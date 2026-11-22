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
  isPresidentBadgeHolder,
} from '../../lib/data/types';
import { getSupabaseClient } from '../../lib/supabase/client';
import {
  sanitizePlayerName,
  sanitizeTextInput,
  isAllowedAuthEmail,
  ALLOWED_EMAIL_ERROR,
} from '../../lib/security/sanitize';
import { useTranslation } from '../../lib/i18n';
import {
  ACHIEVEMENT_BADGES,
  ACHIEVEMENT_TIER_STYLES,
  AchievementBadgeId,
  evaluatePlayerAchievements,
} from '../../lib/types/achievements';
import PendingVerificationQueue from '../PendingVerificationQueue';
import ScrollLock from '../ScrollLock';
import {
  Sliders,
  Trophy,
  CheckCircle2,
  UserPlus,
  GraduationCap,
  Briefcase,
  Trash2,
  Search,
  Pencil,
  X,
  Calendar,
  Loader2,
  Crown,
  Award,
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
  'Neft-Qaz Mühəndisliyi',
  'Kimya Mühəndisliyi',
  'Proseslərin Avtomatlaşdırılması',
  'İnzibati Heyət / Dekanlıq',
];

const ADMISSION_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

interface PlayersTabProps {
  profiles: PlayerProfile[];
  matchesList: MatchRecord[];
  currentUser: PlayerProfile | null;
  showAddMember: boolean;
  onCloseAddMember: () => void;
  showToast: (msg: string) => void;
}

