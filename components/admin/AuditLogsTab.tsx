'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MatchAuditLogRecord, fetchMatchAuditLogs } from '../../lib/services/matches';
import { useTranslation } from '../../lib/i18n';
import { ShieldCheck, Search, RotateCcw, Loader2, Clock } from 'lucide-react';

export default function AuditLogsTab() {
  const { t, locale } = useTranslation();

  const [logs, setLogs] = useState<MatchAuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const data = await fetchMatchAuditLogs(100);
    setLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.match_id.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q) ||
        (log.match?.player1_name || '').toLowerCase().includes(q) ||
        (log.match?.player2_name || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const dateLocale = locale === 'az' ? 'az-AZ' : locale === 'ru' ? 'ru-RU' : 'en-US';

  return (
    <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              {t('admin.audit_title', 'Avto-Təsdiq & Audit Jurnalı')}
            </h2>
            <p className="text-xs text-slate-400">
              {t(
                'admin.audit_subtitle',
                '48 saatlıq gözləmədən sonra avtomatik təsdiqlənən matçların xronoloji jurnalı'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Oyunçu, səbəb, ID..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-48 sm:w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadLogs()}
            title={t('admin.audit_refresh', 'Yenilə')}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="py-10 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>{t('admin.audit_loading', 'Audit qeydləri yüklənir...')}</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">
          {t('admin.audit_empty', 'Hələ heç bir audit qeydi tapılmadı.')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="py-2.5 px-3">{t('admin.audit_resolved_at', 'Tarix')}</th>
                <th className="py-2.5 px-3">{t('admin.audit_match', 'Matç')}</th>
                <th className="py-2.5 px-3">{t('admin.audit_reason', 'Səbəb')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                      {new Date(log.resolved_at).toLocaleString(dateLocale, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {log.match ? (
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">
                          {log.match.player1_name}{' '}
                          <span className="font-mono text-cyan-300 px-1">
                            {log.match.player1_score} - {log.match.player2_score}
                          </span>{' '}
                          {log.match.player2_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          ±{log.match.elo_delta ?? 0} ELO • {log.match_id.slice(0, 8)}…
                        </div>
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-400">{log.match_id}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {log.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
