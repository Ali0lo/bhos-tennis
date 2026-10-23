'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../../lib/supabase/client';
import { useTranslation } from '../../lib/i18n';
import SmoothReveal from '../../components/SmoothReveal';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [verifyingToken, setVerifyingToken] = useState(true);
  const [isRecoveryValid, setIsRecoveryValid] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setVerifyingToken(false);
      setIsRecoveryValid(false);
      return;
    }

    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryValid(true);
        setVerifyingToken(false);
      } else if (event === 'SIGNED_IN' && session) {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const search = typeof window !== 'undefined' ? window.location.search : '';
        if (
          hash.includes('type=recovery') ||
          hash.includes('access_token=') ||
          search.includes('code=') ||
          search.includes('type=recovery')
        ) {
          setIsRecoveryValid(true);
          setVerifyingToken(false);
        }
      }
    });

    const initializeRecoveryCheck = async () => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const typeParam = searchParams.get('type');

      if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
        if (isMounted) {
          setIsRecoveryValid(true);
          setVerifyingToken(false);
        }
        return;
      }

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session && isMounted) {
            setIsRecoveryValid(true);
            setVerifyingToken(false);
            return;
          }
        } catch {}
      }

      if (tokenHash && typeParam === 'recovery') {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (!error && data.session && isMounted) {
            setIsRecoveryValid(true);
            setVerifyingToken(false);
            return;
          }
        } catch {}
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        if (session) {
          setIsRecoveryValid(true);
        }
        setVerifyingToken(false);
      }
    };

    const timer = setTimeout(() => {
      initializeRecoveryCheck();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Yeni şifrə ən azı 6 simvoldan ibarət olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Daxil edilən şifrələr bir-biri ilə uyğun gəlmir.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg('Autentifikasiya xidməti hazırda əlçatan deyil.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      setToastSuccess(t('auth.password_updated', 'Şifrəniz uğurla yeniləndi!'));
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Şifrə yenilənərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SmoothReveal>
      <div className="max-w-md mx-auto py-12 px-4">
        {toastSuccess && (
          <div className="fixed top-6 right-6 z-50 rounded-2xl bg-[#0F1623] border border-[#22C55E]/40 px-4 py-3.5 shadow-[0_0_30px_rgba(34,197,94,0.25)] flex items-center gap-3 text-xs text-white">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            <div>
              <p className="font-bold text-[#22C55E]">{toastSuccess}</p>
              <p className="text-[11px] text-slate-400">Giriş səhifəsinə yönləndirilirsiniz...</p>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#0F1623] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.2)] shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display font-black text-white">
                {t('auth.reset_title', 'Şifrənin Sıfırlanması')}
              </h1>
              <p className="text-xs text-slate-400">
                BANM Stolüstü Tennis Klubu hesabınız üçün yeni şifrə təyin edin
              </p>
            </div>
          </div>

          {verifyingToken ? (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-[#3B82F6] animate-spin mx-auto" />
              <p className="text-xs text-slate-400">
                Təhlükəsizlik keçidi yoxlanılır...
              </p>
            </div>
          ) : !isRecoveryValid ? (
            <div className="p-5 rounded-2xl bg-[#131C2B] border border-rose-500/30 space-y-4 text-center">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-display font-bold text-white">
                  Etibarsız və ya vaxtı bitmiş keçid
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Şifrə sıfırlama linkinin müddəti bitib və ya keçid artıq istifadə olunub. Zəhmət olmasa giriş səhifəsindən yeni sıfırlama sorğusu göndərin.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-[#3B82F6] hover:bg-blue-500 text-white font-display font-bold text-xs shadow-lg shadow-[#3B82F6]/25 transition inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Giriş Səhifəsinə Qayıt</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>{t('auth.new_password', 'Yeni şifrə')}</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ən azı 6 simvol"
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                    aria-label={showNewPassword ? 'Şifrəni gizlə' : 'Şifrəni göstər'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Yeni şifrənin təkrarı</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('auth.confirm_password', 'Şifrəni təsdiqləyin')}
                    className="w-full pl-4 pr-11 py-3 rounded-xl bg-[#131C2B] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                    aria-label={showConfirmPassword ? 'Şifrəni gizlə' : 'Şifrəni göstər'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || Boolean(toastSuccess)}
                className="w-full py-3.5 rounded-xl bg-[#3B82F6] hover:bg-blue-500 disabled:opacity-50 text-white font-display font-black text-sm shadow-xl shadow-[#3B82F6]/25 transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Yenilənir...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Şifrəni Yenilə</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2 border-t border-white/10">
                <Link
                  href="/login"
                  className="text-xs text-slate-400 hover:text-[#3B82F6] transition inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Giriş səhifəsinə qayıt</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </SmoothReveal>
  );
}
