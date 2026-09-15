import { useEffect, useRef } from 'react';

// a held button on this device sends one plain keydown, auto-repeat from ~400ms, then keyup on
// release. counting repeats is what identifies a hold; counting presses must not, or five fast
// presses of Mode would fire this as well as the launcher gesture they belong to.

/**
 * Fires once when any of `keys` is held for `holdMs`. A tap never fires.
 *
 * @param keys `KeyboardEvent.key` values to watch, compared case-insensitively.
 * @param holdMs how long the key must stay down, and the refractory window after a fire.
 * @param onHold called once per hold. Re-read on every render, so it need not be stable.
 * @param enabled when false no listeners are attached and any hold in progress is dropped.
 */
export function useHoldKey(keys: readonly string[], holdMs: number, onHold: () => void, enabled = true) {
  const latest = useRef(onHold);

  useEffect(() => {
    latest.current = onHold;
  }, [onHold]);

  const watched = keys.join('|');

  useEffect(() => {
    if (!enabled) return;
    const list = watched.split('|').map(k => k.toLowerCase());
    const match = (k: string) => list.includes(k.toLowerCase());

    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastFire = 0;

    const clear = () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
    };

    const fire = () => {
      clear();
      lastFire = Date.now();
      latest.current();
    };

    const onDown = (e: KeyboardEvent) => {
      if (!match(e.key) || e.repeat) return;
      // one toggle per hold, however many events arrive while the button is down
      if (Date.now() - lastFire < holdMs || timer !== null) return;
      timer = setTimeout(fire, holdMs);
    };

    const onUp = (e: KeyboardEvent) => {
      if (match(e.key)) clear();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      clear();
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [enabled, holdMs, watched]);
}
