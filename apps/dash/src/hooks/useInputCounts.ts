import { useEffect, useState } from 'react';
import { useBridge } from '../bridge';

/**
 * What the desktop odometer last reported. `needs-permission` means macOS has not granted Input
 * Monitoring to the agent, which only the user can fix; `unavailable` means no agent is installed
 * and the device should say nothing about these stats.
 */
export type InputCounts =
  | { status: 'counting'; keys: number; scrollPoints: number; stale: boolean }
  | { status: 'needs-permission' }
  | { status: 'unavailable' };

// the extension heartbeats every 30s even when the numbers hold still, so silence for three of
// them means nothing is feeding us rather than nobody touching the keyboard
const STALE_MS = 90_000;

const TICK_MS = 15_000;

type Received = { counts: InputCounts; at: number };

function parse(message: unknown): InputCounts | null {
  const m = message as Record<string, unknown> | null;
  if (!m || m.kind !== 'input-counts') return null;
  if (m.status === 'needs-permission') return { status: 'needs-permission' };
  if (m.status === 'unavailable') return { status: 'unavailable' };
  if (typeof m.keys !== 'number' || typeof m.scrollPoints !== 'number') return null;
  return {
    status: 'counting',
    keys: Math.max(0, m.keys),
    scrollPoints: Math.max(0, m.scrollPoints),
    stale: false,
  };
}

/** Keystroke and scroll totals pushed by the desktop extension, or null when nothing has arrived. */
export function useInputCounts(): InputCounts | null {
  const client = useBridge();
  const [seen, setSeen] = useState<Received | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(
    () =>
      client.forward.onJson(message => {
        const counts = parse(message);
        if (counts) setSeen({ counts, at: Date.now() });
      }),
    [client],
  );

  // the extension only pushes on its own tick, so ask on mount and on every reconnect
  useEffect(() => {
    const ask = () => void client.forward.json({ kind: 'input-counts-request' }).catch(() => {});
    ask();
    return client.on(event => {
      if (event.type === 'open') ask();
    });
  }, [client]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(tick);
  }, []);

  if (!seen) return null;
  if (seen.counts.status !== 'counting') return seen.counts;
  return { ...seen.counts, stale: now - seen.at > STALE_MS };
}
