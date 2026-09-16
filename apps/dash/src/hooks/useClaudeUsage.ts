import { useEffect, useState } from 'react';
import { useBridge } from '../bridge';

/** one rate-limit window: a 0-100 percentage, the epoch ms it rolls over, and its own short label. */
export type UsageWindow = { pct: number; resetsAt: number | null; severity: string; label: string };

/** the reading the desktop extension last pushed. */
export type ClaudeUsage = { at: number; session: UsageWindow | null; weekly: UsageWindow | null };

function toWindow(value: unknown): UsageWindow | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  if (typeof o.pct !== 'number' || !Number.isFinite(o.pct)) return null;
  return {
    pct: o.pct,
    resetsAt: typeof o.resetsAt === 'number' ? o.resetsAt : null,
    severity: typeof o.severity === 'string' ? o.severity : 'normal',
    label: typeof o.label === 'string' ? o.label : '',
  };
}

// a window whose reset has passed is showing last period's number until the next poll lands
function live(window: UsageWindow | null, now: number): UsageWindow | null {
  if (!window) return null;
  if (window.resetsAt != null && window.resetsAt <= now) return { ...window, pct: 0, severity: 'normal' };
  return window;
}

/**
 * Claude usage as pushed by the desktop extension, or null when nothing has arrived:
 * no desktop app, extension disabled, or no credentials on that machine.
 */
export function useClaudeUsage(): ClaudeUsage | null {
  const client = useBridge();
  const [usage, setUsage] = useState<ClaudeUsage | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(
    () =>
      client.forward.onJson(message => {
        const m = message as Record<string, unknown> | null;
        if (!m || m.kind !== 'claude-usage') return;
        setUsage({
          at: typeof m.at === 'number' ? m.at : Date.now(),
          session: toWindow(m.session),
          weekly: toWindow(m.weekly),
        });
      }),
    [client],
  );

  // the extension only broadcasts on its own poll, so ask on mount and on every reconnect
  useEffect(() => {
    const ask = () => void client.forward.json({ kind: 'claude-usage-request' }).catch(() => {});
    ask();
    return client.on(event => {
      if (event.type === 'open') ask();
    });
  }, [client]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  if (!usage) return null;
  return { ...usage, session: live(usage.session, now), weekly: live(usage.weekly, now) };
}
