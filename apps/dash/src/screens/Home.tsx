import { useCallback, useEffect, useState } from 'react';
import { useBridge, useConnection } from '../bridge';
import { Backdrop } from '../components/Backdrop';
import { Clock } from '../components/Clock';
import { Lyrics } from '../components/Lyrics';
import { NowPlaying } from '../components/NowPlaying';
import { ProgressBar } from '../components/ProgressBar';
import { useLyrics } from '../hooks/useLyrics';
import { usePlayer } from '../hooks/usePlayer';
import { useSyncOffset } from '../hooks/useSyncOffset';

export default function Home() {
  const client = useBridge();
  const conn = useConnection();
  const { track, positionMs, durationMs, playing } = usePlayer();
  const trackKey = track?.uri ?? track?.persistentId ?? null;

  const [lyricsOn, setLyricsOn] = useState(false);
  const { status, lines } = useLyrics(trackKey, lyricsOn);
  const { offsetMs, nudge } = useSyncOffset();
  const [flash, setFlash] = useState<{ n: number; text: string } | null>(null);
  const say = useCallback((text: string) => setFlash(f => ({ n: (f?.n ?? 0) + 1, text })), []);

  // the phone only re-reports its playhead on a real transport change, so this
  // is the one thing that can pull a wrong anchor back onto the music
  const reanchor = useCallback(async () => {
    if (!playing) return;
    say('Resyncing');
    await client.player.pause();
    await new Promise(r => setTimeout(r, 350));
    await client.player.resume();
  }, [client, playing, say]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') void reanchor();
      else if (e.key === '2' || e.key === '3') {
        const next = nudge(e.key === '2' ? -1 : 1);
        say(`Sync ${next > 0 ? '+' : ''}${(next / 1000).toFixed(2)}s`);
      } else if (e.key === '4') setLyricsOn(on => !on);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudge, reanchor, say]);

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

  const shownMs = Math.max(0, durationMs == null ? positionMs + offsetMs : Math.min(positionMs + offsetMs, durationMs));
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
        {lyricsOn && status === 'ready' && lines && <Lyrics lines={lines} positionMs={shownMs} />}
        {flash && (
          <div
            key={flash.n}
            onAnimationEnd={() => setFlash(null)}
            className="mb-3 truncate font-book text-lg text-off-white/75 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] animate-[fade-out-hold_1.6s_ease-out_forwards]">
            {flash.text}
          </div>
        )}
        <ProgressBar positionMs={shownMs} durationMs={durationMs} playing={playing} />
      </div>
    </div>
  );
}
