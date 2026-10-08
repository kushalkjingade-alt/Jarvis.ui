import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceEngineStatus = 'idle' | 'requesting' | 'listening' | 'simulated';

interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  isFinal: boolean;
  0: SpeechAlternativeLike;
}
interface SpeechResultListLike {
  length: number;
  [index: number]: SpeechResultLike;
}
interface SpeechEventLike {
  resultIndex: number;
  results: SpeechResultListLike;
}
interface SpeechRecognizerLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechCtor = new () => SpeechRecognizerLike;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SIM_PHRASES = [
  'System diagnostics complete. All channels nominal.',
  'Voice interface calibrated and ready, sir.',
  'Core temperature stable. Output at ninety eight percent.',
  'Processing your next command.',
  'Audio spectrum analysis running in real time.',
];
const MAX_TRANSCRIPT = 600;
const cap = (s: string) => (s.length > MAX_TRANSCRIPT ? s.slice(-MAX_TRANSCRIPT) : s);

/** Speech-cadence synthetic level (0-100) for environments without a microphone. */
function synthLevel(t: number): number {
  const phrase = Math.max(0, Math.sin(t * 0.42) * 0.7 + Math.sin(t * 0.19 + 1.3) * 0.3);
  const envelope = Math.pow(phrase, 1.3);
  const syllable = Math.abs(Math.sin(t * 10.7)) * (0.55 + 0.45 * Math.abs(Math.sin(t * 2.9)));
  const shimmer = 0.8 + 0.2 * Math.sin(t * 23.3) * Math.sin(t * 11.7);
  return Math.min(100, envelope * syllable * shimmer * 120 + 4 * envelope);
}

export interface VoiceEngine {
  isListening: boolean;
  status: VoiceEngineStatus;
  audioLevel: number;
  transcript: string;
  interim: string;
  micDenied: boolean;
  speechSupported: boolean;
  toggle: () => void;
  start: () => void;
  stop: () => void;
  startSimulated: () => void;
}

/**
 * Drives the whole visualization: getUserMedia + AnalyserNode for the 0-100
 * audioLevel, Web Speech API (SpeechRecognition) for the live transcript, and
 * a synthetic speech-cadence generator when the microphone is denied,
 * missing, or when the user asks for a demo signal.
 */
export function useVoiceEngine(): VoiceEngine {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<VoiceEngineStatus>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [micDenied, setMicDenied] = useState(false);
  const [speechSupported] = useState(() => getSpeechCtor() !== null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognizerLike | null>(null);
  const activeRef = useRef(false);
  const simRef = useRef(false);
  const simT0Ref = useRef(0);
  const simTimerRef = useRef(0);
  const phraseIdxRef = useRef(0);
  const wordIdxRef = useRef(0);
  const levelRef = useRef(0);
  const frameRef = useRef(0);

  const tick = useCallback(() => {
    if (!activeRef.current) return;
    let target = 0;
    const now = performance.now();
    if (simRef.current) {
      const elapsed = (now - simT0Ref.current) / 1000;
      target = synthLevel(elapsed);
      if (elapsed - simTimerRef.current > 0.42) {
        const phrase = SIM_PHRASES[phraseIdxRef.current % SIM_PHRASES.length];
        const words = phrase.split(' ');
        if (wordIdxRef.current >= words.length) {
          phraseIdxRef.current += 1;
          wordIdxRef.current = 0;
          simTimerRef.current = elapsed + 0.9;
          setInterim('');
          setTranscript((prev) => cap(prev ? `${prev} ${phrase}` : phrase));
        } else {
          const word = words[wordIdxRef.current];
          setInterim((prev) => (prev ? `${prev} ${word}` : word));
          wordIdxRef.current += 1;
        }
      }
    } else {
      const analyser = analyserRef.current;
      const data = timeDataRef.current;
      if (analyser && data) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        target = Math.min(100, Math.sqrt(sum / data.length) * 340);
      }
    }
    const prev = levelRef.current;
    const next = target > prev ? prev + (target - prev) * 0.45 : prev + (target - prev) * 0.15;
    levelRef.current = next;
    frameRef.current += 1;
    if (frameRef.current % 2 === 0) {
      const shown = Math.round(next * 10) / 10;
      setAudioLevel((p) => (Math.abs(p - shown) >= 0.4 ? shown : p));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    simRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const rec = recognitionRef.current;
    if (rec) {
      rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    timeDataRef.current = null;
    if (ctxRef.current) {
      void ctxRef.current.close().catch(() => undefined);
      ctxRef.current = null;
    }
    levelRef.current = 0;
    setAudioLevel(0);
    setInterim('');
    setIsListening(false);
    setStatus('idle');
  }, []);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    levelRef.current = 0;
    setTranscript('');
    setInterim('');
    setStatus('requesting');

    const begin = (micOk: boolean) => {
      if (!activeRef.current) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (ctxRef.current) {
          void ctxRef.current.close().catch(() => undefined);
          ctxRef.current = null;
        }
        return;
      }
      simRef.current = !micOk;
      simT0Ref.current = performance.now();
      simTimerRef.current = 0;
      phraseIdxRef.current = 0;
      wordIdxRef.current = 0;
      setIsListening(true);
      setStatus(micOk ? 'listening' : 'simulated');
      rafRef.current = requestAnimationFrame(tick);
    };

    const beginRecognition = () => {
      const Ctor = getSpeechCtor();
      if (!Ctor) return;
      try {
        const rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (event) => {
          let finalChunk = '';
          let interimChunk = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const res = event.results[i];
            const text = res[0].transcript;
            if (res.isFinal) finalChunk += text;
            else interimChunk += text;
          }
          if (finalChunk) setTranscript((prev) => cap(prev ? `${prev} ${finalChunk}` : finalChunk));
          setInterim(interimChunk);
        };
        rec.onend = () => {
          if (activeRef.current && !simRef.current) {
            try {
              rec.start();
            } catch {
              /* restart race — already running */
            }
          }
        };
        rec.onerror = () => undefined;
        recognitionRef.current = rec;
        rec.start();
      } catch {
        recognitionRef.current = null;
      }
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicDenied(true);
      begin(false);
      beginRecognition();
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!activeRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) throw new Error('AudioContext unavailable');
        const ctx = new Ctx();
        ctxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.55;
        ctx.createMediaStreamSource(stream).connect(analyser);
        analyserRef.current = analyser;
        timeDataRef.current = new Uint8Array(analyser.fftSize);
        begin(true);
      })
      .catch(() => {
        setMicDenied(true);
        begin(false);
      });

    beginRecognition();
  }, [tick]);

  const startSimulated = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    simRef.current = true;
    levelRef.current = 0;
    simT0Ref.current = performance.now();
    simTimerRef.current = 0;
    phraseIdxRef.current = 0;
    wordIdxRef.current = 0;
    setTranscript('');
    setInterim('');
    setIsListening(true);
    setStatus('simulated');
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const toggle = useCallback(() => {
    if (activeRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    isListening,
    status,
    audioLevel,
    transcript,
    interim,
    micDenied,
    speechSupported,
    toggle,
    start,
    stop,
    startSimulated,
  };
}
