"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DynamicAerialMap from '@/components/medxrescue/DynamicAerialMap';
import DynamicSmartCarHud from '@/components/medxrescue/DynamicSmartCarHud';
import AmbulanceShell from '@/components/medxrescue/AmbulanceShell';
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
      setNotice(res.message || 'Demo fleet seeded across operating areas!');
      await loadFleet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not seed demo fleet.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AmbulanceShell>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50 px-3 py-1 text-xs font-semibold text-[#1b7b68]">
              <HeartPulse size={14} /> Fleet Radar &amp; Smart Cockpit HUD
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Live Fleet Telemetry &amp; GIS Map
            </h1>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Real-time smart car cockpit HUD and aerial GIS map tracking moving ambulances, active incidents, and hospital emergency bases.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-semibold border border-slate-200">
              <button
                type="button"
                onClick={() => setDisplayMode('SMART_CAR_HUD')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${displayMode === 'SMART_CAR_HUD' ? 'bg-[#1b7b68] text-white font-bold shadow-md shadow-[#1b7b68]/20' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Gauge size={14} /> Cockpit HUD
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('AERIAL_MAP')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition-all ${displayMode === 'AERIAL_MAP' ? 'bg-[#1b7b68] text-white font-bold shadow-md shadow-[#1b7b68]/20' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Layers size={14} /> GIS Map
              </button>
            </div>

            <button
              onClick={seedFleet}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-teal-200 bg-teal-50/80 px-4 py-2.5 text-xs font-semibold text-[#1b7b68] hover:bg-teal-100/70 disabled:opacity-50"
            >
              <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
              Seed Fleet
            </button>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-200/60 bg-rose-50 p-4 text-xs font-semibold text-rose-700">{error}</div>}
        {notice && <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">{notice}</div>}

        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden p-2">
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
    </AmbulanceShell>
  );
}
