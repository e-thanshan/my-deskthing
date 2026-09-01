import { useEffect, useRef } from 'react';
import { useBridge } from '../bridge';

// one physical detent of the rotary arrives as a wheel event with |deltaX| 120
const DETENT = 120;

export function useDialVolume() {
  const client = useBridge();
  const acc = useRef(0);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      acc.current += e.deltaX;
      while (acc.current >= DETENT) {
        acc.current -= DETENT;
        void client.audio.volumeUp();
      }
      while (acc.current <= -DETENT) {
        acc.current += DETENT;
        void client.audio.volumeDown();
      }
    };
    window.addEventListener('wheel', onWheel);
    return () => window.removeEventListener('wheel', onWheel);
  }, [client]);
}
