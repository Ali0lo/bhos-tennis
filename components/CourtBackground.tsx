'use client';

import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

interface CourtBackgroundProps {
  className?: string;
}

export default function CourtBackground({ className = '' }: CourtBackgroundProps) {
  const mouseX = useMotionValue(500);
  const mouseY = useMotionValue(300);

  const smoothX = useSpring(mouseX, { stiffness: 90, damping: 26, mass: 0.6 });
  const smoothY = useSpring(mouseY, { stiffness: 90, damping: 26, mass: 0.6 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const spotlightBg = useMotionTemplate`radial-gradient(540px circle at ${smoothX}px ${smoothY}px, rgba(59, 130, 246, 0.14), rgba(6, 182, 212, 0.05) 45%, transparent 80%)`;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
    >
      <motion.div
        className="pointer-events-none fixed inset-0 z-0 opacity-80 hidden md:block will-change-transform"
        style={{ background: spotlightBg }}
      />

      <svg
        viewBox="0 0 1200 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover opacity-30"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="courtFade" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#080D16" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="courtStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#E2E8F0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="netGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
          <mask id="courtMask">
            <rect width="1200" height="700" fill="url(#courtFade)" />
          </mask>
        </defs>

        <g mask="url(#courtMask)">
          <g opacity="0.22" stroke="#1E293B" strokeWidth="1">
            <line x1="0" y1="120" x2="1200" y2="120" />
            <line x1="0" y1="240" x2="1200" y2="240" />
            <line x1="0" y1="360" x2="1200" y2="360" />
            <line x1="0" y1="480" x2="1200" y2="480" />
            <line x1="0" y1="600" x2="1200" y2="600" />
            <line x1="200" y1="0" x2="50" y2="700" />
            <line x1="400" y1="0" x2="300" y2="700" />
            <line x1="600" y1="0" x2="600" y2="700" />
            <line x1="800" y1="0" x2="900" y2="700" />
            <line x1="1000" y1="0" x2="1150" y2="700" />
          </g>

          <polygon
            points="330,130 870,130 1060,570 140,570"
            stroke="url(#courtStroke)"
            strokeWidth="2"
            fill="rgba(15, 22, 35, 0.35)"
          />

          <polygon
            points="344,142 856,142 1038,556 162,556"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            fill="none"
          />

          <line
            x1="600"
            y1="130"
            x2="600"
            y2="570"
            stroke="rgba(226, 232, 240, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="8 6"
          />

          <line
            x1="215"
            y1="335"
            x2="985"
            y2="335"
            stroke="url(#netGlow)"
            strokeWidth="3"
          />
          <line
            x1="222"
            y1="323"
            x2="978"
            y2="323"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="1"
          />

          <circle cx="330" cy="130" r="3" fill="#3B82F6" opacity="0.7" />
          <circle cx="870" cy="130" r="3" fill="#3B82F6" opacity="0.7" />
          <circle cx="1060" cy="570" r="3.5" fill="#06B6D4" opacity="0.7" />
          <circle cx="140" cy="570" r="3.5" fill="#06B6D4" opacity="0.7" />
          <circle cx="600" cy="335" r="4" fill="#38BDF8" opacity="0.85" />
        </g>
      </svg>
    </div>
  );
}

