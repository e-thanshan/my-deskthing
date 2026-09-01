import type { CSSProperties } from 'react';

// transform/opacity only: the device gpu composites these, anything else janks
const css = `
@keyframes ct-puff {
  0% { transform: translate(0, 0) scale(0.45); opacity: 0 }
  14% { opacity: 0.85 }
  100% { transform: translate(20px, -90px) scale(2.1); opacity: 0 }
}
.ct-puff { animation: ct-puff var(--pd) ease-out var(--pdel) infinite; }
`;

const FLOWER_COLORS = ['#f7ead2', '#e8899a', '#f2b53c', '#d9793a'];
const FLOWERS = [
  [24, 392], [58, 418], [96, 400], [128, 442], [170, 412], [204, 396], [238, 430], [282, 408],
  [318, 446], [352, 402], [388, 424], [430, 398], [468, 438], [502, 410], [548, 428], [590, 404],
  [628, 444], [662, 416], [700, 398], [736, 432], [764, 408], [148, 464], [396, 458], [606, 462],
];
const STEMMED = [
  [44, 458], [216, 470], [340, 466], [452, 472], [530, 462], [676, 470], [742, 458], [116, 474],
];

// rotated translucent ellipses read as brush strokes on the fields
const DAUBS: [number, number, number, number, number, string, number][] = [
  [90, 388, 30, 3.5, -6, '#5f4a1c', 0.14], [250, 402, 26, 3, 4, '#d3b264', 0.18],
  [380, 392, 34, 3.5, -3, '#5f4a1c', 0.12], [520, 400, 24, 3, 6, '#d3b264', 0.16],
  [650, 394, 30, 3.5, -5, '#5f4a1c', 0.13], [740, 410, 22, 3, 3, '#d3b264', 0.16],
  [160, 430, 28, 3.5, 5, '#d3b264', 0.15], [320, 438, 32, 4, -4, '#4f3d16', 0.14],
  [470, 446, 26, 3.5, 6, '#d3b264', 0.16], [610, 434, 30, 3.5, -6, '#4f3d16', 0.13],
  [60, 456, 24, 3.5, 4, '#d3b264', 0.15], [700, 458, 28, 4, -3, '#4f3d16', 0.14],
  [200, 330, 28, 3, -4, '#7c5c22', 0.15], [420, 336, 24, 2.5, 5, '#d8ae62', 0.16],
  [640, 336, 26, 3, -5, '#7c5c22', 0.13],
];

