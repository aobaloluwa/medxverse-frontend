'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserRound,
  Mail,
  Phone,
  Lock,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { AccountType } from '@/types/auth.types';
import { API_BASE_URL } from '@/services/appointment.service';

export default function PatientPortalRegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    name: '',
    hospitalCode: '',
    mrn: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));

    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Your passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          hospitalCode: formData.hospitalCode.trim().toUpperCase(),
          mrn: formData.mrn.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          dateOfBirth: formData.dateOfBirth,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data?.token || !payload?.data?.patient) {
        throw new Error(payload?.message || "We couldn't create your account.");
      }

      const patient = payload.data.patient;
      setAuth(
        {
          id: patient.portalAccountId || patient.id,
          userId: patient.portalAccountId || patient.id,
          name: patient.name,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          accountType: AccountType.PATIENT_PORTAL,
          userType: 'PATIENT',
          ...(patient.hospitalId ? { hospitalId: patient.hospitalId } : {}),
          ...(patient.hospitalId && patient.id ? { patientId: patient.id, linkedToHospital: true } : {}),
          ...(patient.mrn ? { mrn: patient.mrn } : {}),
        },
        payload.data.token,
      );

      router.replace('/portal');
    } catch (err: any) {
      setErrorMessage(err?.message || "We couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1b7b68] px-5 py-10 font-sans">
      {/* Background decorative circles */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full border border-white/[0.035] bg-white/[0.025]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 top-1/4 h-[620px] w-[620px] rounded-full border border-white/[0.035] bg-white/[0.025]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 -left-20 h-[560px] w-[560px] rounded-full border border-black/[0.035] bg-black/[0.025]"
      />

      {/* Main content */}
      <div className="relative z-10 mx-auto w-full max-w-[520px]">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Create patient account
          </h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/65">
            MedXverse Patient Portal
          </p>
        </div>

        {/* Informational banner */}
        <div className="mb-4 space-y-2">
          <div className="flex items-start gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 text-xs text-white backdrop-blur-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Register with your hospital code and Patient ID. Your details must match your existing hospital record.</span>
          </div>

          {/* Error */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200/25 bg-rose-950/20 px-3.5 py-3 text-xs text-white backdrop-blur-sm"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div className="group relative">
            <label htmlFor="name" className="sr-only">
              Full name
            </label>
            <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
            <input
              id="name"
              type="text"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              value={formData.name}
              onChange={handleChange}
              placeholder="FULL NAME"
              className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
            />
          </div>

          {/* Hospital-issued identity details are matched to the existing HMS patient record. */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="group relative">
              <label htmlFor="hospitalCode" className="sr-only">Hospital code</label>
              <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input id="hospitalCode" type="text" name="hospitalCode" required value={formData.hospitalCode} onChange={handleChange} placeholder="HOSPITAL CODE" className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15" />
            </div>
            <div className="group relative">
              <label htmlFor="mrn" className="sr-only">Hospital-issued Patient ID</label>
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input id="mrn" type="text" name="mrn" required value={formData.mrn} onChange={handleChange} placeholder="PATIENT ID / MRN" className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15" />
            </div>
          </div>
          <div className="group relative">
            <label htmlFor="phone" className="sr-only">Phone number registered with the hospital</label>
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
            <input id="phone" type="tel" name="phone" autoComplete="tel" required value={formData.phone} onChange={handleChange} placeholder="PHONE NUMBER ON YOUR HOSPITAL RECORD" className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15" />
          </div>

          {/* Email + Date of Birth */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Email */}
            <div className="group relative">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="EMAIL ADDRESS"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>

            {/* Date of Birth */}
            <div className="group relative">
              <label htmlFor="dateOfBirth" className="sr-only">
                Date of birth
              </label>
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium uppercase tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>
          </div>

          {/* Password + Confirm Password */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {/* Password */}
            <div className="group relative">
              <label htmlFor="password" className="sr-only">
                Create password
              </label>
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="PASSWORD (8+ CHARS)"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 pr-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
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

            {/* Confirm Password */}
            <div className="group relative">
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm password
              </label>
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={8}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="CONFIRM PASSWORD"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 pr-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-white px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1b7b68] shadow-lg shadow-black/10 transition-all hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating account</span>
              </>
            ) : (
              <>
                <span>Create patient account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-7 text-center">
          <p className="text-[11px] text-white/55">
            Already have an account?{' '}
            <Link
              href="/portal/login"
              className="font-semibold text-white/90 transition-colors hover:text-white hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-white/30">
          Secure registration for MedXverse Patient Portal
        </p>
      </div>
    </main>
  );
}
