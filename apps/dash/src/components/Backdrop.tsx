import { useEffect, useState } from 'react';

type Layer = { id: string; src: string; ready: boolean };

/**
 * Full-bleed backdrop image. A new image fades in over the one before it, which is dropped once
 * it is covered. With no image yet the page's own background shows through.
 *
 * @param fit shows the whole image over a blurred, darkened copy of itself instead of cropping it.
 */
export function Backdrop({ image, fit = false }: { image: { id: string; src: string } | null; fit?: boolean }) {
  const [layers, setLayers] = useState<Layer[]>([]);

  useEffect(() => {
    if (!image) return;
    setLayers(ls => (ls.at(-1)?.id === image.id ? ls : [...ls, { id: image.id, src: image.src, ready: false }]));
  }, [image]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {layers.map(layer => (
        <div
          key={layer.id}
          onTransitionEnd={e => {
            if (e.target !== e.currentTarget) return;
            setLayers(ls => {
              const at = ls.findIndex(l => l.id === layer.id);
              return at > 0 ? ls.slice(at) : ls;
            });
          }}
          className={`absolute inset-0 transition-opacity duration-[1500ms] ${layer.ready ? 'opacity-100' : 'opacity-0'}`}>
          {fit && (
            <img
              src={layer.src}
              alt=""
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.55]"
            />
          )}
          <img
            src={layer.src}
            alt=""
            decoding="async"
            onLoad={() => setLayers(ls => ls.map(l => (l.id === layer.id ? { ...l, ready: true } : l)))}
            className={`absolute inset-0 h-full w-full ${fit ? 'object-contain' : 'object-cover'}`}
          />
        </div>
      ))}
    </div>
  );
}
