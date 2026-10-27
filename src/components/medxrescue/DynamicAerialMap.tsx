"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const AerialLiveMap = dynamic(() => import('./AerialLiveMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full flex-col items-center justify-center rounded-3xl border border-slate-700 bg-slate-950 text-slate-400">
      <Loader2 size={32} className="animate-spin text-[#1b7b68]" />
      <p className="mt-3 text-sm font-bold text-slate-300">Initializing Aerial Satellite Radar…</p>
      <p className="mt-1 text-xs text-slate-500">Loading Leaflet &amp; Esri World Imagery map layers</p>
    </div>
  ),
});

export default AerialLiveMap;
