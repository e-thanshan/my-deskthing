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
  /** The artwork's page on the museum's own site, or empty. */
  link: string;
  /** The museum's description in plain text, clipped to a few sentences, or empty. */
  blurb: string;
  mime: string;
  data: string;
};

/** A painting as sent to a device, with the title `back` would restore. */
export type PaintingMessage = Painting & { previous: string | null };

export type PaintingFeed = {
  current(): Painting | null;
  message(): PaintingMessage | null;
  /** Replaces today's painting with a different one. */
  skip(): Promise<'ok' | 'busy' | 'failed'>;
  /** Restores the painting the last skip or day change replaced. */
  back(): Promise<'ok' | 'none' | 'busy'>;
  stop(): void;
};

type Deps = Pick<ExtensionContext, 'kv' | 'log'>;

type Candidate = {
  id: string;
  title: string;
  artist: string;
  date: string;
  museum: string;
  link: string;
  blurb: string;
  image: string;
  headers?: Record<string, string>;
  width?: number;
  height?: number;
};

const CHECK_MS = 15 * 60_000;
const CURRENT_KEY = 'painting-current';
const HISTORY_KEY = 'painting-history';
const HISTORY = 365;
const PREVIOUS_KEY = 'painting-previous';
const PREVIOUS = 3;
const BLURB_MAX = 420;
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

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
};

const TAG = /<[^>]*>/g;

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? whole;
    const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
  });
}

/**
 * Museum copy arrives as html fragments, and cleveland escapes its tags as entities, so tags are
 * stripped on both sides of decoding. Leaves a single line of plain text.
 */
function cleanText(value: unknown): string {
  return decodeEntities(str(value).replace(TAG, ' '))
    .replace(TAG, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cuts `text` to `max` characters, at a sentence end when one falls late enough, else at a word. */
function clip(text: string, max = BLURB_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (end > max * 0.4) return cut.slice(0, end + 1);
  return `${cut.slice(0, cut.lastIndexOf(' ', max))}\u2026`;
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
        fields: [
          'id',
          'title',
          'artist_title',
          'artist_display',
          'date_display',
          'image_id',
          'thumbnail',
          'short_description',
          'description',
        ],
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
      link: `https://www.artic.edu/artworks/${row.id}`,
      blurb: clip(cleanText(row.short_description) || cleanText(row.description)),
      // 843 is the width the iiif server keeps cached, and the one it asks clients to use
      image: `${iiif}/${imageId}/full/843,/0/default.jpg`,
      headers: { 'aic-user-agent': UA },
      width: num(thumb.width),
      height: num(thumb.height),
    };
  }
}

// cleveland has no subject field and its text search matches the word anywhere in a record, so a
// candidate must also read as a landscape somewhere in its titles or descriptions
const LANDSCAPE_WORDS =
  /\b(landscapes?|views?|vistas?|scenery|rivers?|lakes?|mountains?|valleys?|hills?|coasts?|shores?|seas?|seascapes?|harbou?rs?|bays?|forests?|woods?|woodlands?|fields?|meadows?|pastures?|marsh(es)?|islands?|waterfalls?|cascades?|sunsets?|sunrise|twilight|moonlight|winter|snow|storms?|clouds?|sky|countryside|gardens?|streams?|brooks?|cliffs?|plains?|dunes?|beach(es)?|village)\b/i;
const NOT_LANDSCAPE = /\b(calligraphy|portrait|still life|inscription|colophon|sutra)\b/i;

function readsAsLandscape(row: Record<string, unknown>): boolean {
  const title = str(row.title);
  if (NOT_LANDSCAPE.test(title)) return false;
  const alternates = Array.isArray(row.alternate_titles) ? row.alternate_titles.map(str) : [];
  const annotation = isRecord(row.images) ? str(row.images.annotation) : '';
  return [title, ...alternates, annotation, cleanText(row.description)].some(text => LANDSCAPE_WORDS.test(text));
}

async function* cleveland(deps: Deps): AsyncGenerator<Candidate> {
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
    if (!readsAsLandscape(row)) {
      deps.log.debug('skip', `cma:${row.id}`, 'not a landscape', `(${str(row.title)})`);
      continue;
    }
    const creator = Array.isArray(row.creators) ? row.creators.find(isRecord) : undefined;
    yield {
      id: `cma:${row.id}`,
      title: str(row.title),
      // descriptions read "Thomas Cole (American, 1801-1848)"
      artist: str(creator?.description).replace(/\s*\(.*\)\s*$/, ''),
      date: str(row.creation_date),
      museum: 'Cleveland Museum of Art',
      link: str(row.url),
      blurb: clip(cleanText(row.description) || cleanText(row.did_you_know)),
      image,
      width: num(web?.width),
      height: num(web?.height),
    };
  }
}

// smk files makers surname first, "Christensen, Godfred"
function smkName(maker: Record<string, unknown> | undefined): string {
  const fore = str(maker?.creator_forename);
  const sur = str(maker?.creator_surname);
  if (fore && sur) return `${fore} ${sur}`;
  const parts = str(maker?.creator).split(', ');
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : str(maker?.creator);
}

