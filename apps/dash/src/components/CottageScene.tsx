import type { CSSProperties } from 'react';

// transform/opacity only: the device gpu composites these, anything else janks
const css = `
@keyframes ct-fall { 0% { transform: translateY(-50px) } 100% { transform: translateY(540px) } }
@keyframes ct-sway {
  0% { transform: translateX(-16px) rotate(-42deg) }
  100% { transform: translateX(16px) rotate(48deg) }
}
@keyframes ct-puff {
  0% { transform: translate(0, 0) scale(0.45); opacity: 0 }
  14% { opacity: 0.85 }
  100% { transform: translate(20px, -90px) scale(2.1); opacity: 0 }
}
.ct-fall { animation: ct-fall var(--fd) linear var(--fdel) infinite; will-change: transform; }
.ct-sway {
  animation: ct-sway var(--sd) ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: center;
}
.ct-puff { animation: ct-puff var(--pd) ease-out var(--pdel) infinite; }
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

const FLOWER_COLORS = ['#f7ead2', '#e8899a', '#f2b53c', '#d9793a'];
const FLOWERS = [
  [24, 392], [58, 418], [96, 400], [128, 442], [170, 412], [204, 396], [238, 430], [282, 408],
  [318, 446], [352, 402], [388, 424], [430, 398], [468, 438], [502, 410], [548, 428], [590, 404],
  [628, 444], [662, 416], [700, 398], [736, 432], [764, 408], [148, 464], [396, 458], [606, 462],
];
const STEMMED = [
  [44, 458], [216, 470], [340, 466], [452, 472], [530, 462], [676, 470], [742, 458], [116, 474],
];

function leafStyle(l: (typeof LEAVES)[number]): CSSProperties {
  return { '--fd': `${l.fd}s`, '--fdel': `${l.fdel}s`, '--sd': `${l.sd}s` } as CSSProperties;
}

export function CottageScene() {
  return (
    <div aria-hidden className="absolute inset-0">
      <style>{css}</style>
      <svg viewBox="0 0 800 480" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ct-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fa3c4" />
            <stop offset="0.5" stopColor="#e5b57e" />
            <stop offset="1" stopColor="#f6d9a6" />
          </linearGradient>
          <radialGradient id="ct-sun">
            <stop offset="0" stopColor="#ffedbe" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffedbe" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ct-smoke">
            <stop offset="0" stopColor="#f2efe8" stopOpacity="0.85" />
            <stop offset="1" stopColor="#f2efe8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="480" fill="url(#ct-sky)" />
        <circle cx="250" cy="140" r="170" fill="url(#ct-sun)" />
        <ellipse cx="560" cy="96" rx="58" ry="13" fill="#fbe7c4" opacity="0.7" />
        <ellipse cx="120" cy="70" rx="44" ry="10" fill="#fbe7c4" opacity="0.55" />

        <path d="M0,300 C120,258 260,252 400,272 C540,292 660,262 800,282 L800,480 L0,480 Z" fill="#c39a5c" />
        <path d="M0,340 C150,300 330,296 480,318 C630,340 720,310 800,326 L800,480 L0,480 Z" fill="#a5762f" />

        <g>
          <circle cx="438" cy="296" r="22" fill="#ad5b28" />
          <circle cx="416" cy="306" r="16" fill="#c97a35" />
        </g>

        <g>
          <path d="M116,364 C114,320 112,300 118,282" stroke="#6a452c" strokeWidth="10" strokeLinecap="round" fill="none" />
          <circle cx="88" cy="286" r="30" fill="#d96f32" />
          <circle cx="150" cy="284" r="32" fill="#e0a13a" />
          <circle cx="118" cy="262" r="40" fill="#c1441e" />
        </g>
        <g>
          <path d="M706,336 L706,262" stroke="#6a452c" strokeWidth="12" strokeLinecap="round" fill="none" />
          <circle cx="676" cy="272" r="30" fill="#b8542a" />
          <circle cx="738" cy="270" r="32" fill="#e0a13a" />
          <circle cx="706" cy="246" r="44" fill="#d96f32" />
        </g>

        <g>
          <rect x="556" y="206" width="15" height="34" fill="#7a5240" />
          <rect x="553.5" y="200" width="20" height="6" fill="#66443a" />
          <rect x="475" y="262" width="112" height="60" fill="#f1e3c6" />
          <polygon points="463,264 531,214 599,264" fill="#9c4526" />
          <rect x="517" y="286" width="26" height="36" fill="#66402a" />
          <circle cx="538" cy="305" r="1.6" fill="#d9b06a" />
          <g stroke="#6b4226" strokeWidth="1.5">
            <rect x="488" y="278" width="20" height="17" fill="#ffd483" />
            <line x1="498" y1="278" x2="498" y2="295" />
            <line x1="488" y1="286.5" x2="508" y2="286.5" />
            <rect x="560" y="278" width="20" height="17" fill="#ffd483" />
            <line x1="570" y1="278" x2="570" y2="295" />
            <line x1="560" y1="286.5" x2="580" y2="286.5" />
          </g>
        </g>

        <g fill="url(#ct-smoke)">
          <circle cx="563" cy="194" r="14" className="ct-puff" style={{ '--pd': '6s', '--pdel': '0s' } as CSSProperties} />
          <circle cx="563" cy="194" r="12" className="ct-puff" style={{ '--pd': '6s', '--pdel': '-2s' } as CSSProperties} />
          <circle cx="563" cy="194" r="15" className="ct-puff" style={{ '--pd': '6s', '--pdel': '-4s' } as CSSProperties} />
        </g>

        <path d="M0,400 C180,362 420,356 620,380 C720,392 770,386 800,382 L800,480 L0,480 Z" fill="#97742c" />
        <path d="M522,322 C518,350 502,372 474,404 L512,404 C532,372 538,346 545,322 Z" fill="#b08a52" opacity="0.85" />

        <g>
          {FLOWERS.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="3.1" fill={FLOWER_COLORS[i % FLOWER_COLORS.length]} />
              <circle cx={x} cy={y} r="1.2" fill="#6d4f1e" />
            </g>
          ))}
          {STEMMED.map(([x, y], i) => (
            <g key={i}>
              <line x1={x} y1={y} x2={x} y2={y - 15} stroke="#5f6e2e" strokeWidth="1.5" />
              <circle cx={x} cy={y - 18} r="4" fill={FLOWER_COLORS[(i + 1) % FLOWER_COLORS.length]} />
              <circle cx={x} cy={y - 18} r="1.5" fill="#6d4f1e" />
            </g>
          ))}
        </g>

        <g>
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
        </g>
      </svg>
    </div>
  );
}
