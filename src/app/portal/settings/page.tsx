"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BellRing, CheckCircle2, CircleAlert, KeyRound, Loader2, Save, ShieldCheck, Smartphone } from "lucide-react";
import { API_BASE_URL } from "@/services/appointment.service";
import { useAuthStore } from "@/store/useAuthStore";

type Preferences = {
  appointmentUpdates: boolean;
  careTeamMessages: boolean;
  billingUpdates: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
};
const defaults: Preferences = { appointmentUpdates: true, careTeamMessages: true, billingUpdates: true, emailNotifications: true, smsNotifications: false };
const fields: { key: keyof Preferences; title: string; description: string }[] = [
  { key: "appointmentUpdates", title: "Appointment updates", description: "Confirmations, changes and reminders for your appointments." },
  { key: "careTeamMessages", title: "Care team messages", description: "Updates when your care team sends you a message." },
  { key: "billingUpdates", title: "Billing and payment updates", description: "Receipts and payment-related notifications." },
  { key: "emailNotifications", title: "Email notifications", description: "Allow account notifications to be sent to your registered email." },
  { key: "smsNotifications", title: "SMS notifications", description: "Allow supported notifications to be sent by SMS." },
];

export default function PatientSettingsPage() {
  const { token } = useAuthStore();
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/settings`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Unable to load settings.");
      setPreferences({ ...defaults, ...(payload.data?.preferences || {}) });
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load settings."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  async function savePreferences() {
    if (!token) return;
    setSavingPreferences(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/settings`, { method: "PATCH", headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ preferences }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Settings could not be saved.");
      setPreferences({ ...defaults, ...(payload.data?.preferences || preferences) });
      setSuccess("Your notification preferences have been saved to your patient account.");
    } catch (err) { setError(err instanceof Error ? err.message : "Settings could not be saved."); }
    finally { setSavingPreferences(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSavingPassword(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${API_BASE_URL}/patient-portal/auth/change-password`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(passwords) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Password could not be changed.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess("Your password has been changed successfully.");
    } catch (err) { setError(err instanceof Error ? err.message : "Password could not be changed."); }
    finally { setSavingPassword(false); }
  }

  return (
    <div className="mx-auto max-w-full space-y-6">
      <div>
        <Link href="/portal" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1b7b68]"><ArrowLeft className="h-4 w-4" /> Patient dashboard</Link>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Preferences & security</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage patient portal notifications and protect your account.</p>
      </div>
      {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success && <div role="status" className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

      {loading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />Loading settings…</div> : <>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><BellRing className="h-5 w-5" /></div><div><h2 className="text-base font-bold text-slate-900">Notification preferences</h2><p className="mt-1 text-xs leading-5 text-slate-500">These preferences are saved to your patient portal account. Delivery depends on the notification channel being supported by the service.</p></div></div>
          <div className="divide-y divide-slate-100">
            {fields.map((field) => <label key={field.key} className="flex cursor-pointer items-center justify-between gap-4 py-4"><span className="min-w-0"><span className="block text-sm font-semibold text-slate-800">{field.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{field.description}</span></span><input type="checkbox" checked={preferences[field.key]} onChange={(e) => setPreferences((current) => ({ ...current, [field.key]: e.target.checked }))} className="h-5 w-5 shrink-0 accent-[#1b7b68]" /></label>)}
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-5"><button type="button" onClick={() => void savePreferences()} disabled={savingPreferences} className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#146253] disabled:opacity-60">{savingPreferences ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{savingPreferences ? "Saving…" : "Save preferences"}</button></div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><KeyRound className="h-5 w-5" /></div><div><h2 className="text-base font-bold text-slate-900">Change password</h2><p className="mt-1 text-xs leading-5 text-slate-500">Use a strong password that you do not reuse on other websites.</p></div></div>
          <form onSubmit={changePassword} className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-slate-600">Current password<input type="password" required autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords((v) => ({ ...v, currentPassword: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10" /></label>
            <div className="grid gap-4 md:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">New password<input type="password" required minLength={8} autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords((v) => ({ ...v, newPassword: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10" /><span className="mt-1 block text-[10px] font-normal text-slate-400">At least 8 characters with uppercase, lowercase, number and symbol.</span></label><label className="block text-xs font-semibold text-slate-600">Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={passwords.confirmPassword} onChange={(e) => setPasswords((v) => ({ ...v, confirmPassword: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10" /></label></div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-[10px] leading-5 text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-[#1b7b68]" />Your current password is verified before any change is saved.</div>
            <div className="flex justify-end border-t border-slate-100 pt-5"><button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#146253] disabled:opacity-60">{savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{savingPassword ? "Updating…" : "Update password"}</button></div>
          </form>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6"><div className="flex gap-3"><Smartphone className="h-5 w-5 text-[#1b7b68]" /><div><h2 className="text-sm font-bold text-slate-800">Account access</h2><p className="mt-1 text-xs leading-5 text-slate-500">Sign out when using a shared device. Your session is protected by your account token; signing out clears this browser session.</p></div></div></section>
      </>}
    </div>
  );
}
