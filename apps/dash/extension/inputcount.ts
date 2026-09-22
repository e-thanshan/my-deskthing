import type { ExtensionContext } from '@bridgething/extension';

/** What the device renders. `keys` and `scrollPoints` are the agent's all-time totals. */
export type InputState =
  | { kind: 'input-counts'; status: 'counting'; at: number; keys: number; scrollPoints: number }
  | { kind: 'input-counts'; status: 'needs-permission' }
  | { kind: 'input-counts'; status: 'unavailable' };

export type InputCounter = {
  current(): InputState;
  stop(): void;
};

const POLL_MS = 5_000;

// the agent only rewrites the file when a number moves, so an idle machine produces no change to
// forward. without a heartbeat the device cannot tell that apart from nobody talking to it.
const HEARTBEAT_MS = 30_000;

// written by the launchd agent from scripts/install-inputcount.ts. the agent owns the odometer and
// keeps counting with bridgething closed, so this side only ever reads.
function countsPath(): string | null {
  const home = Deno.env.get('HOME');
  return home ? `${home}/Library/Application Support/dash-inputcount/counts.json` : null;
}

function parse(text: string): InputState {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { kind: 'input-counts', status: 'unavailable' };
  }
  if (body.status === 'needs-permission') return { kind: 'input-counts', status: 'needs-permission' };
  const keys = body.keys;
  const scrollPoints = body.scrollPoints;
  if (typeof keys !== 'number' || typeof scrollPoints !== 'number') {
    return { kind: 'input-counts', status: 'unavailable' };
  }
  return {
    kind: 'input-counts',
    status: 'counting',
    at: typeof body.at === 'number' ? body.at : Date.now(),
    keys: Math.max(0, keys),
    scrollPoints: Math.max(0, scrollPoints),
  };
}

function same(a: InputState, b: InputState): boolean {
  if (a.status !== b.status) return false;
  if (a.status !== 'counting' || b.status !== 'counting') return true;
  return a.keys === b.keys && a.scrollPoints === b.scrollPoints;
}

/**
 * Watches the launchd agent's odometer file and reports every change through `onChange`. With no
 * agent installed the state stays `unavailable` and the device says nothing about these stats.
 */
export function startInputCounts(ctx: ExtensionContext, onChange: (state: InputState) => void): InputCounter {
  let state: InputState = { kind: 'input-counts', status: 'unavailable' };
  let announced = '';
  let sentAt = 0;
  const path = countsPath();

  const poll = async () => {
    if (!path) return;
    let next: InputState;
    try {
      next = parse(await Deno.readTextFile(path));
    } catch {
      // no agent installed, or it has never written: both read as nothing to show
      next = { kind: 'input-counts', status: 'unavailable' };
    }
    if (next.status !== announced) {
      announced = next.status;
      if (next.status === 'needs-permission') {
        ctx.log.warn('the input odometer is installed but input monitoring is not granted to it;', path);
      } else if (next.status === 'unavailable') {
        ctx.log.info('no input odometer at', path, '- run `bun run install-inputcount` to add one');
      } else {
        ctx.log.info('input odometer reading', next.keys, 'keys');
      }
    }
    const changed = !same(state, next);
    state = next;
    if (!changed && Date.now() - sentAt < HEARTBEAT_MS) return;
    sentAt = Date.now();
    onChange(next);
  };

  void poll();
  const timer = setInterval(() => void poll(), POLL_MS);

  return {
    current: () => state,
    stop: () => clearInterval(timer),
  };
}
