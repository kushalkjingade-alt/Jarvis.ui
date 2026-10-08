import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Waves } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import VoiceOrb from '@/components/voice-orb/VoiceOrb';
import HudTelemetry, { Brackets } from '@/components/voice-orb/HudTelemetry';
import { useVoiceEngine } from '@/hooks/useVoiceEngine';
import { cn } from '@/lib/utils';

const HINTS: Record<string, string> = {
  idle: 'Tap start and speak — or run a demo signal',
  requesting: 'Establishing microphone link…',
  listening: 'Live input active — speak into your microphone',
  simulated: 'Synthetic voice feed driving the core',
};

export default function Home() {
  const engine = useVoiceEngine();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (engine.micDenied && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning('Microphone unavailable — running simulated voice input.', {
        description: 'Grant mic permission and restart listening for live levels.',
      });
    }
  }, [engine.micDenied]);

  const simulating = engine.isListening && engine.status === 'simulated';

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#060709] text-slate-100">
      {/* HUD grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,140,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,140,0,0.05)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      {/* ambient radial glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(255,140,0,0.14) 0%, rgba(255,215,0,0.04) 35%, transparent 70%)',
        }}
      />
      {/* vignette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10"
        style={{ background: 'radial-gradient(circle at center, transparent 45%, rgba(0,0,0,0.7) 100%)' }}
      />
      {/* scanlines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30 opacity-25 [background:linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] [background-size:100%_4px]"
      />

      <HudTelemetry status={engine.status} audioLevel={engine.audioLevel} isListening={engine.isListening} />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 pb-20 pt-6 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center"
        >
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            J.A.R.V.I.S <span className="text-[#FFD700]">Voice Core</span>
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#FF8C00]/80">
            AI Voice Interface · Audio Reactive
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full"
        >
          <VoiceOrb isListening={engine.isListening} audioLevel={engine.audioLevel} />
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            data-testid="mic-toggle-button"
            onClick={() => engine.toggle()}
            disabled={engine.status === 'requesting'}
            className={cn(
              'h-14 gap-3 rounded-full px-8 text-sm font-bold uppercase tracking-[0.2em] transition-all hover:scale-105',
              engine.status === 'listening'
                ? 'animate-jarvis-pulse bg-[#FF8C00] text-[#060709] hover:bg-[#FFA020]'
                : 'bg-[#1F242C] text-slate-100 hover:bg-[#2B323D]',
            )}
          >
            {engine.isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {engine.status === 'requesting'
              ? 'Linking…'
              : engine.isListening
                ? 'Stop Listening'
                : 'Start Listening'}
          </Button>
          <Button
            data-testid="simulate-toggle-button"
            variant="outline"
            onClick={() => (simulating ? engine.stop() : engine.startSimulated())}
            className="h-14 gap-2 rounded-full border-[#FFD700]/40 px-6 font-mono text-xs uppercase tracking-[0.2em] text-[#FFD700] hover:bg-[#FFD700]/10"
          >
            <Waves className="h-4 w-4" />
            {simulating ? 'Stop Demo' : 'Demo Signal'}
          </Button>
        </div>

        <p
          data-testid="status-hint"
          className="max-w-md text-center font-mono text-xs uppercase tracking-[0.18em] text-slate-500"
        >
          {HINTS[engine.status] ?? HINTS.idle}
        </p>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
          data-testid="transcript-panel"
          className="relative w-full max-w-2xl rounded-xl border border-[#FF8C00]/20 bg-[#0D1117]/85 p-5 backdrop-blur-xl"
        >
          <Brackets />
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-[#FF8C00]/80">
              Transcript // Live Feed
            </h2>
            <Badge
              variant="outline"
              className="border-[#FFD700]/40 font-mono text-[10px] tracking-[0.15em] text-[#FFD700]"
            >
              {engine.speechSupported ? 'WEB SPEECH API' : 'RECOGNIZER N/A'}
            </Badge>
          </div>
          <p
            data-testid="transcript-readout"
            aria-live="polite"
            className="min-h-14 text-base leading-relaxed text-slate-200 sm:text-lg"
          >
            {engine.transcript || (
              <span className="text-slate-600">
                Awaiting voice input — the J.A.R.V.I.S core is standing by…
              </span>
            )}
          </p>
          {engine.interim && (
            <p aria-live="polite" className="mt-1 text-base italic leading-relaxed text-[#FFD700]/70 sm:text-lg">
              {engine.interim}
              <span className="animate-pulse">▍</span>
            </p>
          )}
        </motion.section>

        <footer className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-slate-600">
          Voice Sphere Visualizer · Web Speech API · Canvas 2D · Framer Motion
        </footer>
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
