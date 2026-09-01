function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ProgressBar({ positionMs, durationMs }: { positionMs: number; durationMs: number | null }) {
  // hold the row's height when there is nothing to show so the layout does not jump
  if (durationMs == null || durationMs <= 0) return <div className="h-6" />;
  const pct = Math.min(100, (positionMs / durationMs) * 100);
  return (
    <div className="flex h-6 items-center gap-4">
      <span className="w-12 font-mono text-hint text-dim">{fmt(positionMs)}</span>
      <div className="h-1.5 flex-1 bg-neutral-soft">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right font-mono text-hint text-dim">{fmt(durationMs)}</span>
    </div>
  );
}
