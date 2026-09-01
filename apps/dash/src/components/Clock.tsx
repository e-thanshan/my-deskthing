import { useClock } from '../hooks/useClock';

export function Clock() {
  const { time, meridiem } = useClock();
  return (
    <div className="flex items-baseline gap-1.5 font-display">
      <span className="text-3xl font-medium tracking-display text-near">{time}</span>
      <span className="text-row text-dim">{meridiem}</span>
    </div>
  );
}
