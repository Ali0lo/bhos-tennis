'use client';

import React from 'react';

export default function PlayerProfileSkeleton() {
  return (
    <div
      className="space-y-8 max-w-5xl mx-auto pb-16"
      aria-busy="true"
      aria-label="Loading player profile"
    >
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-lg bg-[#131C2B] animate-pulse border border-white/5" />
      </div>

      <div
        className="rounded-3xl bg-[#0F1623] p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#131C2B] animate-pulse border border-white/10 shrink-0" />
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="h-7 sm:h-8 w-44 sm:w-60 rounded-xl bg-[#131C2B] animate-pulse" />
                <div className="h-5 w-20 rounded-full bg-[#131C2B] animate-pulse" />
                <div className="h-5 w-24 rounded-full bg-[#131C2B] animate-pulse" />
              </div>
              <div className="h-4 w-52 sm:w-72 rounded-lg bg-[#131C2B]/80 animate-pulse" />
              <div className="h-3.5 w-40 sm:w-56 rounded-lg bg-[#131C2B]/60 animate-pulse" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#131C2B] border border-white/10 min-w-[140px] h-24 animate-pulse flex flex-col items-center justify-center gap-2">
            <div className="h-2.5 w-16 rounded bg-[#0F1623]" />
            <div className="h-8 w-20 rounded-lg bg-[#0F1623]" />
            <div className="h-2.5 w-16 rounded bg-[#0F1623]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="rounded-2xl bg-[#0F1623] p-5 border border-white/10 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-[#131C2B] animate-pulse" />
              <div className="w-4 h-4 rounded bg-[#131C2B] animate-pulse" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-[#131C2B] animate-pulse" />
            <div className="h-2.5 w-24 rounded bg-[#131C2B]/70 animate-pulse" />
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl bg-[#0F1623] p-6 shadow-xl space-y-4"
        style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded-lg bg-[#131C2B] animate-pulse" />
          <div className="h-4 w-24 rounded-lg bg-[#131C2B] animate-pulse" />
        </div>

        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-14 rounded-xl bg-[#131C2B] animate-pulse border border-white/5 px-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-6 w-16 rounded-lg bg-[#0F1623]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 sm:w-48 rounded bg-[#0F1623]" />
                  <div className="h-2.5 w-24 rounded bg-[#0F1623]/70" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-12 rounded bg-[#0F1623]" />
                <div className="h-5 w-12 rounded bg-[#0F1623]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
