'use client';

import React, { useState } from 'react';
import { useRealtime } from '@/context/RealtimeContext';
import { Lock, ShieldCheck, KeyRound, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowingButton } from '@/components/ui/GlowingButton';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, login } = useRealtime();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-[2px] animate-pulse">
          <div className="w-full h-full bg-[#04201a] rounded-[14px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <p className="text-sm font-medium text-emerald-300">Synchronizing Central Master Registry...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);
      const res = await login(password);
      setIsSubmitting(false);
      if (!res.success) {
        setError(res.error || 'Invalid administrator password.');
      }
    };

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <GlassCard className="p-8 space-y-6 shadow-2xl border-emerald-500/30">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-[2px] mx-auto shadow-lg shadow-emerald-500/25">
                <div className="w-full h-full bg-[#04201a] rounded-[14px] flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight pt-2">
                VSB Hostel Management
              </h2>
              <p className="text-xs text-emerald-300/80">
                Boys Hostel-I (New Construction First Floor) • Central Master Access
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center justify-between">
                  <span>Common Administrator Password:</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-emerald-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#021d17] border border-emerald-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Same single account may be opened concurrently on up to 3 devices.
                </p>
              </div>

              <GlowingButton
                variant="primary"
                size="lg"
                icon={Lock}
                loading={isSubmitting}
                className="w-full justify-center"
              >
                Unlock Central Dashboard
              </GlowingButton>
            </form>

            <div className="pt-4 border-t border-emerald-500/20 text-center">
              <p className="text-[11px] text-emerald-400/60">
                Default credentials: <span className="font-mono text-emerald-300 font-semibold">admin@vsb2026</span>
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
