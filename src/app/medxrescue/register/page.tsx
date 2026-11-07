"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Mail,
  Lock,
  Phone,
  User,
  Ambulance,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Siren,
  ShieldCheck,
} from 'lucide-react';

import { useAuthStore } from '@/store/useAuthStore';
import { API_BASE_URL } from '@/services/appointment.service';

type HospitalOption = {
  _id: string;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
};

export default function RescueCrewRegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    hospitalId: '',
    crewRole: 'PARAMEDIC',
    registrationNumber: '',
    makeModel: 'Mercedes Sprinter ALS Ambulance',
    vehicleClass: 'ADVANCED_LIFE_SUPPORT',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadHospitals = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/medxrescue/auth/hospitals`);
        const payload = await response.json();
        if (!cancelled && response.ok && payload.success && Array.isArray(payload.data)) {
          setHospitals(payload.data);
          if (payload.data.length > 0) {
            setFormData((prev) => ({ ...prev, hospitalId: payload.data[0]._id }));
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingHospitals(false);
      }
    };
    void loadHospitals();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (!formData.hospitalId) {
      setErrorMessage('Select a host hospital for your ambulance crew account.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/medxrescue/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          hospitalId: formData.hospitalId,
          crewRole: formData.crewRole,
          registrationNumber: formData.registrationNumber.trim() || undefined,
          makeModel: formData.makeModel.trim() || undefined,
          vehicleClass: formData.vehicleClass,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Registration failed. Please review your details and try again.');
      }

      const { token, user } = payload.data;
      setAuth(user, token);
      router.push('/medxrescue/login?registered=true');
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Registration failed. Please review your details and try again.'
      );
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
      <div className="relative mx-auto z-10 w-full max-w-[520px]">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm border border-white/20">
            <Siren className="h-6 w-6 animate-pulse" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Register Ambulance Crew
          </h1>

          <p className="mt-1 text-[10px] font-medium tracking-[0.22em] text-white/65">
            MedXRescue Emergency Workstation
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200/25 bg-rose-950/20 px-3.5 py-3 text-xs text-white backdrop-blur-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Host Hospital Selection */}
          <div className="group relative">
            <label htmlFor="hospitalId" className="sr-only">Select Host Hospital</label>
            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
            <select
              id="hospitalId"
              required
              name="hospitalId"
              value={formData.hospitalId}
              onChange={handleChange}
              className="h-12 w-full appearance-none rounded-sm border border-white bg-transparent px-11 pr-8 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
            >
              {loadingHospitals ? (
                <option value="" className="bg-[#1b7b68] text-white">LOADING HOSPITALS...</option>
              ) : hospitals.length === 0 ? (
                <option value="" className="bg-[#1b7b68] text-white">NO HOSPITALS REGISTERED</option>
              ) : (
                hospitals.map((h) => (
                  <option key={h._id} value={h._id} className="bg-[#1b7b68] text-white">
                    {h.name.toUpperCase()} {h.address ? `(${h.address.toUpperCase()})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Full Name */}
          <div className="group relative">
            <label htmlFor="name" className="sr-only">Full Name</label>
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
            <input
              id="name"
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="FULL NAME (E.G. PARAMEDIC JANE DOE)"
              className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="group relative">
              <label htmlFor="email" className="sr-only">Official email</label>
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                id="email"
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="OFFICIAL EMAIL"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>

            <div className="group relative">
              <label htmlFor="phone" className="sr-only">Contact phone</label>
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                id="phone"
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="CONTACT PHONE"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>
          </div>

          {/* Crew Role + Vehicle Class */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[9px] font-medium tracking-[0.18em] text-white/50">CREW ROLE</label>
              <select
                name="crewRole"
                value={formData.crewRole}
                onChange={handleChange}
                className="h-12 w-full rounded-sm border border-white bg-[#1b7b68] px-3 text-[10px] font-medium tracking-[0.1em] text-white outline-none focus:bg-white/[0.04]"
              >
                <option value="PARAMEDIC">PARAMEDIC / EMT</option>
                <option value="DRIVER">AMBULANCE DRIVER</option>
                <option value="CREW">CRITICAL CARE TECH</option>
                <option value="PROVIDER_ADMIN">DISPATCH LEAD</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-medium tracking-[0.18em] text-white/50">AMBULANCE CLASS</label>
              <select
                name="vehicleClass"
                value={formData.vehicleClass}
                onChange={handleChange}
                className="h-12 w-full rounded-sm border border-white bg-[#1b7b68] px-3 text-[10px] font-medium tracking-[0.1em] text-white outline-none focus:bg-white/[0.04]"
              >
                <option value="ADVANCED_LIFE_SUPPORT">ADVANCED LIFE SUPPORT (ALS)</option>
                <option value="BASIC_LIFE_SUPPORT">BASIC LIFE SUPPORT (BLS)</option>
                <option value="ICU_AMBULANCE">ICU AMBULANCE</option>
                <option value="NEONATAL">NEONATAL CARE</option>
                <option value="PATIENT_TRANSPORT">PATIENT TRANSPORT</option>
              </select>
            </div>
          </div>

          {/* Registration Number + Password */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="group relative">
              <label htmlFor="registrationNumber" className="sr-only">Vehicle Registration</label>
              <Ambulance className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                id="registrationNumber"
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="REGISTRATION (OPTIONAL)"
                className="h-12 w-full rounded-sm border border-white bg-transparent px-11 text-[10px] font-medium tracking-[0.1em] text-white outline-none transition-all placeholder:text-white/55 focus:border-white focus:bg-white/[0.04] focus:ring-1 focus:ring-white/15"
              />
            </div>

            <div className="group relative">
              <label htmlFor="password" className="sr-only">Password</label>
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                placeholder="PASSWORD (MIN 8 CHARS)"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-white px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1b7b68] shadow-lg shadow-black/10 transition-all hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Registering Crew</span></>
            ) : (
              <><span>Register Crew Account</span><ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-[11px] text-white/55">
            Already have a crew account?{' '}
            <Link href="/medxrescue/login" className="font-semibold text-white/90 hover:text-white hover:underline">
              Login
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-white/30">
          Secure access to MedXRescue Nexus
        </p>
      </div>
    </main>
  );
}
