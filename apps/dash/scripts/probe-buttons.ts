#!/usr/bin/env bun
// prints every input event the kiosk page receives, so an unmapped physical button can be told apart
// from one the firmware swallows, and a hold can be told apart from a pulse. attaches over cdp and
// changes nothing on the device.

const HOST = process.env.SUPERBIRD_HOST ?? 'bridgething.local';
const PORT = Number(process.env.BRIDGETHING_CDP_PORT ?? 9222);
const SECONDS = Number(process.env.PROBE_SECONDS ?? 60);

const INSTALL = `(() => {
  const w = window;
  // the listeners outlive this script, so a second run must reuse them or every event prints twice
  if (w.__probe) return 'already installed';
  w.__probe = true;
  const t0 = performance.now();
  const log = (type, e) => {
    const row = {
      type,
      key: e.key ?? null,
      code: e.code ?? null,
      keyCode: e.keyCode ?? null,
      repeat: !!e.repeat,
      t: Math.round(performance.now() - t0),
    };
    console.log('__probe ' + JSON.stringify(row));
  };
  for (const type of ['keydown', 'keyup', 'pointerdown', 'pointerup'])
    w.addEventListener(type, e => log(type, e), true);
  return 'installed';
})()`;

type Row = { type: string; key: string | null; code: string | null; keyCode: number | null; repeat: boolean; t: number };

async function pageTarget(): Promise<string> {
  const res = await fetch(`http://${HOST}:${PORT}/json/list`);
  if (!res.ok) throw new Error(`cdp list failed: ${res.status}`);
  const targets = (await res.json()) as { type: string; url: string; webSocketDebuggerUrl?: string }[];
  const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page?.webSocketDebuggerUrl) throw new Error('no page target on the kiosk');
  console.log(`attached to ${page.url}`);
  return page.webSocketDebuggerUrl;
}

const url = await pageTarget();
const ws = new WebSocket(url);
let id = 0;
const send = (method: string, params: Record<string, unknown> = {}) =>
  ws.send(JSON.stringify({ id: ++id, method, params }));

let last = 0;
let rows = 0;

ws.addEventListener('open', () => {
  send('Runtime.enable');
  send('Runtime.evaluate', { expression: INSTALL, returnByValue: true });
  console.log('');
  console.log(`listening for ${SECONDS}s. press each button in turn, then hold the far-right`);
  console.log('Settings button for about two seconds.');
  console.log('a detectable hold shows keydown, a gap, then keyup. nothing at all for a button');
  console.log('means the firmware never hands it to the page.');
  console.log('');
  console.log('  gap  type          key          code         vk   repeat');
  console.log('  ---- ------------- ------------ ------------ ---- ------');
  setTimeout(() => {
    console.log('');
    console.log(rows === 0 ? 'no input events seen.' : `${rows} events seen.`);
    ws.close();
    process.exit(0);
  }, SECONDS * 1000);
});

ws.addEventListener('message', ev => {
  const msg = JSON.parse(String((ev as MessageEvent).data)) as {
    method?: string;
    params?: { args?: { value?: unknown }[] };
  };
  if (msg.method !== 'Runtime.consoleAPICalled') return;
  const text = msg.params?.args?.[0]?.value;
  if (typeof text !== 'string' || !text.startsWith('__probe ')) return;
  const r = JSON.parse(text.slice("__probe ".length)) as Row;
  rows++;
  const gap = last === 0 ? 0 : r.t - last;
  last = r.t;
  const pad = (v: unknown, n: number) => String(v ?? '-').padEnd(n);
  console.log(
    `  ${String(gap + 'ms').padStart(4)} ${pad(r.type, 13)} ${pad(r.key, 12)} ${pad(r.code, 12)} ${pad(r.keyCode, 4)} ${r.repeat ? 'yes' : ''}`,
  );
});

ws.addEventListener('error', () => {
  console.error(`cannot reach the kiosk debugger at ${HOST}:${PORT}`);
  process.exit(1);
});

ws.addEventListener('close', () => process.exit(0));
