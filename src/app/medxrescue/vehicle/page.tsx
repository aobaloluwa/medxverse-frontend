"use client";

import { useCallback, useEffect, useState } from 'react';
import AmbulanceShell from '@/components/medxrescue/AmbulanceShell';
import { medxRescueService, type RescueVehicle } from '@/services/medxrescue.service';
import { Ambulance, CheckCircle2, Crosshair, ShieldCheck, RefreshCw, AlertCircle, Wrench, Activity } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const label = (value?: string) => (value || 'UNKNOWN').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function RescueVehiclePage() {
  const account = useAuthStore((state) => state.account);
  const [vehicle, setVehicle] = useState<RescueVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meRes = await fetch('/api/medxrescue/auth/me', {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
      }).catch(() => null);
      if (meRes && meRes.ok) {
        const payload = await meRes.json();
        if (payload?.data?.vehicle) {
          setVehicle(payload.data.vehicle);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  const updateGps = () => {
    if (!navigator.geolocation) {
      setError('Browser geolocation is unavailable on this device.');
      return;
    }
    setGpsBusy(true);
    setError('');
    setNotice('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          if (vehicle?._id && (vehicle as any).providerId) {
            await medxRescueService.updateVehicleLocation(vehicle._id, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracyMeters: pos.coords.accuracy,
            }, (vehicle as any).providerId);
            setNotice(`Live GPS coordinates updated successfully! (±${Math.round(pos.coords.accuracy)}m accuracy)`);
            void loadVehicle();
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not update vehicle GPS location.');
        } finally {
          setGpsBusy(false);
        }
      },
      (err) => {
        setGpsBusy(false);
        setError('GPS permission denied or location unavailable.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const toggleStatus = async (status: 'AVAILABLE' | 'OFFLINE' | 'BUSY') => {
    if (!vehicle?._id || !(vehicle as any).providerId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await medxRescueService.setVehicleOperationalStatus(vehicle._id, status, (vehicle as any).providerId);
      setNotice(`Ambulance status updated to ${label(status)}.`);
      void loadVehicle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update vehicle operational status.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AmbulanceShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1b7b68]">
              <Ambulance size={15} /> Vehicle Readiness &amp; Equipment
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Ambulance Operational Status</h1>
            <p className="mt-1 text-xs text-slate-500">Manage vehicle readiness, update live GPS location fixes, and inspect onboard medical equipment.</p>
          </div>

          <button
            onClick={() => void loadVehicle()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Status
          </button>
        </div>

        {error && (
          <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status & GPS Card */}
          <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Activity size={16} className="text-[#1b7b68]" /> Vehicle Operational State
              </h2>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-[#1b7b68]">
                {label(vehicle?.status || 'AVAILABLE')}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500">Assigned Vehicle Registration</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{vehicle?.registrationNumber || 'AMB-911-RES'}</p>
              <p className="text-xs text-slate-600 mt-0.5">{vehicle?.makeModel || 'Mercedes Sprinter ALS'}</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500 mb-2">Set Operational Availability</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => void toggleStatus('AVAILABLE')}
                  disabled={busy}
                  className="rounded-xl bg-teal-50 border border-teal-200 py-2.5 text-xs font-bold text-[#1b7b68] hover:bg-teal-100 disabled:opacity-50"
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => void toggleStatus('BUSY')}
                  disabled={busy}
                  className="rounded-xl bg-amber-50 border border-amber-200 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  Busy
                </button>
                <button
                  type="button"
                  onClick={() => void toggleStatus('OFFLINE')}
                  disabled={busy}
                  className="rounded-xl bg-slate-50 border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Offline
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={updateGps}
                disabled={gpsBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#156354] disabled:opacity-50"
              >
                <Crosshair size={16} className={gpsBusy ? 'animate-spin' : ''} />
                {gpsBusy ? 'Capturing High-Accuracy GPS...' : 'Update Device GPS Location Now'}
              </button>
            </div>
          </section>

          {/* Equipment & Qualifications */}
          <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Wrench size={16} className="text-[#1b7b68]" />
              <h2 className="text-sm font-extrabold text-slate-900">Onboard Medical Equipment</h2>
            </div>

            <div className="space-y-2">
              {(vehicle?.equipment || ['Automated External Defibrillator (AED)', 'Portable Mechanical Ventilator', 'Oxygen Cylinder & Regulator', 'ECG Monitor', 'Emergency Trauma Kit']).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-[#f7fcfb] p-2.5 rounded-xl border border-teal-50">
                  <CheckCircle2 size={15} className="text-[#1b7b68] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500 mb-2">Crew Qualifications &amp; Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {(vehicle?.crewQualifications || ['Paramedic', 'Emergency Medical Technician', 'ACLS Certified']).map((qual, idx) => (
                  <span key={idx} className="rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 text-[11px] font-bold text-[#1b7b68]">
                    {qual}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AmbulanceShell>
  );
}
