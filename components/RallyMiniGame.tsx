'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Play,
  RotateCcw,
  Flame,
  Sparkles,
  LogIn,
  Loader2,
  Infinity as InfinityIcon,
} from 'lucide-react';
import ArcadeLeaderboard, { ARCADE_INFINITY_MODE } from './ArcadeLeaderboard';
import { getSupabaseClient } from '../lib/supabase/client';
import { invalidatePlayerProfileCache } from '../lib/data/store';
import { useTranslation } from '../lib/i18n';
import {
  playHitSound,
  playWinSound,
  playLoseSound,
  unlockAudio,
  isSoundMuted,
  setSoundMuted,
  loadSoundMutedPreference,
} from '../lib/audio/minigameSounds';

type Difficulty = 'easy' | 'medium' | 'hard' | 'infinity';

interface DifficultyConfig {
  labelAz: string;
  initialSpeed: number;
  maxSpeed: number;
  speedIncrement: number;
  aiMaxSpeed: number;
  aiReactionLerp: number;
  aiErrorMargin: number;
  paddleWidth: number;
}

const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    labelAz: 'Asan',
    initialSpeed: 5.2,
    maxSpeed: 10.5,
    speedIncrement: 0.22,
    aiMaxSpeed: 5.4,
    aiReactionLerp: 0.11,
    aiErrorMargin: 10,
    paddleWidth: 86,
  },
  medium: {
    labelAz: 'Orta',
    initialSpeed: 6.4,
    maxSpeed: 12.8,
    speedIncrement: 0.28,
    aiMaxSpeed: 7.4,
    aiReactionLerp: 0.16,
    aiErrorMargin: 6,
    paddleWidth: 76,
  },
  hard: {
    labelAz: 'Çətin',
    initialSpeed: 7.6,
    maxSpeed: 15.0,
    speedIncrement: 0.35,
    aiMaxSpeed: 9.8,
    aiReactionLerp: 0.23,
    aiErrorMargin: 2,
    paddleWidth: 68,
  },
  // Infinity Rally: the bot never misses, the ball speeds up with every player return.
  // initialSpeed 5.33 px/frame == 320 px/s; maxSpeed 15.5 px/frame == 930 px/s.
  infinity: {
    labelAz: '♾️ Sonsuz Ralli',
    initialSpeed: 320 / 60,
    maxSpeed: 15.5,
    speedIncrement: 0,
    aiMaxSpeed: 42,
    aiReactionLerp: 0.45,
    aiErrorMargin: 26,
    paddleWidth: 80,
  },
};

/** Ball speed multiplier applied on every successful player return (Infinity mode). */
const INFINITY_ACCEL = 1.05;
const INFINITY_BEST_STORAGE_KEY = 'bhos_rally_infinity_high_score';
const INFINITY_PENDING_STORAGE_KEY = 'bhos_rally_infinity_pending_score';

/** Rally milestones: White -> Electric Yellow -> Burning Orange -> Crimson */
const TENSION_TIERS = [
  { min: 0, hex: '#F8FAFC', edge: '#CBD5E1', rgb: '248, 250, 252' },
  { min: 10, hex: '#FACC15', edge: '#EAB308', rgb: '250, 204, 21' },
  { min: 25, hex: '#F97316', edge: '#EA580C', rgb: '249, 115, 22' },
  { min: 50, hex: '#E11D48', edge: '#BE123C', rgb: '225, 29, 72' },
];

const getTensionTierIndex = (rally: number) => {
  let idx = 0;
  for (let i = 0; i < TENSION_TIERS.length; i++) {
    if (rally >= TENSION_TIERS[i].min) idx = i;
  }
  return idx;
};

const ARCADE_BADGE_NAMES: Record<string, string> = {
  rally_starter: 'Ralli Başlanğıcı',
  rally_master: 'Ralli Ustası',
  table_ruler: 'Masa Hakimi',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  rgb: string;
}

interface SubmitState {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'guest';
  rank?: number;
  best?: number;
  isNewBest?: boolean;
  badges?: string[];
  errorMessage?: string;
}

interface TelemetrySession {
  sessionId: string | null;
  sessionStartTime: number;
  moveEventsCount: number;
  untrustedEventsCount: number;
  syntheticSnapCount: number;
  contactOffsets: number[];
  clientYSamples: number[];
  lastPointerX: number;
  lastPointerTime: number;
}

