import { useEffect, useRef } from 'react';
import { clamp } from './useCanvasLoop';

const BAR_COUNT = 48;
const MAX_BAR_PX = 76;

/**
 * Audio-reactive waveform bars below the orb. Heights are driven by a rAF
 * loop writing transforms directly to the DOM (no re-render per frame); the
 * audioLevel prop is eased internally so bars stay smooth at any prop rate.
 */
export default function Waveform({
  isListening,
  audioLevel,
  barCount = BAR_COUNT,
}: {
  isListening: boolean;
  audioLevel: number;
  barCount?: number;
}) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef({ level: 0, isListening, audioLevel });
  stateRef.current.isListening = isListening;
  stateRef.current.audioLevel = audioLevel;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;
      const target = clamp(st.audioLevel, 0, 100) / 100;
      const cur = st.level + (target - st.level) * Math.min(1, dt * (target > st.level ? 14 : 6));
      st.level = cur;
      const t = now / 1000;
      for (let i = 0; i < barCount; i += 1) {
        const bar = barsRef.current[i];
        if (!bar) continue;
        const win = Math.pow(Math.sin((Math.PI * (i + 0.5)) / barCount), 0.8);
        let frac: number;
        if (st.isListening) {
          const jitter = 0.55 + 0.45 * Math.sin(t * (2.2 + (i % 7) * 0.85) + i * 1.7);
          frac = cur * win * jitter * 1.25;
        } else {
          frac = 0.08 + 0.05 * Math.sin(t * 1.6 + i * 0.55) * win;
        }
        frac = clamp(frac, 0.02, 1);
        bar.style.transform = `scaleY(${frac.toFixed(3)})`;
        bar.style.opacity = String(0.45 + 0.55 * frac);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [barCount]);

  return (
    <div
      data-testid="waveform-container"
      className="flex w-full max-w-xl items-end justify-center gap-[3px] sm:gap-1"
      style={{ height: MAX_BAR_PX }}
    >
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          data-testid={`waveform-bar-${i}`}
          className="h-full w-1 origin-bottom rounded-full bg-gradient-to-t from-[#FF8C00] via-[#FFB300] to-[#FFD700] shadow-[0_0_8px_rgba(255,140,0,0.55)] will-change-transform"
          style={{ transform: 'scaleY(0.06)' }}
        />
      ))}
    </div>
  );
}
