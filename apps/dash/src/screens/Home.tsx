import { useCallback, useEffect, useState } from 'react';
import { useConnection } from '../bridge';
import { Backdrop } from '../components/Backdrop';
import { Clock } from '../components/Clock';
import { Lyrics } from '../components/Lyrics';
import { NowPlaying } from '../components/NowPlaying';
import { ProgressBar } from '../components/ProgressBar';
import { useLyrics } from '../hooks/useLyrics';
import { usePlayer } from '../hooks/usePlayer';
import { LYRIC_OFFSET_STEP_MS, usePrefs, useSettingsPanel } from '../prefs';

export default function Home() {
  const conn = useConnection();
  const { track, positionMs, durationMs, playing } = usePlayer();
  const trackKey = track?.uri ?? track?.persistentId ?? null;

  const [lyricsOn, setLyricsOn] = useState(false);
  const { status, lines } = useLyrics(trackKey, lyricsOn);
  const { prefs } = usePrefs();
  const [flash, setFlash] = useState<{ n: number; text: string } | null>(null);
  const say = useCallback((text: string) => setFlash(f => ({ n: (f?.n ?? 0) + 1, text })), []);
  const { open: panelOpen } = useSettingsPanel();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panelOpen) return;
      if (e.key === '1') setLyricsOn(on => !on);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen]);

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

  // the trim is for the gap between the phone's playhead and what the speakers are
  // actually playing, so it moves the lyrics only; the progress bar shows the truth
  const lyricMs = Math.max(0, positionMs + prefs.lyricOffset * LYRIC_OFFSET_STEP_MS);
  const lyricsShowing = (lyricsOn && status === 'ready') || flash != null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-off-white">
      <Backdrop />
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
      <div
        className={`absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 via-black/35 to-transparent transition-opacity duration-500 ${lyricsShowing ? 'opacity-100' : 'opacity-0'}`}
      />
      <div className="relative flex h-full w-full flex-col p-8">
        <div className="flex items-start">
          <div className="min-w-0 flex-1">
            <NowPlaying conn={conn} track={track} />
          </div>
          <div className="shrink-0 pl-6">
            <Clock />
          </div>
        </div>
        <div className="flex-1" />
        {lyricsOn && status === 'ready' && lines && <Lyrics lines={lines} positionMs={lyricMs} />}
        {flash && (
          <div
            key={flash.n}
            onAnimationEnd={() => setFlash(null)}
            className="mb-3 truncate font-book text-lg text-off-white/75 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] animate-[fade-out-hold_1.6s_ease-out_forwards]">
            {flash.text}
          </div>
        )}
        <ProgressBar positionMs={positionMs} durationMs={durationMs} playing={playing} />
      </div>
    </div>
  );
}
