import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Cloud } from 'lucide-react';
import { signInUser, signUpUser, UserProfile } from '../services/auth';
import { BrandLogoSvg } from './BrandLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  theme: 'dark' | 'light';
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  theme,
  initialMode = 'signin',
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const res = await signUpUser(name, email, password);
        if ('error' in res) {
          setErrorMsg(res.error);
        } else {
          onLoginSuccess(res.user);
          onClose();
        }
      } else {
        const res = await signInUser(email, password);
        if ('error' in res) {
          setErrorMsg(res.error);
        } else {
          onLoginSuccess(res.user);
          onClose();
        }
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const res = await signInUser('arjun@greenpath.ai', 'password123');
    setIsLoading(false);
    if ('user' in res) {
      onLoginSuccess(res.user);
      onClose();
    }
  };

  const panelBg =
    theme === 'dark'
      ? 'bg-[#090d16] text-zinc-100 border border-zinc-800'
      : 'bg-white text-slate-800 border border-slate-200 shadow-2xl';

  const inputBg =
    theme === 'dark'
      ? 'bg-black/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className={`w-full max-w-md ${panelBg} rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95`}>
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <BrandLogoSvg sizeClass="w-9 h-9" />
            <div>
              <h3 className="text-sm font-semibold tracking-wide">
                {mode === 'signin' ? 'Sign In to Green Path' : 'Create Free Account'}
              </h3>
              <p className="text-[10px] text-zinc-400 font-light flex items-center gap-1">
                <span>Save EcoPoints & Verified Commutes</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4 stroke-[1.75]" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`py-1.5 font-medium rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-emerald-500 text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`py-1.5 font-medium rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-emerald-500 text-black shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs animate-in fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-light tracking-wider text-zinc-400">
                Full Name
              </label>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${inputBg}`}>
                <User className="h-4 w-4 text-emerald-500 stroke-[1.75]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  className="w-full bg-transparent outline-none text-xs font-light"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-light tracking-wider text-zinc-400">
              Email Address
            </label>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${inputBg}`}>
              <Mail className="h-4 w-4 text-emerald-500 stroke-[1.75]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-transparent outline-none text-xs font-light"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-light tracking-wider text-zinc-400">
              Password
            </label>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${inputBg}`}>
              <Lock className="h-4 w-4 text-emerald-500 stroke-[1.75]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-transparent outline-none text-xs font-light"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-semibold text-xs tracking-wide shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In' : 'Create Account (+100 Bonus Pts)'}</span>
                <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Login Option */}
        <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-medium border border-emerald-500/20 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Instant Demo Sign In (Arjun · 1,420 Pts)</span>
          </button>

          {/* Secure Session Badge */}
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-light px-1 pt-1">
            <span className="flex items-center gap-1 text-emerald-500">
              <ShieldCheck className="h-3 w-3 stroke-[2]" />
              <span>Encrypted Session Storage</span>
            </span>
            <span className="font-metallic text-[9px]">Green Path ID</span>
          </div>
        </div>
      </div>
    </div>
  );
}
