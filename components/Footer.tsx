'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full max-w-5xl mx-auto px-5 sm:px-8 pt-6 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <span className="font-display font-extrabold text-[10px] uppercase tracking-[0.14em] text-white">
          BHOS / TABLE TENNIS CLUB
        </span>
        <span className="text-[11px] text-slate-500">
          Made for the next rally. Baku, Azerbaijan.
        </span>
      </div>
    </footer>
  );
}
