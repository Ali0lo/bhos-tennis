'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trophy, Play, RotateCcw, Flame, Sparkles } from 'lucide-react';

type Difficulty = 'easy' | 'medium' | 'hard';

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
};

const HIGH_SCORE_STORAGE_KEY = 'bhos_rally_high_score';
const CANVAS_WIDTH = 440;
const CANVAS_HEIGHT = 560;
const TABLE_MARGIN_X = 32;
const TABLE_MARGIN_Y = 36;
const TABLE_WIDTH = CANVAS_WIDTH - TABLE_MARGIN_X * 2;
const TABLE_HEIGHT = CANVAS_HEIGHT - TABLE_MARGIN_Y * 2;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 6.5;

interface TrailPoint {
  x: number;
  y: number;
}

export default function RallyMiniGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [currentRally, setCurrentRally] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [lastOutcomeText, setLastOutcomeText] = useState<string>('');
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  const highScoreRef = useRef<number>(0);
  const difficultyRef = useRef<Difficulty>(difficulty);

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
    lastFrameTime: 0,
  });

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
        const parsed = saved ? parseInt(saved, 10) : 0;
        if (!isNaN(parsed) && parsed > 0) {
          setHighScore(parsed);
          highScoreRef.current = parsed;
        }
      } catch {}
    }
  }, []);

  const persistHighScore = useCallback((score: number) => {
    if (score > highScoreRef.current) {
      highScoreRef.current = score;
      setHighScore(score);
      setIsNewRecord(true);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(score));
        } catch {}
      }
    }
  }, []);

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
      st.lastFrameTime = performance.now();

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
    if (engineRef.current.status === 'playing') {
      startOrResetGame(nextDiff);
    }
  };

  const updatePointerPosition = useCallback((clientX: number) => {
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
    engineRef.current.playerX = Math.max(minX, Math.min(maxX, relX));
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updatePointerPosition(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches && e.touches.length > 0) {
      updatePointerPosition(e.touches[0].clientX);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches && e.touches.length > 0) {
      updatePointerPosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    const step = (now: number) => {
      const st = engineRef.current;
      const cfg = DIFFICULTY_SETTINGS[difficultyRef.current];
      const dtRaw = st.lastFrameTime ? (now - st.lastFrameTime) / 16.6667 : 1;
      const dt = Math.min(2.2, Math.max(0.5, dtRaw));
      st.lastFrameTime = now;

      st.playerVx = (st.playerX - st.prevPlayerX) / dt;
      st.prevPlayerX = st.playerX;

      if (st.hitFlash > 0) {
        st.hitFlash = Math.max(0, st.hitFlash - 0.08 * dt);
      }

      if (st.status === 'playing') {
        st.trail.push({ x: st.ballX, y: st.ballY });
        if (st.trail.length > 9) {
          st.trail.shift();
        }

        st.ballVx += st.ballSpin * 0.035 * dt;
        st.ballSpin *= Math.pow(0.988, dt);

        st.ballX += st.ballVx * dt;
        st.ballY += st.ballVy * dt;

        const leftWall = TABLE_MARGIN_X + BALL_RADIUS;
        const rightWall = CANVAS_WIDTH - TABLE_MARGIN_X - BALL_RADIUS;

        if (st.ballX <= leftWall) {
          st.ballX = leftWall;
          st.ballVx = Math.abs(st.ballVx);
        } else if (st.ballX >= rightWall) {
          st.ballX = rightWall;
          st.ballVx = -Math.abs(st.ballVx);
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
        const moveX = Math.max(
          -maxAiStep,
          Math.min(maxAiStep, diffX * cfg.aiReactionLerp * dt * 2.4)
        );
        st.aiX = Math.max(aiMinX, Math.min(aiMaxX, st.aiX + moveX));

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
            const nextRally = st.rally + 1;
            st.rally = nextRally;
            setCurrentRally(nextRally);
            persistHighScore(nextRally);

            st.ballSpeed = Math.min(
              cfg.maxSpeed,
              st.ballSpeed + cfg.speedIncrement
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
            const nextRally = st.rally + 1;
            st.rally = nextRally;
            setCurrentRally(nextRally);
            persistHighScore(nextRally);

            st.ballSpeed = Math.min(
              cfg.maxSpeed,
              st.ballSpeed + cfg.speedIncrement * 0.65
            );
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
          }
        }

        if (st.ballY - BALL_RADIUS > CANVAS_HEIGHT - 10) {
          st.status = 'gameover';
          setLastOutcomeText('Ralli başa çatdı! Yenidən cəhd edin.');
          setGameState('gameover');
        } else if (st.ballY + BALL_RADIUS < 10) {
          const bonusRally = st.rally + 2;
          st.rally = bonusRally;
          setCurrentRally(bonusRally);
          persistHighScore(bonusRally);
          st.status = 'gameover';
          setLastOutcomeText('Bot topu qaytara bilmədi! (+2 Bonus Ralli)');
          setGameState('gameover');
        }
      }

      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      drawRoundedRect(
        TABLE_MARGIN_X - 6,
        TABLE_MARGIN_Y - 6,
        TABLE_WIDTH + 12,
        TABLE_HEIGHT + 12,
        10
      );
      ctx.fill();

      ctx.fillStyle = '#1D4ED8';
      drawRoundedRect(
        TABLE_MARGIN_X,
        TABLE_MARGIN_Y,
        TABLE_WIDTH,
        TABLE_HEIGHT,
        6
      );
      ctx.fill();

      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(
        TABLE_MARGIN_X + 4,
        TABLE_MARGIN_Y + 4,
        TABLE_WIDTH - 8,
        TABLE_HEIGHT / 2 - 4
      );

      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(
        TABLE_MARGIN_X + 1,
        TABLE_MARGIN_Y + 1,
        TABLE_WIDTH - 2,
        TABLE_HEIGHT - 2
      );

      ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, TABLE_MARGIN_Y + 2);
      ctx.lineTo(CANVAS_WIDTH / 2, TABLE_MARGIN_Y + TABLE_HEIGHT - 2);
      ctx.stroke();

      const netY = CANVAS_HEIGHT / 2;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(TABLE_MARGIN_X - 8, netY - 4, 8, 8);
      ctx.fillRect(CANVAS_WIDTH - TABLE_MARGIN_X, netY - 4, 8, 8);

      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(TABLE_MARGIN_X - 4, netY + 3);
      ctx.lineTo(CANVAS_WIDTH - TABLE_MARGIN_X + 4, netY + 3);
      ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
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

      for (let i = 0; i < st.trail.length; i++) {
        const pt = st.trail[i];
        const ratio = (i + 1) / (st.trail.length + 1);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, BALL_RADIUS * ratio * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(248, 250, 252, ${ratio * 0.28})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(st.ballX, st.ballY + 2.5, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(11, 15, 25, 0.38)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(st.ballX, st.ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [persistHighScore]);

  return (
    <div className="w-full max-w-[520px] mx-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-700/15 border border-blue-700/40 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>🏓 BHOS Arcade</span>
          </div>
          <h2 className="text-lg font-display font-bold text-white">
            Masaüstü Ralli
          </h2>
          <p className="text-xs text-slate-400">
            Reketini idarə et, topu masada saxla və şəxsi rekordunu yenilə
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center min-w-[84px]">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Flame className="w-3 h-3 text-rose-500" />
              <span>Cari Ralli</span>
            </div>
            <div className="text-lg font-mono font-extrabold text-white mt-0.5">
              {currentRally}
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-center min-w-[84px]">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Rekord</span>
            </div>
            <div className="text-lg font-mono font-extrabold text-amber-400 mt-0.5">
              {highScore}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="inline-flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1 gap-1">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((lvl) => {
            const active = difficulty === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => handleDifficultyChange(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  active
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {DIFFICULTY_SETTINGS[lvl].labelAz}
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
              <span>Başla</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Yenidən</span>
            </>
          )}
        </button>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{ touchAction: 'none' }}
          className="w-full h-auto block select-none touch-none cursor-ew-resize"
        />

        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-700/20 border border-blue-600/40 flex items-center justify-center text-2xl mb-3">
              <span>🏓</span>
            </div>

            {gameState === 'gameover' ? (
              <>
                <h3 className="text-base font-display font-bold text-white">
                  Oyun Bitdi — {currentRally} Zərbə
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">
                  {lastOutcomeText}
                </p>
                {isNewRecord && currentRally > 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Yeni Şəxsi Rekord: {highScore}!</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-base font-display font-bold text-white">
                  Masaüstü Ralli Çağırışı
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs">
                  Siçanı və ya barmağınızı sağa-sola hərəkət etdirərək qırmızı raketi idarə edin. Hər zərbədə top sürətlənir!
                </p>
              </>
            )}

            <button
              type="button"
              onClick={() => startOrResetGame()}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{gameState === 'gameover' ? 'Yenidən Oyna' : 'Oyuna Başla'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Raket: Qırmızı (Aşağı) • Rəqib: Bot (Yuxarı)</span>
        <span className="font-mono text-slate-300">60 FPS • Spin Fizikası</span>
      </div>
    </div>
  );
}

