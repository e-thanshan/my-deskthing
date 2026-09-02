import type { MediaItem, PlayerState } from '@bridgething/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBridge } from '../bridge';

type NowPlaying = {
  track: MediaItem | null;
  playing: boolean;
  positionMs: number;
  durationMs: number | null;
};

// the daemon only pushes on material changes, so the playhead is extrapolated
// between them and re-anchored on this interval. stateGet answers from the
// daemon's cache in a few ms and never reaches the phone.
const RESYNC_MS = 5_000;

export function usePlayer(): NowPlaying {
  const client = useBridge();
  const [snap, setSnap] = useState<{ state: PlayerState; takenAt: number } | null>(null);
  const [, setTick] = useState(0);
  const seq = useRef(0);

  // performance.now is monotonic. the device has no rtc and takes its wall
  // clock from the phone, so Date.now can step mid-track and jerk the playhead.
  const apply = useCallback((state: PlayerState) => {
    seq.current++;
    setSnap({ state, takenAt: performance.now() - (state.playback.positionAgeMs ?? 0) });
  }, []);

  // a poll issued before a track change must not land on top of it
  const poll = useCallback(async () => {
    const at = seq.current;
    const r = await client.player.stateGet();
    if (r.ok && seq.current === at) apply(r.response.state);
  }, [client, apply]);

  useEffect(() => {
    const off = client.player.onSnapshot(r => apply(r.state));
    void poll();
    return off;
  }, [client, apply, poll]);

  const playing = snap?.state.playback.state === 'playing';

  useEffect(() => {
    if (!playing) return;
    // a lyric line can only flip on a tick, so this is the floor on how late one lands
    const tick = setInterval(() => setTick(t => t + 1), 100);
    const resync = setInterval(() => void poll(), RESYNC_MS);
    return () => {
      clearInterval(tick);
      clearInterval(resync);
    };
  }, [poll, playing]);

  if (!snap) return { track: null, playing: false, positionMs: 0, durationMs: null };

  const { state, takenAt } = snap;
  const durationMs = state.track?.durationMs ?? null;
  const advanced = state.playback.positionMs + (playing ? performance.now() - takenAt : 0);
  return {
    track: state.track,
    playing,
    positionMs: durationMs == null ? advanced : Math.min(advanced, durationMs),
    durationMs,
  };
}
