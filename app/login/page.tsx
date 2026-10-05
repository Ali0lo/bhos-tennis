'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabase/client';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile, PlayingLevel } from '../../lib/data/types';
import { 
  Lock, 
  Mail, 
  User, 
  GraduationCap, 
  Calendar, 
  Gauge, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  UserPlus,
  LogIn
} from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  // Mode: 'signin' | 'register'
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register State
  const [fullName, setFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [admissionYear, setAdmissionYear] = useState<number>(new Date().getFullYear());
  const [faculty, setFaculty] = useState<string>('Information Security');
  const [playingLevel, setPlayingLevel] = useState<PlayingLevel>('Beginner');

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState(false);
  const [registrationPending, setRegistrationPending] = useState<{
    name: string;
    email: string;
  } | null>(null);

  // --- SIGN IN HANDLER ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase connection is not configured.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (authError) {
        setError(authError.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      if (data?.user?.email) {
        const store = BHOSDataStore.getInstance();
        await store.linkProfileByEmail(data.user.email);
        setSignInSuccess(true);

        setTimeout(() => {
          router.push(redirectPath);
          router.refresh();
        }, 500);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTER HANDLER ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = registerEmail.trim().toLowerCase();

    if (!trimmedName) {
      setError('First Name & Surname is required.');
      return;
    }

    if (!trimmedEmail) {
      setError('BHOS Email is required.');
      return;
    }

    if (!trimmedEmail.endsWith('@bhos.edu.az')) {
      setError('Registration is restricted to BHOS institutional emails (@bhos.edu.az).');
      return;
    }

    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase connection is not configured.');
      setLoading(false);
      return;
    }

    try {
      // 1. Supabase Auth Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: trimmedName,
            faculty,
            admission_year: admissionYear,
            playing_level: playingLevel,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // 2. Generate unique profile ID
      const newId = authData?.user?.id || (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `p-${Date.now()}`);

      const newProfile: PlayerProfile = {
        id: newId,
        full_name: trimmedName,
        email: trimmedEmail,
        major_faculty: faculty,
        admission_year: Number(admissionYear),
        gender: 'other',
        role: 'player',
        playing_level: playingLevel,
        playing_style: 'Shakehand All-round',
        blade_equipment: 'Standard Club Blade',
        forehand_rubber: 'Standard Rubber',
        backhand_rubber: 'Standard Rubber',
        current_elo: 0,
        matches_played: 0,
        wins: 0,
        losses: 0,
        is_verified: false, // Requires Admin verification
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // 3. Insert profile row into Supabase public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([newProfile]);

      if (profileError) {
        // If row already exists or unique constraint hit
        if (profileError.message.includes('duplicate key') || profileError.message.includes('unique')) {
          throw new Error('A player profile with this email already exists.');
        }
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // 4. Update local store
      const store = BHOSDataStore.getInstance();
      store.addProfile(newProfile);

      // 5. Display verification pending view
      setRegistrationPending({
        name: trimmedName,
        email: trimmedEmail,
      });

      // Clear register inputs
      setFullName('');
      setRegisterEmail('');
      setRegisterPassword('');
    } catch (err: any) {
      console.error('[Register] Error:', err);
      setError(err?.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to BHOS TT Portal</span>
      </Link>

      {/* Main Glassmorphic Card (#0F1623) */}
      <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-8 shadow-2xl shadow-black/80 backdrop-blur-xl relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#3B82F6]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto p-2 shadow-lg shadow-cyan-500/10">
            <img
              src="/images/bhos-crest.png"
              alt="BHOS Crest"
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,229,255,0.7)] mix-blend-screen"
            />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-white tracking-tight">
              BHOS TT Portal
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Official Baku Higher Oil School Table Tennis Club
            </p>
          </div>
        </div>

        {/* REGISTRATION PENDING SUCCESS VIEW */}
        {registrationPending ? (
          <div className="space-y-5 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Registration Submitted!</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Welcome, <strong>{registrationPending.name}</strong>! Your account has been registered with{' '}
                <span className="font-mono text-cyan-300">{registrationPending.email}</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left text-xs text-amber-200/90 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Pending Admin Verification</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                To maintain competitive integrity, new athlete registrations must be approved by President Ali Iskandarli or Coach Iftixar Meherremov. Once verified and your initial ELO is calibrated, your profile will appear on the live leaderboard.
              </p>
            </div>

            <button
              onClick={() => {
                setRegistrationPending(null);
                setMode('signin');
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* TOGGLE TABS: Sign In / Register */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#080D16] border border-white/10 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'signin'
                    ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* Sign In Success Alert */}
            {signInSuccess && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Authenticated successfully. Redirecting...</span>
              </div>
            )}

            {/* TAB 1: SIGN IN FORM */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    BHOS Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@bhos.edu.az"
                      disabled={loading || signInSuccess}
                      className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading || signInSuccess}
                      className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={loading || signInSuccess}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] text-white font-bold text-xs transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In to Portal</span>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                {/* First Name & Surname */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    First Name & Surname <span className="text-[#3B82F6]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Murad Gasimov"
                      disabled={loading}
                      className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* BHOS Email */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    BHOS Email <span className="text-[#3B82F6]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="name.surname@bhos.edu.az"
                      disabled={loading}
                      className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Password (min 6 characters) <span className="text-[#3B82F6]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 transition"
                      tabIndex={-1}
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Admission Year & Playing Level */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Admission Year <span className="text-[#3B82F6]">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                      <input
                        type="number"
                        required
                        min={2018}
                        max={2030}
                        value={admissionYear}
                        onChange={(e) => setAdmissionYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                        disabled={loading}
                        className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Playing Level <span className="text-[#3B82F6]">*</span>
                    </label>
                    <div className="relative">
                      <Gauge className="w-4 h-4 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                      <select
                        value={playingLevel}
                        onChange={(e) => setPlayingLevel(e.target.value as PlayingLevel)}
                        disabled={loading}
                        className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Specialty / Faculty */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Specialty / Faculty <span className="text-[#3B82F6]">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                    <select
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      disabled={loading}
                      className="w-full bg-[#131C2B] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6] transition disabled:opacity-50"
                    >
                      <option value="Information Security">Information Security</option>
                      <option value="Computer Engineering">Computer Engineering</option>
                      <option value="Chemical Engineering">Chemical Engineering</option>
                      <option value="Petroleum Engineering">Petroleum Engineering</option>
                      <option value="Process Automation">Process Automation</option>
                      <option value="Sports & Physical Education">Sports & Physical Education</option>
                      <option value="Faculty Staff">Faculty Staff</option>
                    </select>
                  </div>
                </div>

                {/* Submit Register Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] text-white font-bold text-xs transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register for Verification</span>
                  )}
                </button>
              </form>
            )}

            {/* Footer security note */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-start gap-2.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Authorized Baku Higher Oil School members access real-time ELO ratings, tournament draws, and club management.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-[#080D16]">
      <Suspense fallback={
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#3B82F6]" />
          <span>Loading sign in...</span>
        </div>
      }>
        <AuthContent />
      </Suspense>
    </div>
  );
}
