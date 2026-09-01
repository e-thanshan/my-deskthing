import { useEffect, useState } from 'react';
import { useConnection } from '../bridge';
import { Backdrop } from '../components/Backdrop';
import { Clock } from '../components/Clock';
import { Lyrics } from '../components/Lyrics';
import { NowPlaying } from '../components/NowPlaying';
import { ProgressBar } from '../components/ProgressBar';
import { useLyrics } from '../hooks/useLyrics';
import { usePlayer } from '../hooks/usePlayer';

export default function Home() {
  const conn = useConnection();
  const { track, positionMs, durationMs, playing } = usePlayer();
  const trackKey = track?.uri ?? track?.persistentId ?? null;

  const [lyricsOn, setLyricsOn] = useState(false);
  const { status, lines } = useLyrics(trackKey, lyricsOn);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    // preset button 4 toggles the live lyric
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '4') setLyricsOn(on => !on);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (lyricsOn && status === 'none') setFlash(n => n + 1);
  }, [lyricsOn, status, trackKey]);

  const lyricsShowing = (lyricsOn && status === 'ready') || flash > 0;

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
        {lyricsOn && status === 'ready' && lines && <Lyrics lines={lines} positionMs={positionMs} />}
        {flash > 0 && (
          <div
            key={flash}
            onAnimationEnd={() => setFlash(0)}
            className="mb-3 truncate font-book text-lg text-off-white/75 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] animate-[fade-out-hold_1.6s_ease-out_forwards]">
            No lyrics available
          </div>
        )}
        <ProgressBar positionMs={positionMs} durationMs={durationMs} playing={playing} />
      </div>
    </div>
  );
}
