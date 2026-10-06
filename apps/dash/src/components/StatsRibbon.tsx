import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { InputCounts } from '../hooks/useInputCounts';

// a scroll delta arrives in points, and a point is a logical pixel whose physical size depends on
// the display and its scaling. this is roughly a default-scaled retina panel, which is the only
// honest single number available for a stat nobody is going to survey a wall with.
const POINTS_PER_INCH = 125;

const METRES_PER_POINT = 0.0254 / POINTS_PER_INCH;

type Unit = { name: string; metres: number };

const UNITS: Unit[] = [
  { name: 'planck lengths', metres: 1.616255e-35 },
  { name: 'angstroms', metres: 1e-10 },
  { name: 'beard-seconds', metres: 5e-9 },
  { name: 'barleycorns', metres: 0.0254 / 3 },
  { name: 'attoparsecs', metres: 0.030856775814913673 },
  { name: 'hands', metres: 0.1016 },
  { name: 'bananas', metres: 0.18 },
  { name: 'light-nanoseconds', metres: 0.299792458 },
  { name: 'cubits', metres: 0.4572 },
  { name: 'smoots', metres: 1.7018 },
  { name: 'fathoms', metres: 1.8288 },
  { name: 'rods', metres: 5.0292 },
  { name: 'chains', metres: 20.1168 },
  { name: 'blue whales', metres: 25 },
  { name: 'olympic pools', metres: 50 },
  { name: 'football fields', metres: 91.44 },
  { name: 'furlongs', metres: 201.168 },
  { name: 'eiffel towers', metres: 330 },
  { name: 'nautical miles', metres: 1852 },
  { name: 'leagues', metres: 4828.032 },
  { name: 'mount everests', metres: 8848.86 },
  { name: 'marathons', metres: 42_195 },
  { name: 'trips around the world', metres: 40_075_017 },
  { name: 'light-seconds', metres: 299_792_458 },
  { name: 'trips to the moon', metres: 384_400_000 },
  { name: 'sun widths', metres: 1_392_700_000 },
  { name: 'AU', metres: 149_597_870_700 },
  { name: 'light-years', metres: 9_460_730_472_580_800 },
  { name: 'parsecs', metres: 30_856_775_814_913_673 },
  { name: 'kessel runs', metres: 12 * 30_856_775_814_913_673 },
];

let deck: Unit[] = [];
let dealt: Unit | undefined;

// dealt from a shuffled deck rather than picked independently, so every unit comes round once before
// any repeats, and a reshuffle never deals the one just shown
function drawUnit(): Unit {
  if (deck.length === 0) {
    deck = [...UNITS];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (deck[deck.length - 1] === dealt) deck.reverse();
  }
  dealt = deck.pop()!;
  return dealt;
}

// the artwork behind this is any colour it likes, and ember on a sunlit wall reads as nothing, so
// the glyphs carry their own dark halo instead of trusting the backdrop to be dark
const FLOATER =
  'pointer-events-none absolute bottom-full whitespace-nowrap font-display text-[26px] font-bold text-ember ' +
  '[text-shadow:0_0_4px_rgba(0,0,0,0.95),0_0_10px_rgba(0,0,0,0.9),0_2px_16px_rgba(0,0,0,0.75)] ' +
  'animate-[float-up_1s_ease-out_forwards]';

function fmtInt(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('en-US');
}

// the units span fifty orders of magnitude, so anything a fixed format would print as a wall of zeros
// or digits goes to scientific notation instead
function fmtMagnitude(value: number): ReactNode {
  if (value === 0) return '0';
  if (value >= 1e6 || value < 1e-3) {
    const [mantissa, exponent] = value.toExponential(2).split('e');
    return (
      <>
        {mantissa}×10<sup>{Number(exponent)}</sup>
      </>
    );
  }
  if (value >= 1000) return fmtInt(value);
  return value.toLocaleString('en-US', { minimumSignificantDigits: 3, maximumSignificantDigits: 3 });
}

function fmtScrolled(points: number, unit: Unit): ReactNode {
  return (
    <>
      {fmtMagnitude((points * METRES_PER_POINT) / unit.metres)}
      <span className="ml-1.5 text-hint text-off-white/70">{unit.name}</span>
    </>
  );
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
  value: ReactNode;
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
        <span className="font-mono text-eyebrow tracking-[0.25em] text-off-white/70 uppercase">{label}</span>
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

  const [unit, setUnit] = useState(drawUnit);
  useEffect(() => {
    if (open) setUnit(drawUnit());
  }, [open]);

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
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-[58px] items-end gap-9 border-t transition-colors duration-300 [text-shadow:0_0_3px_rgba(0,0,0,0.9),0_1px_8px_rgba(0,0,0,0.6)] ${
          open ? 'border-rule' : 'border-transparent'
        }`}>
        <Cell label="listened" value={`${fmtInt(listenedMs / 60_000)} min`} dim={!open} />
        <Cell label="drinks" value={fmtInt(drinks)} dim={!open}>
          {pops.map(id => (
            <span
              key={id}
              onAnimationEnd={() => endPop(id)}
              style={{ left: `${(id % 3) * 7 - 7}px` }}
              className={FLOATER}>
              +1 drink
            </span>
          ))}
        </Cell>
        {counting && <Cell label="keys" value={fmtInt(counting.keys)} dim={!open} muted={counting.stale} />}
        {counting && (
          <Cell
            label="scrolled"
            value={fmtScrolled(counting.scrollPoints, unit)}
            dim={!open}
            muted={counting.stale}
          />
        )}
        {/* out of flow and up on the label row, so a long scrolled unit cannot shove it off the screen */}
        {note && (
          <span
            className={`absolute right-0 bottom-8 font-mono text-hint text-off-white/55 transition-opacity duration-300 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}>
            {note}
          </span>
        )}
      </div>
    </div>
  );
}
