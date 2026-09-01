import type { ConnectionState, MediaItem } from '@bridgething/client';

export function NowPlaying({ conn, track }: { conn: ConnectionState; track: MediaItem | null }) {
  if (!track) {
    const open = conn === 'open';
    return (
      <div className="flex min-w-0 flex-col gap-1.5 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
        <div className="truncate font-mono text-eyebrow tracking-[0.25em] text-off-white/70 uppercase">
          {open ? 'nothing playing' : 'connecting'}
        </div>
        <div className="truncate text-title text-off-white/85">
          {open ? 'play something on your phone' : 'waiting for the device'}
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-0.5 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
      <div className="truncate font-display text-3xl font-semibold tracking-display">{track.title ?? 'unknown'}</div>
      <div className="truncate text-xl text-off-white/85">{track.artist ?? ''}</div>
      {track.album && <div className="truncate font-mono text-hint text-off-white/60">{track.album}</div>}
    </div>
  );
}
