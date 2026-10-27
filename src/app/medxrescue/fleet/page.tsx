"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DynamicAerialMap from '@/components/medxrescue/DynamicAerialMap';
import DynamicSmartCarHud from '@/components/medxrescue/DynamicSmartCarHud';
import { medxRescueService, type LiveFleetData } from '@/services/medxrescue.service';
import { Ambulance, ArrowLeft, RefreshCw, Siren, ShieldCheck, HeartPulse, Gauge, Layers } from 'lucide-react';

export default function MedxRescueFleetRadarPage() {
  const [displayMode, setDisplayMode] = useState<'SMART_CAR_HUD' | 'AERIAL_MAP'>('SMART_CAR_HUD');
  const [fleet, setFleet] = useState<LiveFleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadFleet = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await medxRescueService.getLiveFleet();
      setFleet(res.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to fetch live fleet telemetry.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFleet();
    const interval = window.setInterval(() => void loadFleet(true), 8000);
    return () => window.clearInterval(interval);
  }, [loadFleet]);

  const seedFleet = async () => {
    setSeeding(true); setError(''); setNotice('');
    try {
      const res = await medxRescueService.seedDemoFleet();
      setNotice(res.message || 'Demo fleet seeded across Nigeria operating areas!');
      await loadFleet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not seed demo fleet.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5faf9] text-slate-800 font-sans">
      {/* Top Command Bar (Sticky with z-50 stacking above map) */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/medxrescue" className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">
              <ArrowLeft size={15} /> Exit Radar
            </Link>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b7b68] text-white shadow-md">
                <HeartPulse size={22} />
              </span>
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
                  MedXRescue Nexus <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-extrabold text-[#1b7b68] border border-teal-200">SMART CAR TELEMETRY</span>
                </h1>
                <p className="text-xs text-slate-500">Futuristic smart-car cockpit navigation &amp; ambulance movement dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Display Mode Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-1 font-bold text-xs border border-slate-200">
              <button
                type="button"
                onClick={() => setDisplayMode('SMART_CAR_HUD')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${displayMode === 'SMART_CAR_HUD' ? 'bg-[#1b7b68] text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Gauge size={14} /> Smart Car HUD
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('AERIAL_MAP')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${displayMode === 'AERIAL_MAP' ? 'bg-[#1b7b68] text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Layers size={14} /> Satellite Map
              </button>
            </div>

            <button
              onClick={() => void seedFleet()}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              <Ambulance size={15} /> {seeding ? 'Seeding units…' : 'Seed Demo Fleet'}
            </button>

            <button
              onClick={() => void loadFleet()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4">
        {/* Status / Notice Banners */}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">{notice}</div>}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Active Fleet</p>
            <p className="mt-1 text-2xl font-black text-[#1b7b68]">{fleet?.vehicles.length ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Available Ambulances</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">{fleet?.vehicles.filter(v => v.status === 'AVAILABLE').length ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dispatched Missions</p>
            <p className="mt-1 text-2xl font-black text-rose-600">{fleet?.vehicles.filter(v => v.status === 'DISPATCHED' || v.activeIncident).length ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Emergency SOS</p>
            <p className="mt-1 text-2xl font-black text-amber-600">{fleet?.incidents.length ?? '—'}</p>
          </div>
        </div>

        {/* Active Display Component */}
        <div className="relative isolate z-0 overflow-hidden rounded-3xl">
          {displayMode === 'SMART_CAR_HUD' ? (
            <DynamicSmartCarHud
              vehicles={fleet?.vehicles || []}
              incidents={fleet?.incidents || []}
              facilities={fleet?.facilities || []}
              heightClass="h-[720px]"
            />
          ) : (
            <DynamicAerialMap
              vehicles={fleet?.vehicles || []}
              incidents={fleet?.incidents || []}
              facilities={fleet?.facilities || []}
              onRefresh={() => void loadFleet()}
              loading={loading}
              heightClass="h-[720px]"
            />
          )}
        </div>
      </div>
    </main>
  );
}
