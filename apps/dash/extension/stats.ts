import type { ExtensionContext } from '@bridgething/extension';
import { describeError } from './http.ts';

/** The device's all-time totals, as the device sends them and as the backup file holds them. */
export type StatsTotals = { listenedMs: number; drinks: number };

/** What the device receives and folds into its own totals. */
export type StatsBackupMessage = { kind: 'stats-backup' } & StatsTotals;

export type StatsBackup = {
  /** The backup's totals, or null when the file is there but cannot be read as totals. */
  read(): Promise<StatsBackupMessage | null>;
  /** Raises the backup to `totals` wherever the device is ahead. A number in the file is never lowered. */
  save(totals: StatsTotals): Promise<void>;
};

/** Where the backup is kept, beside the input odometer. The manifest grants read and write on this directory. */
export const STATS_DIR = '~/Library/Application Support/dash-inputcount';

const FILE = 'stats.json';

function count(value: unknown): number | null {
  if (value === undefined) return 0;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Keeps the device's drinks and listening totals in a file on the computer, which survives the webapp
 * being uninstalled from the car thing and its key-value namespace going with it.
 */
export function startStatsBackup(ctx: Pick<ExtensionContext, 'log'>): StatsBackup {
  const home = Deno.env.get('HOME');
  const dir = home ? STATS_DIR.replace('~', home) : null;
  const path = dir ? `${dir}/${FILE}` : null;
  const warned = new Set<'read' | 'write'>();
  let announced = false;
  let queue: Promise<void> = Promise.resolve();

  const warn = (kind: 'read' | 'write', ...args: unknown[]) => {
    if (warned.has(kind)) return;
    warned.add(kind);
    ctx.log.warn(...args);
  };

  const load = async (): Promise<StatsTotals | null> => {
    if (!path) return null;
    let text: string;
    try {
      text = await Deno.readTextFile(path);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return { listenedMs: 0, drinks: 0 };
      warn('read', 'could not read the stats backup at', path, describeError(err));
      return null;
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    const fields = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const listenedMs = count(fields?.listenedMs);
    const drinks = count(fields?.drinks);
    // a file that does not parse might be a hand edit with a typo in it, so it is left for the user to fix
    if (!fields || listenedMs == null || drinks == null) {
      warn('read', 'the stats backup at', path, 'is not valid json with numeric listenedMs and drinks; leaving it alone');
      return null;
    }
    warned.delete('read');
    if (!announced) {
      announced = true;
      ctx.log.info('stats backup holds', Math.round(listenedMs / 60_000), 'min and', drinks, 'drinks at', path);
    }
    return { listenedMs, drinks };
  };

  const write = async (incoming: StatsTotals) => {
    const current = await load();
    if (!current || !dir || !path) return;
    const next = {
      listenedMs: Math.max(current.listenedMs, Math.round(incoming.listenedMs)),
      drinks: Math.max(current.drinks, Math.round(incoming.drinks)),
    };
    if (next.listenedMs === current.listenedMs && next.drinks === current.drinks) return;
    try {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(`${path}.tmp`, `${JSON.stringify({ ...next, at: Date.now() }, null, 2)}\n`);
      await Deno.rename(`${path}.tmp`, path);
      warned.delete('write');
    } catch (err) {
      warn('write', 'could not write the stats backup to', path, describeError(err));
    }
  };

  return {
    read: async () => {
      const totals = await load();
      return totals ? { kind: 'stats-backup', ...totals } : null;
    },
    // a read and its write must not interleave with the next save's, or a slower one could land a lower total
    save: totals => (queue = queue.then(() => write(totals))),
  };
}
