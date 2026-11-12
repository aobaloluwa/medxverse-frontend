'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Hospital,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  Siren,
  Clock,
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { AccountPayload } from '@/types/auth.types';
import { useAuthStore } from '@/store/useAuthStore';
import { apiClient } from '@/lib/api-client';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyForm: ProfileForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
};

const emptyPasswordForm: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'HM';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function HmsSettingsPage() {
  const { account, token, setAuth } = useAuthStore();
  const [profile, setProfile] = useState<AccountPayload | null>(account);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [passwords, setPasswords] = useState<PasswordForm>(emptyPasswordForm);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');

  // Emergency availability settings state
  const [emergencyAvailability, setEmergencyAvailability] = useState({
    availableForEmergency: true,
    availabilityMode: '24_7',
    customStartTime: '08:00',
    customEndTime: '08:00',
    resusBaysAvailable: 5,
    edBedsAvailable: 15,
    diversionStatus: false,
  });
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [facilityId, setFacilityId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfileAndFacility = async () => {
      try {
        const response = await authService.getProfile();
        const nextProfile = response.data;

        if (cancelled || !nextProfile) return;

        setProfile(nextProfile);
        setForm({
          name: nextProfile.name || '',
          email: nextProfile.email || '',
          phone: nextProfile.phone || '',
          address: nextProfile.address || '',
        });

        if (token) {
          setAuth(nextProfile, token);
        }

        // Load MedXRescue facility data for this hospital
        const facRes = await apiClient.get<any, any>('/medxrescue/facilities');
        const facilities = facRes?.data || [];
        if (!cancelled && facilities.length > 0) {
          const f = facilities[0];
          setFacilityId(f._id);
          setEmergencyAvailability({
            availableForEmergency: f.availableForEmergency !== false,
            availabilityMode: f.availabilityMode || '24_7',
            customStartTime: f.customStartTime || '08:00',
            customEndTime: f.customEndTime || '08:00',
            resusBaysAvailable: f.liveCapacity?.resusBaysAvailable ?? 5,
            edBedsAvailable: f.liveCapacity?.edBedsAvailable ?? 15,
            diversionStatus: f.liveCapacity?.diversionStatus ?? false,
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getErrorMessage(requestError, 'Unable to load account profile.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfileAndFacility();

    return () => {
      cancelled = true;
    };
  }, [setAuth, token]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setProfileMessage('');
    setError('');
  };

  const updatePassword = (field: keyof PasswordForm, value: string) => {
    setPasswords((current) => ({ ...current, [field]: value }));
    setPasswordMessage('');
    setError('');
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setError('');

    try {
      const response = await authService.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      const nextProfile = response.data;

      if (!nextProfile) {
        throw new Error('The account profile could not be updated.');
      }

      setProfile(nextProfile);
      setForm({
        name: nextProfile.name || '',
        email: nextProfile.email || '',
        phone: nextProfile.phone || '',
        address: nextProfile.address || '',
      });

      if (token) {
        setAuth(nextProfile, token);
      }

      setProfileMessage('Profile saved successfully.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to save your profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordMessage('');
    setError('');

    try {
      await authService.changePassword(passwords);
      setPasswords(emptyPasswordForm);
      setPasswordMessage('Password changed successfully.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to change your password.'));
    } finally {
      setChangingPassword(false);
    }
  };

  const saveEmergencyAvailability = async (event: FormEvent) => {
    event.preventDefault();
    setSavingAvailability(true);
    setAvailabilityMessage('');
    setError('');
    try {
      let targetFacilityId = facilityId;
      if (!targetFacilityId) {
        const facRes = await apiClient.get<any, any>('/medxrescue/facilities');
        const facilities = facRes?.data || [];
        if (facilities.length > 0) {
          targetFacilityId = facilities[0]._id;
          setFacilityId(targetFacilityId);
        }
      }

      if (!targetFacilityId) {
        throw new Error('No registered MedXRescue facility found for this hospital account. Please register your hospital facility first.');
      }

      await apiClient.patch(`/medxrescue/facilities/${targetFacilityId}/availability`, {
        availableForEmergency: emergencyAvailability.availableForEmergency,
        availabilityMode: emergencyAvailability.availabilityMode,
        customStartTime: emergencyAvailability.customStartTime,
        customEndTime: emergencyAvailability.customEndTime,
        liveCapacity: {
          resusBaysAvailable: Number(emergencyAvailability.resusBaysAvailable),
          edBedsAvailable: Number(emergencyAvailability.edBedsAvailable),
          diversionStatus: emergencyAvailability.diversionStatus,
        }
      });
      setAvailabilityMessage('Hospital emergency availability & shift schedule updated successfully!');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update emergency availability.'));
    } finally {
      setSavingAvailability(false);
    }
  };

  const currentProfile = profile || account;
  const accountStatus = currentProfile?.isActive === false ? 'INACTIVE' : 'ACTIVE';
  const accountType = currentProfile?.accountType || 'HOSPITAL';

  if (loading && !currentProfile) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#1b7b68]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans antialiased">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">Account &amp; Emergency Settings</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Hospital Profile &amp; SOS Availability</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              Manage your hospital account profile, security, and Uber-style emergency rescue availability, shift schedules, and live bed capacity.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-sm font-bold text-[#1b7b68] shadow-sm">
            {getInitials(currentProfile?.name || 'Hospital')}
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700">
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Emergency Availability & Shift Settings Card */}
      <form onSubmit={saveEmergencyAvailability} className="rounded-3xl border-2 border-teal-500/30 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-[#1b7b68]">
            <Siren className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">MedXRescue Emergency Availability &amp; Shift Schedule</h2>
            <p className="text-xs text-slate-500">Configure whether your hospital accepts automated Uber-style guest emergency matching and active hours.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <span className="text-xs font-black text-slate-700">Emergency SOS Matching</span>
            <p className="text-[11px] text-slate-500">Allow guests to match with your hospital for emergency dispatches.</p>
            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyAvailability.availableForEmergency}
                onChange={e => setEmergencyAvailability(prev => ({ ...prev, availableForEmergency: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#1b7b68] focus:ring-[#1b7b68]"
              />
              <span className="text-xs font-extrabold text-slate-800">
                {emergencyAvailability.availableForEmergency ? '🟢 Hospital is Available' : '🔴 Hospital is Offline'}
              </span>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <span className="text-xs font-black text-slate-700">Availability Mode</span>
            <p className="text-[11px] text-slate-500">Choose 24/7 or custom active shift hours.</p>
            <select
              value={emergencyAvailability.availabilityMode}
              onChange={e => setEmergencyAvailability(prev => ({ ...prev, availabilityMode: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#1b7b68]"
            >
              <option value="24_7">24 Hours / 7 Days (Always Active)</option>
              <option value="CUSTOM">Custom Shift Hours</option>
            </select>
          </div>

          {emergencyAvailability.availabilityMode === 'CUSTOM' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-black text-slate-700">Active Shift Hours</span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="block text-[10px] font-bold text-slate-600">
                  Start Time
                  <input
                    type="time"
                    value={emergencyAvailability.customStartTime}
                    onChange={e => setEmergencyAvailability(prev => ({ ...prev, customStartTime: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"
                  />
                </label>
                <label className="block text-[10px] font-bold text-slate-600">
                  End Time
                  <input
                    type="time"
                    value={emergencyAvailability.customEndTime}
                    onChange={e => setEmergencyAvailability(prev => ({ ...prev, customEndTime: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <span className="text-xs font-black text-slate-700">Active Shift Hours</span>
              <p className="text-xs font-extrabold text-[#1b7b68] mt-2">Active 24 Hours Daily (08:00 - 08:00 Standard Shift)</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <span className="text-xs font-black text-slate-700">Resus Bays Available</span>
            <input
              type="number"
              min="0"
              max="50"
              value={emergencyAvailability.resusBaysAvailable}
              onChange={e => setEmergencyAvailability(prev => ({ ...prev, resusBaysAvailable: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <span className="text-xs font-black text-slate-700">ED Beds Available</span>
            <input
              type="number"
              min="0"
              max="200"
              value={emergencyAvailability.edBedsAvailable}
              onChange={e => setEmergencyAvailability(prev => ({ ...prev, edBedsAvailable: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
            <span className="text-xs font-black text-slate-700">Diversion Status</span>
            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyAvailability.diversionStatus}
                onChange={e => setEmergencyAvailability(prev => ({ ...prev, diversionStatus: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-extrabold text-slate-800">
                {emergencyAvailability.diversionStatus ? '🚨 Diversion Active (Do Not Match)' : '🟢 Normal Operations'}
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          {availabilityMessage ? (
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {availabilityMessage}
            </p>
          ) : (
            <span className="text-[11px] text-slate-400">Changes apply instantly to the smart guest matching algorithm.</span>
          )}

          <button
            type="submit"
            disabled={savingAvailability}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-2.5 text-xs font-black text-white hover:bg-[#166657] shadow transition disabled:opacity-60"
          >
            {savingAvailability ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Emergency Availability
          </button>
        </div>
      </form>

      {/* Profile & Password Section */}
      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Account information</h2>
            <p className="text-xs text-slate-400">Update the hospital contact details your account allows you to maintain.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hospital name</span>
            <input value={form.name} onChange={(event) => updateField('name', event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</span>
            <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Phone</span>
            <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Address</span>
            <textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10" />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {profileMessage && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 sm:mr-auto">
              <CheckCircle2 className="h-4 w-4" />
              {profileMessage}
            </p>
          )}
          <button type="submit" disabled={savingProfile} className="flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#166653] disabled:cursor-not-allowed disabled:opacity-60">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
        </div>
      </form>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Change password</h2>
              <p className="text-xs text-slate-400">Use at least 8 characters with upper/lowercase, a number and a special character.</p>
            </div>
          </div>

          <form onSubmit={changePassword} className="mt-6 space-y-4">
            {[
              ['currentPassword', 'Current password', showCurrent, setShowCurrent],
              ['newPassword', 'New password', showNew, setShowNew],
              ['confirmPassword', 'Confirm new password', showConfirm, setShowConfirm],
            ].map(([field, label, visible, setVisible]) => (
              <label key={field as string} className="block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label as string}</span>
                <div className="relative mt-1.5">
                  <input
                    type={visible ? 'text' : 'password'}
                    value={passwords[field as keyof PasswordForm]}
                    onChange={(event) => updatePassword(field as keyof PasswordForm, event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-xs text-slate-700 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10"
                  />
                  <button
                    type="button"
                    onClick={() => (setVisible as (value: boolean) => void)(!visible)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    aria-label={`Show ${label as string}`}
                  >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            ))}

            {passwordMessage && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {passwordMessage}
              </p>
            )}

            <button type="submit" disabled={changingPassword} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1b7b68]/20 bg-[#e8f5f3] px-4 py-2.5 text-xs font-bold text-[#1b7b68] transition hover:bg-[#dcefeb] disabled:cursor-not-allowed disabled:opacity-60">
              {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              Change password
            </button>
          </form>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                <Hospital className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Your hospital</h2>
                <p className="text-xs text-slate-400">This is the hospital account that owns your HMS access.</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-800">{currentProfile?.name || 'Hospital'}</p>
              {currentProfile?.code && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#1b7b68]">Hospital code: {currentProfile.code}</p>}
              <div className="mt-4 grid gap-2 text-xs text-slate-500">
                {currentProfile?.phone && <p>{currentProfile.phone}</p>}
                {currentProfile?.email && <p className="break-all">{currentProfile.email}</p>}
                {currentProfile?.address && <p>{currentProfile.address}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Work identity</h2>
                <p className="text-xs text-slate-400">System-managed account information.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Email</p>
                <p className="mt-1 break-all text-xs font-semibold text-slate-700">{currentProfile?.email || 'Not available'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Account type</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">{accountType}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Hospital code</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">{currentProfile?.code || 'Not assigned'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[9px] uppercase tracking-wider text-slate-400">Account status</p>
                <p className={`mt-1 text-xs font-semibold ${accountStatus === 'ACTIVE' ? 'text-emerald-700' : 'text-rose-600'}`}>{accountStatus}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-xs text-emerald-800">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">Hospital-scoped access</p>
          <p className="mt-1 leading-5">Your profile and password are checked against your authenticated hospital account. Hospital code, account type, and account status remain controlled by the system.</p>
        </div>
      </div>
    </div>
  );
}
