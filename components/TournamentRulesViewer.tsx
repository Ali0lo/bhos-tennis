'use client';

import React from 'react';
import {
  Trophy,
  ShieldCheck,
  Award,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface TournamentRulesViewerProps {
  rules?: string | null;
  className?: string;
}

interface RuleItem {
  id: string;
  type: 'header' | 'rule_card' | 'paragraph';
  title?: string;
  body: string;
  iconType?: 'trophy' | 'users' | 'shield' | 'award' | 'clock' | 'sparkles' | 'check';
}

function getIconForTitle(title: string): RuleItem['iconType'] {
  const lower = title.toLowerCase();
  if (lower.includes('qrup') || lower.includes('group')) return 'users';
  if (lower.includes('pley-off') || lower.includes('final') || lower.includes('kubok')) return 'trophy';
  if (lower.includes('şərt') || lower.includes('istiqamət') || lower.includes('iştirak') || lower.includes('eligibility')) return 'shield';
  if (lower.includes('set') || lower.includes('oyun') || lower.includes('format')) return 'award';
  if (lower.includes('vaxt') || lower.includes('tarix') || lower.includes('saat') || lower.includes('gecikmə')) return 'clock';
  if (lower.includes('servis') || lower.includes('raket') || lower.includes('top')) return 'sparkles';
  return 'check';
}

function parseRules(text?: string | null): RuleItem[] {
  if (!text || !text.trim()) {
    return [
      {
        id: 'default',
        type: 'paragraph',
        body: 'Standart ITTF və BANM Stolüstü Tennis Klubu rəsmi reqlamenti və oyun qaydaları tətbiq olunur.',
      },
    ];
  }

  const lines = text.split('\n');
  const items: RuleItem[] = [];
  let itemIdx = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for headings: ### Title or ## Title or # Title
    if (line.startsWith('#')) {
      const cleanTitle = line.replace(/^#+\s*/, '').trim();
      items.push({
        id: `h-${itemIdx++}`,
        type: 'header',
        body: cleanTitle,
      });
      continue;
    }

    // Check for bullet or numbered list with bold label:
    // e.g. "- **Label:** text" or "1. **Label**: text" or "- **Label** - text"
    const boldMatch = line.match(/^[-*•\d.]*\s*\*\*(.+?)\*\*[:\s-]*(.*)$/);
    if (boldMatch) {
      const label = boldMatch[1].trim();
      const body = boldMatch[2].trim();
      const iconType = getIconForTitle(label);
      items.push({
        id: `rc-${itemIdx++}`,
        type: 'rule_card',
        title: label,
        body: body || label,
        iconType,
      });
      continue;
    }

    // Plain bullet or paragraph
    const cleanBody = line.replace(/^[-*•]\s*/, '').trim();
    items.push({
      id: `p-${itemIdx++}`,
      type: 'paragraph',
      body: cleanBody,
    });
  }

  return items;
}

export default function TournamentRulesViewer({
  rules,
  className = '',
}: TournamentRulesViewerProps) {
  const parsed = parseRules(rules);

  const renderIcon = (type?: RuleItem['iconType']) => {
    switch (type) {
      case 'trophy':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'users':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'award':
        return <Award className="w-4 h-4 text-rose-400" />;
      case 'clock':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'sparkles':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {parsed.map((item) => {
        if (item.type === 'header') {
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 pt-2 pb-1 border-b border-white/5"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h4 className="text-sm sm:text-base font-display font-black text-white tracking-wide">
                {item.body}
              </h4>
            </div>
          );
        }

        if (item.type === 'rule_card') {
          return (
            <div
              key={item.id}
              className="group p-3.5 sm:p-4 rounded-2xl bg-[#0F1623] hover:bg-[#131C2B] border border-white/10 hover:border-blue-600/40 transition-all shadow-sm flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                {renderIcon(item.iconType)}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-700/20 border border-blue-600/30 text-blue-300 text-[11px] font-display font-bold uppercase tracking-wider">
                  {item.title}
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {item.body}
                </p>
              </div>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 font-sans leading-relaxed"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>{item.body}</span>
          </div>
        );
      })}
    </div>
  );
}

