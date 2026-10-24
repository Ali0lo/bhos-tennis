'use client';

import React from 'react';
import SmoothReveal, { SmoothRevealItem } from './SmoothReveal';
import { useTranslations } from '../lib/i18n';
import {
  ShieldAlert,
  Footprints,
  Shirt,
  HeartHandshake,
  Wrench,
  BookOpenCheck,
  Users,
  Sparkles,
  Clock,
  MapPin,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export default function HallRulesSection() {
  const t = useTranslations('home');

  const officialHallRules = [
    {
      id: 1,
      title: t('hall_rules.rule1_title'),
      subtitle: t('hall_rules.rule1_tag'),
      description: t('hall_rules.rule1_desc'),
      icon: Footprints,
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 2,
      title: t('hall_rules.rule2_title'),
      subtitle: t('hall_rules.rule2_tag'),
      description: t('hall_rules.rule2_desc'),
      icon: Shirt,
      accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 3,
      title: t('hall_rules.rule3_title'),
      subtitle: t('hall_rules.rule3_tag'),
      description: t('hall_rules.rule3_desc'),
      icon: HeartHandshake,
      accent: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      id: 4,
      title: t('hall_rules.rule4_title'),
      subtitle: t('hall_rules.rule4_tag'),
      description: t('hall_rules.rule4_desc'),
      icon: Wrench,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 5,
      title: t('hall_rules.rule5_title'),
      subtitle: t('hall_rules.rule5_tag'),
      description: t('hall_rules.rule5_desc'),
      icon: BookOpenCheck,
      accent: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/30',
    },
  ];

  const fourTables = [
    {
      number: 1,
      label: t('hall_rules.t1_label'),
      group: t('hall_rules.t1_group'),
      isWomen: true,
      usage: t('hall_rules.t1_usage'),
      surface: 'Donic Waldner Classic 25mm ITTF',
    },
    {
      number: 2,
      label: t('hall_rules.t2_label'),
      group: t('hall_rules.t2_group'),
      isWomen: false,
      usage: t('hall_rules.t2_usage'),
      surface: 'Donic Waldner Classic 25mm ITTF',
    },
    {
      number: 3,
      label: t('hall_rules.t3_label'),
      group: t('hall_rules.t3_group'),
      isWomen: false,
      usage: t('hall_rules.t3_usage'),
      surface: 'Donic Waldner Classic 25mm ITTF',
    },
    {
      number: 4,
      label: t('hall_rules.t4_label'),
      group: t('hall_rules.t4_group'),
      isWomen: false,
      usage: t('hall_rules.t4_usage'),
      surface: 'Donic Waldner Classic 25mm ITTF',
    },
  ];

  return (
    <div className="space-y-8">
      <SmoothReveal delay={0.05} scale>
        <div className="relative rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#3B82F6]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] font-mono text-xs font-black">
                  {t('sections.tables_num')}
                </span>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('hall_rules.badge')}</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                {t('sections.tables_title')}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t('hall_rules.subtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-1.5 bg-[#131C2B] px-3 py-1.5 rounded-xl border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>08:00 – 16:40</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#131C2B] px-3 py-1.5 rounded-xl border border-white/5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('hall_rules.location')}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#131C2B] px-3 py-1.5 rounded-xl border border-white/5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('hall_rules.tables_summary')}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <a
                href="https://chat.whatsapp.com/KTd3144iWxXHdqHmQJW6QN"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 fill-slate-950" />
                <span>{t('sections.join_whatsapp')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </SmoothReveal>

      <SmoothReveal staggerChildren={0.1} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SmoothRevealItem direction="right" className="rounded-3xl bg-[#0F1623] border border-rose-500/30 p-6 sm:p-7 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-rose-500/10 blur-2xl" />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider">
                {t('hall_rules.table1_badge')}
              </span>
              <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-400 text-white font-display font-black text-sm flex items-center justify-center shadow-lg shadow-rose-500/20">
                #1
              </span>
            </div>

            <div>
              <h3 className="text-xl font-display font-black text-white">
                {t('sections.table_1_label')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                {t('hall_rules.table1_desc')}
              </p>
            </div>

            <div className="rounded-2xl bg-[#131C2B] border border-rose-500/20 p-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{t('hall_rules.table1_bullet1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{t('hall_rules.table1_bullet2')}</span>
              </div>
            </div>
          </div>
        </SmoothRevealItem>

        <SmoothRevealItem direction="right" className="rounded-3xl bg-[#0F1623] border border-cyan-500/30 p-6 sm:p-7 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-500/10 blur-2xl" />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                {t('hall_rules.tables24_badge')}
              </span>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4].map((num) => (
                  <span
                    key={num}
                    className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-[#3B82F6] text-slate-950 font-display font-black text-xs flex items-center justify-center shadow-md shadow-cyan-500/20"
                  >
                    #{num}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-display font-black text-white">
                {t('sections.table_standard_label')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                {t('hall_rules.tables24_desc')}
              </p>
            </div>

            <div className="rounded-2xl bg-[#131C2B] border border-cyan-500/20 p-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{t('hall_rules.tables24_bullet1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{t('hall_rules.tables24_bullet2')}</span>
              </div>
            </div>
          </div>
        </SmoothRevealItem>
      </SmoothReveal>

      <SmoothReveal staggerChildren={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {fourTables.map((tb) => (
          <SmoothRevealItem
            key={tb.number}
            direction="right"
            className={`rounded-2xl bg-[#0F1623] border p-5 shadow-lg flex flex-col justify-between transition-all ${
              tb.isWomen
                ? 'border-rose-500/30 hover:border-rose-500/60'
                : 'border-white/10 hover:border-cyan-500/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`w-8 h-8 rounded-xl font-display font-black text-xs flex items-center justify-center ${
                    tb.isWomen
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  #{tb.number}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    tb.isWomen
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {tb.group}
                </span>
              </div>

              <div className="my-3 py-3.5 px-3 rounded-xl bg-[#131C2B] border border-white/5 relative flex items-center justify-center">
                <div
                  className={`w-full h-14 rounded-lg border-2 relative flex items-center justify-center ${
                    tb.isWomen
                      ? 'bg-rose-950/40 border-rose-400/50'
                      : 'bg-blue-950/50 border-cyan-400/50'
                  }`}
                >
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/25" />
                  <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/60 -translate-x-1/2" />
                  <span className="relative z-10 px-2 py-0.5 rounded bg-slate-950/90 text-[10px] font-mono font-bold text-white border border-white/10">
                    {tb.label}
                  </span>
                </div>
              </div>

              <h4 className="font-display font-bold text-white text-sm">{tb.label}</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tb.usage}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-slate-400">
              {tb.surface}
            </div>
          </SmoothRevealItem>
        ))}
      </SmoothReveal>

      <SmoothReveal delay={0.12}>
        <div className="rounded-3xl bg-[#0F1623] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-display font-black text-white">
                  {t('hall_rules.rules_header')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('hall_rules.rules_subheader')}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider w-fit">
              {t('hall_rules.rules_count_badge')}
            </span>
          </div>

          <SmoothReveal staggerChildren={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {officialHallRules.map((rule, index) => {
              const IconComponent = rule.icon;
              const isLastOdd = index === officialHallRules.length - 1 && officialHallRules.length % 2 !== 0;

              return (
                <SmoothRevealItem
                  key={rule.id}
                  direction="up"
                  className={`rounded-2xl bg-[#131C2B] border border-white/5 p-5 flex items-start gap-4 hover:border-white/15 transition ${
                    isLastOdd ? 'md:col-span-2' : ''
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${rule.accent}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-black text-cyan-400">
                        0{rule.id}
                      </span>
                      <h4 className="text-sm sm:text-base font-display font-bold text-white">
                        {rule.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-semibold uppercase">
                        {rule.subtitle}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                </SmoothRevealItem>
              );
            })}
          </SmoothReveal>
        </div>
      </SmoothReveal>
    </div>
  );
}
