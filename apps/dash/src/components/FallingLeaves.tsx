import type { CSSProperties } from 'react';

// transform/opacity only: the device gpu composites these, anything else janks
const css = `
@keyframes ct-fall { 0% { transform: translateY(-50px) } 100% { transform: translateY(540px) } }
@keyframes ct-sway {
  0% { transform: translateX(-16px) rotate(-42deg) }
  100% { transform: translateX(16px) rotate(48deg) }
}
.ct-fall { animation: ct-fall var(--fd) linear var(--fdel) infinite; will-change: transform; }
.ct-sway {
  animation: ct-sway var(--sd) ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: center;
}
`;

const LEAF_COLORS = ['#c1441e', '#d96f32', '#e0a13a', '#8a5a26'];
const LEAVES = [
  { x: 40, fd: 12.5, fdel: -3.1, sd: 2.5, s: 1.1 },
  { x: 110, fd: 10.2, fdel: -7.4, sd: 3.1, s: 0.9 },
  { x: 190, fd: 14.8, fdel: -1.2, sd: 2.2, s: 1.3 },
  { x: 270, fd: 11.4, fdel: -9.8, sd: 2.8, s: 1.0 },
  { x: 335, fd: 13.6, fdel: -5.5, sd: 3.3, s: 1.2 },
  { x: 410, fd: 9.6, fdel: -2.6, sd: 2.4, s: 0.9 },
  { x: 480, fd: 15.4, fdel: -11.3, sd: 2.9, s: 1.4 },
  { x: 560, fd: 10.8, fdel: -6.2, sd: 2.1, s: 1.0 },
  { x: 640, fd: 13.1, fdel: -0.7, sd: 3.0, s: 1.2 },
  { x: 710, fd: 11.9, fdel: -8.6, sd: 2.6, s: 0.9 },
  { x: 772, fd: 14.2, fdel: -4.3, sd: 2.3, s: 1.1 },
];

function leafStyle(l: (typeof LEAVES)[number]): CSSProperties {
  return { '--fd': `${l.fd}s`, '--fdel': `${l.fdel}s`, '--sd': `${l.sd}s` } as CSSProperties;
}

export function FallingLeaves() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <style>{css}</style>
      <svg viewBox="0 0 800 480" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {LEAVES.map((l, i) => (
          <g key={i} transform={`translate(${l.x}, 0)`}>
            <g className="ct-fall" style={leafStyle(l)}>
              <g className="ct-sway" style={leafStyle(l)}>
                <path
                  d="M0,-6 C4.5,-3 4.5,3.5 0,7.5 C-4.5,3.5 -4.5,-3 0,-6"
                  transform={`scale(${l.s})`}
                  fill={LEAF_COLORS[i % LEAF_COLORS.length]}
                  opacity="0.92"
                />
              </g>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
