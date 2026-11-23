'use client';

import React from 'react';

interface CourtBackgroundProps {
  className?: string;
}

/**
 * Architectural ITTF table-tennis court perspective linework overlay.
 * Restrained hairline geometry calibrated for the deep obsidian ground.
 */
export default function CourtBackground({ className = '' }: CourtBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
    >
      <svg
        viewBox="0 0 1200 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover opacity-[0.16]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="courtFade" cx="50%" cy="48%" r="54%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="68%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#070A11" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="courtStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#E2E8F0" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="netLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E11D48" stopOpacity="0" />
            <stop offset="50%" stopColor="#E2E8F0" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
          </linearGradient>
          <mask id="courtMask">
            <rect width="1200" height="700" fill="url(#courtFade)" />
          </mask>
        </defs>

        <g mask="url(#courtMask)">
          {/* Perspective table outer boundary */}
          <polygon
            points="330,130 870,130 1060,570 140,570"
            stroke="url(#courtStroke)"
            strokeWidth="1.25"
            fill="rgba(13, 18, 30, 0.22)"
          />

          {/* Inner court hairline */}
          <polygon
            points="344,142 856,142 1038,556 162,556"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            fill="none"
          />

          {/* Doubles center service line */}
          <line
            x1="600"
            y1="130"
            x2="600"
            y2="570"
            stroke="rgba(226, 232, 240, 0.24)"
            strokeWidth="1"
            strokeDasharray="6 6"
          />

          {/* Net tension wire */}
          <line x1="215" y1="335" x2="985" y2="335" stroke="url(#netLine)" strokeWidth="1.75" />
          <line x1="222" y1="324" x2="978" y2="324" stroke="rgba(226, 232, 240, 0.16)" strokeWidth="1" />

          {/* Corner anchor points */}
          <circle cx="330" cy="130" r="2.25" fill="#94A3B8" opacity="0.6" />
          <circle cx="870" cy="130" r="2.25" fill="#94A3B8" opacity="0.6" />
          <circle cx="1060" cy="570" r="2.5" fill="#94A3B8" opacity="0.55" />
          <circle cx="140" cy="570" r="2.5" fill="#94A3B8" opacity="0.55" />
          <circle cx="600" cy="335" r="2.75" fill="#E11D48" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
}