function computeStdDev(values: number[]): number {
  if (values.length <= 1) return 1;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function evaluateNaturalInput(telemetry: TelemetrySession): boolean {
  const { moveEventsCount, untrustedEventsCount, contactOffsets } = telemetry;
  // Only reject if an overwhelming majority of events are explicitly untrusted
  if (untrustedEventsCount > 50 && moveEventsCount > 0 && untrustedEventsCount / moveEventsCount > 0.8) {
    return false;
  }
  // For normal play, bot solvers hit dead-center with absolute zero standard deviation
  if (contactOffsets.length >= 20) {
    const stdDev = computeStdDev(contactOffsets);
    if (stdDev === 0) {
      return false;
    }
  }
  return true;
}

function detectAutoPaddleUserscript(telemetry: TelemetrySession): { isCheat: boolean; reason?: string } {
  // 1. Untrusted synthetic mouse/pointer event flooding
  if (telemetry.untrustedEventsCount > 50 && telemetry.moveEventsCount > 0 && telemetry.untrustedEventsCount / telemetry.moveEventsCount > 0.8) {
    return { isCheat: true, reason: 'untrusted_events_exceeded' };
  }

  // 2. Monkey-patched CanvasRenderingContext2D.prototype.arc
  if (typeof window !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined') {
    try {
      const arcFn = CanvasRenderingContext2D.prototype.arc;
      const arcStr = Function.prototype.toString.call(arcFn);
      if (!arcStr.includes('[native code]')) {
        return { isCheat: true, reason: 'monkey_patched_arc' };
      }
    } catch {}
  }

  // 3. Absolute zero hit-offset standard deviation check over 25+ rallies (bot script locking exact center)
  if (telemetry.contactOffsets.length >= 25) {
    const stdDev = computeStdDev(telemetry.contactOffsets);
    if (stdDev === 0) {
      return { isCheat: true, reason: 'zero_hit_variance' };
    }
  }

  return { isCheat: false };
}

const HIGH_SCORE_STORAGE_KEY = 'bhos_rally_high_score';
const CANVAS_WIDTH = 440;
const CANVAS_HEIGHT = 560;
const TABLE_MARGIN_X = 32;
const TABLE_MARGIN_Y = 36;
const TABLE_WIDTH = CANVAS_WIDTH - TABLE_MARGIN_X * 2;
const TABLE_HEIGHT = CANVAS_HEIGHT - TABLE_MARGIN_Y * 2;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 6.5;

/**
 * Physics are frame-rate independent. All velocities / speeds in this file are
 * expressed in pixels per 60 Hz reference frame (i.e. `5` == 300 px/sec) and are
 * scaled each tick by `elapsedSeconds * PHYSICS_REFERENCE_FPS`, so the game runs
 * at identical speed on 60 Hz, 120 Hz, 144 Hz or 240 Hz displays.
 */
const PHYSICS_REFERENCE_FPS = 60;
/** Clamp so a background tab / long stall never teleports the ball (seconds). */
const MAX_FRAME_DELTA_SEC = 0.1;
/** Max physics sub-step (in reference frames) to avoid tunnelling through paddles. */
const MAX_SUBSTEP_FRAMES = 1.5;
/** Window used to estimate paddle velocity independent of refresh rate (ms). */
const PADDLE_VELOCITY_WINDOW_MS = 34;

interface TrailPoint {
  x: number;
  y: number;
}

export default function RallyMiniGame() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [currentRally, setCurrentRally] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [lastOutcomeText, setLastOutcomeText] = useState<string>('');
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [soundMuted, setSoundMutedState] = useState<boolean>(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState<number>(0);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });
  const [toast, setToast] = useState<{
    score: number;
    rank?: number;
    badges: string[];
    customMessage?: string;
  } | null>(null);

  const highScoresRef = useRef<{ classic: number; infinity: number }>({ classic: 0, infinity: 0 });
  const cloudBestRef = useRef<number | null>(null);
  const onInfinityGameOverRef = useRef<(score: number) => void>(() => {});
  const difficultyRef = useRef<Difficulty>(difficulty);
  const lastDprRef = useRef<number>(1);

  const telemetryRef = useRef<TelemetrySession>({
    sessionId: null,
    sessionStartTime: 0,
    moveEventsCount: 0,
    untrustedEventsCount: 0,
    syntheticSnapCount: 0,
    contactOffsets: [],
    clientYSamples: [],
    lastPointerX: CANVAS_WIDTH / 2,
    lastPointerTime: 0,
  });
  const sessionPromiseRef = useRef<Promise<string | null> | null>(null);

  const engineRef = useRef({
    status: 'idle' as 'idle' | 'playing' | 'gameover',
    rally: 0,
    playerX: CANVAS_WIDTH / 2,
    prevPlayerX: CANVAS_WIDTH / 2,
    playerVx: 0,
    aiX: CANVAS_WIDTH / 2,
    aiTargetOffset: 0,
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballVx: 0,
    ballVy: 0,
    ballSpeed: 6.4,
    ballSpin: 0,
    trail: [] as TrailPoint[],
    hitFlash: 0,
    trailAccum: 0,
    particles: [] as Particle[],
    posHistory: [] as { t: number; x: number }[],
    lastFrameTime: 0,
  });

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    setSoundMutedState(loadSoundMutedPreference());
  }, []);

  const toggleSound = () => {
    const next = !isSoundMuted();
    setSoundMuted(next);
    setSoundMutedState(next);
    if (!next) unlockAudio();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedClassic = parseInt(localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || '0', 10);
        let savedInfinity = parseInt(
          localStorage.getItem(INFINITY_BEST_STORAGE_KEY) || '0',
          10
        );
        // Automatically purge any 778 or fraudulent score from local storage
        if (savedInfinity >= 700) {
          savedInfinity = 0;
          try {
            localStorage.removeItem(INFINITY_BEST_STORAGE_KEY);
            localStorage.removeItem(INFINITY_PENDING_STORAGE_KEY);
          } catch {}
        }
        highScoresRef.current = {
          classic: !isNaN(savedClassic) && savedClassic > 0 ? savedClassic : 0,
          infinity: !isNaN(savedInfinity) && savedInfinity > 0 ? savedInfinity : 0,
        };
        setHighScore(
          difficultyRef.current === 'infinity'
            ? highScoresRef.current.infinity
            : highScoresRef.current.classic
        );
      } catch {}
    }
  }, []);

  const persistHighScore = useCallback((score: number) => {
    const key = difficultyRef.current === 'infinity' ? 'infinity' : 'classic';
    if (score > highScoresRef.current[key]) {
      highScoresRef.current[key] = score;
      setHighScore(score);
      setIsNewRecord(true);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            key === 'infinity' ? INFINITY_BEST_STORAGE_KEY : HIGH_SCORE_STORAGE_KEY,
            String(score)
          );
        } catch {}
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Auth + arcade leaderboard submission (Infinity mode only)
  // ---------------------------------------------------------------------------
  const readPendingScore = () => {
    try {
      const v = parseInt(localStorage.getItem(INFINITY_PENDING_STORAGE_KEY) || '0', 10);
      return !isNaN(v) && v > 0 ? v : 0;
    } catch {
      return 0;
    }
  };
  const writePendingScore = (score: number) => {
    try {
      if (score > readPendingScore()) {
        localStorage.setItem(INFINITY_PENDING_STORAGE_KEY, String(score));
      }
    } catch {}
  };
  const clearPendingScore = () => {
    try {
      localStorage.removeItem(INFINITY_PENDING_STORAGE_KEY);
    } catch {}
  };

  const startArcadeSession = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return null;
      const { data, error } = await supabase.rpc('start_arcade_session', {
        p_mode: ARCADE_INFINITY_MODE,
      });
      if (error) {
        console.warn('[Arcade Anti-Cheat] Failed to start signed session:', error.message);
        return null;
      }
      return (data as string) || null;
    } catch {
      return null;
    }
  }, []);

  const submitInfinityScore = async (
    score: number,
    userId: string,
    sessionId: string | null,
    durationSeconds: number,
    isNatural: boolean
  ) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      writePendingScore(score);
      setSubmitState({
        status: 'error',
        errorMessage: t('arcade.offline_saved', 'Serverlə əlaqə qurulmadı. Nəticə bu cihazda saxlanıldı.'),
      });
      return;
    }

    setSubmitState({ status: 'saving' });
    try {
      const { data, error } = await supabase.rpc('submit_arcade_score', {
        p_session_id: sessionId || null,
        p_score: score,
        p_mode: ARCADE_INFINITY_MODE,
        p_duration_seconds: Math.round(durationSeconds * 100) / 100,
        p_is_natural_input: isNatural,
      });
      if (error) throw error;

      const res = (data || {}) as {
        best_score?: number;
        is_new_best?: boolean;
        rank?: number;
        badges_awarded?: string[];
      };
      const best = Number(res.best_score ?? score);
      const badges = Array.isArray(res.badges_awarded) ? res.badges_awarded : [];

      cloudBestRef.current = best;
      clearPendingScore();
      highScoresRef.current.infinity = best;
      try {
        localStorage.setItem(INFINITY_BEST_STORAGE_KEY, String(best));
      } catch {}
      if (difficultyRef.current === 'infinity') {
        setHighScore(best);
      }
      setSubmitState({
        status: 'saved',
        rank: res.rank,
        best,
        isNewBest: Boolean(res.is_new_best),
        badges,
      });
      setLeaderboardRefreshKey((k) => k + 1);

      if (res.is_new_best) {
        setToast({ score: best, rank: res.rank, badges });
        playWinSound();
      }
      if (badges.length > 0) {
        invalidatePlayerProfileCache(userId);
      }
    } catch (err: any) {
      const msg = err?.message || t('arcade.submit_error', 'Nəticə göndərilərkən xəta baş verdi.');
      setSubmitState({
        status: 'error',
        errorMessage: msg,
      });
    }
  };

  onInfinityGameOverRef.current = async (score: number) => {
    if (score <= 0) {
      setSubmitState({ status: 'idle' });
      return;
    }

    // Countermeasure 3: Check for auto-paddle userscript and synthetic manipulation
    const cheatCheck = detectAutoPaddleUserscript(telemetryRef.current);
    if (cheatCheck.isCheat) {
      console.warn('[Anti-Cheat] Auto-paddle userscript detected:', cheatCheck.reason);
      const anticheatMsg = t('arcade.anticheat_detected', 'Avto-raket aşkarlandı! 🏓 Öz gücünlə oyna!');
      setSubmitState({
        status: 'error',
        errorMessage: anticheatMsg,
      });
      setToast({
        score,
        badges: [],
        customMessage: anticheatMsg,
      });
      playLoseSound();
      return; // Block submit_arcade_score call entirely!
    }

    if (!authUserId) {
      writePendingScore(score);
      setSubmitState({ status: 'guest' });
      return;
    }
    if (score > (cloudBestRef.current ?? 0)) {
      const now = performance.now();
      const tel = telemetryRef.current;
      const durationSeconds = Math.max(0, (now - tel.sessionStartTime) / 1000);
      const isNatural = evaluateNaturalInput(tel);

      if (!isNatural) {
        const anticheatMsg = t('arcade.anticheat_detected', 'Avto-raket aşkarlandı! 🏓 Öz gücünlə oyna!');
        setSubmitState({
          status: 'error',
          errorMessage: anticheatMsg,
        });
        setToast({
          score,
          badges: [],
          customMessage: anticheatMsg,
        });
        playLoseSound();
        return;
      }

      let sessionId = tel.sessionId;
      if (!sessionId && sessionPromiseRef.current) {
        try {
          sessionId = await Promise.race([
            sessionPromiseRef.current,
            new Promise<null>((res) => setTimeout(() => res(null), 1200)),
          ]);
        } catch {
          sessionId = null;
        }
      }

      void submitInfinityScore(score, authUserId, sessionId, durationSeconds, isNatural);
    } else {
      setSubmitState({ status: 'idle' });
    }
  };

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setAuthUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // When a user is signed in: learn their cloud best, and push any score earned as a guest.
  useEffect(() => {
    if (!authUserId) {
      cloudBestRef.current = null;
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;
    (async () => {
      let cloudBest = 0;
      try {
        const { data } = await supabase.rpc('get_my_arcade_standing', {
          p_mode: ARCADE_INFINITY_MODE,
        });
        const first = Array.isArray(data) ? data[0] : data;
        cloudBest = first && first.score != null ? Number(first.score) : 0;
      } catch {}
      if (cancelled) return;
      cloudBestRef.current = cloudBest;
      // When signed in, the verified cloud score is the authoritative source of truth.
      // If an admin or anti-cheat reset the progress (cloudBest < local),
      // reset local storage down to cloudBest so new legitimate records
      // are recognized, displayed, and submitted cleanly!
      if (cloudBest !== highScoresRef.current.infinity) {
        highScoresRef.current.infinity = cloudBest;
        try {
          localStorage.setItem(INFINITY_BEST_STORAGE_KEY, String(cloudBest));
          localStorage.removeItem(INFINITY_PENDING_STORAGE_KEY);
        } catch {}
        if (difficultyRef.current === 'infinity') {
          setHighScore(cloudBest);
        }
      }

      const pending = readPendingScore();
      if (pending > 0) {
        clearPendingScore();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleScoreDeleted = useCallback(
    (deletedUserId: string) => {
      if (authUserId === deletedUserId) {
        cloudBestRef.current = 0;
        highScoresRef.current.infinity = 0;
        if (difficultyRef.current === 'infinity') {
          setHighScore(0);
        }
        try {
          localStorage.removeItem(INFINITY_BEST_STORAGE_KEY);
          localStorage.removeItem(INFINITY_PENDING_STORAGE_KEY);
        } catch {}
      }
      setLeaderboardRefreshKey((k) => k + 1);
    },
    [authUserId]
  );

  const startOrResetGame = useCallback(
    (selectedDiff?: Difficulty) => {
      const activeDiff = selectedDiff ?? difficultyRef.current;
      const cfg = DIFFICULTY_SETTINGS[activeDiff];
      const st = engineRef.current;

      const launchAngle = (Math.random() - 0.5) * 0.55;
      const speed = cfg.initialSpeed;

      st.status = 'playing';
      st.rally = 0;
      st.playerX = CANVAS_WIDTH / 2;
      st.prevPlayerX = CANVAS_WIDTH / 2;
      st.playerVx = 0;
      st.aiX = CANVAS_WIDTH / 2;
      st.aiTargetOffset = 0;
      st.ballX = CANVAS_WIDTH / 2;
      st.ballY = CANVAS_HEIGHT / 2 + 24;
      st.ballSpeed = speed;
      st.ballVx = Math.sin(launchAngle) * speed;
      st.ballVy = -Math.cos(launchAngle) * speed;
      st.ballSpin = 0;
      st.trail = [];
      st.hitFlash = 0;
      st.trailAccum = 0;
      st.particles = [];
      st.posHistory = [];
      st.lastFrameTime = performance.now();

      // Reset micro-telemetry and initiate signed session for Infinity mode
      telemetryRef.current = {
        sessionId: null,
        sessionStartTime: performance.now(),
        moveEventsCount: 0,
        untrustedEventsCount: 0,
        syntheticSnapCount: 0,
        contactOffsets: [],
        clientYSamples: [],
        lastPointerX: CANVAS_WIDTH / 2,
        lastPointerTime: performance.now(),
      };

      if (activeDiff === 'infinity') {
        const p = startArcadeSession().then((sid) => {
          if (sid) {
            telemetryRef.current.sessionId = sid;
          }
          return sid;
        });
        sessionPromiseRef.current = p;
      } else {
        sessionPromiseRef.current = null;
      }

      unlockAudio();
      setSubmitState({ status: 'idle' });
      setToast(null);
      setCurrentRally(0);
      setIsNewRecord(false);
      setLastOutcomeText('');
      setGameState('playing');
    },
    []
  );

  const handleDifficultyChange = (nextDiff: Difficulty) => {
    setDifficulty(nextDiff);
    difficultyRef.current = nextDiff;
    setHighScore(
      nextDiff === 'infinity' ? highScoresRef.current.infinity : highScoresRef.current.classic
    );
    setIsNewRecord(false);
    setSubmitState({ status: 'idle' });
    if (engineRef.current.status === 'playing') {
      startOrResetGame(nextDiff);
    }
  };

  const checkEventTrust = (e: React.UIEvent | Event): boolean => {
    const raw = e as any;
    const native = raw?.nativeEvent ?? raw;
    // Only flag if the event is explicitly marked untrusted by the browser engine (isTrusted === false)
    if (native && native.isTrusted === false) {
      telemetryRef.current.untrustedEventsCount++;
      if (telemetryRef.current.untrustedEventsCount > 50) {
        return false;
      }
    }
    return true;
  };

  const updatePointerPosition = useCallback((clientX: number, clientY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const scaleX = CANVAS_WIDTH / rect.width;
    const relX = (clientX - rect.left) * scaleX;
    const cfg = DIFFICULTY_SETTINGS[difficultyRef.current];
    const halfPaddle = cfg.paddleWidth / 2;
    const minX = TABLE_MARGIN_X + halfPaddle - 8;
    const maxX = CANVAS_WIDTH - TABLE_MARGIN_X - halfPaddle + 8;
    const targetX = Math.max(minX, Math.min(maxX, relX));

    // Telemetry tracking for anti-cheat verification
    const now = performance.now();
    const tel = telemetryRef.current;
    tel.moveEventsCount++;
    const dt = now - tel.lastPointerTime;
    const dx = Math.abs(targetX - tel.lastPointerX);
    if (dt > 0 && dt < 12 && dx > 180) {
      tel.syntheticSnapCount++;
    }
    if (clientY !== undefined) {
      tel.clientYSamples.push(clientY);
      if (tel.clientYSamples.length > 100) {
        tel.clientYSamples.shift();
      }
    }
    tel.lastPointerX = targetX;
    tel.lastPointerTime = now;

    engineRef.current.playerX = targetX;
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!checkEventTrust(e)) return;
    unlockAudio();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!checkEventTrust(e)) return;
    updatePointerPosition(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!checkEventTrust(e)) return;
    if (e.touches && e.touches.length > 0) {
      updatePointerPosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!checkEventTrust(e)) return;
    unlockAudio();
    if (e.touches && e.touches.length > 0) {
      updatePointerPosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /**
     * Retina / High-DPI Scaling:
     * Synchronize the internal pixel buffer with the physical device pixel ratio (DPR),
     * keeping CSS layout dimensions in standard units so the table renders razor-sharp
     * on Retina/mobile screens without any coordinate mismatches.
     */
    const syncCanvasDpi = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const parentWidth = canvas.parentElement?.clientWidth ?? CANVAS_WIDTH;
      const cssWidth =
        rect.width > 0 ? rect.width : (parentWidth > 0 ? parentWidth : CANVAS_WIDTH);
      const cssHeight = Math.round((cssWidth * CANVAS_HEIGHT) / CANVAS_WIDTH);

      const targetBufferWidth = Math.max(1, Math.floor(cssWidth * dpr));
      const targetBufferHeight = Math.max(1, Math.floor(cssHeight * dpr));

      if (canvas.width !== targetBufferWidth || canvas.height !== targetBufferHeight) {
        canvas.width = targetBufferWidth;
        canvas.height = targetBufferHeight;
      }

      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    };

    syncCanvasDpi();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => syncCanvasDpi());
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener('resize', syncCanvasDpi);

    const playerPaddleY = CANVAS_HEIGHT - TABLE_MARGIN_Y - 22;
    const aiPaddleY = TABLE_MARGIN_Y + 22 - PADDLE_HEIGHT;

    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    };

    const updatePhysics = (dt: number, cfg: DifficultyConfig) => {
      const st = engineRef.current;
      const isInfinity = difficultyRef.current === 'infinity';

      if (st.status === 'playing') {
        st.ballVx += st.ballSpin * 0.035 * dt;
        st.ballSpin *= Math.pow(0.988, dt);
        if (isInfinity) {
          // Spin must never push the ball past the speed cap (keeps collisions reliable)
          st.ballVx = Math.max(-cfg.maxSpeed, Math.min(cfg.maxSpeed, st.ballVx));
        }

        st.ballX += st.ballVx * dt;
        st.ballY += st.ballVy * dt;

        const leftWall = TABLE_MARGIN_X + BALL_RADIUS;
        const rightWall = CANVAS_WIDTH - TABLE_MARGIN_X - BALL_RADIUS;

        if (st.ballX <= leftWall) {
          st.ballX = leftWall;
          st.ballVx = Math.abs(st.ballVx);
          playHitSound('wall');
        } else if (st.ballX >= rightWall) {
          st.ballX = rightWall;
          st.ballVx = -Math.abs(st.ballVx);
          playHitSound('wall');
        }

        const halfPaddle = cfg.paddleWidth / 2;
        const aiMinX = TABLE_MARGIN_X + halfPaddle - 6;
        const aiMaxX = CANVAS_WIDTH - TABLE_MARGIN_X - halfPaddle + 6;
        const desiredAiX =
          st.ballVy < 0
            ? st.ballX + st.aiTargetOffset
            : CANVAS_WIDTH / 2 + (st.ballX - CANVAS_WIDTH / 2) * 0.35;
        const diffX = desiredAiX - st.aiX;
        const maxAiStep = cfg.aiMaxSpeed * dt;
        const moveX = isInfinity
          ? Math.max(-maxAiStep, Math.min(maxAiStep, diffX * Math.min(1, cfg.aiReactionLerp * dt)))
          : Math.max(
              -maxAiStep,
              Math.min(maxAiStep, diffX * cfg.aiReactionLerp * dt * 2.4)
            );
        st.aiX = Math.max(aiMinX, Math.min(aiMaxX, st.aiX + moveX));

        // Infinity mode: the bot is invulnerable — lock onto the ball right before contact
        if (
          isInfinity &&
          st.ballVy < 0 &&
          st.ballY - BALL_RADIUS <= aiPaddleY + PADDLE_HEIGHT + 28
        ) {
          st.aiX = Math.max(
            aiMinX,
            Math.min(aiMaxX, st.ballX + st.aiTargetOffset)
          );
        }

        if (
          st.ballVy > 0 &&
          st.ballY + BALL_RADIUS >= playerPaddleY &&
          st.ballY - BALL_RADIUS <= playerPaddleY + PADDLE_HEIGHT + 6
        ) {
          if (
            st.ballX >= st.playerX - halfPaddle - BALL_RADIUS &&
            st.ballX <= st.playerX + halfPaddle + BALL_RADIUS
          ) {
            const hitOffset = Math.max(
              -1,
              Math.min(1, (st.ballX - st.playerX) / halfPaddle)
            );
            if (isInfinity) {
              telemetryRef.current.contactOffsets.push(hitOffset);
            }
            const nextRally = st.rally + 1;
            st.rally = nextRally;
            setCurrentRally(nextRally);
            persistHighScore(nextRally);

            st.ballSpeed = Math.min(
              cfg.maxSpeed,
              isInfinity
                ? st.ballSpeed * INFINITY_ACCEL
                : st.ballSpeed + cfg.speedIncrement
            );
            const bounceAngle = hitOffset * (Math.PI / 3.1);
            const clampedVx = Math.max(-8, Math.min(8, st.playerVx));
            st.ballSpin = clampedVx * 0.22 + hitOffset * 0.45;
            st.ballVx =
              Math.sin(bounceAngle) * st.ballSpeed + clampedVx * 0.18;
            st.ballVy = -Math.max(
              3.8,
              Math.cos(bounceAngle) * st.ballSpeed
            );
            st.ballY = playerPaddleY - BALL_RADIUS - 0.5;
            st.hitFlash = 1;
            playHitSound('paddle');
            st.aiTargetOffset =
              (Math.random() - 0.5) * 2 * cfg.aiErrorMargin;
          }
        }

        if (
          st.ballVy < 0 &&
          st.ballY - BALL_RADIUS <= aiPaddleY + PADDLE_HEIGHT &&
          st.ballY + BALL_RADIUS >= aiPaddleY - 6
        ) {
          if (
            st.ballX >= st.aiX - halfPaddle - BALL_RADIUS &&
            st.ballX <= st.aiX + halfPaddle + BALL_RADIUS
          ) {
            const hitOffset = Math.max(
              -1,
              Math.min(1, (st.ballX - st.aiX) / halfPaddle)
            );
            if (!isInfinity) {
              // Classic modes count every hit; Infinity counts only the player's returns
              const nextRally = st.rally + 1;
              st.rally = nextRally;
              setCurrentRally(nextRally);
              persistHighScore(nextRally);
            }

            if (!isInfinity) {
              st.ballSpeed = Math.min(
                cfg.maxSpeed,
                st.ballSpeed + cfg.speedIncrement * 0.65
              );
            }
            const returnAngle =
              hitOffset * (Math.PI / 3.4) + (Math.random() - 0.5) * 0.14;
            st.ballSpin = -hitOffset * 0.35;
            st.ballVx = Math.sin(returnAngle) * st.ballSpeed;
            st.ballVy = Math.max(
              3.8,
              Math.cos(returnAngle) * st.ballSpeed
            );
            st.ballY = aiPaddleY + PADDLE_HEIGHT + BALL_RADIUS + 0.5;
            st.hitFlash = 0.7;
            playHitSound('paddle');
          }
        }

        if (st.ballY - BALL_RADIUS > CANVAS_HEIGHT - 10) {
          st.status = 'gameover';
          setLastOutcomeText(tRef.current('arcade.outcome_rally_ended', 'Ralli başa çatdı! Yenidən cəhd edin.'));
          setGameState('gameover');
          playLoseSound();
          if (isInfinity) {
            onInfinityGameOverRef.current(st.rally);
          }
        } else if (isInfinity && st.ballY + BALL_RADIUS < 10) {
          // Safety net: the Infinity bot never misses, so just bounce the ball back
          st.ballVy = Math.abs(st.ballVy);
          st.ballY = 10 + BALL_RADIUS;
        } else if (st.ballY + BALL_RADIUS < 10) {
          const bonusRally = st.rally + 2;
          st.rally = bonusRally;
          setCurrentRally(bonusRally);
          persistHighScore(bonusRally);
          st.status = 'gameover';
          setLastOutcomeText(tRef.current('arcade.outcome_bot_missed', 'Bot topu qaytara bilmədi! (+2 Bonus Ralli)'));
          setGameState('gameover');
          playWinSound();
        }
      }

    };

    const step = (now: number) => {
      const st = engineRef.current;
      const cfg = DIFFICULTY_SETTINGS[difficultyRef.current];

      // Delta time in seconds (clamped), converted to 60 Hz reference frames.
      const last = st.lastFrameTime || now;
      const dtSec = Math.min(Math.max((now - last) / 1000, 0), MAX_FRAME_DELTA_SEC);
      st.lastFrameTime = now;
      const frames = dtSec * PHYSICS_REFERENCE_FPS;

      // Paddle velocity (px per reference frame) over a short time window.
      st.posHistory.push({ t: now, x: st.playerX });
      while (st.posHistory.length > 1 && now - st.posHistory[0].t > PADDLE_VELOCITY_WINDOW_MS) {
        st.posHistory.shift();
      }
      const oldest = st.posHistory[0];
      const spanFrames = ((now - oldest.t) / 1000) * PHYSICS_REFERENCE_FPS;
      st.playerVx = spanFrames > 0.05 ? (st.playerX - oldest.x) / spanFrames : 0;
      st.prevPlayerX = st.playerX;

      if (st.hitFlash > 0) {
        st.hitFlash = Math.max(0, st.hitFlash - 0.08 * frames);
      }

      const isInfinity = difficultyRef.current === 'infinity';
      const tierIdx = isInfinity ? getTensionTierIndex(st.rally) : 0;
      const tier = TENSION_TIERS[tierIdx];

      // Particles are time-based too (life decays per reference frame)
      if (st.particles.length > 0 && frames > 0) {
        for (const pt of st.particles) {
          pt.x += pt.vx * frames;
          pt.y += pt.vy * frames;
          pt.life -= 0.045 * frames;
        }
        st.particles = st.particles.filter((pt) => pt.life > 0);
      }

      if (st.status === 'playing' && frames > 0) {
        // Time-based ball trail (one point per reference frame, not per display frame)
        st.trailAccum += frames;
        if (st.trailAccum >= 1) {
          st.trail.push({ x: st.ballX, y: st.ballY });
          if (st.trail.length > (isInfinity ? 9 + tierIdx * 3 : 9)) {
            st.trail.shift();
          }
          // Infinity mode: emit tension particles once past the 10-rally milestone
          if (isInfinity && tierIdx > 0) {
            for (let n = 0; n < tierIdx; n++) {
              st.particles.push({
                x: st.ballX + (Math.random() - 0.5) * 4,
                y: st.ballY + (Math.random() - 0.5) * 4,
                vx: -st.ballVx * 0.12 + (Math.random() - 0.5) * 1.4,
                vy: -st.ballVy * 0.12 + (Math.random() - 0.5) * 1.4,
                life: 1,
                rgb: tier.rgb,
              });
            }
            if (st.particles.length > 90) {
              st.particles.splice(0, st.particles.length - 90);
            }
          }
          st.trailAccum %= 1;
        }

        const steps = Math.max(1, Math.ceil(frames / MAX_SUBSTEP_FRAMES));
        const subDt = frames / steps;
        for (let i = 0; i < steps && st.status === 'playing'; i++) {
          updatePhysics(subDt, cfg);
        }
      }

      // Check if display DPR changed dynamically (e.g., dragged between screens or zoomed)
      const currentDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      if (lastDprRef.current !== currentDpr) {
        lastDprRef.current = currentDpr;
        syncCanvasDpi();
      }

      const scaleX = canvas.width > 0 ? canvas.width / CANVAS_WIDTH : currentDpr;
      const scaleY = canvas.height > 0 ? canvas.height / CANVAS_HEIGHT : currentDpr;

      // Clear the physical canvas buffer cleanly
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Scale drawing context so all game coordinates stay in canonical 440x560 space
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Table ambient glow / outer base
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      drawRoundedRect(
        TABLE_MARGIN_X - 6,
        TABLE_MARGIN_Y - 6,
        TABLE_WIDTH + 12,
        TABLE_HEIGHT + 12,
        10
      );
      ctx.fill();

      // Main table surface
      ctx.fillStyle = '#1D4ED8';
      drawRoundedRect(
        TABLE_MARGIN_X,
        TABLE_MARGIN_Y,
        TABLE_WIDTH,
        TABLE_HEIGHT,
        6
      );
      ctx.fill();

      // Table inner half highlight (top court)
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(
        TABLE_MARGIN_X + 3,
        TABLE_MARGIN_Y + 3,
        TABLE_WIDTH - 6,
        TABLE_HEIGHT / 2 - 3
      );

      // White table boundary line with matched rounded corners for crisp edges
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 2;
      drawRoundedRect(
        TABLE_MARGIN_X + 1,
        TABLE_MARGIN_Y + 1,
        TABLE_WIDTH - 2,
        TABLE_HEIGHT - 2,
        5
      );
      ctx.stroke();

      // Center dividing line (crisp vertical alignment)
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, TABLE_MARGIN_Y + 3);
      ctx.lineTo(CANVAS_WIDTH / 2, TABLE_MARGIN_Y + TABLE_HEIGHT - 3);
      ctx.stroke();

      // Net posts and structure
      const netY = CANVAS_HEIGHT / 2;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(TABLE_MARGIN_X - 8, netY - 4, 8, 8);
      ctx.fillRect(CANVAS_WIDTH - TABLE_MARGIN_X, netY - 4, 8, 8);

      // Net shadow
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(TABLE_MARGIN_X - 4, netY + 3);
      ctx.lineTo(CANVAS_WIDTH - TABLE_MARGIN_X + 4, netY + 3);
      ctx.stroke();

      // White dashed net cord
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(TABLE_MARGIN_X - 4, netY);
      ctx.lineTo(CANVAS_WIDTH - TABLE_MARGIN_X + 4, netY);
      ctx.stroke();
      ctx.setLineDash([]);

      const halfPaddle = cfg.paddleWidth / 2;

      ctx.fillStyle = '#94A3B8';
      drawRoundedRect(
        st.aiX - halfPaddle,
        aiPaddleY,
        cfg.paddleWidth,
        PADDLE_HEIGHT,
        6
      );
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#E11D48';
      drawRoundedRect(
        st.playerX - halfPaddle,
        playerPaddleY,
        cfg.paddleWidth,
        PADDLE_HEIGHT,
        6
      );
      ctx.fill();
      ctx.strokeStyle = st.hitFlash > 0.2 ? '#FDA4AF' : '#FB7185';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const createCirclePath = (cx: number, cy: number, r: number): Path2D => {
        const p = new Path2D();
        if (typeof (p as any).roundRect === 'function') {
          (p as any).roundRect(cx - r, cy - r, r * 2, r * 2, r);
        } else {
          const k = 0.552284749831 * r;
          p.moveTo(cx, cy - r);
          p.bezierCurveTo(cx + k, cy - r, cx + r, cy - k, cx + r, cy);
          p.bezierCurveTo(cx + r, cy + k, cx + k, cy + r, cx, cy + r);
          p.bezierCurveTo(cx - k, cy + r, cx - r, cy + k, cx - r, cy);
          p.bezierCurveTo(cx - r, cy - k, cx - k, cy - r, cx, cy - r);
          p.closePath();
        }
        return p;
      };

      for (const pt of st.particles) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.2 + pt.life * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pt.rgb}, ${Math.max(0, pt.life) * 0.6})`;
        ctx.fill();
      }

      for (let i = 0; i < st.trail.length; i++) {
        const pt = st.trail[i];
        const ratio = (i + 1) / (st.trail.length + 1);
        const trailR = BALL_RADIUS * ratio * 0.85;
        const trailPath = createCirclePath(pt.x, pt.y, trailR);
        ctx.fillStyle = `rgba(${tier.rgb}, ${ratio * (tierIdx > 0 ? 0.42 : 0.28)})`;
        ctx.fill(trailPath);
      }

      // Countermeasure 2: HONEYPOT DECOY
      // Trigger Violentmonkey auto-paddle userscript hook (detects radius 6.5) with fake decoy
      // coordinates oscillating on the opposite side of the table with alpha = 0.
      ctx.save();
      ctx.globalAlpha = 0;
      const decoyOsc = now * 0.0035;
      const decoyX =
        st.ballX > CANVAS_WIDTH / 2
          ? TABLE_MARGIN_X + 40 + Math.abs(Math.sin(decoyOsc)) * 75
          : CANVAS_WIDTH - TABLE_MARGIN_X - 40 - Math.abs(Math.cos(decoyOsc)) * 75;
      const decoyY = TABLE_MARGIN_Y + 120 + Math.sin(decoyOsc * 1.3) * 60;
      ctx.beginPath();
      ctx.arc(decoyX, decoyY, 6.5, 0, Math.PI * 2);
      ctx.beginPath(); // Clears path immediately so nothing is drawn
      ctx.restore();

      // Countermeasure 2: REAL BALL DRAWING
      // Draw real ball and shadow via Path2D without invoking CanvasRenderingContext2D.prototype.arc!
      const shadowPath = createCirclePath(st.ballX, st.ballY + 2.5, BALL_RADIUS);
      ctx.fillStyle = 'rgba(11, 15, 25, 0.38)';
      ctx.fill(shadowPath);

      const ballPath = createCirclePath(st.ballX, st.ballY, BALL_RADIUS);
      if (tierIdx > 0) {
        ctx.shadowColor = tier.hex;
        ctx.shadowBlur = 6 + tierIdx * 5;
      }
      ctx.fillStyle = tier.hex;
      ctx.fill(ballPath);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = tier.edge;
      ctx.lineWidth = 1;
      ctx.stroke(ballPath);

      rafRef.current = requestAnimationFrame(step);
    };

    // Reset the time base when the tab/window regains focus so the ball
    // doesn't jump after the page was in the background.
    const resetTimeBase = () => {
      const st = engineRef.current;
      st.lastFrameTime = performance.now();
      st.posHistory = [];
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resetTimeBase();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', resetTimeBase);

    rafRef.current = requestAnimationFrame(step);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', resetTimeBase);
      window.removeEventListener('resize', syncCanvasDpi);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [persistHighScore]);

  const difficultyLabels: Record<Difficulty, string> = {
    easy: t('arcade.easy', 'Asan'),
    medium: t('arcade.medium', 'Orta'),
    hard: t('arcade.hard', 'Çətin'),
    infinity: t('arcade.infinity_badge', '♾️ Sonsuz Ralli'),
  };

  return (
    <div className="w-full max-w-[520px] mx-auto space-y-4">
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-700/15 border border-blue-700/40 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>BHOS Arcade</span>
          </div>
          <h2 className="text-lg font-display font-bold text-white">
            {t('arcade.title', 'Masaüstü Ralli')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('arcade.subtitle', 'Reketini idarə et, topu masada saxla və şəxsi rekordunu yenilə')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[84px]">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Flame className="w-3 h-3 text-rose-500" />
              <span>{t('arcade.current_rally', 'Cari Ralli')}</span>
            </div>
            <div className="text-lg font-mono font-extrabold text-white mt-0.5">
              {currentRally}
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-center min-w-[84px]">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>{t('arcade.record', 'Rekord')}</span>
            </div>
            <div className="text-lg font-mono font-extrabold text-amber-400 mt-0.5">
              {highScore}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="inline-flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1 gap-1">
          {(['easy', 'medium', 'hard', 'infinity'] as Difficulty[]).map((lvl) => {
            const active = difficulty === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleDifficultyChange(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  active
                    ? lvl === 'infinity'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-sm'
                      : 'bg-blue-700 text-white shadow-sm'
                    : lvl === 'infinity'
                    ? 'text-amber-300/90 hover:text-amber-200'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {difficultyLabels[lvl]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => startOrResetGame()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
        >
          {gameState === 'idle' ? (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{t('arcade.start', 'Başla')}</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('arcade.restart', 'Yenidən')}</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 -mt-1 flex items-center gap-1.5">
        <InfinityIcon className="w-3 h-3 text-amber-400 shrink-0" />
        <span>
          {difficulty === 'infinity'
            ? t('arcade.challenge_desc_infinity', 'Bot heç vaxt səhv etmir — top hər uğurlu qaytarışda 5% sürətlənir. Rekordlar qlobal cədvələ yazılır.')
            : t('arcade.infinity_notice', 'Qlobal reytinq yalnız ♾️ Sonsuz Ralli rejimində qeydə alınır.')}
        </span>
      </p>

      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onPointerMove={(e) => {
            if (!checkEventTrust(e)) return;
            updatePointerPosition(e.clientX, e.clientY);
          }}
          onPointerDown={(e) => {
            if (!checkEventTrust(e)) return;
            unlockAudio();
          }}
          style={{
            touchAction: 'none',
            maxWidth: '100%',
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          }}
          className="w-full h-auto block select-none touch-none cursor-ew-resize"
        />

        {toast && (
          <div
            role="status"
            className="absolute top-2 left-2 right-12 z-20 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500/30 via-rose-500/25 to-amber-500/30 backdrop-blur-sm px-3 py-2 shadow-lg shadow-amber-500/20"
          >
            <div className="flex items-center gap-2 text-amber-100 text-xs font-extrabold">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
              <span>
                {toast.customMessage
                  ? toast.customMessage
                  : `🎉 ${t('arcade.record', 'Rekord')}: ${toast.score} ${t('arcade.rallies', 'ralli')}${toast.rank ? ` • #${toast.rank}` : ''}`}
              </span>
            </div>
            {toast.badges.map((b) => (
              <div key={b} className="mt-1 text-[11px] font-bold text-amber-200">
                🏅 {b}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundMuted ? t('arcade.sound_on', 'Səsi aç') : t('arcade.sound_off', 'Səsi söndür')}
          aria-pressed={soundMuted}
          title={soundMuted ? t('arcade.sound_on', 'Səsi aç') : t('arcade.sound_off', 'Səsi söndür')}
          className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-slate-700/70 text-base leading-none opacity-80 hover:opacity-100 transition"
        >
          <span aria-hidden="true">{soundMuted ? '🔇' : '🔊'}</span>
        </button>

        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-700/20 border border-blue-600/40 flex items-center justify-center text-2xl mb-3">
              🏓
            </div>

            {gameState === 'gameover' ? (
              <>
                <h3 className="text-base font-display font-bold text-white">
                  {t('arcade.game_over', 'Oyun Bitdi')} — {currentRally} {t('arcade.hits', 'Zərbə')}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">
                  {lastOutcomeText}
                </p>
                {isNewRecord && currentRally > 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('arcade.new_record', 'Yeni Şəxsi Rekord: {score}!').replace('{score}', String(highScore))}</span>
                  </div>
                )}

                {difficulty === 'infinity' && currentRally > 0 && (
                  <div className="mt-3 w-full max-w-xs space-y-2">
                    {submitState.status === 'saving' && (
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('arcade.submitting', 'Nəticə göndərilir...')}</span>
                      </div>
                    )}
                    {submitState.status === 'saved' && (
                      <div className="rounded-xl bg-emerald-600/10 border border-emerald-600/30 px-3 py-2 text-xs text-emerald-300">
                        {t('arcade.your_standing', 'Reytinqdə yeriniz:')}{' '}
                        <span className="font-mono font-black">#{submitState.rank ?? '—'}</span>
                        {' • '}{t('arcade.record', 'Qlobal rekord:')}{' '}
                        <span className="font-mono font-black">{submitState.best}</span>
                      </div>
                    )}
                    {submitState.status === 'error' && (
                      <div className="rounded-xl bg-rose-600/10 border border-rose-600/30 px-3 py-2 text-xs text-rose-300">
                        {submitState.errorMessage ||
                          t('arcade.submit_error_saved_locally', 'Nəticə göndərilə bilmədi. Bu cihazda saxlanıldı, növbəti dəfə yenidən cəhd olunacaq.')}
                      </div>
                    )}
                    {submitState.status === 'guest' && (
                      <div className="rounded-xl bg-blue-700/15 border border-blue-600/40 px-3 py-2.5 space-y-2">
                        <p className="text-xs font-semibold text-blue-100">
                          {t('arcade.login_to_compete', 'Reytinqdə yer almaq üçün daxil olun')}
                        </p>
                        <Link
                          href="/login?redirect=/minigame"
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>{t('arcade.login_btn', 'Daxil ol')}</span>
                        </Link>
                        <p className="text-[10px] text-slate-400">
                          {t('arcade.guest_saved_notice', 'Nəticəniz ({score} ralli) bu cihazda saxlanıldı və daxil olduqdan sonra göndəriləcək.').replace('{score}', String(currentRally))}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-base font-display font-bold text-white">
                  {t('arcade.challenge_title', 'Masaüstü Ralli Çağırışı')}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">
                  {difficulty === 'infinity'
                    ? t('arcade.challenge_desc_infinity', 'Bot heç vaxt səhv etmir! Yalnız sən topu qaytara bilməyəndə oyun bitir. Hər qaytarışda top 5% sürətlənir — nə qədər davam edə bilərsən?')
                    : t('arcade.challenge_desc_classic', 'Siçanı və ya barmağınızı sağa-sola hərəkət etdirərək qırmızı raketi idarə edin. Hər zərbədə top sürətlənir!')}
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => startOrResetGame()}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{gameState === 'gameover' ? t('arcade.play_again', 'Yenidən Oyna') : t('arcade.start', 'Oyuna Başla')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>{t('arcade.controls_tip', 'Raket: Qırmızı (Aşağı) • Rəqib: Bot (Yuxarı)')}</span>
        <span className="font-mono text-slate-300">{t('arcade.physics_tip', 'Hər ekranda eyni sürət • Spin Fizikası')}</span>
      </div>
    </div>

    <ArcadeLeaderboard
      refreshKey={leaderboardRefreshKey}
      currentUserId={authUserId}
      onScoreDeleted={handleScoreDeleted}
    />
    </div>
  );
}

