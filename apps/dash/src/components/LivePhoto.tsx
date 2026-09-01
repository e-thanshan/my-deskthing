import { useEffect, useRef, useState } from 'react';

// warps the still photo instead of layering it: a sway field (mask green) wobbles
// foliage and a slow pan (mask red) drifts the sky, so nothing needs inpainting.
// debug: ?mask overlays the mask channels, ?amp=8 exaggerates the motion.

const W = 800;
const H = 480;

const VS = `attribute vec2 p; varying vec2 vUv;
void main(){ vUv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }`;

const FS = `precision mediump float;
varying vec2 vUv;
uniform sampler2D uPhoto, uMask;
uniform vec2 uScale, uOffset;
uniform float uT, uAmp, uDebug;
void main(){
  vec4 m = texture2D(uMask, vUv);
  float sway = m.g;
  float cloud = m.r * (1.0 - m.g);
  cloud *= smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
  float ph = vUv.x*17.0 + vUv.y*9.0;
  vec2 off = vec2(0.0);
  off.x += sway * uAmp * (1.4*sin(uT*1.05 + ph) + 0.6*sin(uT*2.3 + ph*1.7)) * (2.6/800.0);
  off.y += sway * uAmp * 0.8*sin(uT*0.9 + ph*1.3) * (1.2/480.0);
  off.x += cloud * (14.0/800.0) * uAmp * sin(uT*0.10472);
  vec2 uv = (vUv + off) * uScale + uOffset;
  vec4 c = texture2D(uPhoto, uv);
  if (uDebug > 0.5) c = mix(c*0.35, vec4(m.r, m.g, 0.0, 1.0), 0.6);
  gl_FragColor = c;
}`;

function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a: number) {
  const grad = g.createRadialGradient(x, y, 0, x, y, 1);
  grad.addColorStop(0, `rgba(0,${Math.round(255 * a)},0,1)`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.save();
  g.translate(x, y);
  g.scale(rx, ry);
  g.translate(-x, -y);
  g.fillStyle = grad;
  g.fillRect(x - 1.5 * rx, y - 1.5 * ry, 3 * rx, 3 * ry);
  g.restore();
}

// screen-space at half res: red = cloud drift, green = foliage sway
function paintMask(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 240;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 400, 240);

  const sky = g.createLinearGradient(0, 0, 0, 100);
  sky.addColorStop(0, 'rgb(255,0,0)');
  sky.addColorStop(0.7, 'rgb(200,0,0)');
  sky.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = sky;
  g.fillRect(0, 0, 400, 100);
  g.fillStyle = '#000';
  g.beginPath();
  g.moveTo(236, 104);
  g.lineTo(282, 74);
  g.lineTo(306, 74);
  g.lineTo(342, 104);
  g.closePath();
  g.fill();

  g.globalCompositeOperation = 'lighter';
  blob(g, 362, 140, 44, 55, 1.0);
  blob(g, 396, 140, 30, 50, 0.9);
  blob(g, 328, 182, 26, 30, 0.65);
  blob(g, 28, 158, 30, 22, 0.7);
  blob(g, 75, 163, 25, 16, 0.5);
  blob(g, 315, 146, 14, 9, 0.4);
  const grass = g.createLinearGradient(0, 198, 0, 240);
  grass.addColorStop(0, 'rgba(0,0,0,0)');
  grass.addColorStop(1, `rgba(0,215,0,1)`);
  g.fillStyle = grass;
  g.fillRect(0, 198, 400, 42);
  const nearGrass = g.createLinearGradient(0, 184, 0, 202);
  nearGrass.addColorStop(0, 'rgba(0,0,0,0)');
  nearGrass.addColorStop(1, 'rgba(0,60,0,1)');
  g.fillStyle = nearGrass;
  g.fillRect(0, 184, 400, 18);
  return c;
}

export function LivePhoto({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) {
      setFailed(true);
      return;
    }
    let raf = 0;
    let dead = false;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (dead) return;
      const sh = (type: number, source: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        setFailed(true);
        return;
      }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const tex = (unit: number, source: TexImageSource) => {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      };
      tex(0, img);
      tex(1, paintMask());
      gl.uniform1i(gl.getUniformLocation(prog, 'uPhoto'), 0);
      gl.uniform1i(gl.getUniformLocation(prog, 'uMask'), 1);

      const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const sw = img.naturalWidth * k;
      const shh = img.naturalHeight * k;
      gl.uniform2f(gl.getUniformLocation(prog, 'uScale'), W / sw, H / shh);
      gl.uniform2f(gl.getUniformLocation(prog, 'uOffset'), (sw - W) / 2 / sw, (shh - H) / 2 / shh);

      const q = new URLSearchParams(location.search);
      gl.uniform1f(gl.getUniformLocation(prog, 'uAmp'), Number(q.get('amp') ?? '1') || 1);
      gl.uniform1f(gl.getUniformLocation(prog, 'uDebug'), q.has('mask') ? 1 : 0);
      const uT = gl.getUniformLocation(prog, 'uT');

      gl.viewport(0, 0, W, H);
      let last = 0;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        // 30fps is plenty for slow drift and halves the gpu load
        if (now - last < 31) return;
        last = now;
        gl.uniform1f(uT, now / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        (window as { __lpFrames?: number }).__lpFrames = ((window as { __lpFrames?: number }).__lpFrames ?? 0) + 1;
      };
      raf = requestAnimationFrame(frame);
    };
    img.onerror = () => setFailed(true);

    const onLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', onLost);
    };
  }, [src]);

  if (failed) return <img src={src} alt="" className="h-full w-full object-cover" />;
  return <canvas ref={canvasRef} width={W} height={H} className="h-full w-full" />;
}
