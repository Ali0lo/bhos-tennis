'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Swords,
  Trophy,
  MessageCircle,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'bhos_onboarding_dismissed_v1';

export default function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="relative rounded-2xl bg-[#0F1623] border border-[#3B82F6]/20 p-5 sm:p-6 shadow-2xl backdrop-blur-md overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#3B82F6]" />
              Necə İşləyir?
            </span>
            <h3 className="text-sm sm:text-base font-display font-bold text-white">
              3 Sadə Addımda BANM Liqasına Qoşulun
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-400/20" />
              <span>Rəsmi WhatsApp Qrupu</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              aria-label="Bildirişi bağla"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
          <div className="p-3.5 rounded-xl bg-[#131C2B] border border-white/5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shrink-0 font-display font-black text-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs font-display font-bold text-white">
                1. Qeydiyyatdan Keçin
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tələbə e-poçtunuzla profil yaradın və təcrübənizə uyğun başlanğıc ELO seçin.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#131C2B] border border-white/5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-display font-black text-xs">
              <Swords className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs font-display font-bold text-white">
                2. Oyunu Oynayın
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                İdman zalında rəqibinizlə matçı keçirin və ya WhatsApp qrupunda oyunçu tapın.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#131C2B] border border-white/5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shrink-0 font-display font-black text-xs">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs font-display font-bold text-white">
                3. Nəticəni Qeyd Edin
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Xal qazanın, nişanlar açın və rəsmi BANM liderlər cədvəlində pillə-pillə irəliləyin!
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
