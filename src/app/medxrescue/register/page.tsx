"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, Building2, Ambulance, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Siren, ShieldCheck } from 'lucide-react';
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
    confirmPassword: '',
    hospitalId: '',
    crewRole: 'PARAMEDIC',
    registrationNumber: '',
    makeModel: 'Mercedes Sprinter ALS Ambulance',
    vehicleClass: 'ADVANCED_LIFE_SUPPORT',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.hospitalId) {
      setError('Select a host hospital for your ambulance crew account.');
      return;
    }

    setSubmitting(true);
    setError(null);

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
        throw new Error(payload.message || 'Registration failed. Check your input and try again.');
      }

      const { token, user } = payload.data;
      setAuth(token, user);
      router.replace('/medxrescue/crew');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4faf8] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <Link href="/medxrescue/crew" className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b7b68] to-[#125447] text-white shadow-lg shadow-teal-900/15">
            <Siren size={28} className="animate-pulse" />
          </Link>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#1b7b68]">MedXRescue Nexus</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Register Ambulance Crew</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">Create a crew account linked to your host hospital to handle emergency dispatch offers and live GPS telemetry.</p>
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
              <label className="block text-xs font-extrabold uppercase text-slate-700">Select Host Hospital *</label>
              <div className="relative mt-1.5">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  required
                  name="hospitalId"
                  value={formData.hospitalId}
                  onChange={handleChange}
                  className="w-full appearance-none rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/15"
                >
                  {loadingHospitals ? (
                    <option value="">Loading hospitals...</option>
                  ) : hospitals.length === 0 ? (
                    <option value="">No hospitals registered</option>
                  ) : (
                    hospitals.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name} {h.address ? `(${h.address})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700">Full Name *</label>
                <div className="relative mt-1.5">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Paramedic Jane Doe"
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700">Phone Number *</label>
                <div className="relative mt-1.5">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+2348012345678"
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/15"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-700">Email Address *</label>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="paramedic@medxrescue.ng"
                  className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/15"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700">Crew Role</label>
                <select
                  name="crewRole"
                  value={formData.crewRole}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 py-3 px-4 text-sm font-medium outline-none focus:border-[#1b7b68]"
                >
                  <option value="PARAMEDIC">Paramedic / EMT</option>
                  <option value="DRIVER">Emergency Ambulance Driver</option>
                  <option value="CREW">Critical Care Technician</option>
                  <option value="PROVIDER_ADMIN">Fleet / Dispatch Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700">Ambulance Class</label>
                <select
                  name="vehicleClass"
                  value={formData.vehicleClass}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 py-3 px-4 text-sm font-medium outline-none focus:border-[#1b7b68]"
                >
                  <option value="ADVANCED_LIFE_SUPPORT">Advanced Life Support (ALS)</option>
                  <option value="BASIC_LIFE_SUPPORT">Basic Life Support (BLS)</option>
                  <option value="ICU_AMBULANCE">ICU Ambulance</option>
                  <option value="NEONATAL">Neonatal Intensive Care</option>
                  <option value="PATIENT_TRANSPORT">Patient Transport</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700">Vehicle Registration</label>
                <div className="relative mt-1.5">
                  <Ambulance size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="AMB-911-RES"
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1b7b68]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700">Vehicle Make / Model</label>
                <input
                  type="text"
                  name="makeModel"
                  value={formData.makeModel}
                  onChange={handleChange}
                  placeholder="Mercedes Sprinter ALS"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 py-3 px-4 text-sm font-medium outline-none focus:border-[#1b7b68]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700">Password *</label>
                <div className="relative mt-1.5">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1b7b68]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700">Confirm Password *</label>
                <div className="relative mt-1.5">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-[#1b7b68]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] py-3.5 text-xs font-black text-white shadow-md transition hover:bg-[#156354] disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <><span>Create Ambulance Crew Account</span> <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
            Already have a crew account?{' '}
            <Link href="/medxrescue/login" className="font-extrabold text-[#1b7b68] hover:underline">
              Sign In Here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