export function CottageScene() {
  return (
    <div aria-hidden className="absolute inset-0">
      <style>{css}</style>
      <svg viewBox="0 0 800 480" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ct-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d90b4" />
            <stop offset="0.45" stopColor="#d9a877" />
            <stop offset="0.75" stopColor="#f2d49b" />
            <stop offset="1" stopColor="#f8e6bd" />
          </linearGradient>
          <radialGradient id="ct-sun">
            <stop offset="0" stopColor="#fff3cf" stopOpacity="0.95" />
            <stop offset="1" stopColor="#fff3cf" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ct-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8e6bd" stopOpacity="0.22" />
            <stop offset="1" stopColor="#f8e6bd" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ct-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d3ae74" />
            <stop offset="1" stopColor="#b98e56" />
          </linearGradient>
          <linearGradient id="ct-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c08944" />
            <stop offset="1" stopColor="#8a5f24" />
          </linearGradient>
          <linearGradient id="ct-meadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ad8034" />
            <stop offset="1" stopColor="#6d4a1c" />
          </linearGradient>
          <radialGradient id="ct-red" cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#e57a45" />
            <stop offset="0.6" stopColor="#c1441e" />
            <stop offset="1" stopColor="#8e2a12" />
          </radialGradient>
          <radialGradient id="ct-orange" cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#f0a45e" />
            <stop offset="0.6" stopColor="#d96f32" />
            <stop offset="1" stopColor="#a34a1c" />
          </radialGradient>
          <radialGradient id="ct-gold" cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#f5c86e" />
            <stop offset="0.6" stopColor="#e0a13a" />
            <stop offset="1" stopColor="#b1761f" />
          </radialGradient>
          <radialGradient id="ct-rust" cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#d98a4a" />
            <stop offset="0.6" stopColor="#b8542a" />
            <stop offset="1" stopColor="#7e3517" />
          </radialGradient>
          <linearGradient id="ct-wall" x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0" stopColor="#f8eed6" />
            <stop offset="1" stopColor="#e0c8a0" />
          </linearGradient>
          <linearGradient id="ct-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b25a32" />
            <stop offset="1" stopColor="#7c3a1f" />
          </linearGradient>
          <linearGradient id="ct-door" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#74482e" />
            <stop offset="1" stopColor="#57351f" />
          </linearGradient>
          <linearGradient id="ct-chimney" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#86594a" />
            <stop offset="1" stopColor="#66443a" />
          </linearGradient>
          <linearGradient id="ct-window" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe3a1" />
            <stop offset="1" stopColor="#f4b95c" />
          </linearGradient>
          <radialGradient id="ct-glow">
            <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ct-path" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c8a266" />
            <stop offset="1" stopColor="#8f6b3d" />
          </linearGradient>
          <radialGradient id="ct-smoke">
            <stop offset="0" stopColor="#f2efe8" stopOpacity="0.85" />
            <stop offset="1" stopColor="#f2efe8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ct-vig" cx="0.5" cy="0.45" r="0.75">
            <stop offset="0.6" stopColor="#402410" stopOpacity="0" />
            <stop offset="1" stopColor="#402410" stopOpacity="0.28" />
          </radialGradient>
          <filter id="ct-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0" />
          </filter>
        </defs>

        <rect width="800" height="480" fill="url(#ct-sky)" />
        <circle cx="235" cy="135" r="200" fill="url(#ct-sun)" />
        <g fill="#fdeccb">
          <ellipse cx="560" cy="92" rx="60" ry="12" opacity="0.5" />
          <ellipse cx="596" cy="100" rx="40" ry="9" opacity="0.3" />
          <ellipse cx="118" cy="66" rx="46" ry="10" opacity="0.45" />
          <ellipse cx="88" cy="73" rx="30" ry="7" opacity="0.28" />
        </g>

        <path d="M0,300 C120,258 260,252 400,272 C540,292 660,262 800,282 L800,480 L0,480 Z" fill="url(#ct-far)" opacity="0.95" />
        <rect y="252" width="800" height="44" fill="url(#ct-haze)" />
        <path
          d="M0,288 C120,246 260,240 400,260 C540,280 660,250 800,270 L800,282 C660,262 540,292 400,272 C260,252 120,258 0,300 Z"
          fill="#a5713a"
          opacity="0.45"
        />

        <path d="M0,340 C150,300 330,296 480,318 C630,340 720,310 800,326 L800,480 L0,480 Z" fill="url(#ct-mid)" />

        <g>
          <ellipse cx="438" cy="298" rx="24" ry="20" fill="url(#ct-rust)" opacity="0.85" />
          <ellipse cx="414" cy="307" rx="17" ry="14" fill="url(#ct-orange)" opacity="0.85" />
        </g>

        <g>
          <path d="M116,364 C114,320 112,300 118,282" stroke="#6a452c" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M119,360 C117,326 116,306 120,290" stroke="#4f3320" strokeWidth="3" strokeLinecap="round" fill="none" />
          <ellipse cx="88" cy="286" rx="31" ry="27" fill="url(#ct-orange)" />
          <ellipse cx="150" cy="284" rx="33" ry="28" fill="url(#ct-gold)" transform="rotate(-8 150 284)" />
          <ellipse cx="118" cy="260" rx="43" ry="37" fill="url(#ct-red)" transform="rotate(6 118 260)" />
          <ellipse cx="102" cy="244" rx="22" ry="13" fill="#f2a066" opacity="0.3" transform="rotate(-12 102 244)" />
          <ellipse cx="136" cy="294" rx="20" ry="11" fill="#6e2410" opacity="0.35" transform="rotate(8 136 294)" />
        </g>
        <g>
          <path d="M706,336 L706,262" stroke="#6a452c" strokeWidth="12" strokeLinecap="round" fill="none" />
          <path d="M709,332 L709,270" stroke="#4f3320" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <ellipse cx="676" cy="272" rx="31" ry="26" fill="url(#ct-rust)" transform="rotate(7 676 272)" />
          <ellipse cx="738" cy="270" rx="33" ry="28" fill="url(#ct-gold)" transform="rotate(-6 738 270)" />
          <ellipse cx="706" cy="244" rx="45" ry="38" fill="url(#ct-orange)" transform="rotate(-4 706 244)" />
          <ellipse cx="690" cy="228" rx="23" ry="13" fill="#f7bc7d" opacity="0.3" transform="rotate(-10 690 228)" />
          <ellipse cx="724" cy="280" rx="21" ry="11" fill="#7e3517" opacity="0.35" transform="rotate(9 724 280)" />
        </g>

        <g>
          <ellipse cx="531" cy="324" rx="76" ry="9" fill="#4a2f12" opacity="0.3" />
          <rect x="556" y="206" width="15" height="34" fill="url(#ct-chimney)" />
          <rect x="553.5" y="200" width="20" height="6" fill="#5a3a30" />
          <rect x="475" y="262" width="112" height="60" fill="url(#ct-wall)" />
          <rect x="475" y="262" width="112" height="6" fill="#5c3a1e" opacity="0.3" />
          <polygon points="463,264 531,214 599,264" fill="url(#ct-roof)" />
          <path d="M531,216 L468,262" stroke="#cf7f4f" strokeWidth="2" opacity="0.7" fill="none" />
          <circle cx="498" cy="286" r="16" fill="url(#ct-glow)" />
          <circle cx="570" cy="286" r="16" fill="url(#ct-glow)" />
          <rect x="517" y="286" width="26" height="36" fill="url(#ct-door)" />
          <rect x="515" y="320" width="30" height="4" fill="#8a6a42" opacity="0.8" />
          <circle cx="538" cy="305" r="1.6" fill="#d9b06a" />
          <g stroke="#6b4226" strokeWidth="1.5">
            <rect x="488" y="278" width="20" height="17" fill="url(#ct-window)" />
            <line x1="498" y1="278" x2="498" y2="295" />
            <line x1="488" y1="286.5" x2="508" y2="286.5" />
            <rect x="560" y="278" width="20" height="17" fill="url(#ct-window)" />
            <line x1="570" y1="278" x2="570" y2="295" />
            <line x1="560" y1="286.5" x2="580" y2="286.5" />
          </g>
        </g>

        <g fill="url(#ct-smoke)">
          <circle cx="563" cy="194" r="14" className="ct-puff" style={{ '--pd': '6s', '--pdel': '0s' } as CSSProperties} />
          <circle cx="563" cy="194" r="12" className="ct-puff" style={{ '--pd': '6s', '--pdel': '-2s' } as CSSProperties} />
          <circle cx="563" cy="194" r="15" className="ct-puff" style={{ '--pd': '6s', '--pdel': '-4s' } as CSSProperties} />
        </g>

        <path d="M0,400 C180,362 420,356 620,380 C720,392 770,386 800,382 L800,480 L0,480 Z" fill="url(#ct-meadow)" />
        <path d="M522,322 C518,350 502,372 474,404 L512,404 C532,372 538,346 545,322 Z" fill="url(#ct-path)" opacity="0.9" />
        <g fill="#d9bb85" opacity="0.5">
          <ellipse cx="510" cy="342" rx="5" ry="2" />
          <ellipse cx="498" cy="366" rx="6" ry="2.2" />
          <ellipse cx="486" cy="390" rx="5" ry="2" />
        </g>

        <g>
          {DAUBS.map(([x, y, rx, ry, rot, fill, op], i) => (
            <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill={fill} opacity={op} transform={`rotate(${rot} ${x} ${y})`} />
          ))}
        </g>

        <g>
          {FLOWERS.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={2.4 + (i % 3) * 0.5} fill={FLOWER_COLORS[i % FLOWER_COLORS.length]} opacity="0.95" />
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

        <rect width="800" height="480" fill="url(#ct-vig)" />
        <rect width="800" height="480" filter="url(#ct-grain)" opacity="0.05" />
      </svg>
    </div>
  );
}
