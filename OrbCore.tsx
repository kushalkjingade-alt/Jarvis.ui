import { useRef } from 'react';
import { clamp, useCanvasLoop } from './useCanvasLoop';
import type { OrbVisualProps } from './types';

interface Spike {
  angle: number;
  phase: number;
  speed: number;
  width: number;
}

const SPIKES: Spike[] = Array.from({ length: 26 }, (_, i) => ({
  angle: (i / 26) * Math.PI * 2 + (Math.random() - 0.5) * 0.24,
  phase: Math.random() * Math.PI * 2,
  speed: 0.5 + Math.random() * 1.1,
  width: 0.8 + Math.random() * 1.8,
}));

/**
 * The glowing plasma core: white-hot center, #FFE873/#FFD700/#FF8C00 radial
 * gradient body, additive bloom, and radial energy spikes. Canvas-drawn; the
 * spec reactivity (core scale = 1 + audioLevel/100 while listening) is eased
 * inside the draw loop.
 */
export default function OrbCore({ isListening, audioLevel }: OrbVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(1);
  const propsRef = useRef({ isListening, audioLevel });
  propsRef.current = { isListening, audioLevel };

  useCanvasLoop(canvasRef, (ctx, w, h, t, dt) => {
    const { isListening: listening, audioLevel: level } = propsRef.current;
    const lvl = clamp(level, 0, 100) / 100;
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h);

    // spec: core scale = 1 + audioLevel / 100 when listening
    const target = listening ? 1 + lvl : 1;
    const s = scaleRef.current + (target - scaleRef.current) * Math.min(1, dt * 7);
    scaleRef.current = s;

    const coreR = base * 0.075 * s;
    const breathe = listening ? 1 : 0.92 + 0.08 * Math.sin(t * 1.1);
    const energy = listening ? 0.75 + 0.45 * lvl : 0.55;

    ctx.globalCompositeOperation = 'source-over';

    // outer bloom
    const bloomR = coreR * 5.4;
    const bloom = ctx.createRadialGradient(cx, cy, coreR * 0.25, cx, cy, bloomR);
    bloom.addColorStop(0, `rgba(255, 140, 0, ${(0.2 * energy * breathe).toFixed(3)})`);
    bloom.addColorStop(0.45, `rgba(255, 215, 0, ${(0.06 * energy).toFixed(3)})`);
    bloom.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(cx - bloomR, cy - bloomR, bloomR * 2, bloomR * 2);

    // radial energy spikes (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const spike of SPIKES) {
      const flicker = 0.55 + 0.45 * Math.sin(t * spike.speed * (listening ? 2.4 : 1) + spike.phase);
      const len = base * (0.16 + 0.14 * flicker + (listening ? 0.16 * lvl : 0));
      const a = spike.angle + t * 0.02;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const x0 = cx + dx * coreR * 0.55;
      const y0 = cy + dy * coreR * 0.55;
      const x1 = cx + dx * (coreR * 0.55 + len);
      const y1 = cy + dy * (coreR * 0.55 + len);
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, `rgba(255, 215, 0, ${(0.5 + 0.4 * flicker).toFixed(3)})`);
      grad.addColorStop(0.35, `rgba(255, 140, 0, ${(0.35 * flicker).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = spike.width * (1 + lvl * 0.8);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // core body
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * breathe);
    core.addColorStop(0, '#FFFDF2');
    core.addColorStop(0.3, '#FFE873');
    core.addColorStop(0.62, '#FFD700');
    core.addColorStop(0.88, '#FF8C00');
    core.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * breathe, 0, Math.PI * 2);
    ctx.fill();

    // white-hot center
    const hotR = coreR * 0.5 * breathe;
    const hot = ctx.createRadialGradient(cx, cy, 0, cx, cy, hotR);
    hot.addColorStop(0, `rgba(255, 255, 255, ${(0.8 + 0.2 * lvl).toFixed(3)})`);
    hot.addColorStop(1, 'rgba(255, 232, 115, 0)');
    ctx.fillStyle = hot;
    ctx.beginPath();
    ctx.arc(cx, cy, hotR, 0, Math.PI * 2);
    ctx.fill();
  });

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
