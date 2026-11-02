import type { Painting } from '../hooks/usePainting';

/** One-line credit for the backdrop painting: title, then artist and date, then the museum. */
export function PaintingCredit({ painting }: { painting: Painting }) {
  const byline = [painting.artist, painting.date].filter(Boolean).join(', ');
  return (
    <div className="ml-auto min-w-0 max-w-[60%] shrink truncate pb-[0.12em] text-right text-hint text-off-white/60 [text-shadow:0_0_3px_rgba(0,0,0,0.9),0_1px_8px_rgba(0,0,0,0.6)]">
      <span className="font-clock text-[13px] italic text-off-white/75">{painting.title}</span>
      {byline && <span> · {byline}</span>}
      <span> · {painting.museum}</span>
    </div>
  );
}
