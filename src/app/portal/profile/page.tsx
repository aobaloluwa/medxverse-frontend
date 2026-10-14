"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, CircleAlert, Loader2, Mail, MapPin,
  Phone, Save, ShieldCheck,
} from "lucide-react";
import { API_BASE_URL } from "@/services/appointment.service";
import { useAuthStore } from "@/store/useAuthStore";

type PatientProfile = {
  id: string; firstName: string; lastName: string; name: string; email: string;
  phone: string; address: string; dateOfBirth?: string | null; gender?: string;
  mrn?: string; universalPatientId?: string; maritalStatus?: string; occupation?: string;
  nextOfKin?: string;
};

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10 disabled:bg-slate-50";

export default function PatientProfilePage() {
  const { token, account, setAuth } = useAuthStore();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState({ email: "", phone: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/profile`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload?.data) throw new Error(payload?.message || "Unable to load your profile.");
      const data = payload.data as PatientProfile;
      setProfile(data);
      setForm({ email: data.email || "", phone: data.phone || "", address: data.address || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your profile.");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload?.data) throw new Error(payload?.message || "Your profile could not be saved.");
      const data = payload.data as PatientProfile;
      setProfile(data);
      setForm({ email: data.email || "", phone: data.phone || "", address: data.address || "" });
      if (account) setAuth({ ...account, name: data.name, firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, address: data.address, mrn: data.mrn }, token);
      setSuccess("Your profile has been saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your profile could not be saved.");
    } finally { setSaving(false); }
  }

  const initials = `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase() || "PT";
  const dateOfBirth = profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "Not provided";

  return (
    <div className="mx-auto max-w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/portal" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1b7b68]"><ArrowLeft className="h-4 w-4" /> Patient dashboard</Link>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Account</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">My profile</h1>
          <p className="mt-2 text-sm text-slate-500">Keep your contact details current so your care team can reach you.</p>
        </div>
        <Link href="/portal/settings" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-[#1b7b68]/30 hover:text-[#1b7b68]"><ShieldCheck className="h-4 w-4" /> Account settings</Link>
      </div>

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success && <div role="status" className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

      {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />Loading your profile…</div> : profile && <>
        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-[#e8f5f3] via-white to-white p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#1b7b68] text-2xl font-bold text-white shadow-lg shadow-[#1b7b68]/20">{initials}</div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-slate-900">{profile.name || "Patient"}</h2>
                <p className="mt-1 text-sm text-slate-500">{profile.email || "No email provided"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.mrn && <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600">MRN: {profile.mrn}</span>}
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">Verified patient record</span>
                </div>
              </div>
            </div>
          </div>
          <form onSubmit={save} className="space-y-6 border-t border-slate-100 p-5 sm:p-8">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Contact information</h3>
              <p className="mt-1 text-xs text-slate-500">Changes are saved to your patient record and portal account.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">Email address<div className="relative"><Mail className="absolute left-3 top-4 h-4 w-4 text-slate-400" /><input className={`${inputClass} pl-10`} type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} /></div></label>
              <label className="text-xs font-semibold text-slate-600">Phone number<div className="relative"><Phone className="absolute left-3 top-4 h-4 w-4 text-slate-400" /><input className={`${inputClass} pl-10`} type="tel" required autoComplete="tel" value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} /></div></label>
              <label className="text-xs font-semibold text-slate-600 md:col-span-2">Home address<div className="relative"><MapPin className="absolute left-3 top-4 h-4 w-4 text-slate-400" /><textarea className={`${inputClass} min-h-24 resize-y pl-10`} rows={3} maxLength={300} value={form.address} onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))} placeholder="Enter your current address" /></div></label>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#1b7b68]" /><h3 className="text-xs font-bold text-slate-800">Medical identity details</h3></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date of birth</p><p className="mt-1 text-sm font-semibold text-slate-700">{dateOfBirth}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Gender</p><p className="mt-1 text-sm font-semibold capitalize text-slate-700">{profile.gender || "Not provided"}</p></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Patient ID</p><p className="mt-1 break-all text-sm font-semibold text-slate-700">{profile.universalPatientId || profile.mrn || "Not available"}</p></div>
              </div>
              <p className="mt-3 text-[10px] leading-5 text-slate-400">For safety, date of birth, gender and medical identifiers are managed by your hospital. Contact the hospital if any of these details are incorrect.</p>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setForm({ email: profile.email || "", phone: profile.phone || "", address: profile.address || "" })} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">Discard changes</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#146253] disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving…" : "Save profile"}</button>
            </div>
          </form>
        </section>
      </>}
    </div>
  );
}
