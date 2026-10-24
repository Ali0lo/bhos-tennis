'use client';

import React from 'react';

interface LeaderboardSkeletonProps {
  rows?: number;
}

export default function LeaderboardSkeleton({ rows = 5 }: LeaderboardSkeletonProps) {
  return (
    <div className="px-3 sm:px-4 py-3" aria-busy="true" aria-label="Loading leaderboard">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="bg-[#131C2B] animate-pulse rounded-xl h-14 my-2 px-4 flex items-center justify-between border border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0F1623]" />
            <div className="w-10 h-10 rounded-xl bg-[#0F1623]" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 sm:w-44 rounded bg-[#0F1623]" />
              <div className="h-2.5 w-20 sm:w-28 rounded bg-[#0F1623]/70" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block h-6 w-14 rounded-lg bg-[#0F1623]" />
            <div className="h-5 w-16 rounded bg-[#0F1623]" />
          </div>
        </div>
      ))}
    </div>
  );
}
