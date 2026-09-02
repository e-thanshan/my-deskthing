import { useEffect, useRef } from 'react';

// one physical detent of the rotary arrives as a wheel event with |deltaX| 120
const DETENT = 120;

// counts detents off the rotary. only one consumer should be enabled at a time,
// so whatever has the dial (the settings panel) turns the others off.
export function useDial(onDetent: (dir: -1 | 1) => void, enabled = true) {
  const acc = useRef(0);
  const latest = useRef(onDetent);

  useEffect(() => {
    latest.current = onDetent;
  }, [onDetent]);

  useEffect(() => {
    if (!enabled) return;
    acc.current = 0;
    const onWheel = (e: WheelEvent) => {
      acc.current += e.deltaX;
      while (acc.current >= DETENT) {
        acc.current -= DETENT;
        latest.current(1);
      }
      while (acc.current <= -DETENT) {
        acc.current += DETENT;
        latest.current(-1);
      }
    };
    window.addEventListener('wheel', onWheel);
    return () => window.removeEventListener('wheel', onWheel);
  }, [enabled]);
}
