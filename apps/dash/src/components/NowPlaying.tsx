import type { ConnectionState, MediaItem } from '@bridgething/client';

export function NowPlaying({ conn, track }: { conn: ConnectionState; track: MediaItem | null }) {
  if (!track) {
    const open = conn === 'open';
    return (
      <div className="flex min-w-0 flex-col gap-1.5 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
        <div className="truncate font-mono text-eyebrow tracking-[0.25em] text-off-white/70 uppercase">
          {open ? 'nothing playing' : 'connecting'}
        </div>
        <div className="truncate text-title text-off-white/85">{!open && 'waiting for the device'}</div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-1 font-clock italic [font-variation-settings:'SOFT'_100,'WONK'_1] [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
      <div className="truncate pb-[0.12em] text-[42px] leading-[1.15] font-bold tracking-tight-1">
        {track.title ?? 'unknown'}
      </div>
      <div className="truncate pb-[0.12em] text-2xl text-off-white/85">
        {track.artist ?? ''}
        {track.album && `, ${track.album}`}
      </div>
    </div>
  );
}
