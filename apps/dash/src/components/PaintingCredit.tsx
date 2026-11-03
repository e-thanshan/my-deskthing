import type { Painting } from '../hooks/usePaintingFeed';

/**
 * One-line credit for the backdrop painting: title, then artist and date, then the museum.
 *
 * @param drop pixels to slide the credit down from where the layout puts it, animated both ways.
 */
export function PaintingCredit({ painting, drop = 0 }: { painting: Painting; drop?: number }) {
  const byline = [painting.artist, painting.date].filter(Boolean).join(', ');
  return (
    <div
      style={{ transform: `translateY(${drop}px)` }}
      className="ml-auto min-w-0 max-w-[60%] shrink truncate pb-[0.12em] text-right text-hint text-off-white/70 transition-transform duration-500 ease-out [text-shadow:0_0_3px_rgba(0,0,0,0.9),0_1px_8px_rgba(0,0,0,0.6)]">
      <span className="font-clock text-[13px] italic text-off-white/85">{painting.title}</span>
      {byline && <span> · {byline}</span>}
      <span> · {painting.museum}</span>
    </div>
  );
}
