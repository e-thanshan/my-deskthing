import type { LyricLine } from '@bridgething/client';

export function Lyrics({ lines, positionMs }: { lines: LyricLine[]; positionMs: number }) {
  let idx = -1;
  while (idx + 1 < lines.length && lines[idx + 1].startMs <= positionMs) idx++;
  const current = idx >= 0 ? lines[idx].text : '';
  const next = lines[idx + 1]?.text ?? '';
  if (!current && !next) return null;
  return (
    <div className="mb-3 flex min-w-0 flex-col gap-0.5 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
      {current && <div className="truncate pb-[0.12em] font-book text-[26px]">{current}</div>}
      {next && <div className="truncate pb-[0.12em] font-book text-lg text-off-white/50">{next}</div>}
    </div>
  );
}
