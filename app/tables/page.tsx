'use client';

import React from 'react';
import HallTableWidget from '../../components/HallTableWidget';
import { useTranslation } from '../../lib/i18n';
import { 
  Table as TableIcon, 
  MessageCircle, 
  ExternalLink, 
  CheckCircle2, 
  Info, 
  ShieldAlert 
} from 'lucide-react';

export default function TablesPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-bhos-border/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center p-1 shrink-0">
            <img 
              src="/images/bhos-crest.png" 
              alt="BHOS Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-cyan-400" />
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
                {t('facility.title')}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('footer.campus')} • {t('hero.stats_tables_sub')}
            </p>
          </div>
        </div>

        {/* WhatsApp Matchmaking Link */}
        <a
          href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 shrink-0 w-fit"
        >
          <MessageCircle className="w-4 h-4 fill-slate-950" />
          <span>{t('facility.whatsapp_matchmaking')}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Hall Rules & Info Banner */}
      <div className="p-4 rounded-2xl border border-bhos-border bg-bhos-midnight/70 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">{t('facility.allocation_rule')}</span>
            <span className="text-slate-400">
              {t('facility.allocation_desc')}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-bhos-cyan shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">{t('facility.equipment_rule')}</span>
            <span className="text-slate-400">
              {t('facility.equipment_desc')}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">{t('facility.footwear_rule')}</span>
            <span className="text-slate-400">
              {t('facility.footwear_desc')}
            </span>
          </div>
        </div>
      </div>

      {/* Embedded Interactive Hall & Table Widget */}
      <HallTableWidget />
    </div>
  );
}
