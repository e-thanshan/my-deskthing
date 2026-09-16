import { useEffect, useRef } from 'react';
import { useWallClock } from './useWallClock';

const CHECK_MS = 10_000;

/**
 * Fires at most once a day, when wall time reaches `atMinutes` past midnight.
 *
 * @param atMinutes minute of the day to fire at, or null to fire never.
 * @param onDue called on the crossing. Re-read on every render, so it need not be stable.
 */
export function useAutoSleep(atMinutes: number | null, onDue: () => void) {
  const latest = useRef(onDue);

  useEffect(() => {
    latest.current = onDue;
  }, [onDue]);

  const read = useWallClock();

  useEffect(() => {
    if (atMinutes === null) return;
    // only the crossing counts. a page that loaded after the time had passed, or a screen woken
    // later in the evening, waits for tomorrow rather than going dark under the user's hand.
    // a fresh time seeds prev as well, so moving the pref onto a time already past does nothing.
    let prev: number | null = null;
    let firedOn: string | null = null;

    const check = () => {
      const { hour, minute, day, synced } = read();
      // an unsynced read is this device's own clock, which is no basis for acting on the time
      if (!synced) return;
      const mins = hour * 60 + minute;
      const before = prev;
      prev = mins;
      if (before === null || before >= atMinutes || mins < atMinutes) return;
      if (firedOn === day) return;
      firedOn = day;
      latest.current();
    };

    check();
    const timer = setInterval(check, CHECK_MS);
    return () => clearInterval(timer);
  }, [atMinutes, read]);
}
