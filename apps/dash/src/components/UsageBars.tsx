import { useClaudeUsage, type UsageWindow } from '../hooks/useClaudeUsage';

const STALE_MS = 900_000;

function Row({ window, stale }: { window: UsageWindow; stale: boolean }) {
  const pct = Math.round(window.pct);
  // the server says when a window deserves attention; the threshold only covers a response
  // that carried no severity of its own
  const hot = window.severity !== 'normal' || pct >= 80;
  return (
    <div className={`flex items-center gap-2 transition-opacity duration-500 ${stale ? 'opacity-45' : ''}`}>
      <span className="w-10 font-mono text-eyebrow tracking-[0.12em] text-off-white/55 uppercase">
        {window.label}
      </span>
      <div className="h-[3px] w-11 overflow-hidden rounded-full bg-black/40">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${hot ? 'bg-warn' : 'bg-ember'}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-eyebrow text-off-white/70 tabular-nums">{pct}%</span>
    </div>
  );
}

export function UsageBars() {
  const usage = useClaudeUsage();
  if (!usage || (!usage.session && !usage.weekly)) return null;
  const stale = Date.now() - usage.at > STALE_MS;
  return (
    <div className="flex flex-col items-end gap-1 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">
      {usage.session && <Row window={usage.session} stale={stale} />}
      {usage.weekly && <Row window={usage.weekly} stale={stale} />}
    </div>
  );
}
