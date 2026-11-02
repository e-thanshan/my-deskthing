import type { ExtensionContext } from '@bridgething/extension';
import { describeError, keychainClient } from './http.ts';

/** One day's backdrop as the device renders it: the credit, and the image itself as base64. */
export type Painting = {
  kind: 'painting';
  day: string;
  id: string;
  title: string;
  artist: string;
  date: string;
  museum: string;
  mime: string;
  data: string;
};

export type PaintingFeed = {
  current(): Painting | null;
  stop(): void;
};

type Deps = Pick<ExtensionContext, 'kv' | 'log'>;

type Candidate = {
  id: string;
  title: string;
  artist: string;
  date: string;
  museum: string;
  image: string;
  width?: number;
  height?: number;
};

const CHECK_MS = 15 * 60_000;
const CURRENT_KEY = 'painting-current';
const HISTORY_KEY = 'painting-history';
const HISTORY = 365;
const TRIES_PER_SOURCE = 8;

const SCREEN_W = 800;
const SCREEN_H = 480;
const MIN_ASPECT = 1.2;
const MAX_ASPECT = 2.4;
const MAX_UPSCALE = 1.25;
const MAX_BYTES = 900_000;

const UA = 'dash-deskthing (https://github.com/e-thanshan/my-deskthing)';

async function get(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    client: await keychainClient(),
    headers: { 'user-agent': UA, ...(init.headers as Record<string, string> | undefined) },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  }
  return res;
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  return (await get(url, init)).json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function num(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

async function* artInstitute(): AsyncGenerator<Candidate> {
  const url = 'https://api.artic.edu/api/v1/artworks/search';
  const headers = { 'content-type': 'application/json', 'aic-user-agent': UA };
  const filter = [
    { term: { is_public_domain: true } },
    { term: { artwork_type_id: 1 } },
    { exists: { field: 'image_id' } },
  ];
  // the subject tag is the precise net, full text the fallback when the tag matches nothing
  const shapes = [
    { query: { bool: { filter, must: [{ match: { subject_titles: 'landscapes' } }] } } },
    { q: 'landscape', query: { bool: { filter } } },
  ];
  const ask = (shape: object, page: number, limit: number) =>
    getJson(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...shape,
        fields: ['id', 'title', 'artist_title', 'artist_display', 'date_display', 'image_id', 'thumbnail'],
        limit,
        page,
      }),
    });

  const LIMIT = 50;
  let shape: object | undefined;
  let total: number | undefined;
  for (const candidate of shapes) {
    const head = await ask(candidate, 1, 1);
    total = isRecord(head) && isRecord(head.pagination) ? num(head.pagination.total) : undefined;
    if (total) {
      shape = candidate;
      break;
    }
  }
  if (!shape || !total) return;
  // the search api refuses to page past ten thousand hits
  const pages = Math.max(1, Math.min(Math.ceil(total / LIMIT), Math.floor(10_000 / LIMIT)));
  const body = await ask(shape, 1 + randInt(pages), LIMIT);
  if (!isRecord(body) || !Array.isArray(body.data)) return;
  const iiif = (isRecord(body.config) && str(body.config.iiif_url)) || 'https://www.artic.edu/iiif/2';

  for (const row of shuffle(body.data.filter(isRecord))) {
    const imageId = str(row.image_id);
    if (!imageId) continue;
    const thumb = isRecord(row.thumbnail) ? row.thumbnail : {};
    yield {
      id: `aic:${row.id}`,
      title: str(row.title),
      artist: str(row.artist_title) || str(row.artist_display).split('\n')[0],
      date: str(row.date_display),
      museum: 'Art Institute of Chicago',
      // 843 is the width the iiif server keeps cached, and the one it asks clients to use
      image: `${iiif}/${imageId}/full/843,/0/default.jpg`,
      width: num(thumb.width),
      height: num(thumb.height),
    };
  }
}

