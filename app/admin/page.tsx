'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BHOSDataStore } from '../../lib/data/store';
import {
  PlayerProfile,
  UserRole,
  BHOSFaculty,
  MatchRecord,
  isDefaultMember,
  getProfileOrigin,
  isProfilePending,
  formatDateTimeAz,
} from '../../lib/data/types';
import { getSupabaseClient } from '../../lib/supabase/client';
import {
  sanitizePlayerName,
  sanitizeTextInput,
  sanitizeMultilineText,
} from '../../lib/security/sanitize';
import { useTranslation } from '../../lib/i18n';
import MatchLoggerModal from '../../components/MatchLoggerModal';
import PendingVerificationQueue from '../../components/PendingVerificationQueue';
import PendingApprovals from '../../components/PendingApprovals';
import SmoothReveal from '../../components/SmoothReveal';
import {
  ShieldAlert,
  Sliders,
  Trophy,
  RotateCcw,
  CheckCircle2,
  Zap,
  AlertCircle,
  Lock,
  UserPlus,
  GraduationCap,
  Briefcase,
  Trash2,
  Search,
  History,
  Pencil,
  X,
  Calendar,
  Ban,
  Loader2,
} from 'lucide-react';

const FACULTIES: BHOSFaculty[] = [
  'Information Security',
  'Computer Engineering',
  'Computer Science',
  'Data Analytics',
  'Chemical Engineering',
  'Petroleum Engineering',
  'Process Automation',
  'Business Administration',
  'Finance',
];

const STAFF_DEPARTMENTS: string[] = [
  'İdman Klubu',
  'Riyaziyyat və Təbii Elmlər',
  'İnformasiya Texnologiyaları',
  'Neft-Qaz Mühəndisliyi',
  'Kimya Mühəndisliyi',
  'Proseslərin Avtomatlaşdırılması',
  'İnzibati Heyət / Dekanlıq',
];

