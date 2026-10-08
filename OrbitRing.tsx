import { useRef } from 'react';
import { useAnimationFrame } from 'motion/react';

export interface OrbitRingProps {
  /** Ring diameter as a % of the stage. */
  size: number;
  /** Static 3D tilt in degrees. */
  tiltX: number;
  tiltY: number;
  /** Base seconds per revolution (before the listening speed multiplier). */
  duration: number;
  /** 1 idle, 3 while listening (spec: ring rotation speed x3). */
  speedMultiplier: number;
  reverse?: boolean;
  testId: string;
  ringClassName: string;
}

/**
 * A tilted, border-drawn ring spinning around its own normal via rAF so the
 * speed multiplier glides smoothly instead of snapping between durations.
 */
export default function OrbitRing({
  size,
  tiltX,
  tiltY,
  duration,
  speedMultiplier,
  reverse = false,
  testId,
  ringClassName,
}: OrbitRingProps) {
  const spinRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(Math.random() * 360);
  const cfgRef = useRef({ duration, speedMultiplier, reverse });
  cfgRef.current = { duration, speedMultiplier, reverse };

  useAnimationFrame((_, delta) => {
    const { duration: dur, speedMultiplier: mult, reverse: rev } = cfgRef.current;
    angleRef.current += (delta / 1000) * (360 / dur) * mult * (rev ? -1 : 1);
    if (spinRef.current) {
      spinRef.current.style.transform = `rotate(${angleRef.current}deg)`;
    }
  });

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2"
      style={{ width: `${size}%`, height: `${size}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div
        className="h-full w-full"
        style={{ transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`, transformStyle: 'preserve-3d' }}
      >
        <div
          ref={spinRef}
          data-testid={testId}
          className={`h-full w-full rounded-full will-change-transform ${ringClassName}`}
        />
      </div>
    </div>
  );
}
