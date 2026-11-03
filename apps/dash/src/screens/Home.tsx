import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useConnection } from '../bridge';
import { Backdrop } from '../components/Backdrop';
import { Clock } from '../components/Clock';
import { Lyrics } from '../components/Lyrics';
import { NowPlaying } from '../components/NowPlaying';
import { PaintingCredit } from '../components/PaintingCredit';
import { ProgressBar } from '../components/ProgressBar';
import { StatsRibbon } from '../components/StatsRibbon';
import { UsageBars } from '../components/UsageBars';
import { useInputCounts } from '../hooks/useInputCounts';
import { useLyrics } from '../hooks/useLyrics';
import { usePlayer } from '../hooks/usePlayer';
import { useStats } from '../hooks/useStats';
import { usePainting } from '../painting';
import { usePrefs, useSettingsPanel } from '../prefs';

export default function Home() {
  const conn = useConnection();
  const { track, positionMs, durationMs, playing } = usePlayer();
  const trackKey = track?.uri ?? track?.persistentId ?? null;

  const [lyricsOn, setLyricsOn] = useState(false);
  const { status, lines } = useLyrics(trackKey, lyricsOn);
  const [flash, setFlash] = useState<{ n: number; text: string } | null>(null);
  const say = useCallback((text: string) => setFlash(f => ({ n: (f?.n ?? 0) + 1, text })), []);
  const { open: panelOpen } = useSettingsPanel();
  const { painting, peeking, menuOpen } = usePainting();
  const { prefs } = usePrefs();

  const [ribbonOn, setRibbonOn] = useState(false);
  const { listenedMs, drinks, drinkPulse, logDrink } = useStats(playing);
  const input = useInputCounts();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panelOpen || menuOpen) return;
      if (e.key === '1') setLyricsOn(on => !on);
      if (e.key === '2') setRibbonOn(on => !on);
      if (e.key === 'Escape') {
        e.preventDefault();
        logDrink();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, menuOpen, logDrink]);

  useEffect(() => {
    if (!lyricsOn) return;
    const text =
      status === 'none'
        ? 'No lyrics available'
        : status === 'plain'
          ? 'Lyrics not synced for this song'
          : status === 'error'
            ? "Couldn't fetch lyrics"
            : null;
    if (text) say(text);
  }, [lyricsOn, status, trackKey, say]);

  const lyricsShowing = lyricsOn && status === 'ready' && lines != null;
  const creditShowing = painting != null && (!lyricsShowing || peeking);
  const scrimShowing = ((lyricsOn && status === 'ready') || flash != null || ribbonOn) && !peeking;
  const fade = `transition-opacity duration-500 ${peeking ? 'opacity-0' : 'opacity-100'}`;

  const column = useRef<HTMLDivElement>(null);
  const creditRow = useRef<HTMLDivElement>(null);
  const [creditDrop, setCreditDrop] = useState(0);

  // with the bar and the ribbon faded the credit settles into the bottom corner. how far that is
  // depends on whether the ribbon is open, so it is measured from the layout, which a transform
  // leaves alone, rather than assumed.
  useLayoutEffect(() => {
    const box = column.current;
    const row = creditRow.current;
    if (!peeking || !box || !row) return;
    const contentBottom = box.clientHeight - parseFloat(getComputedStyle(box).paddingBottom);
    setCreditDrop(Math.max(0, contentBottom - (row.offsetTop + row.offsetHeight)));
  }, [peeking, ribbonOn, creditShowing]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-off-white">
      <Backdrop image={painting} fit={prefs.paintingFit === 1} />
      <div className={`absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/55 to-transparent ${fade}`} />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
      <div
        className={`absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 via-black/35 to-transparent transition-opacity duration-500 ${scrimShowing ? 'opacity-100' : 'opacity-0'}`}
      />
      <div ref={column} className="relative flex h-full w-full flex-col p-8">
        <div className={`flex items-start ${fade}`}>
          <div className="min-w-0 flex-1">
            <NowPlaying conn={conn} track={track} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2.5 pl-6">
            <Clock />
            <UsageBars />
          </div>
        </div>
        <div className="flex-1" />
        {lyricsShowing && (
          <div className={fade}>
            <Lyrics lines={lines} positionMs={positionMs} />
          </div>
        )}
        {(flash || creditShowing) && (
          <div ref={creditRow} className="mb-3 flex items-end gap-6">
            {flash && (
              <div className={`min-w-0 flex-1 ${fade}`}>
                <div
                  key={flash.n}
                  onAnimationEnd={() => setFlash(null)}
                  className="truncate font-book text-lg text-off-white/75 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] animate-[fade-out-hold_1.6s_ease-out_forwards]">
                  {flash.text}
                </div>
              </div>
            )}
            {creditShowing && <PaintingCredit painting={painting} drop={peeking ? creditDrop : 0} />}
          </div>
        )}
        <div className={fade}>
          <ProgressBar positionMs={positionMs} durationMs={durationMs} playing={playing} />
        </div>
        <div className={fade}>
          <StatsRibbon
            open={ribbonOn}
            listenedMs={listenedMs}
            drinks={drinks}
            drinkPulse={drinkPulse}
            input={input}
          />
        </div>
      </div>
    </div>
  );
}
