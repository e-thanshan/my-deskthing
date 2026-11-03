import { useCallback, useEffect, useState } from 'react';
import type { PaintingStatus } from '../hooks/usePaintingFeed';
import { useDial } from '../hooks/useDial';
import { usePainting } from '../painting';
import { clamp, usePrefs } from '../prefs';

type Action = 'skip' | 'back' | 'save' | 'fit';

type Row = { action: Action; label: string; hint: string; enabled: boolean; value?: string };

const SAVED_FILE = '~/dash-paintings.md';

function statusText(status: PaintingStatus, last: Action | null): string | null {
  switch (status) {
    case 'idle':
      return null;
    case 'asking':
    case 'working':
      return last === 'back'
        ? 'bringing back the last one…'
        : last === 'save'
          ? 'saving…'
          : 'finding another painting…';
    case 'offline':
      return "the computer isn't answering, and it does the fetching";
    case 'busy':
      return 'still looking for one, a moment';
    case 'skip-failed':
      return "couldn't find another one, try again in a bit";
    case 'no-previous':
      return 'nothing earlier to go back to';
    case 'saved':
      return `saved to ${SAVED_FILE}`;
    case 'already-saved':
      return `already in ${SAVED_FILE}`;
    case 'save-failed':
      return `couldn't write ${SAVED_FILE}`;
  }
}

export function PaintingMenu() {
  const { painting, status, skip, back, save, setMenuOpen } = usePainting();
  const { prefs, setPref } = usePrefs();
  const [index, setIndex] = useState(0);
  const [last, setLast] = useState<Action | null>(null);
  const fit = prefs.paintingFit === 1;
  const inFlight = status === 'asking' || status === 'working';

  const rows: Row[] = [
    { action: 'skip', label: 'Another painting', hint: 'find a different one for today', enabled: true },
    {
      action: 'back',
      label: 'Previous painting',
      hint: painting?.previous ? `back to ${painting.previous}` : 'nothing earlier yet',
      enabled: painting?.previous != null,
    },
    { action: 'save', label: 'Save to list', hint: `adds it to ${SAVED_FILE}`, enabled: painting != null },
    {
      action: 'fit',
      label: 'Whole painting',
      hint: fit ? 'showing all of it' : 'filling the screen',
      enabled: true,
      value: fit ? 'on' : 'off',
    },
  ];

  const run = useCallback(
    (row: Row) => {
      if (!row.enabled) return;
      if (row.action === 'fit') {
        setPref('paintingFit', fit ? 0 : 1);
        return;
      }
      if (inFlight) return;
      setLast(row.action);
      if (row.action === 'skip') skip();
      else if (row.action === 'back') back();
      else save();
    },
    [back, fit, inFlight, save, setPref, skip],
  );

  useDial(
    useCallback((dir: -1 | 1) => setIndex(i => clamp(i + dir, 0, rows.length - 1)), [rows.length]),
  );

  const selected = rows[index];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // the rotary's own press is Enter; space is the desk-browser stand-in
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        run(selected);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, selected, setMenuOpen]);

  const byline = painting ? [painting.artist, painting.date].filter(Boolean).join(', ') : '';
  const footer = statusText(status, last) ?? 'turn to move  ·  press to select  ·  3 to close';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35">
      <div className="flex w-[720px] flex-col overflow-hidden rounded-2xl border border-rule-strong bg-screen/80 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="flex items-baseline justify-between gap-6 border-b border-rule px-5 py-3">
          <span className="font-mono text-eyebrow tracking-[0.25em] text-off-white/70 uppercase">painting</span>
          <span className="truncate font-mono text-eyebrow text-off-white/35">{painting?.museum}</span>
        </div>

        <div className="flex">
          <div className="min-w-0 flex-1 border-r border-rule px-5 py-4">
            {painting ? (
              <>
                <div className="line-clamp-2 pb-[0.12em] font-clock text-title leading-snug italic text-off-white/95">
                  {painting.title}
                </div>
                {byline && <div className="mt-1 truncate text-body text-off-white/70">{byline}</div>}
                {painting.blurb && (
                  <p className="mt-3 line-clamp-7 text-hint leading-relaxed text-off-white/55">{painting.blurb}</p>
                )}
              </>
            ) : (
              <p className="text-body leading-relaxed text-off-white/55">
                No painting yet. The computer fetches one once the desktop app is running.
              </p>
            )}
          </div>

          <div className="w-[300px] shrink-0 py-1">
            {rows.map((row, i) => {
              const active = i === index;
              return (
                <div
                  key={row.action}
                  onClick={() => {
                    setIndex(i);
                    run(row);
                  }}
                  className={`flex items-center gap-4 px-5 py-3 transition-colors duration-150 ${active ? 'bg-off-white/8' : ''}`}>
                  <span
                    className={`h-9 w-[3px] shrink-0 rounded-full transition-colors duration-150 ${
                      active ? 'bg-ember/55' : 'bg-transparent'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-display text-row-lg tracking-tight-1 ${
                        row.enabled ? 'text-off-white/95' : 'text-off-white/35'
                      }`}>
                      {row.label}
                    </span>
                    <span className="block truncate text-hint text-off-white/40">{row.hint}</span>
                  </span>
                  {row.value && (
                    <span className="w-8 shrink-0 text-right font-mono text-hint text-off-white/70">{row.value}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-rule px-5 py-2.5">
          <span className="block truncate font-mono text-hint text-off-white/40">{footer}</span>
        </div>
      </div>
    </div>
  );
}
