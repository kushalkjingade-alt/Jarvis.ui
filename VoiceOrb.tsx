import { motion } from 'motion/react';
import OrbCore from './OrbCore';
import WireframeSphereCanvas from './WireframeSphereCanvas';
import OrbitRing from './OrbitRing';
import ParticleField from './ParticleField';
import Waveform from './Waveform';

export interface VoiceOrbProps {
  isListening: boolean;
  /** 0-100 */
  audioLevel: number;
}

/**
 * VoiceOrb — the full orb stack: canvas wireframe sphere + particle field +
 * glowing core, three tilted border rings above them, and the waveform bars
 * below. Reactivity spec while isListening: core scale = 1 + audioLevel/100,
 * ring rotation speed x3, particle speed x2.
 */
export default function VoiceOrb({ isListening, audioLevel }: VoiceOrbProps) {
  const speedMultiplier = isListening ? 3 : 1;

  return (
    <div className="flex w-full flex-col items-center gap-7">
      <div className="relative mx-auto aspect-square w-full max-w-[540px]" data-testid="voice-orb-stage">
        {/* ambient halo */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-[-18%] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,140,0,0.16) 0%, rgba(255,215,0,0.05) 45%, transparent 70%)',
          }}
          animate={
            isListening ? { opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] } : { opacity: 0.55, scale: 1 }
          }
          transition={isListening ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.6 }}
        />

        {/* canvas stack: wireframe sphere + particles + core (bottom to top) */}
        <div className="absolute inset-0" data-testid="voice-orb-canvas">
          <WireframeSphereCanvas isListening={isListening} audioLevel={audioLevel} />
          <ParticleField isListening={isListening} audioLevel={audioLevel} />
          <OrbCore isListening={isListening} audioLevel={audioLevel} />
        </div>

        {/* three rotating gimbal rings (div with border) */}
        <OrbitRing
          size={103}
          tiltX={65}
          tiltY={15}
          duration={18}
          speedMultiplier={speedMultiplier}
          testId="orbit-ring-1"
          ringClassName="border-[3px] border-[#FF8C00]/40 border-t-[#FFD700]/90 border-b-transparent"
        />
        <OrbitRing
          size={121}
          tiltX={-45}
          tiltY={30}
          duration={12}
          speedMultiplier={speedMultiplier}
          reverse
          testId="orbit-ring-2"
          ringClassName="border-2 border-dashed border-[#FFD700]/35"
        />
        <OrbitRing
          size={139}
          tiltX={10}
          tiltY={80}
          duration={24}
          speedMultiplier={speedMultiplier}
          testId="orbit-ring-3"
          ringClassName="border border-[#FF8C00]/25 border-l-[#FF8C00]/75 border-b-[#FFD700]/55"
        />
      </div>

      <Waveform isListening={isListening} audioLevel={audioLevel} />
    </div>
  );
}
