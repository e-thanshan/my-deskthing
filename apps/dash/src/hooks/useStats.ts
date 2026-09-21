import { useCallback, useEffect, useRef, useState } from 'react';
import { useBridge } from '../bridge';

const LISTENED_KEY = 'stats.listenedMs';
const DRINKS_KEY = 'stats.drinks';

// only the minutes readout depends on this, so re-anchor on a slow interval and take the
// partial window whenever playback stops
const TICK_MS = 15_000;

const WRITE_DELAY_MS = 1_000;

export type Stats = {
  /** All-time milliseconds of playback this device has witnessed. */
  listenedMs: number;
  /** All-time drinks logged. */
  drinks: number;
  /** Increments once per logged drink, so the ribbon can fire one floater per press. */
  drinkPulse: number;
  logDrink: () => void;
};

/** Running totals held on the device, counted only while this screen is the active webapp. */
export function useStats(playing: boolean): Stats {
  const client = useBridge();
  const [totals, setTotals] = useState({ listenedMs: 0, drinks: 0 });
  const [drinkPulse, setDrinkPulse] = useState(0);
  const [ready, setReady] = useState(false);
  const since = useRef<number | null>(null);

  // the stored totals are folded into whatever accumulated while the read was in flight, so a
  // drink logged in the first second is not clobbered by the load landing on top of it
  useEffect(() => {
    let stale = false;
    const read = async (key: string) => {
      const r = await client.store.get({ key }).catch(() => null);
      if (!r?.ok || r.response.value == null) return 0;
      const value = Number(r.response.value);
      return Number.isFinite(value) && value > 0 ? value : 0;
    };
    void Promise.all([read(LISTENED_KEY), read(DRINKS_KEY)]).then(([listenedMs, drinks]) => {
      if (stale) return;
      setTotals(t => ({ listenedMs: t.listenedMs + listenedMs, drinks: t.drinks + drinks }));
      setReady(true);
    });
    return () => {
      stale = true;
    };
  }, [client]);

  // performance.now is monotonic. the device takes its wall clock from the phone, so Date.now
  // can step mid-track and would bank the jump as listening time.
  const commit = useCallback(() => {
    if (since.current == null) return;
    const now = performance.now();
    const elapsed = now - since.current;
    since.current = now;
    if (elapsed > 0) setTotals(t => ({ ...t, listenedMs: t.listenedMs + elapsed }));
  }, []);

  useEffect(() => {
    if (!playing) return;
    since.current = performance.now();
    const tick = setInterval(commit, TICK_MS);
    return () => {
      commit();
      since.current = null;
      clearInterval(tick);
    };
  }, [playing, commit]);

  const logDrink = useCallback(() => {
    setTotals(t => ({ ...t, drinks: t.drinks + 1 }));
    setDrinkPulse(p => p + 1);
  }, []);

  // writes are absolute totals rather than increments, so a dropped one costs nothing but the
  // interval it covered and the next write puts the number right again
  useEffect(() => {
    if (!ready) return;
    const write = setTimeout(() => {
      void client.store.put({ key: LISTENED_KEY, value: String(Math.round(totals.listenedMs)) }).catch(() => {});
      void client.store.put({ key: DRINKS_KEY, value: String(totals.drinks) }).catch(() => {});
    }, WRITE_DELAY_MS);
    return () => clearTimeout(write);
  }, [client, ready, totals]);

  return { ...totals, drinkPulse, logDrink };
}
