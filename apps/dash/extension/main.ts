import { asJson, defineExtension, json } from '@bridgething/extension';
import { startInputCounts, type InputCounter } from './inputcount.ts';

const ENDPOINT = 'https://api.anthropic.com/api/oauth/usage';
const KEYCHAIN_SERVICE = 'Claude Code-credentials';
const POLL_MS = 300_000;
const CACHE_KEY = 'last-usage';

/** one rate-limit window: a 0-100 percentage, the epoch ms it rolls over, and its own short label. */
type Window = { pct: number; resetsAt: number | null; severity: string; label: string };

/** what the device renders. */
type Usage = { kind: 'claude-usage'; at: number; session: Window | null; weekly: Window | null };

// claude code refreshes this token in place, so re-read the item every poll
async function readToken(): Promise<string | null> {
  const out = await new Deno.Command('security', {
    args: ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'],
    stdout: 'piped',
    stderr: 'null',
  }).output();
  if (!out.success) return null;
  try {
    const token = JSON.parse(new TextDecoder().decode(out.stdout))?.claudeAiOauth?.accessToken;
    return typeof token === 'string' && token ? token : null;
  } catch {
    return null;
  }
}

// deno carries its own root store and never consults the macos keychain, so on a network
// that intercepts tls every fetch dies with UnknownIssuer. hand it the keychain's roots,
// which `security` can export without any permission beyond the run grant already held.
let clientResolved = false;
let httpClient: Deno.HttpClient | undefined;

async function keychainClient(): Promise<Deno.HttpClient | undefined> {
  if (clientResolved) return httpClient;
  clientResolved = true;
  if (Deno.build.os !== 'darwin') return undefined;
  try {
    const out = await new Deno.Command('security', {
      args: ['find-certificate', '-a', '-p'],
      stdout: 'piped',
      stderr: 'null',
    }).output();
    if (!out.success) return undefined;
    const caCerts = new TextDecoder()
      .decode(out.stdout)
      .split(/(?=-----BEGIN CERTIFICATE-----)/)
      .map(block => block.trim())
      .filter(block => block.startsWith('-----BEGIN CERTIFICATE-----'));
    if (caCerts.length > 0) httpClient = Deno.createHttpClient({ caCerts });
  } catch {
    httpClient = undefined;
  }
  return httpClient;
}

// resets_at arrives as an iso timestamp, but tolerate epoch seconds or ms
function toEpochMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 1e11 ? value : value * 1000;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// percentages arrive already scaled to 0-100, not as a fraction
function toPct(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function modelName(row: Record<string, unknown>): string | null {
  const model = isRecord(row.scope) ? row.scope.model : null;
  const name = isRecord(model) ? model.display_name : null;
  return typeof name === 'string' && name ? name : null;
}

function build(row: Record<string, unknown>, label: string): Window | null {
  const pct = toPct(row.percent);
  if (pct == null) return null;
  return {
    pct,
    resetsAt: toEpochMs(row.resets_at),
    severity: typeof row.severity === 'string' ? row.severity : 'normal',
    label,
  };
}

// the limits array is self describing, so prefer it: it names each window's kind, carries the
// severity the server wants shown, and gives a per model cap the model's own display name
function fromLimits(body: unknown): Pick<Usage, 'session' | 'weekly'> | null {
  const limits = isRecord(body) ? body.limits : null;
  if (!Array.isArray(limits)) return null;
  const rows = limits.filter(isRecord);
  const session = rows.find(row => row.kind === 'session');
  const scoped = rows.find(row => row.kind === 'weekly_scoped' && modelName(row));
  const all = rows.find(row => row.kind === 'weekly_all');
  const weeklyLabel = scoped ? modelName(scoped)!.slice(0, 5).toUpperCase() : '7D';
  return {
    session: session ? build(session, '5H') : null,
    weekly: scoped ? build(scoped, weeklyLabel) : all ? build(all, '7D') : null,
  };
}

// older responses carry the two windows at the root with the percentage under `utilization`
function fromRootWindows(body: unknown): Pick<Usage, 'session' | 'weekly'> {
  const root = isRecord(body) ? body : {};
  const pick = (value: unknown, label: string): Window | null => {
    if (!isRecord(value)) return null;
    const pct = toPct(value.utilization);
    if (pct == null) return null;
    return { pct, resetsAt: toEpochMs(value.resets_at), severity: 'normal', label };
  };
  return { session: pick(root.five_hour, '5H'), weekly: pick(root.seven_day, '7D') };
}

function toUsage(body: unknown): Usage {
  return { kind: 'claude-usage', at: Date.now(), ...(fromLimits(body) ?? fromRootWindows(body)) };
}

function describe(usage: Usage): string {
  const one = (window: Window | null) => {
    if (!window) return 'none';
    const resets =
      window.resetsAt == null
        ? 'no reset'
        : `resets in ${((window.resetsAt - Date.now()) / 3_600_000).toFixed(1)}h`;
    return `${window.label} ${window.pct.toFixed(0)}% ${window.severity} ${resets}`;
  };
  return `session: ${one(usage.session)}; weekly: ${one(usage.weekly)}`;
}

let timer: ReturnType<typeof setInterval> | undefined;
let input: InputCounter | undefined;

defineExtension({
  async start(ctx) {
    let latest: Usage | null = null;
    let announced = false;

    const push = () => {
      if (latest) ctx.broadcast(json(latest));
    };

    const counter = startInputCounts(ctx, state => ctx.broadcast(json(state)));
    input = counter;

    // a forward only reaches the active webapp, so resend whenever a device turns up
    ctx.on('device', event => {
      if (!event.device.active) return;
      push();
      event.device.send(json(counter.current()));
    });

    // a page that loads between polls would otherwise sit empty until the next one, so
    // answer whatever it asks for out of the last reading
    ctx.on('message', (device, message) => {
      const asked = asJson(message) as Record<string, unknown> | undefined;
      if (asked?.kind === 'input-counts-request') {
        device.send(json(counter.current()));
        return;
      }
      if (asked?.kind !== 'claude-usage-request') return;
      if (latest) device.send(json(latest));
    });

    const poll = async () => {
      const token = await readToken();
      if (!token) {
        ctx.log.warn('no claude credentials in the keychain; skipping poll');
        return;
      }
      try {
        const res = await fetch(ENDPOINT, {
          client: await keychainClient(),
          headers: {
            authorization: `Bearer ${token}`,
            'anthropic-beta': 'oauth-2025-04-20',
            'content-type': 'application/json',
          },
        });
        if (!res.ok) {
          ctx.log.warn('usage fetch failed', res.status, res.statusText);
          return;
        }
        latest = toUsage(await res.json());
        if (!announced) {
          announced = true;
          ctx.log.info(describe(latest));
        }
        await ctx.kv.set(CACHE_KEY, latest);
        push();
      } catch (err) {
        // deno buries the real transport failure (tls, dns, refused) in `cause`
        const cause = (err as { cause?: { message?: string } })?.cause?.message;
        ctx.log.warn('usage fetch threw', String(err), cause ? `cause: ${cause}` : '');
      }
    };

    const cached = (await ctx.kv.get(CACHE_KEY)) as Usage | undefined;
    if (cached) {
      latest = cached;
      push();
    }

    await poll();
    timer = setInterval(poll, POLL_MS);
  },
  stop() {
    clearInterval(timer);
    input?.stop();
    httpClient?.close();
  },
});
