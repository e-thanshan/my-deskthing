import { decode, encode } from 'jpeg-js';

const QUALITIES = [90, 80, 70, 60];

/** Pixel size from a baseline or progressive JPEG's frame header. */
export function jpegSize(b: Uint8Array): { width: number; height: number } | null {
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

/** For each output column or row, the first input one it overlaps and the share each overlapped one covers. */
function areaTaps(from: number, to: number): { first: number; weights: number[] }[] {
  const step = from / to;
  return Array.from({ length: to }, (_, i) => {
    const start = i * step;
    const end = start + step;
    const first = Math.floor(start);
    const weights: number[] = [];
    for (let j = first; j < Math.min(from, Math.ceil(end)); j++) {
      weights.push((Math.min(end, j + 1) - Math.max(start, j)) / step);
    }
    return { first, weights };
  });
}

// averaging every source pixel a target pixel covers keeps brushwork and canvas grain from aliasing into moire
function downscale(src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8ClampedArray {
  const cols = areaTaps(sw, dw);
  const rows = areaTaps(sh, dh);
  const mid = new Float32Array(dw * sh * 3);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < dw; x++) {
      const { first, weights } = cols[x];
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = 0; k < weights.length; k++) {
        const s = (y * sw + first + k) * 4;
        r += src[s] * weights[k];
        g += src[s + 1] * weights[k];
        b += src[s + 2] * weights[k];
      }
      const m = (y * dw + x) * 3;
      mid[m] = r;
      mid[m + 1] = g;
      mid[m + 2] = b;
    }
  }
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const { first, weights } = rows[y];
    for (let x = 0; x < dw; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = 0; k < weights.length; k++) {
        const m = ((first + k) * dw + x) * 3;
        r += mid[m] * weights[k];
        g += mid[m + 1] * weights[k];
        b += mid[m + 2] * weights[k];
      }
      const o = (y * dw + x) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = 255;
    }
  }
  return out;
}

/**
 * Scales a JPEG down to the smallest size that still covers `cover` and re-encodes it, stepping the quality
 * down only as far as it takes to fit in `maxBytes`. An image no bigger than `cover` that already fits is
 * returned untouched. Resolves null when even the lowest quality is too heavy, and throws on a JPEG the
 * decoder cannot read.
 */
export function shrinkJpeg(
  bytes: Uint8Array,
  cover: { width: number; height: number },
  maxBytes: number,
): Uint8Array | null {
  const size = jpegSize(bytes);
  if (!size) throw new Error('not a readable jpeg');
  const scale = Math.max(cover.width / size.width, cover.height / size.height);
  if (scale >= 1 && bytes.length <= maxBytes) return bytes;

  const image = decode(bytes, { useTArray: true });
  const width = scale < 1 ? Math.max(cover.width, Math.round(image.width * scale)) : image.width;
  const height = scale < 1 ? Math.max(cover.height, Math.round(image.height * scale)) : image.height;
  const data = scale < 1 ? downscale(image.data, image.width, image.height, width, height) : image.data;

  for (const quality of QUALITIES) {
    const out = encode({ data, width, height }, quality).data;
    if (out.length <= maxBytes) return out;
  }
  return null;
}
