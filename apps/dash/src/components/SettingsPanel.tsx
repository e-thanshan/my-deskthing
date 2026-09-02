import { useCallback, useEffect, useRef, useState } from 'react';
import { useDial } from '../hooks/useDial';
import { clamp, PREF_RANGE, usePrefs, useSettingsPanel, type Prefs } from '../prefs';

type Row = { key: keyof Prefs; label: string; hint: string; format: (v: number) => string };

const ROWS: Row[] = [
  {
    key: 'nightShift',
    label: 'Night shift',
    hint: 'gentler on the eyes after dark',
    format: v => (v === 0 ? 'off' : `${v * 10}%`),
  },
  {
    key: 'lyricOffset',
    label: 'Lyric offset',
    hint: 'plus shows lines sooner, minus later',
    format: v => (v === 0 ? 'none' : `${v > 0 ? '+' : '-'}${(Math.abs(v) / 10).toFixed(1)}s`),
  },
];

export function SettingsPanel() {
  const { prefs, setPref } = usePrefs();
  const { setOpen } = useSettingsPanel();
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  // the value to put back when back is pressed mid-edit, since editing writes live
  const revert = useRef(0);

  const onDetent = useCallback(
    (dir: -1 | 1) => {
      if (!editing) {
        setIndex(i => clamp(i + dir, 0, ROWS.length - 1));
        return;
      }
      const { key } = ROWS[index];
      const { min, max } = PREF_RANGE[key];
      setPref(key, clamp(prefs[key] + dir, min, max));
    },
    [editing, index, prefs, setPref],
  );
  useDial(onDetent);

  const select = useCallback(() => {
    if (editing) setEditing(false);
    else {
      revert.current = prefs[ROWS[index].key];
      setEditing(true);
    }
  }, [editing, index, prefs]);

  const cancel = useCallback(() => {
    setPref(ROWS[index].key, revert.current);
    setEditing(false);
  }, [index, setPref]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // the rotary's own press is Enter; space is the desk-browser stand-in
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (editing) cancel();
        else setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancel, editing, select, setOpen]);

  const tap = (i: number) => {
    if (i === index) {
      select();
      return;
    }
    if (editing) cancel();
    setIndex(i);
  };

  const hint = editing
    ? 'turn to adjust  ·  press to set  ·  back to cancel'
    : 'turn to move  ·  press to select  ·  back to close';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45">
      <div className="w-[520px] overflow-hidden rounded-2xl border border-rule-strong bg-screen/80 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="flex items-baseline justify-between border-b border-rule px-5 py-3">
          <span className="font-mono text-eyebrow tracking-[0.25em] text-off-white/70 uppercase">settings</span>
          <span className="font-mono text-eyebrow text-off-white/35">
            {index + 1}/{ROWS.length}
          </span>
        </div>

        <div className="py-1">
          {ROWS.map((row, i) => {
            const active = i === index;
            const hot = active && editing;
            const { min, max } = PREF_RANGE[row.key];
            const value = prefs[row.key];
            const pick = (v: number) => {
              setIndex(i);
              setPref(row.key, v);
            };
            return (
              <div
                key={row.key}
                onClick={() => tap(i)}
                className={`flex w-full items-center gap-4 px-5 py-3 transition-colors duration-150 ${
                  hot ? 'bg-ember/12' : active ? 'bg-off-white/8' : ''
                }`}>
                <span
                  className={`h-9 w-[3px] shrink-0 rounded-full transition-colors duration-150 ${
                    hot ? 'bg-ember' : active ? 'bg-ember/55' : 'bg-transparent'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-row-lg tracking-tight-1 text-off-white/95">
                    {row.label}
                  </span>
                  <span className="block truncate text-hint text-off-white/40">{row.hint}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {min < 0 ? (
                    <Slider value={value} max={max} hot={hot} onPick={pick} />
                  ) : (
                    <Meter value={value} max={max} hot={hot} onPick={pick} />
                  )}
                  <span className="w-12 text-right font-mono text-hint text-off-white/70">{row.format(value)}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-rule px-5 py-2.5">
          <span className="font-mono text-hint text-off-white/40">{hint}</span>
        </div>
      </div>
    </div>
  );
}

// both readouts are touchable as well as dialable, so the panel still works if a
// device ever hands the rotary's press to something other than Enter
function Meter({
  value,
  max,
  hot,
  onPick,
}: {
  value: number;
  max: number;
  hot: boolean;
  onPick: (value: number) => void;
}) {
  return (
    <span className="-my-2 flex">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          onClick={e => {
            e.stopPropagation();
            onPick(i + 1 === value ? i : i + 1);
          }}
          className="px-[2px] py-2">
          <span
            className={`block h-3.5 w-[9px] rounded-[2px] transition-colors duration-150 ${
              i < value ? (hot ? 'bg-ember' : 'bg-ember/55') : 'bg-off-white/15'
            }`}
          />
        </span>
      ))}
    </span>
  );
}

// assumes a range centred on zero, which is what a trim is
function Slider({
  value,
  max,
  hot,
  onPick,
}: {
  value: number;
  max: number;
  hot: boolean;
  onPick: (value: number) => void;
}) {
  const width = 126;
  const half = width / 2;
  const span = (Math.abs(value) / max) * half;
  return (
    <span
      onClick={e => {
        e.stopPropagation();
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onPick(Math.round(((e.clientX - box.left - half) / half) * max));
      }}
      className="relative -my-2 block py-2"
      style={{ width }}>
      <span className="block h-[3px] rounded-full bg-off-white/15" />
      <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-off-white/30" />
      <span
        className={`absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-colors duration-150 ${
          hot ? 'bg-ember' : 'bg-ember/55'
        }`}
        style={{ left: value < 0 ? half - span : half, width: span }}
      />
    </span>
  );
}
