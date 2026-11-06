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
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <HeartPulse size={20} className="text-[#1b7b68]" /> Fleet Radar &amp; Smart Car HUD
            </h1>
            <p className="text-xs text-slate-500 mt-1">Live telemetry map displaying moving ambulances, emergency incidents, and hospital ED bases.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1 font-bold text-xs border border-slate-200">
              <button
                type="button"
                onClick={() => setDisplayMode('SMART_CAR_HUD')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${displayMode === 'SMART_CAR_HUD' ? 'bg-[#1b7b68] text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Gauge size={14} /> Smart Cockpit HUD
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('AERIAL_MAP')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${displayMode === 'AERIAL_MAP' ? 'bg-[#1b7b68] text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Layers size={14} /> Aerial GIS Map
              </button>
            </div>

            <button
              onClick={seedFleet}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-[#1b7b68] hover:bg-teal-100 disabled:opacity-50"
            >
              <RefreshCw size={13} className={seeding ? 'animate-spin' : ''} />
              Seed Demo Fleet
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{notice}</div>}

        <div className="rounded-2xl border border-teal-100 bg-white shadow-sm overflow-hidden p-2">
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
