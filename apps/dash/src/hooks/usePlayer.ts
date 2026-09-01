import type { MediaItem, PlayerState } from '@bridgething/client';
import { useEffect, useState } from 'react';
import { useBridge } from '../bridge';

type NowPlaying = {
  track: MediaItem | null;
  playing: boolean;
  positionMs: number;
  durationMs: number | null;
};

export function usePlayer(): NowPlaying {
  const client = useBridge();
  const [snap, setSnap] = useState<{ state: PlayerState; takenAt: number } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    // positionAgeMs dates the playhead, so rewind takenAt by it
    const apply = (state: PlayerState) =>
      setSnap({ state, takenAt: Date.now() - (state.playback.positionAgeMs ?? 0) });
    const off = client.player.onSnapshot(r => apply(r.state));
    client.player.stateGet().then(r => {
      if (r.ok) apply(r.response.state);
    });
    return off;
  }, [client]);

  const playing = snap?.state.playback.state === 'playing';

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [playing]);

  if (!snap) return { track: null, playing: false, positionMs: 0, durationMs: null };

  const { state, takenAt } = snap;
  const durationMs = state.track?.durationMs ?? null;
  const advanced = state.playback.positionMs + (playing ? Date.now() - takenAt : 0);
  return {
    track: state.track,
    playing,
    positionMs: durationMs == null ? advanced : Math.min(advanced, durationMs),
    durationMs,
  };
}
