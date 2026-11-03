import type { ExtensionContext } from '@bridgething/extension';
import { describeError } from './http.ts';
import { credit, localDay, type Painting } from './painting.ts';

const SAVED_KEY = 'painting-saved';

/** The file saved paintings are appended to. The manifest grants write access to exactly this path. */
export const SAVED_FILE = '~/dash-paintings.md';

function savedPath(): string | null {
  const home = Deno.env.get('HOME');
  return home ? SAVED_FILE.replace('~', home) : null;
}

function entry(p: Painting): string {
  const byline = [p.artist, p.date].filter(Boolean).join(', ');
  const line = [
    `**${p.title}**${byline ? `, ${byline}` : ''}`,
    p.museum,
    p.link ? `[museum page](${p.link})` : '',
    `saved ${localDay()}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return `- ${line}\n${p.blurb ? `  > ${p.blurb}\n` : ''}`;
}

/** Appends `painting` to the saved list once. A painting saved before is left alone. */
export async function savePainting(
  ctx: Pick<ExtensionContext, 'kv' | 'log'>,
  painting: Painting,
): Promise<'saved' | 'already' | 'failed'> {
  const path = savedPath();
  if (!path) return 'failed';
  const raw = (await ctx.kv.get(SAVED_KEY)) as unknown;
  const saved = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
  if (saved.includes(painting.id)) return 'already';
  try {
    try {
      await Deno.writeTextFile(path, '# Saved paintings\n\n', { createNew: true });
    } catch {
      // createNew refuses a file that is already there, which after the first save is every time
    }
    await Deno.writeTextFile(path, entry(painting), { append: true });
  } catch (err) {
    ctx.log.warn('could not save to', path, describeError(err));
    return 'failed';
  }
  await ctx.kv.set(SAVED_KEY, [...saved, painting.id]);
  ctx.log.info('saved', credit(painting), 'to', path);
  return 'saved';
}
