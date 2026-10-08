import { useRef } from 'react';
import { clamp, useCanvasLoop } from './useCanvasLoop';
import type { OrbVisualProps } from './types';

interface Dust {
  ux: number;
  uy: number;
  uz: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  angle: number;
  speed: number;
  size: number;
  phase: number;
  twinkle: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

const DUST_COUNT = 72;
const F = 3.2;

function makeDust(count: number): Dust[] {
  const dust: Dust[] = [];
  for (let i = 0; i < count; i += 1) {
    // Random orbital plane through the origin (biased toward shallow inclinations).
    const a = Math.random() * Math.PI * 2;
    const b = (Math.random() - 0.5) * 1.4;
    const na = Math.cos(a) * Math.cos(b);
    const nb = Math.sin(b);
    const nc = Math.sin(a) * Math.cos(b);
    // u = normalize(cross(n, [0,1,0])) = (-sin a, 0, cos a); v = cross(n, u)
    const ux = -Math.sin(a);
    const uz = Math.cos(a);
    const vxc = nb * uz;
    const vyc = -Math.cos(b);
    const vzc = nb * ux;
    dust.push({
      ux,
      uy: 0,
      uz,
      vx: vxc,
      vy: vyc,
      vz: vzc,
      radius: 0.6 + Math.random() * 0.9 + (Math.random() < 0.15 ? 0.4 : 0),
      angle: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.45,
      size: 2 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      twinkle: 1.5 + Math.random() * 3.5,
    });
  }
  return dust;
}

function makeSprite(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 48;
  const g = c.getContext('2d');
  if (!g) return c;
  const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  grad.addColorStop(0, 'rgba(255, 232, 115, 1)');
  grad.addColorStop(0.3, 'rgba(255, 215, 0, 0.55)');
  grad.addColorStop(0.7, 'rgba(255, 140, 0, 0.18)');
  grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 48, 48);
  return c;
}

/**
 * Golden dust orbiting the core on tilted elliptical planes, drawn with a
 * pre-rendered glow sprite (additive). While listening the orbital speed
 * doubles (spec: particle speed x2) and high levels discharge spark bursts.
 */
export default function ParticleField({ isListening, audioLevel }: OrbVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ isListening, audioLevel });
  propsRef.current = { isListening, audioLevel };
  const dustRef = useRef<Dust[]>([]);
  if (dustRef.current.length === 0) dustRef.current = makeDust(DUST_COUNT);
  const sparksRef = useRef<Spark[]>([]);
  const spriteRef = useRef<HTMLCanvasElement | null>(null);

  useCanvasLoop(canvasRef, (ctx, w, h, t, dt) => {
    const { isListening: listening, audioLevel: level } = propsRef.current;
    const lvl = clamp(level, 0, 100) / 100;
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h);
    const R = base * 0.21;

    const sprite = spriteRef.current ?? (spriteRef.current = makeSprite());
    const speedMult = listening ? 2 : 1;

    ctx.globalCompositeOperation = 'lighter';

    // slow global drift of the whole dust field
    const gy = t * 0.03;
    const cgy = Math.cos(gy);
    const sgy = Math.sin(gy);

    for (const d of dustRef.current) {
      d.angle += dt * d.speed * speedMult;
      const c = Math.cos(d.angle) * d.radius;
      const s = Math.sin(d.angle) * d.radius;
      let x = d.ux * c + d.vx * s;
      let y = d.uy * c + d.vy * s;
      let z = d.uz * c + d.vz * s;
      const x2 = x * cgy + z * sgy;
      const z2 = -x * sgy + z * cgy;
      x = x2;
      z = z2;
      const persp = F / (F - z);
      const sx = cx + x * R * persp;
      const sy = cy + y * R * persp;
      const tw = 0.6 + 0.4 * Math.sin(t * d.twinkle + d.phase);
      const depth = clamp((z + 1.4) / 2.4, 0, 1);
      ctx.globalAlpha = (0.2 + 0.6 * depth) * tw;
      const size = d.size * persp * (listening ? 1 + lvl * 0.5 : 1);
      ctx.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);
    }

    // spark discharges from the core at high audio levels while listening
    const sparks = sparksRef.current;
    if (listening && lvl > 0.55) {
      const spawn = Math.random() < (lvl - 0.55) * 1.2 ? 1 + Math.floor(Math.random() * 2) : 0;
      for (let i = 0; i < spawn && sparks.length < 90; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const v = base * (0.3 + Math.random() * 0.5);
        sparks.push({
          x: cx + Math.cos(a) * base * 0.04,
          y: cy + Math.sin(a) * base * 0.04,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0.5 + Math.random() * 0.4,
          max: 0.9,
        });
      }
    }
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const sp = sparks[i];
      sp.life -= dt;
      if (sp.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vx *= 0.985;
      sp.vy *= 0.985;
      const f = sp.life / sp.max;
      ctx.globalAlpha = f * 0.9;
      const sz = base * 0.014 * (0.5 + f);
      ctx.drawImage(sprite, sp.x - sz / 2, sp.y - sz / 2, sz, sz);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  });

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
