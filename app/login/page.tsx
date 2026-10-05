'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabase/client';
import { BHOSDataStore } from '../../lib/data/store';
import { 
  Lock, 
  Mail, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  User,
  GraduationCap,
  Award,
  Calendar,
  Clock
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [admissionYear, setAdmissionYear] = useState<number | string>(2024);
  const [faculty, setFaculty] = useState('Computer Engineering');
  const [playingLevel, setPlayingLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInSuccess, setSignInSuccess] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

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
        email: signInEmail.trim().toLowerCase(),
        password: signInPassword,
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
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanFirst = firstName.trim();
    const cleanLast = surname.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const yearNum = Number(admissionYear);

    if (!cleanFirst || !cleanLast) {
      setError('Please provide your first name and surname.');
      return;
    }

    if (!cleanEmail) {
      setError('Please provide your BHOS email address.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (isNaN(yearNum) || yearNum < 2015 || yearNum > 2030) {
      setError('Please enter a valid admission year (e.g. 2024).');
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
      const fullName = `${cleanFirst} ${cleanLast}`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: regPassword,
        options: {
          data: {
            full_name: fullName,
            admission_year: yearNum,
            major_faculty: faculty,
            playing_level: playingLevel,
          },
        },
      });

      if (authError) {
        setError(authError.message || 'Failed to create user account.');
        setLoading(false);
        return;
      }

      const userId = authData?.user?.id || `p-${Date.now()}`;

      const profilePayload = {
        id: userId,
        full_name: fullName,
        email: cleanEmail,
        major_faculty: faculty,
        admission_year: yearNum,
        playing_level: playingLevel,
        playing_style: 'Shakehand All-round',
        blade_equipment: 'University Racket',
        forehand_rubber: 'Standard',
        backhand_rubber: 'Standard',
        current_elo: 0,
        matches_played: 0,
        wins: 0,
        losses: 0,
        is_verified: false,
        is_active: true,
        role: 'player' as const,
        created_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profilePayload]);

      if (profileError) {
        console.warn('Profile insertion warning:', profileError.message);
      }

      const store = BHOSDataStore.getInstance();
      store.addProfile(profilePayload as any);

      setRegisterSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to BHOS TT Portal</span>
      </Link>

      <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-8 shadow-2xl shadow-black/80 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#3B82F6]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto p-2 shadow-lg shadow-cyan-500/10">
            <img
              src="/images/bhos-crest.png"
              alt="BHOS Crest"
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,229,255,0.7)] mix-blend-screen"
            />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black text-white tracking-tight">
              BHOS TT Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Baku Higher Oil School Table Tennis Club
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 p-1 bg-[#080D16] border border-white/10 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {signInSuccess && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Authenticated successfully. Redirecting...</span>
          </div>
        )}

        {registerSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Clock className="w-4 h-4" />
              <span>Pending Admin Verification</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-300">
              Your account has been created successfully. It is currently waiting for admin verification to assign your starting ELO rating and activate your access.
            </p>
            <button
              type="button"
              onClick={() => {
                setRegisterSuccess(false);
                setMode('signin');
              }}
              className="mt-2 w-full py-2 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 font-semibold text-xs transition text-center"
            >
              Go to Sign In
            </button>
          </div>
        )}

        {mode === 'signin' && !registerSuccess && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                BHOS Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="name@bhos.edu.az"
                  disabled={loading || signInSuccess}
                  className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading || signInSuccess}
                  className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || signInSuccess}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] text-white font-bold text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}

        {mode === 'register' && !registerSuccess && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  First Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ali"
                    disabled={loading}
                    className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Surname
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Iskandarli"
                    disabled={loading}
                    className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                BHOS Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="first.last@bhos.edu.az"
                  disabled={loading}
                  className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={loading}
                  className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-8 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Admission Year
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                  <input
                    type="number"
                    required
                    min={2015}
                    max={2030}
                    value={admissionYear}
                    onChange={(e) => setAdmissionYear(e.target.value)}
                    placeholder="2024"
                    disabled={loading}
                    className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Playing Level
                </label>
                <div className="relative">
                  <Award className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                  <select
                    value={playingLevel}
                    onChange={(e) => setPlayingLevel(e.target.value as any)}
                    disabled={loading}
                    className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Specialty / Faculty
              </label>
              <div className="relative">
                <GraduationCap className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
                >
                  <option value="Computer Engineering">Computer Engineering</option>
                  <option value="Information Security">Information Security</option>
                  <option value="Process Automation">Process Automation Engineering</option>
                  <option value="Chemical Engineering">Chemical Engineering</option>
                  <option value="Petroleum Engineering">Petroleum Engineering</option>
                  <option value="Business Administration">Business Administration</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] text-white font-bold text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting registration...</span>
                </>
              ) : (
                <span>Register Account</span>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-white/10 flex items-start gap-2.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Authorized Baku Higher Oil School members access real-time ELO ratings, tournament draws, and club management.
          </p>
        </div>
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
        <LoginForm />
      </Suspense>
    </div>
  );
}