const ADMISSION_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matchesList, setMatchesList] = useState<MatchRecord[]>([]);
  const [matchSearch, setMatchSearch] = useState('');
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<MatchRecord | null>(null);
  const [isVoiding, setIsVoiding] = useState<boolean>(false);
  const [editingMatch, setEditingMatch] = useState<MatchRecord | null>(null);
  const [editP1Score, setEditP1Score] = useState<number>(0);
  const [editP2Score, setEditP2Score] = useState<number>(0);
  const [editSetScores, setEditSetScores] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('confirmed');
  const [editTournament, setEditTournament] = useState<string>('');
  const [editMatchDate, setEditMatchDate] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<number>(25);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(null);
  const [eloEdits, setEloEdits] = useState<Record<string, number>>({});
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingFoundingId, setTogglingFoundingId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState<string>('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'registered' | 'default' | 'pending'>('all');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [newUserType, setNewUserType] = useState<'student' | 'teacher'>('student');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMajor, setNewMajor] = useState<string>('Computer Engineering');
  const [newAdmissionYear, setNewAdmissionYear] = useState<number>(2024);
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [newRole, setNewRole] = useState<UserRole>('player');
  const [newInitialElo, setNewInitialElo] = useState<number>(0);

  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tRules, setTRules] = useState(
    '### Turnir Qaydaları\n- Olimpiya sistemi (uduzan çıxır), 5 setdən ən yaxşısı.\n- ITTF standartlı servis qaydası (16 sm açıq ovucdan atış).'
  );
  const [tStartDate, setTStartDate] = useState('2026-10-15');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const totalMembersCount = profiles.length;
  const defaultMembersCount = useMemo(
    () => profiles.filter((p) => getProfileOrigin(p) === 'İlkin Heyət').length,
    [profiles]
  );
  const registeredMembersCount = useMemo(
    () => profiles.filter((p) => getProfileOrigin(p) === 'Qeydiyyat').length,
    [profiles]
  );
  const pendingMembersCount = useMemo(
    () => profiles.filter((p) => isProfilePending(p)).length,
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const origin = getProfileOrigin(p);
      const pending = isProfilePending(p);
      if (memberFilter === 'registered' && origin !== 'Qeydiyyat') return false;
      if (memberFilter === 'default' && origin !== 'İlkin Heyət') return false;
      if (memberFilter === 'pending' && !pending) return false;
      if (memberSearchQuery.trim()) {
        const q = memberSearchQuery.toLowerCase().trim();
        const matchName = p.full_name?.toLowerCase().includes(q);
        const matchEmail = p.email?.toLowerCase().includes(q);
        const matchFaculty = p.major_faculty?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchFaculty) return false;
      }
      return true;
    });
  }, [profiles, memberFilter, memberSearchQuery]);

  useEffect(() => {
    store.fetchMatchesFromCloud();
    const update = () => {
      const pList = store.getProfiles();
      setProfiles(pList);
      setMatchesList(store.getMatches());
      setCurrentUser(store.getCurrentUser());

      const initElo: Record<string, number> = {};
      pList.forEach((p) => {
        initElo[p.id] = p.current_elo;
      });
      setEloEdits(initElo);

      if (selectedParticipants.length === 0 && pList.length >= 4) {
        setSelectedParticipants(pList.slice(0, 4).map((p) => p.id));
      }
    };
    update();
    return store.subscribe(update);
  }, [store, selectedParticipants.length]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleDeleteMatch = async (match: MatchRecord) => {
    const matchLabel = `${match.player1_name} (${match.player1_score}) vs ${match.player2_name} (${match.player2_score})`;
    const confirmed = window.confirm(
      `"${matchLabel}" oyun qeydini sistemdən və bazadan tamamilə silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarılmır.`
    );
    if (!confirmed) return;

    setDeletingMatchId(match.id);
    try {
      const ok = await store.deleteMatch(match.id);
      if (ok) {
        showToast('Oyun qeydi uğurla silindi.');
      } else {
        showToast('Oyun tapılmadı.');
      }
    } catch (err: any) {
      showToast(err.message || 'Oyun silinərkən xəta baş verdi.');
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    const target = voidTarget;
    setIsVoiding(true);
    try {
      await store.voidMatch(target.id);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('bhos_tt_leaderboard_cache_v1');
      }
      setMatchesList((prev) => prev.filter((m) => m.id !== target.id));
      setSelectedMatchIds((prev) => prev.filter((id) => id !== target.id));
      setVoidTarget(null);
      showToast(
        `Matç ləğv edildi. ${target.elo_delta || 0} ELO xalı hər iki oyunçuya geri qaytarıldı.`
      );
    } catch (err: any) {
      showToast(err.message || 'Matç ləğv edilərkən xəta baş verdi.');
    } finally {
      setIsVoiding(false);
    }
  };

  const handleOpenEditModal = (m: MatchRecord) => {
    setEditingMatch(m);
    setEditP1Score(m.player1_score);
    setEditP2Score(m.player2_score);
    setEditSetScores(m.set_scores || '');
    setEditStatus(m.status || 'confirmed');
    setEditTournament(m.tournament_title || '');
    setEditMatchDate(
      m.match_date ? m.match_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setIsSavingEdit(true);
    try {
      const updates: Partial<MatchRecord> = {
        player1_score: Number(editP1Score),
        player2_score: Number(editP2Score),
        set_scores: editSetScores.trim(),
        status: editStatus,
        tournament_title: editTournament.trim() || undefined,
        match_date: editMatchDate
          ? new Date(editMatchDate).toISOString()
          : editingMatch.match_date,
      };
      await store.updateMatch(editingMatch.id, updates);
      showToast('Oyun məlumatları uğurla yeniləndi.');
      setEditingMatch(null);
    } catch (err: any) {
      showToast(err.message || 'Oyun yenilənərkən xəta baş verdi.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredMatches = matchesList.filter((m) => {
    if (!matchSearch.trim()) return true;
    const q = matchSearch.toLowerCase();
    return (
      m.player1_name?.toLowerCase().includes(q) ||
      m.player2_name?.toLowerCase().includes(q) ||
      m.tournament_title?.toLowerCase().includes(q) ||
      m.logged_by_name?.toLowerCase().includes(q) ||
      m.set_scores?.toLowerCase().includes(q)
    );
  });

  const displayedMatches = filteredMatches.slice(0, displayLimit);

  const toggleSelectMatch = (id: string) => {
    setSelectedMatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearMatchSelection = () => {
    setSelectedMatchIds([]);
  };

  const handleDeleteSelectedMatches = async () => {
    if (selectedMatchIds.length === 0) return;
    const count = selectedMatchIds.length;
    const confirmed = window.confirm(
      `Seçilmiş ${count} oyunu sistemdən və bazadan tamamilə silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarılmır.`
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await store.deleteMatches(selectedMatchIds);
      setSelectedMatchIds([]);
      showToast(`${count} oyun uğurla silindi.`);
    } catch (err: any) {
      showToast(err.message || 'Oyunlar silinərkən xəta baş verdi.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const allDisplayedSelected =
    displayedMatches.length > 0 &&
    displayedMatches.every((m) => selectedMatchIds.includes(m.id));

  const toggleSelectAllDisplayed = () => {
    if (allDisplayedSelected) {
      const displayedIdSet = new Set(displayedMatches.map((m) => m.id));
      setSelectedMatchIds((prev) => prev.filter((id) => !displayedIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedMatchIds, ...displayedMatches.map((m) => m.id)]);
      setSelectedMatchIds(Array.from(newIds));
    }
  };

  const handleOverrideElo = (playerId: string) => {
    const val = eloEdits[playerId];
    if (typeof val !== 'number' || isNaN(val)) return;
    const safeElo = Math.max(0, val);
    const updated = store.overrideElo(playerId, safeElo);
    showToast(`${updated.full_name} üçün ELO ${updated.current_elo} olaraq yeniləndi`);
  };

  const handleRoleChange = (playerId: string, role: UserRole) => {
    const updated = store.updateUserRole(playerId, role);
    showToast(`${updated.full_name} rolu ${t(`roles.${role}`)} olaraq dəyişdirildi`);
  };

  const handleUserTypeToggle = (player: PlayerProfile) => {
    const isCurrentlyStaff =
      player.user_type === 'teacher' ||
      player.user_type === 'staff' ||
      !player.admission_year;

    const updates: Partial<PlayerProfile> = isCurrentlyStaff
      ? { user_type: 'student', admission_year: 2024 }
      : { user_type: 'teacher', admission_year: null };

    const updated = store.updateProfile(player.id, updates);
    showToast(
      `${updated.full_name} statusu ${
        updates.user_type === 'teacher' ? 'Müəllim / Əməkdaş' : 'Tələbə (2024)'
      } olaraq yeniləndi`
    );
  };

  const handleStartEditName = (player: PlayerProfile) => {
    setEditingPlayerId(player.id);
    setEditPlayerName(player.full_name);
  };

  const handleCancelEditName = () => {
    setEditingPlayerId(null);
    setEditPlayerName('');
  };

  const handleSavePlayerName = async (playerId: string) => {
    const trimmed = sanitizePlayerName(editPlayerName, 80);
    if (!trimmed || trimmed.length < 2) {
      showToast('Zəhmət olmasa adı düzgün daxil edin (ən azı 2 hərf).');
      return;
    }
    try {
      const updated = store.updateProfile(playerId, { full_name: trimmed });
      showToast(`${updated.full_name} adı uğurla yeniləndi.`);
      setEditingPlayerId(null);
      setEditPlayerName('');
    } catch (err: any) {
      showToast(err.message || 'Ad yenilənərkən xəta baş verdi.');
    }
  };

  const handleDeletePlayer = async (player: PlayerProfile) => {
    if (player.id === currentUser?.id) {
      showToast('Öz profilinizi silə bilməzsiniz.');
      return;
    }

    const confirmed = window.confirm(
      `"${player.full_name}" adlı üzvü bazadan birdəfəlik silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`
    );
    if (!confirmed) return;

    setDeletingId(player.id);
    try {
      const ok = await store.deleteProfile(player.id);
      if (ok) {
        showToast(`"${player.full_name}" uğurla silindi.`);
      } else {
        showToast('Profil tapılmadı.');
      }
    } catch (err: any) {
      showToast(err.message || 'Üzvü silərkən xəta baş verdi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFoundingMember = async (player: PlayerProfile) => {
    const isCurrentlyFounding =
      player.origin === 'İlkin Heyət' || isDefaultMember(player.id, player.email);
    const nextOrigin: 'İlkin Heyət' | 'Qeydiyyat' = isCurrentlyFounding
      ? 'Qeydiyyat'
      : 'İlkin Heyət';

    setTogglingFoundingId(player.id);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        if (!isCurrentlyFounding) {
          await supabase.from('profile_achievements').upsert(
            [
              {
                profile_id: player.id,
                badge_id: 'founding_member',
                unlocked_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'profile_id,badge_id' }
          );
        } else {
          await supabase
            .from('profile_achievements')
            .delete()
            .eq('profile_id', player.id)
            .eq('badge_id', 'founding_member');
        }

        await supabase
          .from('profiles')
          .update({ origin: nextOrigin })
          .eq('id', player.id);
      }

      store.updateProfile(player.id, { origin: nextOrigin });

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(`bhos_player_${player.id}`);
        } catch {}
      }

      showToast(
        !isCurrentlyFounding
          ? `"${player.full_name}" adlı oyunçuya 🏆 Qızıl Heyət nailiyyəti verildi!`
          : `"${player.full_name}" üçün Qızıl Heyət statusu ləğv edildi.`
      );
    } catch (err: any) {
      showToast(err.message || 'Xəta baş verdi.');
    } finally {
      setTogglingFoundingId(null);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFullName = sanitizePlayerName(newFullName, 80);
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanFullName || cleanFullName.length < 2 || !cleanEmail) {
      showToast('Zəhmət olmasa ad (ən azı 2 hərf) və e-poçt daxil edin.');
      return;
    }

    const isStaff = newUserType === 'teacher';
    const createdProfile: PlayerProfile = {
      id: `p-${Date.now()}`,
      full_name: cleanFullName,
      email: cleanEmail,
      major_faculty: sanitizeTextInput(newMajor, 80) || 'Computer Engineering',
      admission_year: isStaff ? null : Number(newAdmissionYear),
      user_type: isStaff ? 'teacher' : 'student',
      gender: newGender,
      role: newRole,
      playing_level: 'Intermediate',
      playing_style: 'Shakehand All-round',
      blade_equipment: 'Standard Club Racket',
      forehand_rubber: 'Standard Red',
      backhand_rubber: 'Standard Black',
      current_elo: Math.min(999, Math.max(0, Math.round(Number(newInitialElo) || 0))),
      matches_played: 0,
      wins: 0,
      losses: 0,
      is_verified: true,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('profiles').insert([createdProfile]);
    }

    store.addProfile(createdProfile);
    setNewFullName('');
    setNewEmail('');
    setShowAddMember(false);
    showToast(`${createdProfile.full_name} rəsmi siyahıya əlavə edildi!`);
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = sanitizeTextInput(tTitle, 100);
    if (!cleanTitle || cleanTitle.length < 2) {
      setFormError('Zəhmət olmasa turnirin adını daxil edin (ən azı 2 hərf).');
      return;
    }

    const uniqueParticipants = Array.from(new Set(selectedParticipants.filter(Boolean)));
    if (uniqueParticipants.length < 2) {
      setFormError('Olimpiya səbəti yaratmaq üçün ən azı 2 fərqli iştirakçı seçin.');
      return;
    }

    const cleanDesc =
      sanitizeMultilineText(tDesc, 600) || 'Rəsmi BANM Stolüstü Tennis Klubu turniri.';
    const cleanRules = sanitizeMultilineText(tRules, 1500);
    const maxParticipants =
      uniqueParticipants.length <= 2
        ? 2
        : uniqueParticipants.length <= 4
        ? 4
        : uniqueParticipants.length <= 8
        ? 8
        : 16;

    try {
      const created = store.createTournament({
        title: cleanTitle,
        description: cleanDesc,
        custom_rules: cleanRules,
        format: 'single_elimination',
        max_participants: maxParticipants,
        start_date: new Date(tStartDate).toISOString(),
        created_by: currentUser?.id || 'p-1',
        participant_ids: uniqueParticipants,
      });

      setTTitle('');
      setTDesc('');
      showToast(`"${created.title}" turniri rəsmi səbətlə yaradıldı!`);
    } catch (err: any) {
      setFormError(err.message || 'Turnir yaradılarkən xəta baş verdi.');
    }
  };

  const handleResetDemo = () => {
    store.resetToDefault();
    showToast('Portal məlumatları ilkin BANM vəziyyətinə qaytarıldı.');
  };

  const isAuthorized =
    currentUser?.role === 'president' || currentUser?.role === 'coach';

  return (
    <SmoothReveal>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Prezident və Məşqçi İdarəetmə Mərkəzi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              {t('admin.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {t('admin.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAuthorized && (
              <button
                onClick={() => setShowAddMember((prev) => !prev)}
                className="px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-display font-bold text-xs transition flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Yeni Üzv Əlavə Et</span>
              </button>
            )}
            <button
              onClick={() => setShowMatchModal(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{t('nav.log_match')}</span>
            </button>
            <button
              onClick={handleResetDemo}
              className="px-4 py-2.5 rounded-xl border border-white/15 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('admin.reset_demo')}</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {!isAuthorized ? (
          <div className="p-8 rounded-3xl border border-rose-500/30 bg-rose-950/20 text-center space-y-3">
            <Lock className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-lg font-display font-bold text-white">
              Məhdudlaşdırılmış İdarəetmə Paneli
            </h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Hazırda <strong>{currentUser?.full_name || 'Qonaq'}</strong> olaraq baxırsınız. ELO xallarına düzəliş etmək və ya turnir yaratmaq üçün <strong>Prezident (Ali Iskandarli)</strong> və ya <strong>Məşqçi (Iftixar Meherremov)</strong> hesabına keçin.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <PendingVerificationQueue />
            <PendingApprovals />

            {showAddMember && (
              <form
                onSubmit={handleAddMemberSubmit}
                className="p-6 rounded-3xl border border-indigo-500/30 bg-slate-900/90 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-display font-bold text-white">
                      Yeni Klub Üzvü Əlavə Et (Tələbə və ya Müəllim / Əməkdaş)
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setNewUserType('student');
                        setNewMajor(FACULTIES[1]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        newUserType === 'student'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Tələbə</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewUserType('teacher');
                        setNewMajor(STAFF_DEPARTMENTS[0]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        newUserType === 'teacher'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Müəllim / Əməkdaş</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Ad və Soyad
                    </label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="Məs: İftixar Məhərrəmov"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {newUserType === 'student' ? 'BANM Tələbə E-poçtu' : 'E-poçt Ünvanı'}
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={
                        newUserType === 'teacher'
                          ? 'nümunə@email.com'
                          : 'ad.soyad.std@bhos.edu.az'
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {newUserType === 'student' ? 'Fakültə / İxtisas' : 'Kafedra / Departament'}
                    </label>
                    <select
                      value={newMajor}
                      onChange={(e) => setNewMajor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      {newUserType === 'student'
                        ? FACULTIES.map((fac) => (
                            <option key={fac} value={fac}>
                              {fac}
                            </option>
                          ))
                        : STAFF_DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                    </select>
                  </div>

                  {newUserType === 'student' ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Qəbul İli
                      </label>
                      <select
                        value={newAdmissionYear}
                        onChange={(e) => setNewAdmissionYear(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      >
                        {ADMISSION_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Status
                      </label>
                      <div className="px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs font-bold text-indigo-300">
                        Müəllim / Əməkdaş (Qəbul ili tələb olunmur)
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Kateqoriya:</span>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value as 'male' | 'female')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="male">Oğlan / Bəy</option>
                        <option value="female">Qız / Xanım</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Rol:</span>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="player">Oyunçu</option>
                        <option value="coach">Məşqçi</option>
                        <option value="president">Prezident</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Başlanğıc ELO:</span>
                      <input
                        type="number"
                        min={0}
                        value={newInitialElo}
                        onChange={(e) => setNewInitialElo(Number(e.target.value))}
                        className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-cyan-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
                  >
                    Üzvü Yadda Saxla
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-4">
                <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-cyan-400 shrink-0" />
                      <div>
                        <h2 className="text-lg font-display font-bold text-white">
                          {t('admin.elo_override')}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-medium">
                          <span>Ümumi: {totalMembersCount}</span>
                          <span>•</span>
                          <span className="text-blue-400">Qeydiyyat: {registeredMembersCount}</span>
                          <span>•</span>
                          <span className="text-amber-400">İlkin Heyət: {defaultMembersCount}</span>
                          <span>•</span>
                          <span className="text-orange-400">Gözləyən: {pendingMembersCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setMemberFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs ${
                          memberFilter === 'all'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Hamısı ({totalMembersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberFilter('registered')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs ${
                          memberFilter === 'registered'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Qeydiyyat ({registeredMembersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberFilter('default')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs ${
                          memberFilter === 'default'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        İlkin Heyət ({defaultMembersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberFilter('pending')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition text-xs ${
                          memberFilter === 'pending'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Gözləyən ({pendingMembersCount})
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Üzv adı, email və ya ixtisas üzrə axtarış..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase text-slate-400">
                          <th className="py-2.5 px-3">Üzv</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Qoşulub</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Rol</th>
                          <th className="py-2.5 px-3">ELO Xalı</th>
                          <th className="py-2.5 px-3 text-right">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {filteredProfiles.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                              Seçilmiş filtrə və ya axtarışa uyğun heç bir üzv tapılmadı.
                            </td>
                          </tr>
                        ) : (
                          filteredProfiles.map((p) => {
                            const isStaff =
                              p.user_type === 'teacher' ||
                              p.user_type === 'staff' ||
                              p.role === 'coach' ||
                              !p.admission_year;
                            const isDefault = isDefaultMember(p.id, p.email);

                            return (
                              <tr key={p.id} className="hover:bg-white/[0.02]">
                                <td className="py-3 px-3">
                                  {editingPlayerId === p.id ? (
                                    <div className="flex items-center gap-1.5 py-0.5">
                                      <input
                                        type="text"
                                        value={editPlayerName}
                                        onChange={(e) => setEditPlayerName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSavePlayerName(p.id);
                                          if (e.key === 'Escape') handleCancelEditName();
                                        }}
                                        autoFocus
                                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-cyan-500/60 text-white font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 w-full max-w-[200px]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSavePlayerName(p.id)}
                                        title="Yadda Saxla"
                                        className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEditName}
                                        title="İmtina"
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="font-semibold text-white hover:text-cyan-300 transition cursor-pointer"
                                        onDoubleClick={() => handleStartEditName(p)}
                                        title="Adı dəyişmək üçün klikləyin"
                                      >
                                        {p.full_name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditName(p)}
                                        title="Adı Redaktə Et"
                                        className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-white/5 transition"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  <div className="text-[11px] text-slate-400">
                                    {p.major_faculty}
                                    {isStaff ? ' • Müəllim' : ` • ${p.admission_year}`}
                                  </div>
                                  {p.email && (
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {p.email}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                                    <Calendar className="w-3 h-3 text-cyan-400 shrink-0" />
                                    <span>{formatDateTimeAz(p.created_at)}</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFoundingMember(p)}
                                      disabled={togglingFoundingId === p.id}
                                      title={
                                        getProfileOrigin(p) === 'İlkin Heyət'
                                          ? 'Qızıl Heyət statusunu ləğv etmək üçün klikləyin'
                                          : 'Qızıl Heyət nailiyyətini vermək üçün klikləyin'
                                      }
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition active:scale-95 disabled:opacity-50 ${
                                        getProfileOrigin(p) === 'İlkin Heyət'
                                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/15'
                                          : 'bg-white/5 hover:bg-amber-500/15 text-slate-400 hover:text-amber-300 border border-white/10 hover:border-amber-500/30'
                                      }`}
                                    >
                                      {togglingFoundingId === p.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                                      ) : (
                                        <Trophy
                                          className={`w-3 h-3 ${
                                            getProfileOrigin(p) === 'İlkin Heyət'
                                              ? 'text-amber-400'
                                              : 'opacity-40'
                                          }`}
                                        />
                                      )}
                                      <span>
                                        {getProfileOrigin(p) === 'İlkin Heyət'
                                          ? 'Qızıl Heyət'
                                          : '+ Qızıl Heyət'}
                                      </span>
                                    </button>

                                    {getProfileOrigin(p) !== 'İlkin Heyət' && (
                                      <span
                                        title="Saytdan rəsmi qeydiyyatdan keçmiş istifadəçi"
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                      >
                                        Qeydiyyat
                                      </span>
                                    )}

                                    {isProfilePending(p) && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                        Gözləyən
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <button
                                    type="button"
                                    onClick={() => handleUserTypeToggle(p)}
                                    title="Statusu dəyişmək üçün klikləyin"
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                      isStaff
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                        : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                    }`}
                                  >
                                    {isStaff ? (
                                      <>
                                        <Briefcase className="w-3 h-3" />
                                        <span>Müəllim / Əməkdaş</span>
                                      </>
                                    ) : (
                                      <>
                                        <GraduationCap className="w-3 h-3" />
                                        <span>Tələbə • {p.admission_year}</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 px-3">
                                  <select
                                    value={p.role}
                                    onChange={(e) =>
                                      handleRoleChange(p.id, e.target.value as UserRole)
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                                  >
                                    <option value="player">{t('roles.player')}</option>
                                    <option value="coach">{t('roles.coach')}</option>
                                    <option value="president">{t('roles.president')}</option>
                                  </select>
                                </td>
                                <td className="py-3 px-3">
                                  <input
                                    type="number"
                                    min={0}
                                    value={eloEdits[p.id] ?? p.current_elo}
                                    onChange={(e) =>
                                      setEloEdits((prev) => ({
                                        ...prev,
                                        [p.id]: parseInt(e.target.value, 10) || 0,
                                      }))
                                    }
                                    className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono font-bold text-cyan-400 text-xs focus:outline-none focus:border-cyan-400"
                                  />
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFoundingMember(p)}
                                      disabled={togglingFoundingId === p.id}
                                      title={
                                        getProfileOrigin(p) === 'İlkin Heyət'
                                          ? 'Qızıl Heyət statusunu ləğv et'
                                          : 'Qızıl Heyət nailiyyətini ver'
                                      }
                                      className={`p-1.5 rounded-lg border transition ${
                                        getProfileOrigin(p) === 'İlkin Heyət'
                                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-amber-300 hover:border-amber-500/30'
                                      }`}
                                    >
                                      {togglingFoundingId === p.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                      ) : (
                                        <Trophy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditName(p)}
                                      title="Adı Redaktə Et"
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 border border-white/10 transition"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOverrideElo(p.id)}
                                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition"
                                    >
                                      {t('admin.save_elo')}
                                    </button>
                                    {p.id !== currentUser?.id && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePlayer(p)}
                                        disabled={deletingId === p.id}
                                        title="Oyunçunu Sil"
                                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <form
                  onSubmit={handleCreateTournament}
                  className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-display font-bold text-white">
                      {t('tournaments.create_btn')}
                    </h2>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Turnirin Adı
                    </label>
                    <input
                      type="text"
                      value={tTitle}
                      onChange={(e) => setTTitle(e.target.value)}
                      placeholder="Məs: BANM Bahar Kuboku 2026"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Başlama Tarixi
                    </label>
                    <input
                      type="date"
                      value={tStartDate}
                      onChange={(e) => setTStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Təsvir
                    </label>
                    <input
                      type="text"
                      value={tDesc}
                      onChange={(e) => setTDesc(e.target.value)}
                      placeholder="Qısa turnir icmalı..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Xüsusi Qaydalar (Markdown)
                    </label>
                    <textarea
                      rows={3}
                      value={tRules}
                      onChange={(e) => setTRules(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        İştirakçıları Seçin ({selectedParticipants.length} seçilib)
                      </label>
                      <span className="text-[10px] text-slate-400">Avtomatik ELO səpələnməsi</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      {profiles.map((p) => {
                        const checked = selectedParticipants.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                              checked
                                ? 'bg-cyan-500/15 text-white border border-cyan-500/30'
                                : 'text-slate-400 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleParticipant(p.id)}
                                className="rounded accent-cyan-400"
                              />
                              <span className="font-medium">{p.full_name}</span>
                            </div>
                            <span className="font-mono text-[11px] text-cyan-400">
                              {p.current_elo} ELO
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs shadow-lg shadow-amber-500/20 transition"
                  >
                    Turnir və Səbət Yarat
                  </button>
                </form>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">
                      Qeydə Alınmış Oyunlar & Nəticələrin İdarə Edilməsi
                    </h2>
                    <p className="text-xs text-slate-400">
                      Sistemdə qeydə alınmış oyunların siyahısı, düzəliş edilməsi və silinməsi
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(25)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        displayLimit === 25
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Son 25 oyun
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(50)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        displayLimit === 50
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Son 50 oyun
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayLimit(10000)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        displayLimit >= 10000
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Bütün oyunlar ({filteredMatches.length})
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Oyunçu və ya turnir axtar..."
                      value={matchSearch}
                      onChange={(e) => setMatchSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-52 sm:w-60"
                    />
                  </div>
                </div>
              </div>

              {selectedMatchIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs animate-fade-in">
                  <div className="flex items-center gap-2.5 text-rose-300 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    <span>{selectedMatchIds.length} oyun seçildi</span>
                    <button
                      type="button"
                      onClick={clearMatchSelection}
                      className="text-[11px] underline text-slate-400 hover:text-white transition"
                    >
                      Seçimi təmizlə
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedMatches}
                    disabled={isBulkDeleting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {isBulkDeleting
                        ? 'Silinir...'
                        : `Seçilmişləri Sil (${selectedMatchIds.length})`}
                    </span>
                  </button>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase text-slate-400 bg-white/[0.02]">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allDisplayedSelected}
                          onChange={toggleSelectAllDisplayed}
                          title={
                            allDisplayedSelected
                              ? 'Bütün seçimləri ləğv et'
                              : 'Hamısını seç'
                          }
                          className="rounded accent-cyan-400 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Tarix</th>
                      <th className="py-2.5 px-3">Qarşılaşma</th>
                      <th className="py-2.5 px-3 text-center">Hesab</th>
                      <th className="py-2.5 px-3">Setlər</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Əməliyyatlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {displayedMatches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                          Heç bir oyun qeydi tapılmadı.
                        </td>
                      </tr>
                    ) : (
                      displayedMatches.map((m) => {
                        const isPending = m.status === 'pending';
                        const isDeleting = deletingMatchId === m.id;
                        const isSelected = selectedMatchIds.includes(m.id);

                        return (
                          <tr
                            key={m.id}
                            className={`transition ${
                              isSelected
                                ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                                : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectMatch(m.id)}
                                className="rounded accent-cyan-400 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {new Date(m.match_date).toLocaleDateString('az-AZ', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${m.player1_score > m.player2_score ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                                  {m.player1_name}
                                </span>
                                <span className="text-slate-500 text-[10px]">vs</span>
                                <span className={`font-semibold ${m.player2_score > m.player1_score ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                                  {m.player2_name}
                                </span>
                              </div>
                              {m.tournament_title && (
                                <div className="text-[10px] text-slate-500 truncate max-w-xs">
                                  {m.tournament_title}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-white/5">
                                {m.player1_score} - {m.player2_score}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {m.set_scores || '—'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPending
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {isPending ? 'Gözləmədə' : 'Təsdiqlənib'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(m)}
                                  title="Oyunu redaktə et"
                                  className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {(m.status === 'confirmed' || m.status === 'approved' || !m.status) && (
                                  <button
                                    type="button"
                                    onClick={() => setVoidTarget(m)}
                                    title="Matçı ləğv et və ELO xallarını geri qaytar"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#EF4444]/50 text-[#EF4444] hover:bg-[#EF4444]/10 text-[11px] font-bold transition"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>Ləğv Et</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMatch(m)}
                                  disabled={isDeleting}
                                  title="Bu oyunu sil"
                                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredMatches.length > displayLimit && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDisplayLimit((prev) => prev + 25)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-cyan-400 font-semibold border border-white/10 transition"
                  >
                    Daha 25 oyun göstər (qalan: {filteredMatches.length - displayLimit})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {voidTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#0F1623] border border-[#EF4444]/30 shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">Matçı Ləğv Et</h3>
                  <p className="text-[11px] text-slate-400">Bu əməliyyat geri qaytarılmır</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#131C2B] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{voidTarget.player1_name}</span>
                  <span className="font-mono font-black text-white">
                    {voidTarget.player1_score} - {voidTarget.player2_score}
                  </span>
                  <span className="font-semibold text-white">{voidTarget.player2_name}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono text-center">
                  ELO dəyişikliyi: ±{voidTarget.elo_delta || 0}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Bu matçı ləğv etmək istədiyinizə əminsiniz? Qazanılmış ELO xalları hər iki oyunçudan avtomatik geri qaytarılacaq.
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isVoiding}
                  onClick={() => setVoidTarget(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition disabled:opacity-50"
                >
                  İmtina
                </button>
                <button
                  type="button"
                  disabled={isVoiding}
                  onClick={handleConfirmVoid}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold transition shadow-lg shadow-red-500/20 disabled:opacity-60"
                >
                  {isVoiding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                  <span>{isVoiding ? 'Ləğv edilir...' : 'Bəli, Ləğv Et'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {editingMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-display font-bold text-white">
                      Oyunu Redaktə Et
                    </h3>
                    <p className="text-xs text-slate-400">
                      Oyun nəticəsini, set xallarını və statusunu dəyişin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[11px] uppercase font-bold text-slate-400">Qarşılaşma</span>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span className="font-bold text-sm text-cyan-300">{editingMatch.player1_name}</span>
                    <span className="text-xs text-slate-500 font-bold">VS</span>
                    <span className="font-bold text-sm text-amber-300">{editingMatch.player2_name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {editingMatch.player1_name} Hesabı
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={editP1Score}
                      onChange={(e) => setEditP1Score(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {editingMatch.player2_name} Hesabı
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={editP2Score}
                      onChange={(e) => setEditP2Score(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Set Hesabları
                  </label>
                  <input
                    type="text"
                    value={editSetScores}
                    onChange={(e) => setEditSetScores(e.target.value)}
                    placeholder="Məs: 11-8, 9-11, 11-7, 11-9"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="confirmed">Təsdiqlənib</option>
                      <option value="pending">Təsdiq Gözləyir</option>
                      <option value="rejected">Ləğv Edilib</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Oyun Tarixi
                    </label>
                    <input
                      type="date"
                      value={editMatchDate}
                      onChange={(e) => setEditMatchDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Turnir / Tədbir
                  </label>
                  <input
                    type="text"
                    value={editTournament}
                    onChange={(e) => setEditTournament(e.target.value)}
                    placeholder="Turnir adı və ya boş buraxın"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingMatch(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                  >
                    Ləğv Et
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs shadow-lg shadow-cyan-400/20 transition disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saxlanılır...' : 'Yadda Saxla'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMatchModal && (
          <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
        )}
      </div>
    </SmoothReveal>
  );
}