export default function PlayersTab({
  profiles,
  matchesList,
  currentUser,
  showAddMember,
  onCloseAddMember,
  showToast,
}: PlayersTabProps) {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [eloEdits, setEloEdits] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingFoundingId, setTogglingFoundingId] = useState<string | null>(null);
  const [togglingPresidentId, setTogglingPresidentId] = useState<string | null>(null);
  const [badgeModalPlayer, setBadgeModalPlayer] = useState<PlayerProfile | null>(null);
  const [playerBadgesMap, setPlayerBadgesMap] = useState<Record<string, string>>({});
  const [isLoadingBadges, setIsLoadingBadges] = useState<boolean>(false);
  const [togglingBadgeId, setTogglingBadgeId] = useState<AchievementBadgeId | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState<string>('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'registered' | 'default' | 'pending'>('all');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  const [newUserType, setNewUserType] = useState<'student' | 'teacher'>('student');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMajor, setNewMajor] = useState<string>('Computer Engineering');
  const [newAdmissionYear, setNewAdmissionYear] = useState<number>(2024);
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [newRole, setNewRole] = useState<UserRole>('player');
  const [newInitialElo, setNewInitialElo] = useState<number>(0);

  useEffect(() => {
    const initElo: Record<string, number> = {};
    profiles.forEach((p) => {
      initElo[p.id] = p.current_elo;
    });
    setEloEdits(initElo);
  }, [profiles]);

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

  const handleOpenBadgeModal = async (player: PlayerProfile) => {
    setBadgeModalPlayer(player);
    setPlayerBadgesMap({});
    setIsLoadingBadges(true);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from('profile_achievements')
          .select('badge_id, unlocked_at')
          .eq('profile_id', player.id);
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((row: any) => {
            if (row?.badge_id) {
              map[row.badge_id] = row.unlocked_at || new Date().toISOString();
            }
          });
          setPlayerBadgesMap(map);
        }
      }
    } catch {
    } finally {
      setIsLoadingBadges(false);
    }
  };

  const handleTogglePlayerBadge = async (
    player: PlayerProfile,
    badgeId: AchievementBadgeId,
    currentlyUnlocked: boolean
  ) => {
    setTogglingBadgeId(badgeId);
    try {
      const supabase = getSupabaseClient();
      const nowIso = new Date().toISOString();

      if (supabase) {
        if (!currentlyUnlocked) {
          await supabase.from('profile_achievements').upsert(
            [
              {
                profile_id: player.id,
                badge_id: badgeId,
                unlocked_at: nowIso,
              },
            ],
            { onConflict: 'profile_id,badge_id' }
          );
        } else {
          await supabase
            .from('profile_achievements')
            .delete()
            .eq('profile_id', player.id)
            .eq('badge_id', badgeId);
        }

        if (badgeId === 'founding_member') {
          const nextOrigin: 'İlkin Heyət' | 'Qeydiyyat' = !currentlyUnlocked
            ? 'İlkin Heyət'
            : 'Qeydiyyat';
          await supabase
            .from('profiles')
            .update({ origin: nextOrigin })
            .eq('id', player.id);
          store.updateProfile(player.id, { origin: nextOrigin });
          setBadgeModalPlayer((prev) =>
            prev && prev.id === player.id ? { ...prev, origin: nextOrigin } : prev
          );
        }
      }

      setPlayerBadgesMap((prev) => {
        const next = { ...prev };
        if (!currentlyUnlocked) {
          next[badgeId] = nowIso;
        } else {
          delete next[badgeId];
        }
        return next;
      });

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(`bhos_player_${player.id}`);
        } catch {}
      }

      const badgeDef = ACHIEVEMENT_BADGES.find((b) => b.id === badgeId);
      const badgeTitle = badgeDef ? `${badgeDef.emoji} ${badgeDef.titleAz}` : badgeId;
      showToast(
        !currentlyUnlocked
          ? `"${player.full_name}" üçün ${badgeTitle} nişanı verildi!`
          : `"${player.full_name}" üçün ${badgeTitle} nişanı ləğv edildi.`
      );
    } catch (err: any) {
      showToast(err.message || 'Nişan yenilənərkən xəta baş verdi.');
    } finally {
      setTogglingBadgeId(null);
    }
  };

  const handleTogglePresidentBadge = async (player: PlayerProfile) => {
    const isCurrentlyPres = player.role === 'president';
    const nextRole: UserRole = isCurrentlyPres ? 'player' : 'president';

    setTogglingPresidentId(player.id);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('profiles')
          .update({
            role: nextRole,
            is_verified: true,
            status: 'approved',
          })
          .eq('id', player.id);
      }

      store.updateUserRole(player.id, nextRole);

      showToast(
        !isCurrentlyPres
          ? `"${player.full_name}" üçün 👑 Prezident nişanı (Reytinq Cədvəli) aktivləşdirildi!`
          : `"${player.full_name}" üçün Prezident nişanı ləğv edildi.`
      );
    } catch (err: any) {
      showToast(err.message || 'Xəta baş verdi.');
    } finally {
      setTogglingPresidentId(null);
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

    if (!isAllowedAuthEmail(cleanEmail)) {
      showToast(ALLOWED_EMAIL_ERROR);
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
    onCloseAddMember();
    showToast(`${createdProfile.full_name} rəsmi siyahıya əlavə edildi!`);
  };

  return (
    <div className="space-y-6">
      <PendingVerificationQueue />

      {showAddMember && (
        <form
          onSubmit={handleAddMemberSubmit}
          className="p-6 rounded-3xl border border-indigo-500/30 bg-slate-900/90 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-display font-bold text-white">
                {t('admin.add_member_title', 'Yeni Klub Üzvü Əlavə Et (Tələbə və ya Müəllim / Əməkdaş)')}
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
                <span>{t('roles.player', 'Tələbə')}</span>
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
                <span>{t('roles.teacher', 'Müəllim / Əməkdaş')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                {t('auth.full_name', 'Ad və Soyad')}
              </label>
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder={t('admin.placeholder_name', 'Məs: İftixar Məhərrəmov')}
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
                placeholder="ad.soyad.std@bhos.edu.az və ya nümunə@gmail.com"
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
                        {t(`faculties.${fac}`, fac)}
                      </option>
                    ))
                  : STAFF_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {t(`faculties.${dept}`, dept)}
                      </option>
                    ))}
              </select>
            </div>

            {newUserType === 'student' ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  {t('profile.admission_year', 'Qəbul İli')}
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
                <span className="text-[11px] text-slate-400">{t('admin.category', 'Kateqoriya:')}</span>
                <select
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value as 'male' | 'female')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="male">{t('admin.male_label', 'Oğlan / Bəy')}</option>
                  <option value="female">{t('admin.female_label', 'Qız / Xanım')}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">{t('admin.col_role', 'Rol:')}</span>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="player">{t('roles.player')}</option>
                  <option value="coach">{t('roles.coach')}</option>
                  <option value="president">{t('roles.president')}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">{t('admin.initial_elo', 'Başlanğıc ELO:')}</span>
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
              {t('admin.save_member', 'Üzvü Yadda Saxla')}
            </button>
          </div>
        </form>
      )}

      <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-lg font-display font-bold text-white">
                {t('admin.elo_override')}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-medium">
                <span>{t('admin.total', 'Ümumi')}: {totalMembersCount}</span>
                <span>•</span>
                <span className="text-blue-400">{t('admin.registered', 'Qeydiyyat')}: {registeredMembersCount}</span>
                <span>•</span>
                <span className="text-amber-400">{t('admin.default_roster', 'İlkin Heyət')}: {defaultMembersCount}</span>
                <span>•</span>
                <span className="text-orange-400">{t('admin.pending', 'Gözləyən')}: {pendingMembersCount}</span>
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
              {t('admin.filter_all', 'Hamısı')} ({totalMembersCount})
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
              {t('admin.registered', 'Qeydiyyat')} ({registeredMembersCount})
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
              {t('admin.default_roster', 'İlkin Heyət')} ({defaultMembersCount})
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
              {t('admin.pending', 'Gözləyən')} ({pendingMembersCount})
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={memberSearchQuery}
            onChange={(e) => setMemberSearchQuery(e.target.value)}
            placeholder={t('admin.search_member_placeholder', 'Üzv adı, email və ya ixtisas üzrə axtarış...')}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase text-slate-400">
                <th className="py-2.5 px-3">{t('admin.col_member', 'Üzv')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{t('admin.col_joined', 'Qoşulub')}</th>
                <th className="py-2.5 px-3">{t('admin.col_status', 'Status')}</th>
                <th className="py-2.5 px-3">{t('admin.col_role', 'Rol')}</th>
                <th className="py-2.5 px-3">{t('admin.col_elo', 'ELO Xalı')}</th>
                <th className="py-2.5 px-3 text-right">{t('admin.col_actions', 'Əməliyyat')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    {t('admin.no_members_found', 'Seçilmiş filtrə və ya axtarışa uyğun heç bir üzv tapılmadı.')}
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const isStaff =
                    p.user_type === 'teacher' ||
                    p.user_type === 'staff' ||
                    p.role === 'coach' ||
                    !p.admission_year;

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
                                ? t('admin.golden_roster', 'Qızıl Heyət')
                                : `+ ${t('admin.golden_roster', 'Qızıl Heyət')}`}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePresidentBadge(p)}
                            disabled={togglingPresidentId === p.id}
                            title={
                              isPresidentBadgeHolder(p)
                                ? 'Prezident nişanını ləğv etmək üçün klikləyin'
                                : 'Reytinq cədvəlində Prezident nişanı vermək üçün klikləyin'
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition active:scale-95 disabled:opacity-50 ${
                              isPresidentBadgeHolder(p)
                                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/15'
                                : 'bg-white/5 hover:bg-purple-500/15 text-slate-400 hover:text-purple-300 border border-white/10 hover:border-purple-500/30'
                            }`}
                          >
                            {togglingPresidentId === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                            ) : (
                              <Crown
                                className={`w-3 h-3 ${
                                  isPresidentBadgeHolder(p)
                                    ? 'text-purple-400'
                                    : 'opacity-40'
                                }`}
                              />
                            )}
                            <span>
                              {isPresidentBadgeHolder(p)
                                ? t('admin.president', 'Prezident')
                                : `+ ${t('admin.president', 'Prezident')}`}
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
                            onClick={() => handleOpenBadgeModal(p)}
                            title="Nişanları İdarə Et"
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{t('admin.badges_btn', 'Nişanlar')}</span>
                          </button>
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
                            type="button"
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

      {badgeModalPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
          <ScrollLock />
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">
                    Nişanların İdarə Edilməsi ({ACHIEVEMENT_BADGES.length} Nişan)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Oyunçu: <span className="text-white font-semibold">{badgeModalPlayer.full_name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBadgeModalPlayer(null)}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingBadges ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span>Oyunçu nişanları yüklənir...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(() => {
                  const playerMatches = matchesList.filter(
                    (m) =>
                      m.player1_id === badgeModalPlayer.id ||
                      m.player2_id === badgeModalPlayer.id
                  );
                  const evaluated = evaluatePlayerAchievements(
                    badgeModalPlayer,
                    playerMatches,
                    playerBadgesMap,
                    profiles,
                    store.getTournaments()
                  );

                  return evaluated.map((badge) => {
                    const hasDbGrant = Boolean(playerBadgesMap[badge.id]);
                    const isUnlocked =
                      badge.id === 'founding_member'
                        ? badge.unlocked
                        : hasDbGrant || badge.unlocked;

                    const tierBorderClass = ACHIEVEMENT_TIER_STYLES[badge.accentColor].adminCard;

                    return (
                      <div
                        key={badge.id}
                        className={`rounded-xl p-3.5 border flex items-center justify-between gap-3 transition ${
                          isUnlocked
                            ? tierBorderClass
                            : 'border-slate-800 bg-slate-950/60 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg shrink-0">
                            <span>{badge.emoji}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-display font-bold text-white truncate">
                                {badge.titleAz}
                              </span>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${ACHIEVEMENT_TIER_STYLES[badge.accentColor].adminPill}`}
                              >
                                {badge.tierLabelAz}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {badge.descriptionAz}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={togglingBadgeId === badge.id}
                          onClick={() =>
                            handleTogglePlayerBadge(
                              badgeModalPlayer,
                              badge.id,
                              hasDbGrant ||
                                (badge.id === 'founding_member' && badge.unlocked)
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border shrink-0 transition ${
                            hasDbGrant ||
                            (badge.id === 'founding_member' && badge.unlocked)
                              ? 'bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border-rose-600/40'
                              : 'bg-blue-700 hover:bg-blue-600 text-white border-blue-600'
                          }`}
                        >
                          {togglingBadgeId === badge.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : hasDbGrant ||
                            (badge.id === 'founding_member' && badge.unlocked) ? (
                            'Ləğv et'
                          ) : (
                            '+ Ver'
                          )}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
