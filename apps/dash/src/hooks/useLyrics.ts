import type { LyricLine } from '@bridgething/client';
import { useEffect, useRef, useState } from 'react';
import { useBridge } from '../bridge';

type LyricsStatus = 'unknown' | 'loading' | 'none' | 'plain' | 'error' | 'ready';

// lyrics come from lrclib via the phone. only definitive verdicts are cached;
// a failed lookup is not, so toggling again or changing track retries it.
// plain-only lyrics report 'plain' because static text cannot follow the playhead.
export function useLyrics(
  trackKey: string | null,
  enabled: boolean,
): { status: LyricsStatus; lines: LyricLine[] | null } {
  const client = useBridge();
  const cache = useRef(new Map<string, LyricLine[] | 'none' | 'plain'>());
  const errorKey = useRef<string | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!enabled || !trackKey || cache.current.has(trackKey)) return;
    let stale = false;
    errorKey.current = null;
    (async () => {
      const res = await client.lyrics.get({ timeoutMs: 12_000 });
      if (stale) return;
      if (!res.ok) {
        errorKey.current = trackKey;
        force(n => n + 1);
        return;
      }
      // a late reply for the previous track must not land on this key
      const { trackUri, trackPersistentId, lyrics } = res.response;
      const forAnother =
        (trackUri != null || trackPersistentId != null) && trackUri !== trackKey && trackPersistentId !== trackKey;
      if (forAnother) return;
      const synced = lyrics?.synced;
      let verdict: LyricLine[] | 'none' | 'plain';
      if (synced && synced.length) verdict = [...synced].sort((a, b) => a.startMs - b.startMs);
      else if (lyrics?.plain) verdict = 'plain';
      else verdict = 'none';
      cache.current.set(trackKey, verdict);
      force(n => n + 1);
    })();
    return () => {
      stale = true;
    };
  }, [client, trackKey, enabled]);

  if (!trackKey) return { status: 'none', lines: null };
  const hit = cache.current.get(trackKey);
  if (!hit) {
    if (errorKey.current === trackKey) return { status: 'error', lines: null };
    return { status: enabled ? 'loading' : 'unknown', lines: null };
  }
  if (hit === 'none' || hit === 'plain') return { status: hit, lines: null };
  return { status: 'ready', lines: hit };
}
