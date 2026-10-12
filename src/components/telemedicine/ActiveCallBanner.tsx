'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, PhoneCall, Video, X } from 'lucide-react';
import { ACTIVE_CALL_CHANGED_EVENT, ACTIVE_TELEMEDICINE_CALL_KEY, type ActiveTelemedicineCall } from '@/lib/telemedicine-call-window';

export default function ActiveCallBanner() {
  const router = useRouter();
  const [activeCall, setActiveCall] = useState<ActiveTelemedicineCall | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(ACTIVE_TELEMEDICINE_CALL_KEY);
        setActiveCall(raw ? JSON.parse(raw) as ActiveTelemedicineCall : null);
      } catch { setActiveCall(null); }
    };
    read();
    window.addEventListener(ACTIVE_CALL_CHANGED_EVENT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(ACTIVE_CALL_CHANGED_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, []);
  if (!activeCall) return null;
  const returnToCall = () => router.push(activeCall.href);
  const hangUp = () => window.dispatchEvent(new Event('medxverse:request-hangup'));
  return (
    <div className="fixed inset-x-3 top-[72px] z-[100] mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-[#b9ded3] bg-white/95 p-3 shadow-xl backdrop-blur sm:inset-x-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">{/voice/i.test(activeCall.title) ? <PhoneCall className="h-5 w-5" /> : <Video className="h-5 w-5" />}</span>
      <button type="button" onClick={returnToCall} className="min-w-0 flex-1 text-left"><span className="block text-xs font-bold text-slate-900">Call in progress</span><span className="block truncate text-[11px] text-slate-500">{activeCall.title}</span></button>
      <button type="button" onClick={returnToCall} className="inline-flex items-center gap-1 rounded-xl bg-[#1b7b68] px-3 py-2 text-[11px] font-bold text-white"><ArrowUpRight className="h-4 w-4" /> Return</button>
      <button type="button" onClick={hangUp} aria-label="Hang up call" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"><X className="h-4 w-4" /></button>
    </div>
  );
}
