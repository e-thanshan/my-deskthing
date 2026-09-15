import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useBridge } from './bridge';
import { SWEEP_MS } from './components/TriVision';

/** `KeyboardEvent.key` values that toggle sleep when held. */
export const SLEEP_KEYS = ['m'] as const;

/** How long the button must be held to toggle. */
export const SLEEP_HOLD_MS = 1000;

// the backlight we overrode is parked here too, so a reload or a crash while dark restores it
// instead of leaving a screen nothing on the device can brighten again.
const RESTORE_KEY = 'sleep.restore';

const FALLBACK: Backlight = { mode: 'auto', level: 0.7 };

const READ_TIMEOUT_MS = 700;

// how long after going dark a press is ignored, so the tail of the sleep gesture cannot wake it
const WAKE_GRACE_MS = 700;

type Backlight = { mode: 'auto' | 'manual'; level: number };

/** `closing` and `opening` are the slat sweep; the backlight only moves at the dark end of it. */
export type SleepPhase = 'awake' | 'closing' | 'asleep' | 'opening';

type SleepApi = {
  phase: SleepPhase;
  /** Sleep if awake, wake if asleep. Ignored mid-sweep. */
  toggle: () => void;
};

const SleepContext = createContext<SleepApi | null>(null);

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// no phase transition may wait on a daemon round-trip. a wake that did could leave the screen dark
// for good the one time the daemon is gone, which is the only truly unrecoverable state here.
const limit = <T,>(p: Promise<T>, ms: number) => Promise.race([p.catch(() => null), wait(ms).then(() => null)]);

function parse(raw: string): Backlight | null {
  try {
    const v = JSON.parse(raw) as Partial<Backlight>;
    if (v.mode !== 'auto' && v.mode !== 'manual') return null;
    if (typeof v.level !== 'number' || !Number.isFinite(v.level)) return null;
    return { mode: v.mode, level: Math.max(0, Math.min(1, v.level)) };
  } catch {
    return null;
  }
}

export function SleepProvider({ children }: { children: ReactNode }) {
  const client = useBridge();
  const [phase, setPhase] = useState<SleepPhase>('awake');
  const restore = useRef<Backlight | null>(null);
  const busy = useRef(false);
  const asleepAt = useRef(0);

  const apply = useCallback(
    (light: Backlight) => {
      const hw = client.hardware;
      if (light.mode === 'auto') {
        void hw.displaySetMode({ mode: 'auto' }).catch(() => {});
        return;
      }
      // a level is only honoured in manual mode, so the mode always lands first
      void hw
        .displaySetMode({ mode: 'manual' })
        .then(() => hw.displaySetLevel({ level: light.level }))
        .catch(() => {});
    },
    [client],
  );

  useEffect(() => {
    let stale = false;
    void limit(client.store.get({ key: RESTORE_KEY }, { timeoutMs: READ_TIMEOUT_MS }), READ_TIMEOUT_MS).then(r => {
      if (stale || !r?.ok || r.response.value == null) return;
      const saved = parse(r.response.value);
      if (!saved) return;
      apply(saved);
      void client.store.delete({ key: RESTORE_KEY }).catch(() => {});
    });
    return () => {
      stale = true;
    };
  }, [client, apply]);

  const sleep = useCallback(async () => {
    const startedAt = Date.now();
    setPhase('closing');
    const r = await limit(client.hardware.stateGet({ timeoutMs: READ_TIMEOUT_MS }), READ_TIMEOUT_MS);
    const saved: Backlight = r?.ok
      ? { mode: r.response.state.brightness.mode, level: r.response.state.brightness.level }
      : FALLBACK;
    restore.current = saved;
    void client.store.put({ key: RESTORE_KEY, value: JSON.stringify(saved) }).catch(() => {});
    await wait(Math.max(0, SWEEP_MS - (Date.now() - startedAt)));
    apply({ mode: 'manual', level: 0 });
    setPhase('asleep');
  }, [client, apply]);

  const wake = useCallback(async () => {
    const saved = restore.current;
    restore.current = null;
    if (saved) apply(saved);
    else {
      void limit(client.store.get({ key: RESTORE_KEY }, { timeoutMs: READ_TIMEOUT_MS }), READ_TIMEOUT_MS).then(r =>
        apply((r?.ok && r.response.value != null ? parse(r.response.value) : null) ?? FALLBACK),
      );
    }
    void client.store.delete({ key: RESTORE_KEY }).catch(() => {});
    setPhase('opening');
    await wait(SWEEP_MS);
    setPhase('awake');
  }, [client, apply]);

  const run = useCallback((fn: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    void fn().finally(() => {
      busy.current = false;
    });
  }, []);

  const toggle = useCallback(() => {
    if (phase === 'awake') run(sleep);
    else if (phase === 'asleep') run(wake);
  }, [phase, run, sleep, wake]);

  useEffect(() => {
    if (phase === 'asleep') asleepAt.current = Date.now();
  }, [phase]);

  // while the screen is not fully awake the page must not act on input. a capture listener on window
  // runs before every bubble-phase handler in the app, so stopping here gates all of them at once
  // and the press that wakes the device does nothing else.
  useEffect(() => {
    if (phase === 'awake') return;
    const asleep = phase === 'asleep';
    const swallow = (e: Event) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      if (!asleep) return;
      // only a fresh press wakes. a release is how the sleep gesture itself ends and auto-repeat is
      // the same button still held, so neither counts, and a hold that outlasts the sweep by less
      // than the grace window cannot bounce the screen straight back on.
      if (e.type !== 'keydown' && e.type !== 'pointerdown') return;
      if ((e as KeyboardEvent).repeat) return;
      if (Date.now() - asleepAt.current < WAKE_GRACE_MS) return;
      run(wake);
    };
    const opts = { capture: true } as const;
    window.addEventListener('keydown', swallow, opts);
    window.addEventListener('keyup', swallow, opts);
    window.addEventListener('pointerdown', swallow, opts);
    window.addEventListener('pointerup', swallow, opts);
    window.addEventListener('wheel', swallow, { capture: true, passive: false });
    return () => {
      window.removeEventListener('keydown', swallow, opts);
      window.removeEventListener('keyup', swallow, opts);
      window.removeEventListener('pointerdown', swallow, opts);
      window.removeEventListener('pointerup', swallow, opts);
      window.removeEventListener('wheel', swallow, opts);
    };
  }, [phase, run, wake]);

  const api = useMemo(() => ({ phase, toggle }), [phase, toggle]);
  return <SleepContext.Provider value={api}>{children}</SleepContext.Provider>;
}

export function useSleep(): SleepApi {
  const api = useContext(SleepContext);
  if (!api) throw new Error('useSleep outside SleepProvider');
  return api;
}
