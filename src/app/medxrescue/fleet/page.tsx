"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DynamicAerialMap from '@/components/medxrescue/DynamicAerialMap';
import { medxRescueService, type LiveFleetData } from '@/services/medxrescue.service';
import { Ambulance, ArrowLeft, RefreshCw, Siren, ShieldCheck, HeartPulse } from 'lucide-react';

export default function MedxRescueFleetRadarPage() {
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
    <main className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Top Command Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/medxrescue" className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white">
              <ArrowLeft size={15} /> Exit Radar
            </Link>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b7b68] text-white shadow-lg shadow-teal-900/40">
                <HeartPulse size={22} />
              </span>
              <div>
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  MedXRescue Nexus <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">LIVE AERIAL RADAR</span>
                </h1>
                <p className="text-xs text-slate-400">Uber-style real-time ambulance satellite radar &amp; emergency coordinate overlay</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void seedFleet()}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
            >
              <Ambulance size={15} /> {seeding ? 'Seeding units…' : 'Seed Demo Fleet'}
            </button>

            <button
              onClick={() => void loadFleet()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4">
        {/* Status / Notice Banners */}
        {error && <div className="rounded-xl border border-rose-800 bg-rose-950/80 p-3.5 text-xs font-semibold text-rose-200">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-800 bg-emerald-950/80 p-3.5 text-xs font-semibold text-emerald-200">{notice}</div>}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Radar Fleet</p>
            <p className="mt-1 text-2xl font-black text-emerald-400">{fleet?.vehicles.length ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Ambulances</p>
            <p className="mt-1 text-2xl font-black text-emerald-400">{fleet?.vehicles.filter(v => v.status === 'AVAILABLE').length ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dispatched Missions</p>
            <p className="mt-1 text-2xl font-black text-rose-400">{fleet?.vehicles.filter(v => v.status === 'DISPATCHED' || v.activeIncident).length ?? '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Emergency SOS</p>
            <p className="mt-1 text-2xl font-black text-amber-400">{fleet?.incidents.length ?? '—'}</p>
          </div>
        </div>

        {/* Satellite Map */}
        <DynamicAerialMap
          vehicles={fleet?.vehicles || []}
          incidents={fleet?.incidents || []}
          facilities={fleet?.facilities || []}
          onRefresh={() => void loadFleet()}
          loading={loading}
          heightClass="h-[720px]"
        />
      </div>
    </main>
  );
}
