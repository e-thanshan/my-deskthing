import { useEffect, useRef } from 'react';

/** What a button does on a tap, and when a hold starts and ends. */
export type PressOrHold = {
  onPress: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

/**
 * Tells a tap of `key` from a hold. Released before `holdMs` it is a press; kept down that long it
 * starts a hold, which lasts until release. Unlike `useHoldKey`, the release of a hold is reported.
 *
 * @param key `KeyboardEvent.key` to watch, compared case-insensitively.
 * @param handlers re-read on every render, so they need not be stable.
 * @param enabled turning this off mid-hold ends the hold, so whatever it hid comes back.
 */
export function usePressOrHold(key: string, holdMs: number, handlers: PressOrHold, enabled = true) {
  const latest = useRef(handlers);

  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const watched = key.toLowerCase();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let down = false;
    let holding = false;

    const reset = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      down = false;
      if (holding) {
        holding = false;
        latest.current.onHoldEnd();
      }
    };

    const onDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== watched || e.repeat || down) return;
      down = true;
      timer = setTimeout(() => {
        timer = null;
        holding = true;
        latest.current.onHoldStart();
      }, holdMs);
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== watched || !down) return;
      const tapped = !holding;
      reset();
      if (tapped) latest.current.onPress();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', reset);
      reset();
    };
  }, [enabled, holdMs, key]);
}
