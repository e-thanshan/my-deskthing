import type { TimeInfo } from '@bridgething/client';
import { useEffect, useRef, useState } from 'react';
import { useBridge } from '../bridge';

type Clock = { time: string; meridiem: string };

function render(skewMs: number, info: TimeInfo | null): Clock {
  const now = new Date(Date.now() + skewMs);
  if (info?.tzIana) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: info.tzIana,
      }).formatToParts(now);
      const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
      return { time: `${get('hour')}:${get('minute')}`, meridiem: get('dayPeriod') };
    } catch {
      // a zone id this chromium does not know falls back to the offset path
    }
  }
  let hours: number;
  let minutes: number;
  if (info?.utcOffsetMinutes != null) {
    const shifted = new Date(now.getTime() + (info.utcOffsetMinutes + (info.dstOffsetMinutes ?? 0)) * 60_000);
    hours = shifted.getUTCHours();
    minutes = shifted.getUTCMinutes();
  } else {
    hours = now.getHours();
    minutes = now.getMinutes();
  }
  return {
    time: `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, '0')}`,
    meridiem: hours >= 12 ? 'PM' : 'AM',
  };
}

// the phone is the source of truth for wall time; skew carries it between updates
export function useClock(): Clock {
  const client = useBridge();
  const skew = useRef(0);
  const info = useRef<TimeInfo | null>(null);
  const [clock, setClock] = useState<Clock>(() => render(0, null));

  useEffect(() => {
    const apply = (time: TimeInfo) => {
      if (time.wallClockUnixS != null) skew.current = time.wallClockUnixS * 1000 - Date.now();
      info.current = time;
      setClock(render(skew.current, time));
    };
    client.time.get().then(r => {
      if (r.ok) apply(r.response.time);
    });
    const offChanged = client.time.onChanged(s => apply(s.time));
    const offSnapshot = client.time.onSnapshot(s => apply(s.time));
    const tick = setInterval(() => setClock(render(skew.current, info.current)), 1000);
    return () => {
      offChanged();
      offSnapshot();
      clearInterval(tick);
    };
  }, [client]);

  return clock;
}
