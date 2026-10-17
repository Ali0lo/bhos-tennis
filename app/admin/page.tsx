'use client';

import React, { useState, useEffect } from 'react';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile, UserRole, BHOSFaculty, MatchRecord } from '../../lib/data/types';
import { getSupabaseClient } from '../../lib/supabase/client';
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
} from 'lucide-react';

const FACULTIES: BHOSFaculty[] = [
  'Information Security',
  'Computer Engineering',
  'Chemical Engineering',
  'Petroleum Engineering',
  'Process Automation',
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
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(null);
  const [eloEdits, setEloEdits] = useState<Record<string, number>>({});
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAddMember, setShowAddMember] = useState(false);
  const [newUserType, setNewUserType] = useState<'student' | 'teacher'>('student');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMajor, setNewMajor] = useState<string>('Computer Engineering');
  const [newAdmissionYear, setNewAdmissionYear] = useState<number>(2024);
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [newRole, setNewRole] = useState<UserRole>('player');
  const [newInitialElo, setNewInitialElo] = useState<number>(1000);

  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tRules, setTRules] = useState(
    '### Turnir Qaydaları\n- Olimpiya sistemi (uduzan çıxır), 5 setdən ən yaxşısı.\n- ITTF standartlı servis qaydası (16 sm açıq ovucdan atış).'
  );
  const [tStartDate, setTStartDate] = useState('2026-10-15');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

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

  const filteredMatches = matchesList.filter((m) => {
    if (!matchSearch.trim()) return true;
    const q = matchSearch.toLowerCase();
    return (
      m.player1_name?.toLowerCase().includes(q) ||
      m.player2_name?.toLowerCase().includes(q) ||
      m.tournament_title?.toLowerCase().includes(q) ||
      m.logged_by_name?.toLowerCase().includes(q)
    );
  });

  const handleOverrideElo = (playerId: string) => {
    const val = eloEdits[playerId];
    if (typeof val !== 'number' || isNaN(val)) return;
    const safeElo = Math.max(1000, val);
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

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim()) return;

    const isStaff = newUserType === 'teacher';
    const createdProfile: PlayerProfile = {
      id: `p-${Date.now()}`,
      full_name: newFullName.trim(),
      email: newEmail.trim().toLowerCase(),
      major_faculty: newMajor,
      admission_year: isStaff ? null : Number(newAdmissionYear),
      user_type: isStaff ? 'teacher' : 'student',
      gender: newGender,
      role: newRole,
      playing_level: 'Intermediate',
      playing_style: 'Shakehand All-round',
      blade_equipment: 'Standard Club Racket',
      forehand_rubber: 'Standard Red',
      backhand_rubber: 'Standard Black',
      current_elo: Math.max(1000, Number(newInitialElo) || 1000),
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

    if (!tTitle.trim()) {
      setFormError('Zəhmət olmasa turnirin adını daxil edin.');
      return;
    }
    if (selectedParticipants.length < 2) {
      setFormError('Olimpiya səbəti yaratmaq üçün ən azı 2 iştirakçı seçin.');
      return;
    }

    const created = store.createTournament({
      title: tTitle.trim(),
      description: tDesc.trim() || 'Rəsmi BANM Stolüstü Tennis Klubu turniri.',
      custom_rules: tRules,
      format: 'single_elimination',
      max_participants: selectedParticipants.length <= 4 ? 4 : 8,
      start_date: new Date(tStartDate).toISOString(),
      created_by: currentUser?.id || 'p-1',
      participant_ids: selectedParticipants,
    });

    setTTitle('');
    setTDesc('');
    showToast(`"${created.title}" turniri rəsmi səbətlə yaradıldı!`);
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
                        min={1000}
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
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-display font-bold text-white">
                      {t('admin.elo_override')}
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase text-slate-400">
                          <th className="py-2.5 px-3">Üzv</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Rol</th>
                          <th className="py-2.5 px-3">ELO Xalı</th>
                          <th className="py-2.5 px-3 text-right">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {profiles.map((p) => {
                          const isStaff =
                            p.user_type === 'teacher' ||
                            p.user_type === 'staff' ||
                            p.role === 'coach' ||
                            !p.admission_year;

                          return (
                            <tr key={p.id} className="hover:bg-white/[0.02]">
                              <td className="py-3 px-3">
                                <div className="font-semibold text-white">{p.full_name}</div>
                                <div className="text-[11px] text-slate-500">
                                  {p.major_faculty}
                                  {isStaff ? ' • Müəllim' : ` • ${p.admission_year}`}
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
                                  min={1000}
                                  value={eloEdits[p.id] ?? p.current_elo}
                                  onChange={(e) =>
                                    setEloEdits((prev) => ({
                                      ...prev,
                                      [p.id]: parseInt(e.target.value, 10) || 1000,
                                    }))
                                  }
                                  className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono font-bold text-cyan-400 text-xs focus:outline-none focus:border-cyan-400"
                                />
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
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
                        })}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">
                      Qeydə Alınmış Oyunlar & Nəticələrin Silinməsi
                    </h2>
                    <p className="text-xs text-slate-400">
                      Səhv daxil edilmiş, test və ya ləğv olunmuş oyun qeydlərini bazadan silin
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
                    {filteredMatches.length} oyun
                  </span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Oyunçu və ya turnir axtar..."
                      value={matchSearch}
                      onChange={(e) => setMatchSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-52 sm:w-64"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase text-slate-400 bg-white/[0.02]">
                      <th className="py-2.5 px-3">Tarix</th>
                      <th className="py-2.5 px-3">Qarşılaşma</th>
                      <th className="py-2.5 px-3 text-center">Hesab</th>
                      <th className="py-2.5 px-3">Setlər</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredMatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                          Heç bir oyun qeydi tapılmadı.
                        </td>
                      </tr>
                    ) : (
                      filteredMatches.map((m) => {
                        const isPending = m.status === 'pending';
                        const isDeleting = deletingMatchId === m.id;

                        return (
                          <tr key={m.id} className="hover:bg-white/[0.02] transition">
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
                              <button
                                type="button"
                                onClick={() => handleDeleteMatch(m)}
                                disabled={isDeleting}
                                title="Bu oyunu sil"
                                className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        )}

        {showMatchModal && (
          <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
        )}
      </div>
    </SmoothReveal>
  );
}
