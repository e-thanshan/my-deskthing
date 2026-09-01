import { useClock } from '../hooks/useClock';

export function Clock() {
  const { time, meridiem } = useClock();
  return (
    <div className="flex items-baseline gap-1.5 font-clock [font-variation-settings:'SOFT'_100,'WONK'_1] [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
      <span className="text-3xl font-semibold text-off-white">{time}</span>
      <span className="text-row text-off-white/65">{meridiem}</span>
    </div>
  );
}
