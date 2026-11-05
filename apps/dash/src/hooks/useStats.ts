import { useCallback, useEffect, useRef, useState } from 'react';
import { useBridge } from '../bridge';

const LISTENED_KEY = 'stats.listenedMs';
const DRINKS_KEY = 'stats.drinks';

// only the minutes readout depends on this, so re-anchor on a slow interval and take the
// partial window whenever playback stops
const TICK_MS = 15_000;

const WRITE_DELAY_MS = 1_000;

type Totals = { listenedMs: number; drinks: number };

export type Stats = {
  /** All-time milliseconds of playback this device has witnessed. */
  listenedMs: number;
  /** All-time drinks logged. */
  drinks: number;
  /** Increments once per logged drink, so the ribbon can fire one floater per press. */
  drinkPulse: number;
  logDrink: () => void;
};

function parseBackup(message: unknown): Totals | null {
  const m = message as Record<string, unknown> | null;
  if (!m || m.kind !== 'stats-backup') return null;
  if (typeof m.listenedMs !== 'number' || typeof m.drinks !== 'number') return null;
  if (!Number.isFinite(m.listenedMs) || !Number.isFinite(m.drinks)) return null;
  return { listenedMs: Math.max(0, m.listenedMs), drinks: Math.max(0, m.drinks) };
}

function higher(a: Totals, b: Totals): Totals {
  if (b.listenedMs <= a.listenedMs && b.drinks <= a.drinks) return a;
  return { listenedMs: Math.max(a.listenedMs, b.listenedMs), drinks: Math.max(a.drinks, b.drinks) };
}

/**
 * Running totals held on the device, counted only while this screen is the active webapp. The
 * desktop extension keeps a backup that outlives an uninstall, and the higher of the two wins.
 */
export function useStats(playing: boolean): Stats {
  const client = useBridge();
  const [totals, setTotals] = useState<Totals>({ listenedMs: 0, drinks: 0 });
  const [drinkPulse, setDrinkPulse] = useState(0);
  const [ready, setReady] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const since = useRef<number | null>(null);
  const stored = useRef<Totals | null>(null);
  const early = useRef<Totals | null>(null);
  const merged = useRef(false);

  // the first backup reading predates anything counted since this page loaded, so it lifts the
  // stored floor and the session's own count rides on top. after that the backup only echoes what
  // this page sent it, and taking the max is all a later reading can safely do.
  const restore = useCallback((backup: Totals) => {
    const floor = stored.current;
    if (!floor) {
      early.current = early.current ? higher(early.current, backup) : backup;
      return;
    }
    if (merged.current) {
      setTotals(t => higher(t, backup));
      return;
    }
    merged.current = true;
    setTotals(t => ({
      listenedMs: t.listenedMs + Math.max(0, backup.listenedMs - floor.listenedMs),
      drinks: t.drinks + Math.max(0, backup.drinks - floor.drinks),
    }));
    setBackedUp(true);
  }, []);

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
      stored.current = { listenedMs, drinks };
      setTotals(t => ({ listenedMs: t.listenedMs + listenedMs, drinks: t.drinks + drinks }));
      setReady(true);
      if (early.current) restore(early.current);
    });
    return () => {
      stale = true;
    };
  }, [client, restore]);

  // the extension answers on its own when the device turns up, but a page that loads or reconnects
  // later has to ask
  useEffect(() => {
    const off = client.forward.onJson(message => {
      const backup = parseBackup(message);
      if (backup) restore(backup);
    });
    const ask = () => void client.forward.json({ kind: 'stats-backup-request' }).catch(() => {});
    ask();
    const offOpen = client.on(event => {
      if (event.type === 'open') ask();
    });
    return () => {
      off();
      offOpen();
    };
  }, [client, restore]);

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
  // interval it covered and the next write puts the number right again. the backup is held back
  // until its own reading is merged, or that reading would already contain this session's count.
  useEffect(() => {
    if (!ready) return;
    const write = setTimeout(() => {
      const listenedMs = Math.round(totals.listenedMs);
      void client.store.put({ key: LISTENED_KEY, value: String(listenedMs) }).catch(() => {});
      void client.store.put({ key: DRINKS_KEY, value: String(totals.drinks) }).catch(() => {});
      if (backedUp) {
        void client.forward.json({ kind: 'stats-backup-save', listenedMs, drinks: totals.drinks }).catch(() => {});
      }
    }, WRITE_DELAY_MS);
    return () => clearTimeout(write);
  }, [client, ready, backedUp, totals]);

  return { ...totals, drinkPulse, logDrink };
}
