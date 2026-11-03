import { useEffect, useState } from 'react';
import { BridgeProvider } from './bridge';
import { NightShift } from './components/NightShift';
import { PaintingMenu } from './components/PaintingMenu';
import { SettingsPanel } from './components/SettingsPanel';
import { TriVision } from './components/TriVision';
import { useAutoSleep } from './hooks/useAutoSleep';
import { useDialVolume } from './hooks/useDialVolume';
import { useHoldKey } from './hooks/useHoldKey';
import { usePressOrHold } from './hooks/usePressOrHold';
import { PAINTING_KEY, PaintingProvider, PEEK_HOLD_MS, usePainting } from './painting';
import { autoOffMinutes, PrefsProvider, usePrefs, useSettingsPanel } from './prefs';
import { screens } from './screens';
import { SLEEP_HOLD_MS, SLEEP_KEYS, SleepProvider, useSleep } from './sleep';

export default function App() {
  return (
    <BridgeProvider>
      <SleepProvider>
        <PrefsProvider>
          <PaintingProvider>
            <Shell />
          </PaintingProvider>
        </PrefsProvider>
      </SleepProvider>
    </BridgeProvider>
  );
}

function Shell() {
  const { prefs } = usePrefs();
  const { open, setOpen } = useSettingsPanel();
  const { menuOpen, setMenuOpen, peeking, setPeeking } = usePainting();
  const { phase, toggle, sleepNow } = useSleep();
  const awake = phase === 'awake';
  useDialVolume(!open && !menuOpen && awake);
  useHoldKey(SLEEP_KEYS, SLEEP_HOLD_MS, toggle, awake);
  useAutoSleep(autoOffMinutes(prefs.autoOff), sleepNow);
  usePressOrHold(
    PAINTING_KEY,
    PEEK_HOLD_MS,
    {
      onPress: () => {
        setOpen(false);
        setMenuOpen(m => !m);
      },
      onHoldStart: () => {
        if (!open) setPeeking(true);
      },
      onHoldEnd: () => setPeeking(false),
    },
    awake,
  );
  const [screen, setScreen] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '4') {
        setMenuOpen(false);
        setOpen(o => !o);
        return;
      }
      if (open || menuOpen) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 2 && screens[n - 1]) setScreen(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen, menuOpen, setMenuOpen]);

  const Screen = screens[screen].component;
  return (
    <>
      <Screen />
      {open && <SettingsPanel />}
      {menuOpen && !peeking && <PaintingMenu />}
      <NightShift level={prefs.nightShift} />
      <TriVision phase={phase} />
    </>
  );
}
