"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Hospital,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { AccountType } from "@/types/auth.types";
import { API_BASE_URL } from "@/services/appointment.service";
import PatientShell from "@/components/patient/PatientShell";

type HospitalOption = {
  id: string;
  name: string;
  code: string;
  address?: string;
  logoUrl?: string;
};

export default function PatientPortalHomePage() {
  const router = useRouter();
  const { account, setAuth, token } = useAuthStore();

  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [hospitalCode, setHospitalCode] = useState("");
  const [mrn, setMrn] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const linked = Boolean(account?.hospitalId && account?.patientId);

  const selectedHospital = useMemo(
    () =>
      hospitals.find((h) =>
        selectedHospitalId
          ? h.id === selectedHospitalId
          : Boolean(hospitalCode && h.code === hospitalCode)
      ),
    [hospitals, selectedHospitalId, hospitalCode]
  );

  const firstName =
    account?.firstName || account?.name?.split(" ")[0] || "there";

  const loadHospitals = useCallback(async () => {
    setLoadingHospitals(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/patient-portal/auth/hospitals`,
        { cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok || !payload?.success)
        throw new Error(payload?.message || "Hospitals could not be loaded.");
      const list = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.data?.hospitals)
        ? payload.data.hospitals
        : [];
      setHospitals(list);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Hospitals could not be loaded."
      );
    } finally {
      setLoadingHospitals(false);
    }
  }, []);

  useEffect(() => {
    void loadHospitals();
  }, [loadHospitals]);

  const loadPatientNotifications = useCallback(async () => {
    if (!token || !linked) { setNotifications([]); return; }
    setLoadingNotifications(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications?limit=8`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.success) {
        const list = Array.isArray(payload.data?.notifications) ? payload.data.notifications : [];
        setNotifications(list);
      }
    } catch { /* notifications are supplemental; don't block portal use */ }
    finally { setLoadingNotifications(false); }
  }, [token, linked]);

  useEffect(() => { void loadPatientNotifications(); }, [loadPatientNotifications]);

  async function markNotificationRead(notificationId: string) {
    if (!token || !notificationId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.ok) setNotifications((current) => current.map((item) => String(item._id) === notificationId ? { ...item, status: 'READ' } : item));
    } catch { /* leave the notification visible if marking it read fails */ }
  }

  async function connectHospital(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLinking(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/patient-portal/auth/link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: account?.email,
            password,
            hospitalId: selectedHospitalId || selectedHospital?.id,
            hospitalCode: selectedHospital?.code || hospitalCode,
            mrn: mrn.trim(),
            dateOfBirth,
          }),
        }
      );
      const payload = await response.json();
      if (
        !response.ok ||
        !payload?.success ||
        !payload?.data?.token ||
        !payload?.data?.patient
      )
        throw new Error(
          payload?.message || "We couldn't connect this account to the hospital."
        );
      const patient = payload.data.patient;
      setAuth(
        {
          id: patient.portalAccountId || patient.id,
          userId: patient.portalAccountId || patient.id,
          hospitalId: patient.hospitalId,
          patientId: patient.id,
          name: patient.name,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          accountType: AccountType.PATIENT_PORTAL,
          userType: "PATIENT",
          mrn: patient.mrn,
        },
        payload.data.token
      );
      setPassword("");
      setShowLinkForm(false);
      setSuccess(
        `Your account is now connected to ${
          payload.data.hospital?.name || selectedHospital?.name || "the hospital"
        }.`
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't connect your account. Check the details and try again."
      );
    } finally {
      setLinking(false);
    }
  }

  const quickLinks = [
    {
      label: "Virtual Care",
      description: "Join consultations and message your care team.",
      href: "/portal/telemedicine",
      icon: Video,
      disabled: !linked,
    },
    {
      label: "Hospital Connection",
      description: "Link or manage your hospital patient record.",
      href: "#hospital-connection",
      icon: Hospital,
      disabled: false,
    },
    {
      label: "Your Privacy",
      description: "We verify your details before attaching any record.",
      href: "#",
      icon: ShieldCheck,
      disabled: false,
    },
  ];

  return (
    <PatientShell>
      <div className="space-y-6">
        {/* ── Hero banner ── */}
        <section className="overflow-hidden rounded-[28px] bg-[#1b7b68] p-6 text-white shadow-lg shadow-[#1b7b68]/10 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                Patient workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome back, {firstName}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                Manage your hospital connection, access virtual care, and track
                your health all in one secure place.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-white/80 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              Secure patient access
            </div>
          </div>
        </section>

        {/* ── Alerts ── */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <div className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0 rounded-lg p-0.5 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss"
              className="shrink-0 rounded-lg p-0.5 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Quick-link cards ── */}
        <section className="grid gap-4 md:grid-cols-3">
          {quickLinks.map((card) => {
            const Icon = card.icon;
            const inner = (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#1b7b68]" />
                </div>
                <h2 className="mt-5 text-sm font-bold text-slate-800">
                  {card.label}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {card.description}
                </p>
              </>
            );

            if (card.disabled)
              return (
                <div
                  key={card.label}
                  className="group cursor-not-allowed rounded-2xl border border-slate-100 bg-white p-5 opacity-50 shadow-sm"
                >
                  {inner}
                </div>
              );

            if (card.href.startsWith("#"))
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() =>
                    setShowLinkForm((v) => !v)
                  }
                  className="group rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1b7b68]/20 hover:shadow-md"
                >
                  {inner}
                </button>
              );

            return (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1b7b68]/20 hover:shadow-md"
              >
                {inner}
              </Link>
            );
          })}
        </section>

        {/* ── Patient notifications ── */}
        {linked && (
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><Bell className="h-5 w-5" /></div><div><h2 className="text-sm font-bold text-slate-800">Care notifications</h2><p className="mt-0.5 text-[10px] text-slate-500">Appointment confirmations and payment receipts.</p></div></div>
              <button type="button" onClick={() => void loadPatientNotifications()} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw className={`mr-1 inline h-3 w-3 ${loadingNotifications ? 'animate-spin' : ''}`} />Refresh</button>
            </div>
            {notifications.length ? <div className="mt-4 space-y-2">{notifications.map((item: any) => <article key={String(item._id)} className={`rounded-xl border p-3 ${item.status === 'UNREAD' ? 'border-[#cde7e1] bg-[#f5fbf9]' : 'border-slate-100 bg-white'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.message}</p><p className="mt-2 text-[10px] text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently'}</p></div>{item.status === 'UNREAD' && <button type="button" onClick={() => void markNotificationRead(String(item._id))} className="shrink-0 rounded-lg border border-[#cde7e1] px-2 py-1.5 text-[9px] font-bold text-[#1b7b68]">Mark read</button>}</div></article>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">{loadingNotifications ? 'Loading notifications…' : 'No notifications yet. Booking confirmations and verified payment receipts will appear here.'}</p>}
          </section>
        )}

        {/* ── Status + connect panel ── */}
        <section
          id="hospital-connection"
          className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
        >
          {/* Left – hospital connection status */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Hospital
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-800">
                  Your hospital connection
                </h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                  linked
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {linked ? "Connected" : "Not connected"}
              </span>
            </div>

            {linked ? (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Your portal is linked to a patient record
                  </p>
                  {account?.mrn && (
                    <p className="mt-1 text-xs text-slate-500">
                      Medical record number:{" "}
                      <span className="font-bold text-slate-700">
                        {account.mrn}
                      </span>
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Use Virtual care to access your appointments and
                    consultations.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/portal/telemedicine")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#1b7b68] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#146253]"
                  >
                    Open virtual care <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-sm text-slate-500">
                  Connect to the hospital where you already have a patient
                  record to access hospital-specific services and virtual care.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkForm((v) => !v);
                    setError("");
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#146253]"
                >
                  {showLinkForm ? "Cancel" : "Connect a hospital"}
                  {!showLinkForm && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Right – getting started / tips */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Getting started
            </p>
            <div className="mt-4 space-y-4 text-xs text-slate-600">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1b7b68]" />
                <span>Your patient portal account is active.</span>
              </div>
              <div className="flex items-start gap-3">
                <Hospital className="mt-0.5 h-4 w-4 shrink-0 text-[#1b7b68]" />
                <span>
                  Connect your hospital account to access your medical records
                  and virtual consultations.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Video className="mt-0.5 h-4 w-4 shrink-0 text-[#1b7b68]" />
                <span>
                  Once connected, use Virtual care to join video or chat
                  consultations with your doctor.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1b7b68]" />
                <span>
                  We verify your MRN and date of birth before linking any
                  record.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Link hospital form ── */}
        {!linked && showLinkForm && (
          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">
                  Link your medical record
                </p>
                <h2 className="mt-1 text-base font-bold text-slate-800">
                  Connect to a hospital
                </h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                  Choose the hospital where you are registered, then enter your
                  MRN and date of birth. We will verify the details before
                  connecting the accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={connectHospital}
              className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
            >
              {/* Hospital selector */}
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Hospital
                </span>
                <span className="relative mt-1.5 block">
                  <select
                    required
                    value={selectedHospitalId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedHospitalId(nextId);
                      const found = hospitals.find((h) => h.id === nextId);
                      setHospitalCode(found?.code || "");
                    }}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 pr-10 text-sm text-slate-700 outline-none focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  >
                    <option value="">
                      {loadingHospitals
                        ? "Loading hospitals…"
                        : hospitals.length
                        ? "Select your hospital"
                        : "No hospitals are currently listed"}
                    </option>
                    {hospitals.map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name}
                        {hospital.code ? ` (${hospital.code})` : ""}
                        {hospital.address ? ` · ${hospital.address}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </span>
                {!loadingHospitals && hospitals.length === 0 && (
                  <button
                    type="button"
                    onClick={() => void loadHospitals()}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#1b7b68]"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh hospital list
                  </button>
                )}
              </label>

              {/* MRN */}
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Medical record number (MRN)
                </span>
                <input
                  required
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                  placeholder="Enter your hospital MRN"
                />
              </label>

              {/* Date of birth */}
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Date of birth
                </span>
                <input
                  required
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                />
              </label>

              {/* Password */}
              <label className="block sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Confirm your portal password
                </span>
                <span className="relative mt-1.5 block">
                  <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#1b7b68] focus:bg-white focus:ring-4 focus:ring-[#1b7b68]/10"
                    placeholder="Confirm it's your account"
                  />
                </span>
              </label>

              {/* Footer */}
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-[10px] leading-5 text-slate-400">
                  We match your hospital, MRN, date of birth, and account
                  details. If they do not match, contact the hospital reception
                  to verify your patient record.
                </p>
                <button
                  disabled={
                    linking || loadingHospitals || hospitals.length === 0
                  }
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#146253] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {linking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Verify and connect
                </button>
              </div>
            </form>
          </section>
        )}

        <p className="px-1 text-[10px] leading-5 text-slate-400">
          Need help? If you cannot find your hospital or your details do not
          match, contact the hospital where you are registered. The hospital
          must have an active MedXVerse account and an existing patient record.
        </p>
      </div>
    </PatientShell>
  );
}
