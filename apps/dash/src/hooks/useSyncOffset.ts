import { useCallback, useEffect, useState } from 'react';
import { useBridge } from '../bridge';

const KEY = 'syncOffsetMs';
const STEP = 250;
const LIMIT = 4000;

// the phone reports its playhead only on state changes and never re-reports
// mid-track, so nothing downstream can see the gap between that clock and the
// audio actually leaving the speakers. this is the manual trim for it.
export function useSyncOffset(): { offsetMs: number; nudge: (dir: -1 | 1) => number } {
  const client = useBridge();
  const [offsetMs, setOffsetMs] = useState(0);

  useEffect(() => {
    let stale = false;
    client.store.get({ key: KEY }).then(r => {
      if (stale || !r.ok || r.response.value == null) return;
      const v = Number(r.response.value);
      if (Number.isFinite(v)) setOffsetMs(Math.max(-LIMIT, Math.min(LIMIT, v)));
    });
    return () => {
      stale = true;
    };
  }, [client]);

  const nudge = useCallback(
    (dir: -1 | 1) => {
      const next = Math.max(-LIMIT, Math.min(LIMIT, offsetMs + dir * STEP));
      setOffsetMs(next);
      void client.store.put({ key: KEY, value: String(next) });
      return next;
    },
    [client, offsetMs],
  );

  return { offsetMs, nudge };
}
