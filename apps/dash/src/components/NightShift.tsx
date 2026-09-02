import { PREF_RANGE } from '../prefs';

// a warm layer multiplied over the whole screen: red passes untouched while
// green and blue are attenuated, which warms the picture the way a display
// white-point shift does instead of hazing it the way an alpha wash would.
const TINT = '#ffab5e';
const MAX_ALPHA = 0.62;

export function NightShift({ level }: { level: number }) {
  const alpha = (MAX_ALPHA * level) / PREF_RANGE.nightShift.max;
  if (alpha <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 mix-blend-multiply transition-opacity duration-200"
      style={{ backgroundColor: TINT, opacity: alpha }}
    />
  );
}
