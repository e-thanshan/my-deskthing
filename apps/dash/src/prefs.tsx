import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useBridge } from './bridge';

// everything the on-screen settings panel edits. integers only, so one dial
// detent is always one step and the value round-trips through store as a string.
export type Prefs = {
  nightShift: number;
  lyricOffset: number;
};

// a min below zero renders as a centred slider rather than a fill meter
export const PREF_RANGE: { [K in keyof Prefs]: { min: number; max: number } } = {
  nightShift: { min: 0, max: 10 },
  lyricOffset: { min: -20, max: 20 },
};

const DEFAULTS: Prefs = {
  nightShift: 3,
  lyricOffset: 0,
};

// lyricOffset counts 100ms steps
export const LYRIC_OFFSET_STEP_MS = 100;

const STORE_PREFIX = 'pref.';

type PrefsApi = {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
};

const PrefsContext = createContext<PrefsApi | null>(null);
const PanelContext = createContext<{ open: boolean; setOpen: Dispatch<SetStateAction<boolean>> } | null>(null);

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const client = useBridge();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [open, setOpen] = useState(false);
  // a value the dial already moved must survive the stored read landing late
  const edited = useRef(new Set<keyof Prefs>());

  useEffect(() => {
    let stale = false;
    for (const key of Object.keys(DEFAULTS) as (keyof Prefs)[]) {
      client.store
        .get({ key: STORE_PREFIX + key })
        .then(r => {
          if (stale || edited.current.has(key) || !r.ok || r.response.value == null) return;
          const v = Number(r.response.value);
          if (!Number.isFinite(v)) return;
          const { min, max } = PREF_RANGE[key];
          setPrefs(p => ({ ...p, [key]: clamp(Math.round(v), min, max) }));
        })
        .catch(() => {});
    }
    return () => {
      stale = true;
    };
  }, [client]);

  const setPref = useCallback(
    <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
      const { min, max } = PREF_RANGE[key];
      const next = clamp(Math.round(value), min, max) as Prefs[K];
      edited.current.add(key);
      setPrefs(p => (p[key] === next ? p : { ...p, [key]: next }));
      void client.store.put({ key: STORE_PREFIX + key, value: String(next) }).catch(() => {});
    },
    [client],
  );

  const prefsApi = useMemo(() => ({ prefs, setPref }), [prefs, setPref]);
  const panel = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <PrefsContext.Provider value={prefsApi}>
      <PanelContext.Provider value={panel}>{children}</PanelContext.Provider>
    </PrefsContext.Provider>
  );
}

export function usePrefs(): PrefsApi {
  const api = useContext(PrefsContext);
  if (!api) throw new Error('usePrefs outside PrefsProvider');
  return api;
}

export function useSettingsPanel() {
  const panel = useContext(PanelContext);
  if (!panel) throw new Error('useSettingsPanel outside PrefsProvider');
  return panel;
}
