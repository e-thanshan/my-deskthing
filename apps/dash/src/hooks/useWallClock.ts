import type { TimeInfo } from '@bridgething/client';
import { useCallback, useEffect, useRef } from 'react';
import { useBridge } from '../bridge';

/** Wall time where the phone is. `day` is `YYYY-MM-DD` in that same zone. */
export type Wall = {
  hour: number;
  minute: number;
  day: string;
  /** False until the daemon has answered, while the fields are only this device's own guess. */
  synced: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

const dayKey = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

export function wallNow(skewMs: number, info: TimeInfo | null): Wall {
  const now = new Date(Date.now() + skewMs);
  const synced = info !== null;
  if (info?.tzIana) {
    try {
      // h23 so midnight reads as hour 0 of the new day rather than hour 24 of the old one
      const parts = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: info.tzIana,
      }).formatToParts(now);
      const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
      const [hour, minute, year, month, day] = [get('hour'), get('minute'), get('year'), get('month'), get('day')];
      if ([hour, minute, year, month, day].every(Number.isFinite)) {
        return { hour, minute, day: dayKey(year, month, day), synced };
      }
    } catch {
      // a zone id this chromium does not know falls back to the offset path
    }
  }
  if (info?.utcOffsetMinutes != null) {
    const shifted = new Date(now.getTime() + (info.utcOffsetMinutes + (info.dstOffsetMinutes ?? 0)) * 60_000);
    return {
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      day: dayKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate()),
      synced,
    };
  }
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    day: dayKey(now.getFullYear(), now.getMonth() + 1, now.getDate()),
    synced,
  };
}

/**
 * Reads wall time on demand. The phone is the source of truth for it; skew carries it between
 * updates. The returned reader is stable and holds no state, so a caller that wants the time on
 * its own schedule does not re-render on someone else's.
 */
export function useWallClock(): () => Wall {
  const client = useBridge();
  const skew = useRef(0);
  const info = useRef<TimeInfo | null>(null);

  useEffect(() => {
    const apply = (time: TimeInfo) => {
      if (time.wallClockUnixS != null) skew.current = time.wallClockUnixS * 1000 - Date.now();
      info.current = time;
    };
    client.time.get().then(r => {
      if (r.ok) apply(r.response.time);
    });
    const offChanged = client.time.onChanged(s => apply(s.time));
    const offSnapshot = client.time.onSnapshot(s => apply(s.time));
    return () => {
      offChanged();
      offSnapshot();
    };
  }, [client]);

  return useCallback(() => wallNow(skew.current, info.current), []);
}