// smk tags each title with its language in danish, so an english one reads "engelsk"
function englishTitle(row: Record<string, unknown>): string {
  const titles = Array.isArray(row.titles) ? row.titles.filter(isRecord) : [];
  return str(titles.find(t => /^(en|engelsk)/i.test(str(t.language)))?.title);
}

// some works survive only as an old black and white photograph, and smk's palette for those is all greys
function monochrome(row: Record<string, unknown>): boolean {
  const colors = Array.isArray(row.colors) ? row.colors.map(str).filter(c => /^#[0-9a-f]{6}$/i.test(c)) : [];
  return (
    colors.length > 0 &&
    colors.every(c => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
      return Math.max(r, g, b) - Math.min(r, g, b) <= 12;
    })
  );
}

function anyTitle(row: Record<string, unknown>): string {
  const first = Array.isArray(row.titles) ? row.titles.find(isRecord) : undefined;
  return str(first?.title);
}

async function* smk(deps: Deps): AsyncGenerator<Candidate> {
  const ask = (keys: string, kind: string, offset: number, rows: number) =>
    getJson(
      `https://api.smk.dk/api/v1/art/search/?keys=${encodeURIComponent(keys)}` +
        `&filters=${encodeURIComponent(`[has_image:true],[public_domain:true],[object_names:${kind}]`)}` +
        `&offset=${offset}&rows=${rows}&lang=en`,
    );
  let found = 0;
  let shape: [string, string] | undefined;
  for (const candidate of [
    ['landskab', 'maleri'],
    ['landscape', 'painting'],
    ['landskab', 'painting'],
    ['landscape', 'maleri'],
  ] as [string, string][]) {
    const head = await ask(...candidate, 0, 1);
    found = (isRecord(head) && num(head.found)) || 0;
    if (found) {
      shape = candidate;
      break;
    }
  }
  if (!shape) return;
  deps.log.debug('smk search', shape.join(' / '), 'finds', found);
  const ROWS = 25;
  const body = await ask(...shape, randInt(Math.max(1, found - ROWS)), ROWS);
  const items = isRecord(body) && Array.isArray(body.items) ? body.items.filter(isRecord) : [];

  // a painting with only a danish title is still offered, after every one with an english title
  const ordered = shuffle(items).sort((a, b) => Number(!!englishTitle(b)) - Number(!!englishTitle(a)));

  for (const row of ordered) {
    const iiif = str(row.image_iiif_id);
    const image = iiif ? `${iiif}/full/!1280,1280/0/default.jpg` : str(row.image_thumbnail);
    if (!image) continue;
    const objectNumber = str(row.object_number);
    if (monochrome(row)) {
      deps.log.debug('skip', `smk:${objectNumber}`, 'black and white photograph', JSON.stringify(row.colors));
      continue;
    }
    const maker = Array.isArray(row.production) ? row.production.find(isRecord) : undefined;
    const artist = Array.isArray(row.artist) ? str(row.artist[0]) : '';
    const made = Array.isArray(row.production_date) ? row.production_date.find(isRecord) : undefined;
    yield {
      id: `smk:${objectNumber || str(row.id)}`,
      title: englishTitle(row) || anyTitle(row),
      artist: artist || smkName(maker),
      date: str(made?.period),
      museum: 'National Gallery of Denmark',
      link: str(row.frontend_url) || (objectNumber ? `https://open.smk.dk/artwork/image/${objectNumber}` : ''),
      blurb: '',
      image,
      width: num(row.image_width),
      height: num(row.image_height),
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
  const res = await get(c.image, { headers: c.headers });
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

export const SOURCES = ['aic', 'cma', 'smk'] as const;

export type SourceKey = (typeof SOURCES)[number];

function source(key: SourceKey, deps: Deps): AsyncGenerator<Candidate> {
  if (key === 'aic') return artInstitute();
  if (key === 'cma') return cleveland(deps);
  return smk(deps);
}

/**
 * Finds a landscape painting for `day` that fits the screen and is not in `seen`. The day picks
 * which museum goes first and the others stand in when it fails. Resolves null when none of them
 * produced one.
 *
 * @param options.only narrows the search to one museum.
 * @param options.offset moves the starting museum along, so repeated searches on one day rotate.
 */
export async function pickPainting(
  day: string,
  seen: ReadonlySet<string>,
  deps: Deps,
  { only, offset = 0 }: { only?: SourceKey; offset?: number } = {},
): Promise<Painting | null> {
  const [y, m, d] = day.split('-').map(Number);
  const first = (Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) + offset) % SOURCES.length;
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
          link: c.link,
          blurb: c.blurb,
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

// paintings cached by an older version carry no link or blurb
function toPainting(value: unknown): Painting | null {
  if (!isRecord(value) || value.kind !== 'painting') return null;
  const fields = ['day', 'id', 'title', 'artist', 'date', 'museum', 'mime', 'data'] as const;
  if (!fields.every(k => typeof value[k] === 'string')) return null;
  const v = value as Record<(typeof fields)[number], string>;
  return {
    kind: 'painting',
    day: v.day,
    id: v.id,
    title: v.title,
    artist: v.artist,
    date: v.date,
    museum: v.museum,
    link: str(value.link),
    blurb: str(value.blurb),
    mime: v.mime,
    data: v.data,
  };
}

/** The credit line as the log prints it. */
export function credit(p: Pick<Painting, 'title' | 'artist' | 'date' | 'museum'>): string {
  return [p.title, [p.artist, p.date].filter(Boolean).join(', '), p.museum].filter(Boolean).join(' - ');
}

function size(p: Painting): string {
  return `${p.id}, ${Math.round((p.data.length * 0.75) / 1024)} KB`;
}

/**
 * Keeps one painting per local day. `onChange` gets the cached painting once at startup with
 * `fresh` false, then every painting that replaces it with `fresh` true: each new day's pick, a
 * skip, or a step back. A day whose pick fails keeps the previous painting and tries again on the
 * next check, which is also how a machine that slept through midnight catches up.
 */
export function startPainting(ctx: Deps, onChange: (message: PaintingMessage, fresh: boolean) => void): PaintingFeed {
  let current: Painting | null = null;
  let previous: Painting[] = [];
  let busy = false;
  let stopped = false;
  let skips = { day: '', count: 0 };

  const message = (): PaintingMessage | null =>
    current ? { ...current, previous: previous.at(-1)?.title ?? null } : null;

  // the daily pick, a skip and a step back all rewrite current and the stack, so only one runs at a time
  const locked = async <T,>(whenBusy: T, run: () => Promise<T>): Promise<T> => {
    if (busy || stopped) return whenBusy;
    busy = true;
    try {
      return await run();
    } finally {
      busy = false;
    }
  };

  const history = async (): Promise<Set<string>> => {
    const raw = (await ctx.kv.get(HISTORY_KEY)) as unknown;
    return new Set(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []);
  };

  const adopt = async (next: Painting, keepOutgoing: boolean) => {
    if (keepOutgoing && current && current.id !== next.id) {
      const outgoing = current;
      previous = [...previous.filter(p => p.id !== outgoing.id), outgoing].slice(-PREVIOUS);
    }
    current = next;
    onChange(message()!, true);
    await ctx.kv.set(CURRENT_KEY, next);
    await ctx.kv.set(PREVIOUS_KEY, previous);
  };

  const pickInto = async (day: string, offset: number): Promise<Painting | null> => {
    const seen = await history();
    if (current) seen.add(current.id);
    const next = await pickPainting(day, seen, ctx, { offset });
    if (!next || stopped) return null;
    await adopt(next, true);
    await ctx.kv.set(HISTORY_KEY, [...seen, next.id].slice(-HISTORY));
    return next;
  };

  const tick = () =>
    locked(undefined, async () => {
      const day = localDay();
      if (current?.day === day) return;
      try {
        const next = await pickInto(day, 0);
        if (next) ctx.log.info(`painting for ${day}: ${credit(next)} [${size(next)}]`);
        else ctx.log.warn('no painting found for', day, '- keeping', current?.id ?? 'nothing');
      } catch (err) {
        ctx.log.warn('painting check threw', describeError(err));
      }
    });

  const skip = () =>
    locked<'ok' | 'busy' | 'failed'>('busy', async () => {
      const day = localDay();
      skips = { day, count: skips.day === day ? skips.count + 1 : 1 };
      try {
        const next = await pickInto(day, skips.count);
        if (!next) return 'failed';
        ctx.log.info(`skipped to: ${credit(next)} [${size(next)}]`);
        return 'ok';
      } catch (err) {
        ctx.log.warn('painting skip threw', describeError(err));
        return 'failed';
      }
    });

  const back = () =>
    locked<'ok' | 'none' | 'busy'>('busy', async () => {
      const last = previous.at(-1);
      if (!last) return 'none';
      previous = previous.slice(0, -1);
      // stamped with today so the daily check does not replace it straight away
      const restored = { ...last, day: localDay() };
      try {
        await adopt(restored, false);
      } catch (err) {
        ctx.log.warn('could not persist the restored painting', describeError(err));
      }
      ctx.log.info(`back to: ${credit(restored)}`);
      return 'ok';
    });

  void (async () => {
    try {
      const cached = toPainting(await ctx.kv.get(CURRENT_KEY));
      const stack = (await ctx.kv.get(PREVIOUS_KEY)) as unknown;
      if (Array.isArray(stack)) previous = stack.map(toPainting).filter((p): p is Painting => p !== null);
      if (cached && !current) {
        current = cached;
        onChange(message()!, false);
      }
    } catch (err) {
      ctx.log.warn('could not read the cached painting', describeError(err));
    }
    await tick();
  })();
  const timer = setInterval(() => void tick(), CHECK_MS);

  return {
    current: () => current,
    message,
    skip,
    back,
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
