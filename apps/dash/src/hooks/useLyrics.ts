import type { LyricLine } from '@bridgething/client';
import { useEffect, useRef, useState } from 'react';
import { useBridge } from '../bridge';

type LyricsStatus = 'unknown' | 'loading' | 'none' | 'ready';

// fetches lazily per track while enabled; plain-only lyrics count as none
// because a static text wall cannot follow the playhead
export function useLyrics(
  trackKey: string | null,
  enabled: boolean,
): { status: LyricsStatus; lines: LyricLine[] | null } {
  const client = useBridge();
  const cache = useRef(new Map<string, LyricLine[] | 'none'>());
  const [, force] = useState(0);

  useEffect(() => {
    if (!enabled || !trackKey || cache.current.has(trackKey)) return;
    let stale = false;
    (async () => {
      const res = await client.lyrics.get({ timeoutMs: 12_000 });
      let reply: LyricLine[] | 'none' = 'none';
      if (res.ok) {
        // a late reply for the previous track must not land on this key
        const { trackUri, trackPersistentId, lyrics } = res.response;
        const forAnother =
          (trackUri != null || trackPersistentId != null) && trackUri !== trackKey && trackPersistentId !== trackKey;
        if (forAnother) return;
        const synced = lyrics?.synced;
        if (synced && synced.length) reply = [...synced].sort((a, b) => a.startMs - b.startMs);
      }
      if (stale) return;
      cache.current.set(trackKey, reply);
      force(n => n + 1);
    })();
    return () => {
      stale = true;
    };
  }, [client, trackKey, enabled]);

  if (!trackKey) return { status: 'none', lines: null };
  const hit = cache.current.get(trackKey);
  if (!hit) return { status: enabled ? 'loading' : 'unknown', lines: null };
  if (hit === 'none') return { status: 'none', lines: null };
  return { status: 'ready', lines: hit };
}
