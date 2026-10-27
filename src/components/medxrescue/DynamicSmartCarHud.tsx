"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SmartCarNavigationHud = dynamic(() => import('./SmartCarNavigationHud'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[680px] w-full flex-col items-center justify-center rounded-3xl border-2 border-slate-800 bg-slate-950 text-slate-400 font-sans">
      <Loader2 size={36} className="animate-spin text-cyan-400" />
      <p className="mt-4 text-base font-black text-white">Initializing Smart Car Navigation HUD…</p>
      <p className="mt-1 text-xs text-slate-400">Loading Cockpit Dashboard, Speedometer, and Telemetry Engine</p>
    </div>
  ),
});

export default SmartCarNavigationHud;
