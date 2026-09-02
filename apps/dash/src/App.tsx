import { useEffect, useState } from 'react';
import { BridgeProvider } from './bridge';
import { NightShift } from './components/NightShift';
import { SettingsPanel } from './components/SettingsPanel';
import { useDialVolume } from './hooks/useDialVolume';
import { PrefsProvider, usePrefs, useSettingsPanel } from './prefs';
import { screens } from './screens';

export default function App() {
  return (
    <BridgeProvider>
      <PrefsProvider>
        <Shell />
      </PrefsProvider>
    </BridgeProvider>
  );
}

function Shell() {
  const { prefs } = usePrefs();
  const { open, setOpen } = useSettingsPanel();
  useDialVolume(!open);
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
    </>
  );
}
