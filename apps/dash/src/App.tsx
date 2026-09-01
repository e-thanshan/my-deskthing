import { useEffect, useState } from 'react';
import { BridgeProvider } from './bridge';
import { useDialVolume } from './hooks/useDialVolume';
import { screens } from './screens';

export default function App() {
  return (
    <BridgeProvider>
      <Shell />
    </BridgeProvider>
  );
}

function Shell() {
  useDialVolume();
  const [screen, setScreen] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && screens[n - 1]) setScreen(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Screen = screens[screen].component;
  return <Screen />;
}
