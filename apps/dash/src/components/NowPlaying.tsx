import type { ConnectionState, MediaItem } from '@bridgething/client';

export function NowPlaying({ conn, track }: { conn: ConnectionState; track: MediaItem | null }) {
  if (!track) {
    const open = conn === 'open';
    return (
      <div className="flex flex-col gap-3">
        <div className="font-mono text-eyebrow tracking-[0.25em] text-dim uppercase">
          {open ? 'nothing playing' : 'connecting'}
        </div>
        <div className="text-title text-soft">
          {open ? 'play something on your phone' : 'waiting for the device'}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="line-clamp-2 font-display text-5xl font-medium leading-tight tracking-display">
        {track.title ?? 'unknown'}
      </div>
      <div className="text-2xl text-soft">{track.artist ?? ''}</div>
      {track.album && <div className="font-mono text-hint text-dim">{track.album}</div>}
    </div>
  );
}
