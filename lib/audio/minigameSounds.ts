/**
 * Procedural Web Audio sound engine for the BHOS Rally mini-game.
 * All effects are synthesized in the browser — no audio assets required.
 * Optionally, local sound files can be registered via `registerSoundFile`;
 * a registered file takes priority over the synthesized fallback.
 */

export type HitSoundType = 'paddle' | 'wall' | 'table';
export type SoundKey = HitSoundType | 'win' | 'lose';

export const SOUND_MUTED_STORAGE_KEY = 'bhos_rally_sound_muted';

let audioCtx: AudioContext | null = null;
let muted = false;
const soundFiles: Partial<Record<SoundKey, string>> = {};

/**
 * Lazily creates / resumes the AudioContext. Must be triggered from a user
 * gesture the first time (click, key press, touch) to satisfy autoplay policies.
 */
export const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/** Call from a user gesture (Start button, pointer down, key press). */
export const unlockAudio = () => {
  getAudioContext();
};

export const isSoundMuted = () => muted;

export const setSoundMuted = (value: boolean) => {
  muted = value;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SOUND_MUTED_STORAGE_KEY, value ? '1' : '0');
    } catch {}
  }
};

export const loadSoundMutedPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    muted = localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === '1';
  } catch {
    muted = false;
  }
  return muted;
};

/**
 * Optional: use a local sound file (e.g. '/sounds/paddle.mp3') instead of the
 * synthesized effect. Nothing is fetched until the sound is actually played.
 */
export const registerSoundFile = (key: SoundKey, url: string) => {
  soundFiles[key] = url;
};

const playRegisteredFile = (key: SoundKey): boolean => {
  const url = soundFiles[key];
  if (!url || typeof Audio === 'undefined') return false;
  try {
    const el = new Audio(url);
    el.volume = 0.6;
    el.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
};

export const playHitSound = (type: HitSoundType = 'paddle') => {
  if (muted) return;
  if (playRegisteredFile(type)) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  // Wooden/rubber paddle "thwack" / "pop"
  const baseFreq = type === 'paddle' ? 580 : 380;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  osc.start(now);
  osc.stop(now + 0.07);
};

export const playWinSound = () => {
  if (muted) return;
  if (playRegisteredFile('win')) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Ascending cheerful victory arpeggio (C5 -> E5 -> G5 -> C6)
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const startTime = ctx.currentTime + index * 0.1;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

    osc.start(startTime);
    osc.stop(startTime + 0.25);
  });
};

export const playLoseSound = () => {
  if (muted) return;
  if (playRegisteredFile('lose')) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Descending sad tone (F4 -> D#4 -> C4)
  const notes = [349.23, 311.13, 261.63];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const startTime = ctx.currentTime + index * 0.14;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

    osc.start(startTime);
    osc.stop(startTime + 0.22);
  });
};
