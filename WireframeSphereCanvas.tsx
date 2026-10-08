import { useRef } from 'react';
import { clamp, useCanvasLoop } from './useCanvasLoop';
import type { OrbVisualProps } from './types';

const LATITUDES = [-75, -50, -25, 0, 25, 50, 75];
const MERIDIAN_COUNT = 8;
const SEGMENTS = 56;
const F = 3.2; // perspective distance (unit sphere)

/**
 * Lat/long wireframe sphere drawn on a 2D canvas with a manual 3D rotation
 * matrix + perspective projection — no WebGL dependency. Front-facing segments
 * render brighter; listening adds audio-reactive vertex displacement along the
 * normals and spins the sphere faster.
 */
export default function WireframeSphereCanvas({ isListening, audioLevel }: OrbVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ isListening, audioLevel });
  propsRef.current = { isListening, audioLevel };
  const ryRef = useRef(0.6);

  useCanvasLoop(canvasRef, (ctx, w, h, t, dt) => {
    const { isListening: listening, audioLevel: level } = propsRef.current;
    const lvl = clamp(level, 0, 100) / 100;
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h);
    const R = base * 0.21;

    const speed = listening ? 0.9 + lvl * 1.8 : 0.35;
    ryRef.current += dt * speed;
    const rx = -0.42 + 0.05 * Math.sin(t * 0.4);

    const cosRx = Math.cos(rx);
    const sinRx = Math.sin(rx);
    const ry = ryRef.current;
    const cosRy = Math.cos(ry);
    const sinRy = Math.sin(ry);
    const jitterAmp = listening ? lvl * 0.05 : 0;
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const drawCircle = (
      makePoint: (a: number) => [number, number, number],
      r: number,
      g: number,
      b: number,
      alphaBase: number,
      seed: number,
    ) => {
      let px = 0;
      let py = 0;
      let pz = 0;
      let hasPrev = false;
      for (let i = 0; i <= SEGMENTS; i += 1) {
        const a = (i / SEGMENTS) * Math.PI * 2;
        let [x, y, z] = makePoint(a);
        if (jitterAmp > 0 && !reduced) {
          const d = 1 + jitterAmp * Math.sin(t * 9 + a * 5 + seed);
          x *= d;
          y *= d;
          z *= d;
        }
        const x1 = x * cosRy + z * sinRy;
        const z1 = -x * sinRy + z * cosRy;
        const y2 = y * cosRx - z1 * sinRx;
        const z2 = y * sinRx + z1 * cosRx;
        const persp = F / (F - z2);
        const sx = cx + x1 * R * persp;
        const sy = cy + y2 * R * persp;
        if (hasPrev) {
          const zm = (z2 + pz) / 2;
          const alpha = alphaBase * (0.3 + 0.7 * (zm + 1) / 2);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = zm > 0 ? 1.1 : 0.7;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
        px = sx;
        py = sy;
        pz = z2;
        hasPrev = true;
      }
    };

    ctx.lineCap = 'round';
    for (const latDeg of LATITUDES) {
      const lat = (latDeg * Math.PI) / 180;
      const cl = Math.cos(lat);
      const sl = Math.sin(lat);
      drawCircle((a) => [cl * Math.cos(a), sl, cl * Math.sin(a)], 255, 215, 0, latDeg === 0 ? 0.6 : 0.42, latDeg);
    }
    for (let m = 0; m < MERIDIAN_COUNT; m += 1) {
      const lon = (m / MERIDIAN_COUNT) * Math.PI;
      drawCircle((a) => [Math.sin(a) * Math.cos(lon), Math.cos(a), Math.sin(a) * Math.sin(lon)], 255, 140, 0, 0.42, m * 1.7);
    }
  });

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
