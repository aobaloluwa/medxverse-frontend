"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Siren,
  Ambulance,
} from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { API_BASE_URL } from '@/services/appointment.service';

function RescueCrewLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const isJustRegistered = searchParams.get('registered') === 'true';
  const registeredEmail = searchParams.get('email') || '';

  const [formData, setFormData] = useState({
    email: registeredEmail,
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/medxrescue/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim(), password: formData.password }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Authentication failed. Invalid email or password.');
      }

      const { token, user } = payload.data;
      setAuth(user, token);
      router.replace('/medxrescue/crew');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1b7b68] px-5 py-10 font-sans">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full border border-white/[0.035] bg-white/[0.025]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-1/3 h-[620px] w-[620px] rounded-full border border-white/[0.035] bg-white/[0.025]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-64 -left-20 h-[560px] w-[560px] rounded-full border border-black/[0.035] bg-black/[0.025]" />

      <div className="relative z-10 w-full max-w-[390px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm border border-white/20">
            <Siren className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Ambulance Crew Sign In
          </h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/65">
            MedXRescue Emergency Workstation
          </p>
        </div>

        <div className="mb-4 space-y-2">
          {isJustRegistered && (
            <div className="flex items-start gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-xs text-white backdrop-blur-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Crew account created successfully. Please sign in with your credentials.</span>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200/25 bg-rose-950/20 px-3.5 py-3 text-xs text-white backdrop-blur-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/60">
          <span>Secure paramedic &amp; driver sign in</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="group relative">
            <label htmlFor="email" className="sr-only">Account email</label>
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="OFFICIAL CREW EMAIL"
              className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[11px] font-medium tracking-[0.12em] text-white outline-none transition-all placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
            />
          </div>

          <div className="group relative">
            <label htmlFor="password" className="sr-only">Password</label>
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="PASSWORD"
              className="h-12 w-full rounded-sm border border-white bg-transparent px-11 pr-11 text-[11px] font-medium tracking-[0.12em] text-white outline-none transition-all placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/55 transition-colors hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-white px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1b7b68] shadow-lg shadow-black/10 transition-all hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Signing in</span></>
            ) : (
              <><span>Login</span><ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-[11px] text-white/55">
            Don&apos;t have a crew account?{' '}
            <Link href="/medxrescue/register" className="font-semibold text-white/90 hover:text-white hover:underline">Register</Link>
          </p>
        </div>

        <p className="mt-8 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-white/30">
          Secure access to MedXRescue Nexus
        </p>
      </div>
    </main>
  );
}

export default function RescueLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#1b7b68]"><Loader2 className="h-7 w-7 animate-spin text-white" /></div>}>
      <RescueCrewLoginForm />
    </Suspense>
  );
}
