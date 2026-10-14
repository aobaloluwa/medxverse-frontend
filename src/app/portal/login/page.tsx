"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  UserRound,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { AccountType } from '@/types/auth.types';
import { API_BASE_URL } from '@/services/appointment.service';

function PatientPortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const isJustRegistered = searchParams.get('registered') === 'true';
  const registeredEmail = searchParams.get('email') || '';

  const [loginMode, setLoginMode] = useState<'patientId' | 'email'>(registeredEmail ? 'email' : 'patientId');
  const [formData, setFormData] = useState({
    patientId: '',
    hospitalCode: '',
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
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(loginMode === 'patientId' ? { patientId: formData.patientId.trim() } : { email: formData.email.trim() }), hospitalCode: formData.hospitalCode.trim() || undefined, password: formData.password }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data?.token || !payload?.data?.patient) {
        throw new Error(payload?.message || "We couldn't sign you in. Please check your details.");
      }
      const patient = payload.data.patient;
      const token = payload.data.token;
      const baseAccount = {
        id: patient.portalAccountId || patient.id,
        userId: patient.portalAccountId || patient.id,
        ...(patient.hospitalId ? { hospitalId: patient.hospitalId } : {}),
        ...(patient.linkedToHospital && patient.id ? { patientId: patient.id } : {}),
        name: patient.name,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        accountType: AccountType.PATIENT_PORTAL,
        userType: "PATIENT" as const,
        ...(patient.mrn ? { mrn: patient.mrn } : {}),
      };
      setAuth(baseAccount, token);

      // Restore the saved hospital/patient association after every login.
      // Failure to restore must not block access to the patient portal.
      try {
        const connectionResponse = await fetch(`${API_BASE_URL}/patient-portal/auth/connection`, {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const connectionPayload = await connectionResponse.json().catch(() => null);
        const connection = connectionPayload?.data;
        if (connectionResponse.ok && connectionPayload?.success && connection?.connected) {
          setAuth({
            ...baseAccount,
            hospitalId: connection.hospital?.id || patient.hospitalId,
            patientId: connection.patient?.id || patient.id,
            name: connection.patient?.name || patient.name,
            mrn: connection.patient?.mrn || patient.mrn,
            hospital: connection.hospital ? {
              _id: connection.hospital.id,
              name: connection.hospital.name,
            } : undefined,
          }, token);
        }
      } catch {
        // Keep the successful login; the patient can retry connection restoration later.
      }
      router.replace("/portal");
    } catch (err: any) {
      setErrorMessage(err instanceof Error ? err.message : "We couldn't sign you in. Please check your details.");
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
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/65">
            MedXverse Patient Portal
          </p>
        </div>

        <div className="mb-4 space-y-2">
          {isJustRegistered && (
            <div className="flex items-start gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-xs text-white backdrop-blur-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Account created successfully. Please sign in with your credentials.</span>
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
          <span>Patient portal sign in</span>
          <Link
            href="/auth/login"
            className="font-bold text-white/90 hover:text-white hover:underline"
          >
            Hospital / Staff sign in
          </Link>
        </div>

        <div className="mb-3 grid grid-cols-2 rounded-sm border border-white/30 p-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          <button type="button" onClick={() => setLoginMode('patientId')} className={`rounded-sm px-3 py-2.5 transition ${loginMode === 'patientId' ? 'bg-white text-[#1b7b68]' : 'text-white/75 hover:bg-white/10'}`}>Patient ID</button>
          <button type="button" onClick={() => setLoginMode('email')} className={`rounded-sm px-3 py-2.5 transition ${loginMode === 'email' ? 'bg-white text-[#1b7b68]' : 'text-white/75 hover:bg-white/10'}`}>Email</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {loginMode === 'patientId' ? (
            <div className="group relative">
              <label htmlFor="patientId" className="sr-only">Hospital-issued Patient ID</label>
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input id="patientId" type="text" name="patientId" autoComplete="username" required value={formData.patientId} onChange={handleChange} placeholder="HOSPITAL PATIENT ID" className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[11px] font-medium tracking-[0.12em] text-white outline-none transition-all placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15" />
            </div>
          ) : (
            <div className="group relative">
              <label htmlFor="email" className="sr-only">Account email</label>
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input id="email" type="email" name="email" autoComplete="email" required value={formData.email} onChange={handleChange} placeholder="EMAIL" className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[11px] font-medium tracking-[0.12em] text-white outline-none transition-all placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15" />
            </div>
          )}
          {loginMode === 'patientId' && (
            <div className="group relative">
              <label htmlFor="hospitalCode" className="sr-only">Hospital code (optional)</label>
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input id="hospitalCode" type="text" name="hospitalCode" value={formData.hospitalCode} onChange={handleChange} placeholder="HOSPITAL CODE (IF PROVIDED)" className="h-12 w-full rounded-sm border border-white/70 bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15" />
            </div>
          )}

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

          <div className="flex justify-end pt-0.5">
            <Link href="/auth/forgot-password" className="text-[10px] font-medium text-white/75 transition-colors hover:text-white hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-white px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1b7b68] shadow-lg shadow-black/10 transition-all hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Signing in</span></>
            ) : (
              <><span>Sign in to patient portal</span><ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-[11px] text-white/55">
            Don&apos;t have an account?{' '}
            <Link href="/portal/register" className="font-semibold text-white/90 hover:text-white hover:underline">Register</Link>
          </p>
        </div>

        <p className="mt-8 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-white/30">
          Secure access to MedXverse Patient Portal
        </p>
      </div>
    </main>
  );
}

export default function PatientPortalLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#1b7b68]"><Loader2 className="h-7 w-7 animate-spin text-white" /></div>}>
      <PatientPortalLoginForm />
    </Suspense>
  );
}

