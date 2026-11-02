import { useEffect, useState } from 'react';

type Layer = { id: string; src: string; ready: boolean };

/**
 * Full-bleed backdrop image. A new image fades in over the one before it, which is dropped once
 * it is covered. With no image yet the page's own background shows through.
 */
export function Backdrop({ image }: { image: { id: string; src: string } | null }) {
  const [layers, setLayers] = useState<Layer[]>([]);

  useEffect(() => {
    if (!image) return;
    setLayers(ls => (ls.at(-1)?.id === image.id ? ls : [...ls, { id: image.id, src: image.src, ready: false }]));
  }, [image]);

  return (
    <div aria-hidden className="absolute inset-0">
      {layers.map(layer => (
        <img
          key={layer.id}
          src={layer.src}
          alt=""
          decoding="async"
          onLoad={() => setLayers(ls => ls.map(l => (l.id === layer.id ? { ...l, ready: true } : l)))}
          onTransitionEnd={() =>
            setLayers(ls => {
              const at = ls.findIndex(l => l.id === layer.id);
              return at > 0 ? ls.slice(at) : ls;
            })
          }
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${layer.ready ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
    </div>
  );
}
