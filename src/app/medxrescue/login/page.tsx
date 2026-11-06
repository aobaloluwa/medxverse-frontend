"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Siren, Ambulance, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { API_BASE_URL } from '@/services/appointment.service';

export default function RescueCrewLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/medxrescue/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Sign in failed. Check your email address and password.');
      }

      const { token, user } = payload.data;
      setAuth(token, user);
      router.replace('/medxrescue/crew');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4faf8] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/medxrescue/crew" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b7b68] to-[#125447] text-white shadow-lg shadow-teal-900/15">
            <Siren size={28} className="animate-pulse" />
          </Link>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#1b7b68]">MedXRescue Nexus</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Ambulance Crew Sign In</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">Sign in to your crew account to access live dispatch offers, GPS telemetry, and ePCR workstation.</p>
        </div>

        <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-xl shadow-teal-900/5 sm:p-8">
          {error && (
            <div role="alert" className="mb-5 flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-700">Email Address</label>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="paramedic@medxrescue.ng"
                  className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-700">Password</label>
              <div className="relative mt-1.5">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-10 text-sm font-medium outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] py-3.5 text-xs font-black text-white shadow-md transition hover:bg-[#156354] disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Sign In to Crew Portal</span> <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
            Need an ambulance crew account?{' '}
            <Link href="/medxrescue/register" className="font-extrabold text-[#1b7b68] hover:underline">
              Register Crew Account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
