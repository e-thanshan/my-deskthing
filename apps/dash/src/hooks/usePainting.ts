import { useEffect, useRef, useState } from 'react';
import { useBridge } from '../bridge';

/** The day's backdrop as the desktop extension last sent it. `src` is a data url. */
export type Painting = {
  id: string;
  title: string;
  artist: string;
  date: string;
  museum: string;
  src: string;
};

const STORE_KEY = 'painting';

function parse(value: unknown): Painting | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  if (o.kind !== 'painting') return null;
  const fields = ['id', 'title', 'artist', 'date', 'museum', 'mime', 'data'] as const;
  if (!fields.every(k => typeof o[k] === 'string') || !o.data || !o.id) return null;
  const s = o as Record<(typeof fields)[number], string>;
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    date: s.date,
    museum: s.museum,
    src: `data:${s.mime};base64,${s.data}`,
  };
}

/**
 * The museum painting behind the home screen, or null before one has ever arrived. The last one
 * received is kept on the device, so it survives a reboot with the desktop app closed.
 */
export function usePainting(): Painting | null {
  const client = useBridge();
  const [painting, setPainting] = useState<Painting | null>(null);
  const held = useRef<string | null>(null);

  useEffect(() => {
    let stale = false;
    const ask = () => void client.forward.json({ kind: 'painting-request', have: held.current }).catch(() => {});

    const offForward = client.forward.onJson(message => {
      const m = message as Record<string, unknown> | null;
      if (m?.kind === 'painting-offer') {
        if (typeof m.id === 'string' && m.id !== held.current) ask();
        return;
      }
      const next = parse(m);
      if (!next || next.id === held.current) return;
      held.current = next.id;
      setPainting(next);
      void client.store.put({ key: STORE_KEY, value: JSON.stringify(m) }).catch(() => {});
    });

    client.store
      .get({ key: STORE_KEY })
      .then(r => {
        if (stale || held.current || !r.ok || r.response.value == null) return;
        let stored: Painting | null = null;
        try {
          stored = parse(JSON.parse(r.response.value));
        } catch {
          return;
        }
        if (!stored) return;
        held.current = stored.id;
        setPainting(stored);
      })
      .catch(() => {})
      .finally(() => {
        if (!stale) ask();
      });

    const offOpen = client.on(event => {
      if (event.type === 'open') ask();
    });

    return () => {
      stale = true;
      offForward();
      offOpen();
    };
  }, [client]);

  return painting;
}
