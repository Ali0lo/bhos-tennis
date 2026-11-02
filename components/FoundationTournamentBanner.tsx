'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

const TARGET_DATE_ISO = '2026-11-07T10:00:00+04:00';
const DISMISS_STORAGE_KEY = 'bhos_foundation_tournament_banner_dismissed_v1';
const REGISTRATION_URL = 'https://forms.gle/ULNedGr1LFzyafRe9';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isStarted: boolean;
}

function computeCountdown(): CountdownTime {
  const targetMs = new Date(TARGET_DATE_ISO).getTime();
  const diff = targetMs - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isStarted: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isStarted: false };
}

export default function FoundationTournamentBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isStarted: false,
  });

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1') {
        setDismissed(true);
        return;
      }
    } catch {}

    setCountdown(computeCountdown());
    const interval = setInterval(() => {
      setCountdown(computeCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {}
  };

  if (dismissed) {
    return null;
  }

  const pad = (num: number) => String(num).padStart(2, '0');

  return (
    <section
      aria-label="Foundation Tələbələri Üçün Stolüstü Tennis Turniri"
      className="relative w-full rounded-3xl bg-slate-900 border-2 border-blue-700/80 p-5 sm:p-7 shadow-md overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-1 bg-blue-700"
      />

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Elanı bağla"
        title="Bağla"
        className="absolute top-3.5 right-3.5 z-20 inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pr-6 sm:pr-8 lg:pr-6">
        <div className="space-y-3 max-w-2xl min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/15 border border-rose-600/50 text-rose-400 text-[11px] font-display font-extrabold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>🏆 YENİ TURNİR • FOUNDATION KUBOKU</span>
            </span>

            {mounted && countdown.isStarted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/15 border border-emerald-600/40 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                <span>Turnir Başladı!</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-white tracking-tight leading-snug">
            Foundation Tələbələri Üçün Stolüstü Tennis Turniri
          </h2>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200">
              <span>📅 7 Noyabr 2026</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200">
              <span>📍 Bibiheybət Kampusu</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center justify-between lg:items-end xl:items-center gap-4 shrink-0">
          {mounted && countdown.isStarted ? (
            <div className="px-4 py-3 rounded-2xl bg-slate-950 border border-emerald-600/40 text-emerald-400 font-display font-extrabold text-sm text-center">
              Turnir Başladı!
            </div>
          ) : (
            <div
              aria-label="Turnirə qalan vaxt"
              className="grid grid-cols-4 gap-2 sm:gap-2.5"
            >
              {[
                { label: 'Gün', value: mounted ? pad(countdown.days) : '--' },
                { label: 'Saat', value: mounted ? pad(countdown.hours) : '--' },
                { label: 'Dəq', value: mounted ? pad(countdown.minutes) : '--' },
                { label: 'San', value: mounted ? pad(countdown.seconds) : '--' },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="flex flex-col items-center justify-center min-w-[56px] sm:min-w-[62px] py-2 px-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center shadow-sm"
                >
                  <span className="font-mono text-lg sm:text-xl font-black text-white tabular-nums leading-none">
                    {unit.value}
                  </span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <a
            href={REGISTRATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-display font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition whitespace-nowrap"
          >
            <span>Turnirə Qeydiyyatdan Keç →</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
