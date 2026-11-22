'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Swords,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  LogIn,
  Users,
  UserCheck,
} from 'lucide-react';
import { BHOSDataStore, getPlayerHref } from '../../lib/data/store';
import { PlayerProfile, canAccessAdminPanel, isProfilePending } from '../../lib/data/types';
import {
  ChallengeFormat,
  ChallengeRecord,
  acceptChallenge,
  cancelChallenge,
  createChallenge,
  fetchChallenges,
  getEffectiveChallengeStatus,
} from '../../lib/data/challenges';
import SmoothReveal from '../../components/SmoothReveal';
import CourtBackground from '../../components/CourtBackground';
import AthleteCombobox from '../../components/AthleteCombobox';
import { useTranslation } from '../../lib/i18n';

type BoardTab = 'open' | 'accepted' | 'mine';

export default function ChallengesPage() {
  const { t, locale } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(() => store.getCurrentUser());
  const [players, setPlayers] = useState<PlayerProfile[]>(() => store.getVerifiedProfiles());
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BoardTab>('open');

  const [showComposer, setShowComposer] = useState(false);
  const [isDirect, setIsDirect] = useState(false);
  const [targetOpponentId, setTargetOpponentId] = useState('');
  const [format, setFormat] = useState<ChallengeFormat>('bo5');
  const [proposedTime, setProposedTime] = useState('');
  const [note, setNote] = useState('');
  const [expiresInHours, setExpiresInHours] = useState<number>(24);

  const [submitting, setSubmitting] = useState(false);
  const [busyChallengeId, setBusyChallengeId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchChallenges();
    if (error) {
      setErrorMsg(t('challenges.err_load_failed', 'Çağırışlar yüklənərkən xəta baş verdi.'));
    } else {
      setChallenges(data);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    const syncStore = () => {
      setCurrentUser(store.getCurrentUser());
      setPlayers(store.getVerifiedProfiles().filter((p) => !isProfilePending(p)));
    };
    syncStore();
    void store.fetchProfilesFromCloud().then(syncStore);
    void loadChallenges();

    const unsub = store.subscribe(syncStore);
    return unsub;
  }, [store, loadChallenges]);

  const timePresets = useMemo(
    () => [
      t('challenges.preset_today_1330', 'Bu gün 13:30 • Bibiheybət Zalı'),
      t('challenges.preset_today_1500', 'Bu gün 15:00 • Bibiheybət Zalı'),
      t('challenges.preset_tomorrow_1230', 'Sabah 12:30 • Bibiheybət Zalı'),
    ],
    [t]
  );

  const openChallenges = useMemo(
    () => challenges.filter((c) => getEffectiveChallengeStatus(c) === 'open'),
    [challenges]
  );

  const acceptedChallenges = useMemo(
    () => challenges.filter((c) => getEffectiveChallengeStatus(c) === 'accepted'),
    [challenges]
  );

  const myChallenges = useMemo(() => {
    if (!currentUser) return [];
    return challenges.filter(
      (c) => c.challenger_id === currentUser.id || c.opponent_id === currentUser.id
    );
  }, [challenges, currentUser]);

  const visibleChallenges = useMemo(() => {
    if (activeTab === 'accepted') return acceptedChallenges;
    if (activeTab === 'mine') return myChallenges;
    return openChallenges;
  }, [activeTab, openChallenges, acceptedChallenges, myChallenges]);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);
    setNoticeMsg(null);

    if (!proposedTime.trim()) {
      setErrorMsg(t('challenges.err_time_required', 'Zəhmət olmasa təklif edilən vaxt və məkanı daxil edin.'));
      return;
    }

    if (isDirect && !targetOpponentId) {
      setErrorMsg(t('challenges.select_opponent', 'Rəqib seçin...'));
      return;
    }

    setSubmitting(true);
    const { error } = await createChallenge({
      challengerId: currentUser.id,
      opponentId: isDirect ? targetOpponentId : null,
      format,
      proposedTime,
      note,
      expiresInHours,
    });
    setSubmitting(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    setProposedTime('');
    setNote('');
    setTargetOpponentId('');
    setIsDirect(false);
    setShowComposer(false);
    setActiveTab('open');
    setNoticeMsg(t('challenges.created_success', 'Çağırışınız uğurla dərc olundu!'));
    await loadChallenges();
  };

  const handleAccept = async (challengeId: string) => {
    if (!currentUser) return;
    setErrorMsg(null);
    setNoticeMsg(null);
    setBusyChallengeId(challengeId);
    const { error } = await acceptChallenge(challengeId, currentUser.id);
    setBusyChallengeId(null);

    if (error) {
      setErrorMsg(error);
      return;
    }

    setNoticeMsg(
      t('challenges.accepted_success', 'Çağırış qəbul edildi! Oyunu keçirdikdən sonra nəticəni qeyd edin.')
    );
    await loadChallenges();
  };

  const handleCancel = async (challengeId: string) => {
    setErrorMsg(null);
    setNoticeMsg(null);
    setBusyChallengeId(challengeId);
    const { error } = await cancelChallenge(challengeId);
    setBusyChallengeId(null);

    if (error) {
      setErrorMsg(error);
      return;
    }

    setNoticeMsg(t('challenges.cancelled_success', 'Çağırış ləğv edildi.'));
    await loadChallenges();
  };

  const dateLocale = locale === 'az' ? 'az-AZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
  const isAdmin = canAccessAdminPanel(currentUser);

  return (
    <SmoothReveal>
      <div className="relative space-y-8 pb-12">
        {/* Hero Header */}
        <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-sm overflow-hidden">
          <CourtBackground className="opacity-20" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <Swords className="w-3.5 h-3.5" />
                <span>{t('challenges.badge', 'CANLI MEYDAN OXU LÖVHƏSİ')}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight">
                {t('challenges.page_title', 'Açıq Çağırışlar və Rəqib Axtarışı')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {t(
                  'challenges.page_subtitle',
                  'Bibiheybət zalında oyun vaxtını təklif et, açıq çağırışları qəbul et və ya birbaşa rəqibinə meydan oxu.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setShowComposer((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/40 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('challenges.post_challenge', 'Çağırış Paylaş')}</span>
                </button>
              ) : (
                <Link
                  href="/login?redirectTo=/challenges"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-xs sm:text-sm transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('challenges.login_cta', 'Giriş Et')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        {noticeMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{noticeMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Composer Form */}
        {currentUser && showComposer && (
          <form
            onSubmit={handleCreateChallenge}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-rose-400" />
                <span>{t('challenges.post_challenge', 'Çağırış Paylaş')}</span>
              </h2>

              <div className="inline-flex rounded-xl bg-slate-950 border border-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsDirect(false);
                    setTargetOpponentId('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    !isDirect ? 'bg-blue-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('challenges.open_to_anyone', 'Hamıya Açıq')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDirect(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isDirect ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('challenges.direct_rival', 'Xüsusi Rəqibə')}
                </button>
              </div>
            </div>

            {isDirect && (
              <AthleteCombobox
                label={t('challenges.direct_rival', 'Xüsusi Rəqibə')}
                players={players}
                value={targetOpponentId}
                onChange={setTargetOpponentId}
                excludeIds={[currentUser.id]}
                placeholder={t('challenges.select_opponent', 'Rəqib seçin...')}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('challenges.format_label', 'Oyun Formatı')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bo3', 'bo5', 'bo7'] as ChallengeFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-2.5 rounded-xl border font-mono text-xs font-black uppercase transition ${
                        format === fmt
                          ? 'bg-blue-700/25 border-blue-500 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {t('challenges.expires_in', 'Etibarlılıq müddəti')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[6, 12, 24, 48].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setExpiresInHours(hrs)}
                      className={`py-2.5 rounded-xl border font-mono text-xs font-bold transition ${
                        expiresInHours === hrs
                          ? 'bg-blue-700/25 border-blue-500 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {hrs}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('challenges.proposed_time', 'Təklif Edilən Vaxt & Məkan')}
              </label>
              <input
                type="text"
                maxLength={120}
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                placeholder={t(
                  'challenges.proposed_time_placeholder',
                  'Bu gün 13:30 • Bibiheybət İdman Zalı'
                )}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500">
                  {t('challenges.quick_presets', 'Sürətli şablonlar:')}
                </span>
                {timePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setProposedTime(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('challenges.note_label', 'Əlavə Qeyd (İstəyə bağlı)')}
              </label>
              <input
                type="text"
                maxLength={280}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  'challenges.note_placeholder',
                  'Məs: Masa 2-də isinmədən sonra rəsmi ELO oyunu'
                )}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
              >
                {t('challenges.cancel_btn', 'Ləğv Et')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('challenges.submitting', 'Paylaşılır...')}</span>
                  </>
                ) : (
                  <>
                    <Swords className="w-3.5 h-3.5" />
                    <span>{t('challenges.submit_challenge', 'Çağırışı Dərc Et')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {!currentUser && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
            <span>
              {t(
                'challenges.login_to_post',
                'Çağırış yaratmaq və ya rəqib çağırışlarını qəbul etmək üçün hesabınıza daxil olun.'
              )}
            </span>
            <Link
              href="/login?redirectTo=/challenges"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold shrink-0 self-start sm:self-auto transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('challenges.login_cta', 'Giriş Et')}</span>
            </Link>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              {
                id: 'open' as BoardTab,
                label: t('challenges.open_board', 'Açıq Lövhə'),
                count: openChallenges.length,
              },
              {
                id: 'accepted' as BoardTab,
                label: t('challenges.accepted_tab', 'Qəbul Edilmişlər'),
                count: acceptedChallenges.length,
              },
              ...(currentUser
                ? [
                    {
                      id: 'mine' as BoardTab,
                      label: t('challenges.my_challenges', 'Çağırışlarım'),
                      count: myChallenges.length,
                    },
                  ]
                : []),
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${
                activeTab === tab.id
                  ? 'bg-blue-700 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/25 font-mono text-[10px]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Challenges Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : visibleChallenges.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center space-y-2">
            <Swords className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-bold text-white">
              {activeTab === 'mine'
                ? t('challenges.empty_mine', 'Sizinlə bağlı heç bir çağırış tapılmadı.')
                : activeTab === 'accepted'
                ? t('challenges.empty_accepted', 'Hələ qəbul edilmiş aktiv çağırış yoxdur.')
                : t('challenges.empty_open', 'Hazırda aktiv açıq çağırış yoxdur. İlk çağırışı siz paylaşın!')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleChallenges.map((c) => {
              const effStatus = getEffectiveChallengeStatus(c);
              const challengerName = c.challenger?.full_name || 'BANM Athlete';
              const challengerElo = c.challenger?.current_elo ?? 0;
              const isOwner = Boolean(currentUser && currentUser.id === c.challenger_id);
              const canAccept =
                Boolean(currentUser) &&
                effStatus === 'open' &&
                currentUser!.id !== c.challenger_id &&
                (c.opponent_id === null || c.opponent_id === currentUser!.id);
              const canCancel =
                Boolean(currentUser) &&
                (isOwner || isAdmin) &&
                (effStatus === 'open' || effStatus === 'accepted');
              const isParticipantInAccepted =
                Boolean(currentUser) &&
                effStatus === 'accepted' &&
                (currentUser!.id === c.challenger_id || currentUser!.id === c.opponent_id);
              const otherPlayerId =
                currentUser?.id === c.challenger_id ? c.opponent_id : c.challenger_id;

              const statusBadge =
                effStatus === 'accepted'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : effStatus === 'expired'
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : effStatus === 'cancelled'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                  : c.opponent_id
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                  : 'bg-blue-600/15 text-blue-300 border-blue-500/35';

              const statusText =
                effStatus === 'accepted'
                  ? t('challenges.status_accepted', 'Qəbul Edildi')
                  : effStatus === 'expired'
                  ? t('challenges.status_expired', 'Vaxtı Bitdi')
                  : effStatus === 'cancelled'
                  ? t('challenges.status_cancelled', 'Ləğv Edildi')
                  : c.opponent_id
                  ? t('challenges.status_direct', 'Birbaşa Çağırış')
                  : t('challenges.status_open', 'Açıq Çağırış');

              return (
                <div
                  key={c.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-700/20 border border-blue-600/35 flex items-center justify-center font-display font-black text-blue-300 shrink-0">
                          {challengerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={getPlayerHref(c.challenger_id, challengerName)}
                            className="font-display font-bold text-sm sm:text-base text-white hover:text-blue-400 transition truncate block"
                          >
                            {challengerName}
                          </Link>
                          <div className="text-[11px] font-mono text-slate-400">
                            {challengerElo} ELO
                            {c.challenger?.major_faculty
                              ? ` • ${t(`faculties.${c.challenger.major_faculty}`, c.challenger.major_faculty)}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] font-black uppercase text-cyan-300">
                          {c.format.toUpperCase()}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadge}`}
                        >
                          {statusText}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{c.proposed_time}</span>
                      </div>
                      {c.note && (
                        <p className="text-xs text-slate-400 leading-relaxed">{c.note}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        {c.opponent_id && c.opponent ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {effStatus === 'accepted'
                                ? t('challenges.accepted_by', 'Qəbul etdi:')
                                : t('challenges.directed_to', 'Hədəf:')}{' '}
                              <Link
                                href={getPlayerHref(c.opponent.id, c.opponent.full_name)}
                                className="text-white hover:text-blue-400 font-semibold transition"
                              >
                                {c.opponent.full_name}
                              </Link>
                            </span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span>{t('challenges.vs_anyone', 'İstənilən Oyunçuya Açıq')}</span>
                          </>
                        )}
                      </span>

                      <span className="font-mono text-[10px] text-slate-500">
                        {t('challenges.expires_prefix', 'Bitir:')}{' '}
                        {new Date(c.expires_at).toLocaleString(dateLocale, {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {(canAccept || canCancel || isParticipantInAccepted) && (
                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2">
                      {canAccept && (
                        <button
                          type="button"
                          disabled={busyChallengeId === c.id}
                          onClick={() => handleAccept(c.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition disabled:opacity-50"
                        >
                          {busyChallengeId === c.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{t('challenges.accept_btn', 'Qəbul Et')}</span>
                        </button>
                      )}

                      {isParticipantInAccepted && otherPlayerId && (
                        <Link
                          href={`/log-match?opponentId=${encodeURIComponent(otherPlayerId)}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition"
                        >
                          <span>{t('challenges.log_result_btn', 'Nəticəni Qeyd Et')}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}

                      {canCancel && (
                        <button
                          type="button"
                          disabled={busyChallengeId === c.id}
                          onClick={() => handleCancel(c.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-600/20 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold text-slate-300 hover:text-rose-300 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t('challenges.cancel_btn', 'Ləğv Et')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SmoothReveal>
  );
}
