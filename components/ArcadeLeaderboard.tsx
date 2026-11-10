'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Crown, Medal, Loader2, RefreshCw, Infinity as InfinityIcon, ShieldCheck } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import { getPlayerHref } from '../lib/data/store';

export const ARCADE_INFINITY_MODE = 'infinity';

interface ArcadeRow {
  rank: number;
  user_id: string;
  full_name: string;
  slug: string | null;
  department: string | null;
  year_of_study?: number | null;
  avatar_url: string | null;
  score: number;
}

const DEPARTMENT_LABELS: Record<string, string> = {
  'computer engineering': 'Kompüter mühəndisliyi',
  'process automation engineering': 'Proseslərin avtomatlaşdırılması',
  'process automation': 'Proseslərin avtomatlaşdırılması',
  'information security': 'İnformasiya təhlükəsizliyi',
  'chemical engineering': 'Kimya mühəndisliyi',
  'petroleum engineering': 'Neft-qaz mühəndisliyi',
  'business administration': 'Biznesin idarə edilməsi',
  'idman klubu': 'İdman Klubu',
};

const formatPlayerDepartment = (player: {
  department?: string | null;
  year_of_study?: number | null;
}) => {
  if (
    player.year_of_study &&
    player.year_of_study !== 2026 &&
    player.department?.toLowerCase() === 'foundation'
  ) {
    return 'Tələbə';
  }
  if (player.year_of_study === 2026 || player.department?.toLowerCase() === 'foundation') {
    return 'Foundation';
  }
  if (player.department && player.department.trim() !== '') {
    const raw = player.department.trim();
    const mapped = DEPARTMENT_LABELS[raw.toLowerCase()];
    return mapped || raw;
  }
  return 'Tələbə';
};

interface MyStanding {
  rank: number;
  score: number;
}

interface ArcadeLeaderboardProps {
  /** Bump to force a refetch (e.g. after a score submission) */
  refreshKey?: number;
  currentUserId?: string | null;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/50 text-amber-300"
        title="1-ci yer"
      >
        <Crown className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/10 border border-slate-300/50 text-slate-200"
        title="2-ci yer"
      >
        <Medal className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-700/20 border border-orange-500/50 text-orange-400"
        title="3-cü yer"
      >
        <Medal className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono font-bold text-slate-400">
      {rank}
    </span>
  );
}

export default function ArcadeLeaderboard({
  refreshKey = 0,
  currentUserId = null,
}: ArcadeLeaderboardProps) {
  const [rows, setRows] = useState<ArcadeRow[]>([]);
  const [myStanding, setMyStanding] = useState<MyStanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_arcade_leaderboard', {
        p_mode: ARCADE_INFINITY_MODE,
        p_limit: 10,
      });

      if (rpcError) throw rpcError;

      setRows(
        ((data || []) as any[])
          .filter((r) => Number(r.score) < 700)
          .map((r, idx) => ({
            rank: idx + 1,
            user_id: r.user_id,
            full_name: r.full_name || 'Oyunçu',
            slug: r.slug ?? null,
            department: r.department ?? null,
            year_of_study:
              r.year_of_study != null
                ? Number(r.year_of_study)
                : r.admission_year != null
                ? Number(r.admission_year)
                : null,
            avatar_url: r.avatar_url ?? null,
            score: Number(r.score),
          }))
      );

      if (currentUserId) {
        const { data: mine } = await supabase.rpc('get_my_arcade_standing', {
          p_mode: ARCADE_INFINITY_MODE,
        });
        const first = Array.isArray(mine) ? mine[0] : mine;
        const myScore = first && first.score != null ? Number(first.score) : 0;
        setMyStanding(
          first && first.rank != null && myScore > 0 && myScore < 700
            ? { rank: Number(first.rank), score: myScore }
            : null
        );
      } else {
        setMyStanding(null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const meInTop = currentUserId ? rows.find((r) => r.user_id === currentUserId) : undefined;

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <Trophy className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-display font-bold text-white leading-tight">
              Sonsuz Ralli Liderləri
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <InfinityIcon className="w-3 h-3 text-cyan-400" />
                <span>Ən yüksək ralli • Top 10</span>
              </p>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <ShieldCheck className="w-2.5 h-2.5" />
                Doğrulanmış
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="Yenilə"
          title="Yenilə"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-8 flex items-center justify-center text-slate-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Yüklənir...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
          Reytinq cədvəli hazırda əlçatan deyil.
        </div>
      ) : rows.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
          Hələ heç kim rekord qeyd etməyib. İlk siz olun! 🏓
        </div>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row) => {
            const isMe = currentUserId === row.user_id;
            return (
              <li key={row.user_id}>
                <Link
                  href={getPlayerHref(row.user_id, row.full_name)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition ${
                    isMe
                      ? 'bg-blue-700/15 border-blue-600/50'
                      : row.rank === 1
                      ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-400/60'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <RankBadge rank={row.rank} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {row.full_name}
                      </span>
                      {isMe && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-700 text-white text-[9px] font-bold uppercase shrink-0">
                          Siz
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {formatPlayerDepartment(row)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-black text-sm ${
                        row.rank === 1 ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      {row.score}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">
                      ralli
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {currentUserId && !meInTop && myStanding && !error && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-blue-700/10 border border-blue-600/40 text-xs">
          <span className="text-slate-300">
            Sizin yeriniz:{' '}
            <span className="font-mono font-black text-blue-300">#{myStanding.rank}</span>
          </span>
          <span className="font-mono font-bold text-white">
            {myStanding.score} <span className="text-slate-500 font-normal">ralli</span>
          </span>
        </div>
      )}
    </div>
  );
}
