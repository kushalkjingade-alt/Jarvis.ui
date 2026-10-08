import { useEffect, useState } from 'react';
import { Radar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { VoiceEngineStatus } from '@/hooks/useVoiceEngine';

const STATUS_CONFIG: Record<VoiceEngineStatus, { label: string; className: string }> = {
  idle: { label: 'STANDBY', className: 'border border-white/10 bg-[#161B22] text-slate-400' },
  requesting: { label: 'LINKING', className: 'border border-[#FF8C00]/40 bg-[#2B1A00] text-[#FFB300]' },
  listening: {
    label: 'LISTENING',
    className: 'animate-badge-blink border border-[#FFD700]/50 bg-[#2B1A00] text-[#FFD700]',
  },
  simulated: {
    label: 'SIMULATED INPUT',
    className: 'border border-[#FF8C00]/50 bg-[#2B1A00] text-[#FF8C00]',
  },
};

/** HUD tactical corner brackets for glass panels. */
export function Brackets() {
  return (
    <>
      <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-[#FF8C00]/50" />
      <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-[#FF8C00]/50" />
      <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-[#FF8C00]/50" />
      <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-[#FF8C00]/50" />
    </>
  );
}

function FpsCounter() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames += 1;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span data-testid="fps-display" className="text-base font-bold tracking-normal text-[#FFD700]">
      {fps}
    </span>
  );
}

interface HudTelemetryProps {
  status: VoiceEngineStatus;
  audioLevel: number;
  isListening: boolean;
}

/** JARVIS-style telemetry header: status badge, audio level, core freq, ring velocity, FPS. */
export default function HudTelemetry({ status, audioLevel, isListening }: HudTelemetryProps) {
  const level = Math.round(Math.min(100, Math.max(0, audioLevel)));
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="relative z-20 mx-auto w-full max-w-5xl px-4 pt-5">
      <header
        data-testid="telemetry-panel"
        className="relative flex flex-col gap-4 rounded-xl border border-[#FF8C00]/20 bg-[#0D1117]/85 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
      >
        <Brackets />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#FF8C00]/40 bg-[#2B1A00] shadow-[0_0_18px_rgba(255,140,0,0.35)]">
            <Radar className="h-5 w-5 text-[#FFD700]" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold tracking-[0.18em] text-white">J.A.R.V.I.S</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FF8C00]/80">
              Voice Interface · MK.II
            </p>
          </div>
          <Badge
            data-testid="status-badge"
            variant="outline"
            className={`ml-2 font-mono text-[10px] tracking-[0.2em] ${cfg.className}`}
          >
            {cfg.label}
          </Badge>
        </div>
        <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          <div className="flex flex-col gap-1">
            <span>Audio Level</span>
            <span data-testid="audio-level-display" className="text-base font-bold tracking-normal text-[#FFD700]">
              {String(level).padStart(3, '0')}
            </span>
          </div>
          <div className="hidden flex-col gap-1 sm:flex">
            <span>Core Freq</span>
            <span data-testid="core-freq-display" className="text-base font-bold tracking-normal text-[#FFD700]">
              {(42 + level * 0.86).toFixed(1)}
            </span>
          </div>
          <div className="hidden flex-col gap-1 sm:flex">
            <span>Ring Vel</span>
            <span data-testid="ring-velocity-display" className="text-base font-bold tracking-normal text-[#FFD700]">
              ×{isListening ? 3 : 1}
            </span>
          </div>
          <div className="hidden flex-col gap-1 sm:flex">
            <span>FPS</span>
            <FpsCounter />
          </div>
          <div
            data-testid="audio-level-bar"
            className="hidden h-1.5 w-40 self-center overflow-hidden rounded-full bg-white/10 md:block"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF8C00] to-[#FFD700] transition-[width] duration-150"
              style={{ width: `${level}%` }}
            />
          </div>
        </div>
      </header>
    </div>
  );
}
