import { useEffect, useState } from 'react';
import { useBridge } from '../bridge';

/**
 * What the desktop helper last reported. `needs-permission` means macOS has not granted Input
 * Monitoring to whichever process owns the extension, which only the user can fix; `unavailable`
 * means the helper could not be built or run at all and the device should say nothing about it.
 */
export type InputCounts =
  | { status: 'counting'; at: number; keys: number; scrollPoints: number }
  | { status: 'needs-permission' }
  | { status: 'unavailable' };

function parse(message: unknown): InputCounts | null {
  const m = message as Record<string, unknown> | null;
  if (!m || m.kind !== 'input-counts') return null;
  if (m.status === 'needs-permission') return { status: 'needs-permission' };
  if (m.status === 'unavailable') return { status: 'unavailable' };
  if (typeof m.keys !== 'number' || typeof m.scrollPoints !== 'number') return null;
  return {
    status: 'counting',
    at: typeof m.at === 'number' ? m.at : Date.now(),
    keys: Math.max(0, m.keys),
    scrollPoints: Math.max(0, m.scrollPoints),
  };
}

/** Keystroke and scroll totals pushed by the desktop extension, or null when nothing has arrived. */
export function useInputCounts(): InputCounts | null {
  const client = useBridge();
  const [counts, setCounts] = useState<InputCounts | null>(null);

  useEffect(
    () =>
      client.forward.onJson(message => {
        const next = parse(message);
        if (next) setCounts(next);
      }),
    [client],
  );

  // the extension only broadcasts on its own tick, so ask on mount and on every reconnect
  useEffect(() => {
    const ask = () => void client.forward.json({ kind: 'input-counts-request' }).catch(() => {});
    ask();
    return client.on(event => {
      if (event.type === 'open') ask();
    });
  }, [client]);

  return counts;
}
