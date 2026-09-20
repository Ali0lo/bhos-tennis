'use client';

import React, { useState } from 'react';
import { useTranslation } from '../lib/i18n';
import { 
  Table as TableIcon, 
  Clock, 
  MapPin, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  ChevronRight,
  MessageCircle
} from 'lucide-react';

export interface HallTableInfo {
  number: number;
  designation: string;
  category: 'girls' | 'boys';
  subtitle: string;
  description: string;
  surface: string;
  status: string;
  activePlayers?: string;
  features: string[];
}

export default function HallTableWidget() {
  const { t } = useTranslation();
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(1);

  const tables: HallTableInfo[] = [
    {
      number: 1,
      designation: t('hall_tables.table_1_title'),
      category: 'girls',
      subtitle: t('hall_tables.table_1_sub'),
      description: t('hall_tables.table_1_desc'),
      surface: 'Donic Waldner Classic 25mm ITTF Approved',
      status: t('hall_tables.status_league_ready'),
      activePlayers: t('hall_tables.table_1_active'),
      features: [
        t('facility.allocation_desc'),
        t('facility.equipment_desc'),
        t('hall_tables.dedicated_womens'),
      ],
    },
    {
      number: 2,
      designation: t('hall_tables.table_2_title'),
      category: 'boys',
      subtitle: t('hall_tables.table_2_sub'),
      description: t('hall_tables.table_2_desc'),
      surface: 'Donic Waldner Classic 25mm Competition Top',
      status: t('hall_tables.status_league_ready'),
      activePlayers: t('hall_tables.table_2_active'),
      features: [
        t('hall_tables.competition_spec'),
        t('facility.equipment_desc'),
        t('facility.footwear_desc'),
      ],
    },
    {
      number: 3,
      designation: t('hall_tables.table_3_title'),
      category: 'boys',
      subtitle: t('hall_tables.table_3_sub'),
      description: t('hall_tables.table_3_desc'),
      surface: 'Donic Waldner Classic 25mm Competition Top',
      status: t('hall_tables.status_coaching'),
      activePlayers: t('hall_tables.table_3_active'),
      features: [
        t('hall_tables.status_coaching'),
        t('facility.equipment_desc'),
        t('facility.footwear_desc'),
      ],
    },
    {
      number: 4,
      designation: t('hall_tables.table_4_title'),
      category: 'boys',
      subtitle: t('hall_tables.table_4_sub'),
      description: t('hall_tables.table_4_desc'),
      surface: 'Donic Waldner Classic 25mm ITTF Approved',
      status: t('hall_tables.status_open'),
      activePlayers: t('hall_tables.table_4_active'),
      features: [
        t('hall_tables.open_walkin'),
        t('facility.equipment_desc'),
        t('facility.footwear_desc'),
      ],
    },
  ];

  const selectedTable = tables.find((tb) => tb.number === selectedTableNumber) || tables[0];

  return (
    <div className="space-y-8">
      {/* Top Hall Overview Card */}
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#0F172A] via-[#0A192F] to-[#041022] p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('footer.campus')}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
              {t('facility.title')}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t('facility.subtitle')}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-200">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>09:00 – 22:00</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-200">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Level 2 Sports Arena</span>
              </div>
            </div>
          </div>

          {/* Quick WhatsApp CTA Banner */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>{t('hero.join_whatsapp_btn')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/10 text-center">
              <span className="text-[11px] text-slate-400 block font-sans">{t('hero.stats_tables')}</span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t('hero.stats_tables_sub')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Interactive Visual Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tables.map((table) => {
          const isSelected = selectedTable.number === table.number;
          const isGirlsTable = table.category === 'girls';

          return (
            <div
              key={table.number}
              onClick={() => setSelectedTableNumber(table.number)}
              className={`cursor-pointer rounded-2xl border transition-all p-5 relative overflow-hidden flex flex-col justify-between shadow-xl ${
                isSelected
                  ? isGirlsTable
                    ? 'border-pink-500/80 bg-pink-950/20 ring-2 ring-pink-500/30'
                    : 'border-cyan-400/80 bg-cyan-950/20 ring-2 ring-cyan-500/30'
                  : 'border-white/10 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              {/* Badge top */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`w-8 h-8 rounded-xl font-display font-black text-sm flex items-center justify-center shadow ${
                    isGirlsTable
                      ? 'bg-gradient-to-tr from-pink-500 to-rose-400 text-white'
                      : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950'
                  }`}
                >
                  #{table.number}
                </span>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    isGirlsTable
                      ? 'bg-pink-500/15 text-pink-300 border-pink-500/40'
                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {isGirlsTable ? t('hall_tables.category_girls') : t('hall_tables.category_boys')}
                </span>
              </div>

              {/* Table Diagram Graphic */}
              <div className="my-3 py-4 px-2 rounded-xl bg-gradient-to-b from-blue-950/50 to-slate-950/90 border border-white/5 relative flex items-center justify-center">
                <div className="w-full h-12 rounded-lg bg-emerald-800/60 border border-emerald-500/30 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40 -translate-x-1/2" />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/20 -translate-y-1/2" />
                  <span className="font-display font-bold text-xs text-white/90 drop-shadow">
                    {t('hall_tables.table_nav_badge')} {table.number}
                  </span>
                </div>
              </div>

              {/* Info summary */}
              <div className="space-y-1.5 pt-2">
                <h3 className="font-display font-bold text-sm text-white">
                  {table.designation}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {table.subtitle}
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-mono font-semibold">
                    ● {table.status}
                  </span>
                  <span className="text-cyan-400 font-semibold flex items-center gap-0.5 text-[10px]">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Table Deep Dive & House Rules (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Table Specifications (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span
                className={`w-10 h-10 rounded-2xl font-display font-black text-base flex items-center justify-center ${
                  selectedTable.category === 'girls'
                    ? 'bg-gradient-to-tr from-pink-500 to-rose-400 text-white'
                    : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950'
                }`}
              >
                #{selectedTable.number}
              </span>
              <div>
                <h3 className="text-lg font-display font-bold text-white">
                  {selectedTable.designation}
                </h3>
                <p className="text-xs text-slate-400">{selectedTable.subtitle}</p>
              </div>
            </div>

            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${
                selectedTable.category === 'girls'
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {selectedTable.category === 'girls' ? t('hall_tables.category_girls') : t('hall_tables.category_boys')}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {selectedTable.description}
          </p>

          {/* Key Features Bullet List */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {t('hall_tables.key_features')}:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {selectedTable.features.map((f, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-800/50 border border-white/5 flex items-start gap-2.5 text-slate-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Varsity Roster Connection */}
          {selectedTable.activePlayers && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  {t('hall_tables.active_now')} <strong className="text-white">{selectedTable.activePlayers}</strong>
                </span>
              </div>
              <a
                href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-semibold flex items-center gap-1 shrink-0"
              >
                <span>{t('facility.whatsapp_matchmaking')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Hall Guidelines & Code of Conduct (1 col) */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{t('tournaments.rules')}</span>
            </h3>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>{t('facility.allocation_rule')}:</strong> {t('facility.allocation_desc')}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>{t('facility.footwear_rule')}:</strong> {t('facility.footwear_desc')}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>{t('facility.equipment_rule')}:</strong> {t('facility.equipment_desc')}
                </span>
              </li>
            </ul>
          </div>

          {/* WhatsApp Action Footer */}
          <div className="pt-4 border-t border-white/10">
            <a
              href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t('hero.join_whatsapp_btn')}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
