import { useEffect, useState } from 'react';
import { BridgeProvider } from './bridge';
import { NightShift } from './components/NightShift';
import { SettingsPanel } from './components/SettingsPanel';
import { TriVision } from './components/TriVision';
import { useAutoSleep } from './hooks/useAutoSleep';
import { useDialVolume } from './hooks/useDialVolume';
import { useHoldKey } from './hooks/useHoldKey';
import { autoOffMinutes, PrefsProvider, usePrefs, useSettingsPanel } from './prefs';
import { screens } from './screens';
import { SLEEP_HOLD_MS, SLEEP_KEYS, SleepProvider, useSleep } from './sleep';

export default function App() {
  return (
    <BridgeProvider>
      <SleepProvider>
        <PrefsProvider>
          <Shell />
        </PrefsProvider>
      </SleepProvider>
    </BridgeProvider>
  );
}

function Shell() {
  const { prefs } = usePrefs();
  const { open, setOpen } = useSettingsPanel();
  const { phase, toggle, sleepNow } = useSleep();
  const awake = phase === 'awake';
  useDialVolume(!open && awake);
  useHoldKey(SLEEP_KEYS, SLEEP_HOLD_MS, toggle, awake);
  useAutoSleep(autoOffMinutes(prefs.autoOff), sleepNow);
  const [screen, setScreen] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '4') {
        setOpen(o => !o);
        return;
      }
      if (open) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 3 && screens[n - 1]) setScreen(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const Screen = screens[screen].component;
  return (
    <>
      <Screen />
      {open && <SettingsPanel />}
      <NightShift level={prefs.nightShift} />
      <TriVision phase={phase} />
    </>
  );
}
