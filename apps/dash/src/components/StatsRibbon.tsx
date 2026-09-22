import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { InputCounts } from '../hooks/useInputCounts';

// a scroll delta arrives in points, and a point is a logical pixel whose physical size depends on
// the display and its scaling. this is roughly a default-scaled retina panel, which is the only
// honest single number available for a stat nobody is going to survey a wall with.
const POINTS_PER_INCH = 125;

const INCHES_PER_MILE = 63_360;

function fmtInt(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('en-US');
}

// feet until there is a mile to show, because the first mile takes about eight million points
function fmtScrolled(points: number): string {
  const inches = points / POINTS_PER_INCH;
  const miles = inches / INCHES_PER_MILE;
  if (miles >= 1) return `${miles.toFixed(2)} mi`;
  return `${fmtInt(inches / 12)} ft`;
}

// only the readout fades with the ribbon. the cell keeps its box so a floater launched while the
// ribbon is shut still has somewhere to launch from.
function Cell({
  label,
  value,
  dim,
  muted,
  children,
}: {
  label: string;
  value: string;
  dim: boolean;
  /** The reading is no longer arriving, so show it without claiming it is live. */
  muted?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="relative flex shrink-0 flex-col">
      <div
        className={`flex flex-col gap-0.5 transition-opacity duration-300 ${
          dim ? 'opacity-0' : muted ? 'opacity-40' : 'opacity-100'
        }`}>
        <span className="font-mono text-eyebrow tracking-[0.25em] text-off-white/45 uppercase">{label}</span>
        <span className="font-mono text-title tabular-nums text-off-white/90">{value}</span>
      </div>
      {children}
    </div>
  );
}

export function StatsRibbon({
  open,
  listenedMs,
  drinks,
  drinkPulse,
  input,
}: {
  open: boolean;
  listenedMs: number;
  drinks: number;
  drinkPulse: number;
  input: InputCounts | null;
}) {
  const [pops, setPops] = useState<number[]>([]);

  // strict mode runs this twice for one press, and the pulse is the floater's react key
  useEffect(() => {
    if (drinkPulse === 0) return;
    setPops(list => (list.includes(drinkPulse) ? list : [...list, drinkPulse]));
  }, [drinkPulse]);

  const endPop = useCallback((id: number) => setPops(list => list.filter(p => p !== id)), []);

  const counting = input?.status === 'counting' ? input : null;
  const note =
    input?.status === 'needs-permission'
      ? 'input monitoring not granted'
      : counting?.stale
        ? 'no reading from the computer'
        : null;

  return (
    <div className="relative">
      {/* the spacer alone carries the height, so the row below can overflow upward unclipped */}
      <div className={`transition-[height] duration-300 ease-out ${open ? 'h-[58px]' : 'h-0'}`} />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-[58px] items-end gap-9 border-t transition-colors duration-300 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] ${
          open ? 'border-rule' : 'border-transparent'
        }`}>
        <Cell label="listened" value={`${fmtInt(listenedMs / 60_000)} min`} dim={!open} />
        <Cell label="drinks" value={fmtInt(drinks)} dim={!open}>
          {pops.map(id => (
            <span
              key={id}
              onAnimationEnd={() => endPop(id)}
              style={{ left: `${(id % 3) * 7 - 7}px` }}
              className="pointer-events-none absolute bottom-full whitespace-nowrap font-display text-row-lg font-semibold text-ember [text-shadow:0_1px_10px_rgba(0,0,0,0.75)] animate-[float-up_1s_ease-out_forwards]">
              +1 drink
            </span>
          ))}
        </Cell>
        {counting && <Cell label="keys" value={fmtInt(counting.keys)} dim={!open} muted={counting.stale} />}
        {counting && (
          <Cell
            label="scrolled"
            value={fmtScrolled(counting.scrollPoints)}
            dim={!open}
            muted={counting.stale}
          />
        )}
        {note && (
          <span
            className={`ml-auto shrink-0 pb-1 font-mono text-hint text-off-white/35 transition-opacity duration-300 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}>
            {note}
          </span>
        )}
      </div>
    </div>
  );
}
