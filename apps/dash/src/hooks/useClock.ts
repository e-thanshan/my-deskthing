import { useEffect, useState } from 'react';
import { useWallClock, type Wall } from './useWallClock';

type Clock = { time: string; meridiem: string };

function format({ hour, minute }: Wall): Clock {
  return {
    time: `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')}`,
    meridiem: hour >= 12 ? 'PM' : 'AM',
  };
}

export function useClock(): Clock {
  const read = useWallClock();
  const [clock, setClock] = useState<Clock>(() => format(read()));

  useEffect(() => {
    const tick = setInterval(() => {
      const next = format(read());
      setClock(prev => (prev.time === next.time && prev.meridiem === next.meridiem ? prev : next));
    }, 1000);
    return () => clearInterval(tick);
  }, [read]);

  return clock;
}
