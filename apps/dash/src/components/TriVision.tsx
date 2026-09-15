import { useEffect, useState, type CSSProperties } from 'react';
import type { SleepPhase } from '../sleep';

const SLATS = 16;
const FLIP_MS = 340;
const STAGGER_MS = 26;

/** How long a full left-to-right sweep takes. The sleep sequence waits this out before killing the backlight. */
export const SWEEP_MS = FLIP_MS + STAGGER_MS * (SLATS - 1);

// each slat is a two-faced prism: the front face is transparent so the ui shows through at rest, the
// back face is opaque. rotating 180deg about y brings the opaque face round, so the screen is hidden
// by physical-looking rotation rather than a fade.
const FRONT: CSSProperties = { backfaceVisibility: 'hidden' };

const BACK: CSSProperties = {
  backfaceVisibility: 'hidden',
  transform: 'rotateY(180deg)',
  background: 'linear-gradient(105deg, #12151a 0%, #05070a 42%, #000 100%)',
  boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.055), inset -1px 0 0 rgba(0,0,0,0.9)',
};

/**
 * A row of vertical slats that flip in a wave, the way a tri-vision billboard changes face.
 * Renders nothing while awake. Drive it from {@link SleepPhase}.
 */
export function TriVision({ phase }: { phase: SleepPhase }) {
  // mounts at the start pose and moves on a later frame, or the browser has no previous value to
  // transition from and the slats would snap straight to black.
  const [engaged, setEngaged] = useState(phase === 'asleep');

  useEffect(() => {
    if (phase === 'awake') return;
    if (phase === 'asleep') {
      setEngaged(true);
      return;
    }
    const want = phase === 'closing';
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEngaged(want));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [phase]);

  if (phase === 'awake') return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] flex" style={{ perspective: '900px' }}>
      {phase === 'asleep' && <div className="absolute inset-0 bg-black" />}
      {Array.from({ length: SLATS }, (_, i) => (
        <div
          key={i}
          className="relative flex-1"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${engaged ? 180 : 0}deg)`,
            transition: `transform ${FLIP_MS}ms cubic-bezier(0.45, 0.05, 0.3, 1)`,
            transitionDelay: `${i * STAGGER_MS}ms`,
          }}
        >
          <div className="absolute inset-0" style={FRONT} />
          <div className="absolute inset-0" style={BACK} />
        </div>
      ))}
    </div>
  );
}
