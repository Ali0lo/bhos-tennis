'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile, UserRole, BHOSFaculty, PlayingLevel } from '../../lib/data/types';
import { getSupabaseClient } from '../../lib/supabase/client';
import { useTranslation } from '../../lib/i18n';
import SmoothReveal from '../../components/SmoothReveal';
import {
  Shield,
  Lock,
  Mail,
  User,
  GraduationCap,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  Clock,
  Sparkles,
  Briefcase,
  Eye,
  EyeOff,
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

const PLAYING_LEVELS: PlayingLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

const ADMISSION_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const store = BHOSDataStore.getInstance();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [major, setMajor] = useState<string>('Computer Engineering');
  const [admissionYear, setAdmissionYear] = useState<number>(2024);
  const [gender, setGender] = useState<'female' | 'male'>('male');
  const [playingLevel, setPlayingLevel] = useState<PlayingLevel>('Intermediate');
  const [showPassword, setShowPassword] = useState(false);

  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setCurrentUser(store.getCurrentUser());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const handleUserTypeChange = (nextType: 'student' | 'teacher') => {
    setUserType(nextType);
    if (nextType === 'teacher') {
      setMajor(STAFF_DEPARTMENTS[0]);
    } else {
      setMajor(FACULTIES[1]);
    }
  };

  const handleSwitchToSignup = () => {
    setMode('signup');
    setErrorMsg(null);
    setSuccessMsg(null);

    const clean = email.trim().toLowerCase();
    if (clean === 'ali.iskandarli.std@bhos.edu.az' || clean === 'ali.iskandarli@bhos.edu.az') {
      if (!fullName) setFullName('Ali Iskandarli');
      setUserType('student');
      setMajor('Computer Engineering');
      setAdmissionYear(2023);
    } else if (clean === 'iftixar.coach@gmail.com' || clean === 'iftixar@bhos.edu.az') {
      if (!fullName) setFullName('İftixar Məhərrəmov');
      setUserType('teacher');
      setMajor('İdman Klubu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabaseClient();

    try {
      if (mode === 'signin') {
        if (!cleanEmail || !password) {
          throw new Error('Zəhmət olmasa e-poçt və şifrənizi daxil edin.');
        }

        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (error) {
            if (
              error.message.toLowerCase().includes('invalid login credentials') ||
              error.message.toLowerCase().includes('database error querying schema')
            ) {
              throw new Error('E-poçt və ya şifrə yanlışdır. Əgər bu e-poçtla ilk dəfə daxil olursunuzsa, zəhmət olmasa "Qeydiyyatdan Keç" bölməsinə keçib qeydiyyatdan keçin.');
            }
            throw new Error(error.message);
          }

          if (data.user?.email) {
            const isPresident = cleanEmail === 'ali.iskandarli.std@bhos.edu.az' || cleanEmail === 'ali.iskandarli@bhos.edu.az';
            const isCoach = cleanEmail === 'iftixar.coach@gmail.com' || cleanEmail === 'iftixar@bhos.edu.az';
            const meta = data.user.user_metadata || {};
            const metaUserType = isCoach ? 'teacher' : (meta.user_type || 'student');
            const resolvedRole: UserRole = isPresident ? 'president' : isCoach ? 'coach' : (meta.role || 'player');
            const resolvedVerified = isPresident || isCoach ? true : (meta.is_verified ?? false);
            const resolvedElo = isCoach ? 9999 : (meta.current_elo ? Math.max(1000, Number(meta.current_elo)) : 1000);

            const linked = await store.linkProfileByEmail(data.user.email);
            if (!linked) {
              const newProfile: PlayerProfile = {
                id: data.user.id,
                full_name: meta.full_name || cleanEmail.split('@')[0],
                email: cleanEmail,
                major_faculty: meta.major_faculty || (isCoach ? 'İdman Klubu' : 'Computer Engineering'),
                admission_year:
                  metaUserType === 'teacher' || metaUserType === 'staff'
                    ? null
                    : Number(meta.admission_year) || 2023,
                user_type: metaUserType,
                gender: meta.gender || 'male',
                role: resolvedRole,
                playing_level: meta.playing_level || 'Intermediate',
                playing_style: 'Shakehand All-round',
                blade_equipment: 'Standard Club Racket',
                forehand_rubber: 'Standard Red',
                backhand_rubber: 'Standard Black',
                current_elo: resolvedElo,
                matches_played: 0,
                wins: 0,
                losses: 0,
                is_verified: resolvedVerified,
                is_active: true,
                created_at: new Date().toISOString(),
              };

              await supabase.from('profiles').upsert([newProfile]);
              store.addProfile(newProfile);
              store.setCurrentUser(newProfile.id);
            }
          }

          setSuccessMsg(t('auth.login_success'));
          setTimeout(() => router.push('/'), 800);
          return;
        } else {
          const linked = await store.linkProfileByEmail(cleanEmail);
          if (!linked) {
            throw new Error('Bu e-poçt ünvanı ilə oyunçu profili tapılmadı. Zəhmət olmasa qeydiyyatdan keçin.');
          }
          setSuccessMsg(t('auth.login_success'));
          setTimeout(() => router.push('/'), 800);
          return;
        }
      } else {
        if (!fullName.trim() || !cleanEmail || !password) {
          throw new Error('Zəhmət olmasa bütün tələb olunan xanaları doldurun.');
        }

        const isTeacher = userType === 'teacher';
        if (!isTeacher) {
          const studentEmailRegex = /^[a-zA-Z0-9._%+-]+\.std@bhos\.edu\.az$/;
          if (!studentEmailRegex.test(cleanEmail)) {
            throw new Error('Tələbələr üçün e-poçt formatı: ad.soyad.std@bhos.edu.az olmalıdır');
          }
        } else {
          const generalEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!generalEmailRegex.test(cleanEmail)) {
            throw new Error('Zəhmət olmasa düzgün e-poçt ünvanı daxil edin.');
          }
        }
        const resolvedAdmissionYear = isTeacher ? null : Number(admissionYear);
        const resolvedUserType = isTeacher ? 'teacher' : 'student';

        const isPresident = cleanEmail === 'ali.iskandarli.std@bhos.edu.az' || cleanEmail === 'ali.iskandarli@bhos.edu.az';
        const isCoach = cleanEmail === 'iftixar.coach@gmail.com' || cleanEmail === 'iftixar@bhos.edu.az';
        const resolvedRole: UserRole = isPresident ? 'president' : isCoach ? 'coach' : 'player';
        const resolvedVerified = isPresident || isCoach ? true : false;
        const resolvedElo = isCoach ? 9999 : 1000;

        if (supabase) {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                major_faculty: major,
                admission_year: resolvedAdmissionYear,
                user_type: resolvedUserType,
                role: resolvedRole,
                is_verified: resolvedVerified,
                current_elo: resolvedElo,
                gender,
                playing_level: playingLevel,
              },
            },
          });

          if (error) {
            throw new Error(error.message);
          }

          const userId = data.user?.id || `p-${Date.now()}`;
          const newProfile: PlayerProfile = {
            id: userId,
            full_name: fullName.trim(),
            email: cleanEmail,
            major_faculty: major,
            admission_year: resolvedAdmissionYear,
            user_type: resolvedUserType,
            gender,
            role: resolvedRole,
            playing_level: playingLevel,
            playing_style: 'Shakehand All-round',
            blade_equipment: 'Standard Club Racket',
            forehand_rubber: 'Standard Red',
            backhand_rubber: 'Standard Black',
            current_elo: resolvedElo,
            matches_played: 0,
            wins: 0,
            losses: 0,
            is_verified: resolvedVerified,
            is_active: true,
            created_at: new Date().toISOString(),
          };

          await supabase.from('profiles').delete().eq('email', cleanEmail).neq('id', userId);

          const { error: insertError } = await supabase.from('profiles').upsert(
            [
              {
                id: newProfile.id,
                full_name: newProfile.full_name,
                email: newProfile.email,
                major_faculty: newProfile.major_faculty,
                admission_year: newProfile.admission_year,
                user_type: newProfile.user_type,
                gender: newProfile.gender,
                role: newProfile.role,
                playing_level: newProfile.playing_level,
                playing_style: newProfile.playing_style,
                blade_equipment: newProfile.blade_equipment,
                forehand_rubber: newProfile.forehand_rubber,
                backhand_rubber: newProfile.backhand_rubber,
                current_elo: newProfile.current_elo,
                matches_played: 0,
                wins: 0,
                losses: 0,
                is_verified: newProfile.is_verified,
                is_active: true,
              },
            ],
            { onConflict: 'id' }
          );

          if (insertError) {
            await supabase.from('profiles').upsert(
              [
                {
                  id: newProfile.id,
                  full_name: newProfile.full_name,
                  email: newProfile.email,
                  major_faculty: newProfile.major_faculty,
                  admission_year: newProfile.admission_year,
                  gender: newProfile.gender,
                  role: newProfile.role,
                  playing_level: newProfile.playing_level,
                  playing_style: newProfile.playing_style,
                  blade_equipment: newProfile.blade_equipment,
                  forehand_rubber: newProfile.forehand_rubber,
                  backhand_rubber: newProfile.backhand_rubber,
                  current_elo: newProfile.current_elo,
                  matches_played: 0,
                  wins: 0,
                  losses: 0,
                  is_verified: newProfile.is_verified,
                  is_active: true,
                },
              ],
              { onConflict: 'id' }
            );
          }

          store.addProfile(newProfile);
          if (data.session) {
            store.setCurrentUser(newProfile.id);
            setSuccessMsg(t('auth.login_success'));
            setTimeout(() => router.push('/'), 800);
            return;
          }

          setSuccessMsg(t('auth.signup_success'));
          return;
        } else {
          const newProfile: PlayerProfile = {
            id: `p-${Date.now()}`,
            full_name: fullName.trim(),
            email: cleanEmail,
            major_faculty: major,
            admission_year: resolvedAdmissionYear,
            user_type: resolvedUserType,
            gender,
            role: resolvedRole,
            playing_level: playingLevel,
            playing_style: 'Shakehand All-round',
            blade_equipment: 'Standard Club Racket',
            forehand_rubber: 'Standard Red',
            backhand_rubber: 'Standard Black',
            current_elo: resolvedElo,
            matches_played: 0,
            wins: 0,
            losses: 0,
            is_verified: resolvedVerified,
            is_active: true,
            created_at: new Date().toISOString(),
          };
          store.addProfile(newProfile);
          store.setCurrentUser(newProfile.id);
          setSuccessMsg(t('auth.signup_success'));
          return;
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await store.signOut();
    setSuccessMsg('Hesabdan uğurla çıxış edildi.');
  };

  return (
    <SmoothReveal>
      <div className="max-w-lg mx-auto pt-4 pb-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/15">
            <img
              src="/images/bhos-crest.png"
              alt="BHOS Crest"
              className="w-11 h-11 object-contain filter drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
            {mode === 'signin' ? t('auth.signin_title') : t('auth.signup_title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {mode === 'signin' ? t('auth.signin_sub') : t('auth.signup_sub')}
          </p>
        </div>

        {currentUser && (
          <div className="p-5 rounded-3xl border border-cyan-500/30 bg-slate-900/80 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-display font-black text-base">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-white text-sm">
                      {currentUser.full_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {t(`roles.${currentUser.role}`)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('nav.sign_out')}</span>
              </button>
            </div>

            {currentUser.is_verified === false ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-300 text-xs">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <span className="font-bold block">{t('auth.pending_badge')}</span>
                  <span className="text-amber-200/80 text-[11px]">{t('auth.signup_success')}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <span className="text-slate-400">
                  Hazırkı ELO: <strong className="text-cyan-400 font-mono">{currentUser.current_elo}</strong>
                </span>
                <Link
                  href={`/players/${currentUser.id}`}
                  className="text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>{t('nav.my_profile')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-slate-900/75 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950/90 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-display font-bold transition-all ${
                mode === 'signin'
                  ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('auth.signin_btn')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-display font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('auth.signup_btn')}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-300">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleSwitchToSignup}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs shrink-0 shadow transition"
                >
                  Qeydiyyata Keç
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Üzvlük Kateqoriyası
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleUserTypeChange('student')}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                        userType === 'student'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Tələbə</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserTypeChange('teacher')}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                        userType === 'teacher'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Müəllim / Əməkdaş</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('auth.full_name')}</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Məs: Əli İsgəndərli"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className={userType === 'student' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      {userType === 'student' ? (
                        <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      <span>
                        {userType === 'student' ? 'Fakültə / İxtisas' : 'Kafedra / Departament'}
                      </span>
                    </label>
                    <select
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    >
                      {userType === 'student'
                        ? FACULTIES.map((fac) => (
                            <option key={fac} value={fac}>
                              {t(`faculties.${fac}`)}
                            </option>
                          ))
                        : STAFF_DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                    </select>
                  </div>

                  {userType === 'student' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Qəbul İli</span>
                      </label>
                      <select
                        required
                        value={admissionYear}
                        onChange={(e) => setAdmissionYear(Number(e.target.value))}
                        className="w-full px-3.5 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                      >
                        {ADMISSION_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t('auth.gender')}
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`py-2 rounded-lg text-xs font-semibold transition ${
                          gender === 'female'
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('auth.gender_female')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`py-2 rounded-lg text-xs font-semibold transition ${
                          gender === 'male'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('auth.gender_male')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('auth.playing_level')}</span>
                    </label>
                    <select
                      value={playingLevel}
                      onChange={(e) => setPlayingLevel(e.target.value as PlayingLevel)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    >
                      {PLAYING_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {t(`levels.${lvl}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('auth.email')}</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  mode === 'signup' && userType === 'teacher'
                    ? 'nümunə@email.com'
                    : 'ad.soyad.std@bhos.edu.az'
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('auth.password')}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-950/90 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition p-1"
                  aria-label={showPassword ? 'Şifrəni gizlə' : 'Şifrəni göstər'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center gap-2 text-[11px] text-slate-300">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Yeni üzvlər baza olaraq <strong className="text-cyan-300">1000 ELO</strong> ilə başlayır və Klub Prezidenti / Məşqçi tərəfindən təsdiqləndikdən sonra reytinq cədvəlində aktivləşir.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-display font-black text-sm shadow-xl shadow-cyan-500/20 transition flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>
                {loading
                  ? 'Gözləyin...'
                  : mode === 'signin'
                  ? t('auth.signin_btn')
                  : t('auth.signup_btn')}
              </span>
            </button>
          </form>

          <div className="text-center pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-cyan-400 hover:underline font-medium"
            >
              {mode === 'signin' ? t('auth.switch_to_signup') : t('auth.switch_to_signin')}
            </button>
          </div>
        </div>
      </div>
    </SmoothReveal>
  );
}
