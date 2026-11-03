import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBridge } from '../bridge';

/** The day's backdrop as the desktop extension last sent it. `src` is a data url. */
export type Painting = {
  id: string;
  title: string;
  artist: string;
  date: string;
  museum: string;
  /** The artwork's page on the museum's site, or empty. */
  link: string;
  /** The museum's own description, or empty. */
  blurb: string;
  /** Title of the painting `back` would restore, or null when there is none. */
  previous: string | null;
  src: string;
};

/**
 * Where the last skip, back or save stands. `asking` waits for the computer to acknowledge,
 * `working` is a search it has started, and `offline` means nothing answered.
 */
export type PaintingStatus =
  | 'idle'
  | 'asking'
  | 'working'
  | 'offline'
  | 'busy'
  | 'skip-failed'
  | 'no-previous'
  | 'saved'
  | 'already-saved'
  | 'save-failed';

export type PaintingFeed = {
  painting: Painting | null;
  status: PaintingStatus;
  skip(): void;
  back(): void;
  save(): void;
  clearStatus(): void;
};

const STORE_KEY = 'painting';
const ACK_MS = 4_000;
const SEARCH_MS = 60_000;
const REPLIES: readonly string[] = [
  'working',
  'busy',
  'skip-failed',
  'no-previous',
  'saved',
  'already-saved',
  'save-failed',
];

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
    link: typeof o.link === 'string' ? o.link : '',
    blurb: typeof o.blurb === 'string' ? o.blurb : '',
    previous: typeof o.previous === 'string' && o.previous ? o.previous : null,
    src: `data:${s.mime};base64,${s.data}`,
  };
}

/**
 * The museum painting behind the home screen, or null before one has ever arrived, plus the
 * actions that ask the desktop extension to change or save it. The last painting received is
 * kept on the device, so it survives a reboot with the desktop app closed.
 */
export function usePaintingFeed(): PaintingFeed {
  const client = useBridge();
  const [painting, setPainting] = useState<Painting | null>(null);
  const [status, setStatus] = useState<PaintingStatus>('idle');
  const held = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((next: PaintingStatus, after?: { ms: number; then: PaintingStatus }) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = after ? setTimeout(() => setStatus(after.then), after.ms) : null;
    setStatus(next);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    let stale = false;
    const ask = () => void client.forward.json({ kind: 'painting-request', have: held.current }).catch(() => {});

    const offForward = client.forward.onJson(message => {
      const m = message as Record<string, unknown> | null;
      if (m?.kind === 'painting-offer') {
        if (typeof m.id === 'string' && m.id !== held.current) ask();
        return;
      }
      if (m?.kind === 'painting-status') {
        const state = typeof m.state === 'string' && REPLIES.includes(m.state) ? (m.state as PaintingStatus) : null;
        if (state === 'working') settle('working', { ms: SEARCH_MS, then: 'skip-failed' });
        else if (state) settle(state);
        return;
      }
      const next = parse(m);
      if (!next || next.id === held.current) return;
      held.current = next.id;
      setPainting(next);
      settle('idle');
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
  }, [client, settle]);

  const send = useCallback(
    (message: Record<string, unknown>) => {
      settle('asking', { ms: ACK_MS, then: 'offline' });
      client.forward.json(message).catch(() => settle('offline'));
    },
    [client, settle],
  );

  const skip = useCallback(() => send({ kind: 'painting-skip' }), [send]);
  const back = useCallback(() => send({ kind: 'painting-previous' }), [send]);
  const save = useCallback(() => {
    if (held.current) send({ kind: 'painting-save', id: held.current });
  }, [send]);
  const clearStatus = useCallback(() => settle('idle'), [settle]);

  return useMemo(
    () => ({ painting, status, skip, back, save, clearStatus }),
    [painting, status, skip, back, save, clearStatus],
  );
}