async function* cleveland(): AsyncGenerator<Candidate> {
  const base =
    'https://openaccess-api.clevelandart.org/api/artworks/?q=landscape&type=Painting&has_image=1&cc0=1';
  const head = await getJson(`${base}&limit=1`);
  const total = isRecord(head) && isRecord(head.info) ? num(head.info.total) : undefined;
  if (!total) return;
  const LIMIT = 25;
  const body = await getJson(`${base}&limit=${LIMIT}&skip=${randInt(Math.max(1, total - LIMIT))}`);
  if (!isRecord(body) || !Array.isArray(body.data)) return;

  for (const row of shuffle(body.data.filter(isRecord))) {
    const web = isRecord(row.images) && isRecord(row.images.web) ? row.images.web : null;
    const image = web ? str(web.url) : '';
    if (!image) continue;
    const creator = Array.isArray(row.creators) ? row.creators.find(isRecord) : undefined;
    yield {
      id: `cma:${row.id}`,
      title: str(row.title),
      // descriptions read "Thomas Cole (American, 1801-1848)"
      artist: str(creator?.description).replace(/\s*\(.*\)\s*$/, ''),
      date: str(row.creation_date),
      museum: 'Cleveland Museum of Art',
      image,
      width: num(web?.width),
      height: num(web?.height),
    };
  }
}

const MET_IDS_KEY = 'met-ids';
const MET_IDS_MS = 7 * 24 * 3_600_000;

async function metIds(deps: Deps): Promise<number[]> {
  const cached = (await deps.kv.get(MET_IDS_KEY)) as { at?: unknown; ids?: unknown } | undefined;
  if (cached && typeof cached.at === 'number' && Date.now() - cached.at < MET_IDS_MS && Array.isArray(cached.ids)) {
    return cached.ids.filter((id): id is number => typeof id === 'number');
  }
  const body = await getJson(
    'https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&medium=Paintings&q=landscape',
  );
  const ids =
    isRecord(body) && Array.isArray(body.objectIDs)
      ? body.objectIDs.filter((id): id is number => typeof id === 'number')
      : [];
  if (ids.length > 0) await deps.kv.set(MET_IDS_KEY, { at: Date.now(), ids });
  return ids;
}

async function* met(deps: Deps): AsyncGenerator<Candidate> {
  const ids = await metIds(deps);
  for (const id of shuffle([...ids]).slice(0, TRIES_PER_SOURCE * 2)) {
    let row: unknown;
    try {
      row = await getJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
    } catch (err) {
      deps.log.debug('met object', id, describeError(err));
      continue;
    }
    if (!isRecord(row) || row.isPublicDomain !== true) continue;
    const image = str(row.primaryImageSmall);
    if (!image) continue;
    yield {
      id: `met:${id}`,
      title: str(row.title),
      artist: str(row.artistDisplayName),
      date: str(row.objectDate),
      museum: 'The Met',
      image,
    };
  }
}

/** Pixel size from a baseline or progressive JPEG's frame header. */
function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  return null;
}

