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
  ShieldCheck
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(authError.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      if (data?.user?.email) {
        // Link profile in the store immediately
        const store = BHOSDataStore.getInstance();
        await store.linkProfileByEmail(data.user.email);
        setSuccess(true);

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
        <div className="text-center space-y-3 mb-8">
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
              Sign in with your Baku Higher Oil School account
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Authenticated successfully. Redirecting...</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              BHOS Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@bhos.edu.az"
                disabled={loading || success}
                className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || success}
                className="w-full bg-[#080D16]/80 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button (#3B82F6 Electric Royal Blue) */}
          <button
            type="submit"
            disabled={loading || success}
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

        {/* Security / Info Note */}
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