function fits(width: number, height: number): string | null {
  const aspect = width / height;
  if (aspect < MIN_ASPECT) return `too tall (${width}x${height})`;
  if (aspect > MAX_ASPECT) return `too wide (${width}x${height})`;
  if (Math.max(SCREEN_W / width, SCREEN_H / height) > MAX_UPSCALE) return `too small (${width}x${height})`;
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function download(c: Candidate): Promise<{ mime: string; bytes: Uint8Array } | string> {
  const res = await get(c.image);
  const length = Number(res.headers.get('content-length') ?? '0');
  if (length > MAX_BYTES) {
    await res.body?.cancel();
    return `too heavy (${length} bytes)`;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_BYTES) return `too heavy (${bytes.length} bytes)`;
  const size = jpegSize(bytes);
  if (!size) return `not a readable jpeg (${res.headers.get('content-type') ?? 'no type'})`;
  return fits(size.width, size.height) ?? { mime: 'image/jpeg', bytes };
}

/** Local calendar day on this machine, `YYYY-MM-DD`. */
export function localDay(at = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export const SOURCES = ['aic', 'cma', 'met'] as const;

export type SourceKey = (typeof SOURCES)[number];

function source(key: SourceKey, deps: Deps): AsyncGenerator<Candidate> {
  if (key === 'aic') return artInstitute();
  if (key === 'cma') return cleveland();
  return met(deps);
}

/**
 * Finds a landscape painting for `day` that fits the screen and is not in `seen`. The day picks
 * which museum goes first and the others stand in when it fails. Resolves null when none of them
 * produced one, `only` narrows the search to one museum.
 */
export async function pickPainting(
  day: string,
  seen: ReadonlySet<string>,
  deps: Deps,
  only?: SourceKey,
): Promise<Painting | null> {
  const [y, m, d] = day.split('-').map(Number);
  const first = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) % SOURCES.length;
  const order = only ? [only] : SOURCES.map((_, i) => SOURCES[(first + i) % SOURCES.length]);

  for (const key of order) {
    let tries = 0;
    try {
      for await (const c of source(key, deps)) {
        if (tries++ >= TRIES_PER_SOURCE) break;
        if (seen.has(c.id) || !c.title) continue;
        const early = c.width && c.height ? fits(c.width, c.height) : null;
        if (early) {
          deps.log.debug('skip', c.id, early);
          continue;
        }
        let got: Awaited<ReturnType<typeof download>>;
        try {
          got = await download(c);
        } catch (err) {
          deps.log.debug('skip', c.id, describeError(err));
          continue;
        }
        if (typeof got === 'string') {
          deps.log.debug('skip', c.id, got);
          continue;
        }
        return {
          kind: 'painting',
          day,
          id: c.id,
          title: c.title,
          artist: c.artist,
          date: c.date,
          museum: c.museum,
          mime: got.mime,
          data: toBase64(got.bytes),
        };
      }
      deps.log.warn('no fitting painting from', key, 'after', tries, 'candidates');
    } catch (err) {
      deps.log.warn('painting source', key, 'failed:', describeError(err));
    }
  }
  return null;
}

function isPainting(value: unknown): value is Painting {
  if (!isRecord(value) || value.kind !== 'painting') return false;
  return ['day', 'id', 'title', 'artist', 'date', 'museum', 'mime', 'data'].every(k => typeof value[k] === 'string');
}

/** The credit line as the log prints it. */
export function credit(p: Pick<Painting, 'title' | 'artist' | 'date' | 'museum'>): string {
  return [p.title, [p.artist, p.date].filter(Boolean).join(', '), p.museum].filter(Boolean).join(' - ');
}

/**
 * Keeps one painting per local day. `onChange` gets the cached painting once at startup with
 * `fresh` false, then each new day's pick with `fresh` true. A day whose pick fails keeps the
 * previous painting and tries again on the next check, which is also how a machine that slept
 * through midnight catches up.
 */
export function startPainting(ctx: Deps, onChange: (painting: Painting, fresh: boolean) => void): PaintingFeed {
  let current: Painting | null = null;
  let busy = false;
  let stopped = false;

  const tick = async () => {
    const day = localDay();
    if (busy || stopped || current?.day === day) return;
    busy = true;
    try {
      const history = (await ctx.kv.get(HISTORY_KEY)) as unknown;
      const seen = new Set(Array.isArray(history) ? history.filter(id => typeof id === 'string') : []);
      const next = await pickPainting(day, seen, ctx);
      if (stopped) return;
      if (!next) {
        ctx.log.warn('no painting found for', day, '- keeping', current?.id ?? 'nothing');
        return;
      }
      current = next;
      ctx.log.info(`painting for ${day}: ${credit(next)} [${next.id}, ${Math.round(next.data.length * 0.75 / 1024)} KB]`);
      onChange(next, true);
      await ctx.kv.set(CURRENT_KEY, next);
      await ctx.kv.set(HISTORY_KEY, [...seen, next.id].slice(-HISTORY));
    } catch (err) {
      ctx.log.warn('painting check threw', describeError(err));
    } finally {
      busy = false;
    }
  };

  void (async () => {
    try {
      const cached = await ctx.kv.get(CURRENT_KEY);
      if (isPainting(cached) && !current) {
        current = cached;
        onChange(cached, false);
      }
    } catch (err) {
      ctx.log.warn('could not read the cached painting', describeError(err));
    }
    await tick();
  })();
  const timer = setInterval(() => void tick(), CHECK_MS);

  return {
    current: () => current,
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
