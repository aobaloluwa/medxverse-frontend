'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, PhoneCall, Video, X } from 'lucide-react';
import JitsiMeetingEmbed from '@/components/telemedicine/JitsiMeetingEmbed';
import {
  ACTIVE_CALL_CHANGED_EVENT,
  ACTIVE_TELEMEDICINE_CALL_KEY,
  HANG_UP_ACTIVE_CALL_EVENT,
  type ActiveTelemedicineCall,
} from '@/lib/telemedicine-call-window';
import { telemedicineService, type TelemedicineSession } from '@/services/telemedicine.service';
import { useAuthStore } from '@/store/useAuthStore';

function readActiveCall(): ActiveTelemedicineCall | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_TELEMEDICINE_CALL_KEY);
    return raw ? JSON.parse(raw) as ActiveTelemedicineCall : null;
  } catch {
    return null;
  }
}

export default function PersistentTelemedicineCall() {
  const pathname = usePathname();
  const router = useRouter();
  const account = useAuthStore((state) => state.account);
  const [activeCall, setActiveCall] = useState<ActiveTelemedicineCall | null>(null);
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [error, setError] = useState('');
  const [miniPosition, setMiniPosition] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const miniPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isCallRoute = /\/(staff|portal)\/call\/[^/]+/.test(pathname || '');

  const syncActiveCall = useCallback(() => {
    const next = readActiveCall();
    setActiveCall((current) => current?.sessionId === next?.sessionId && current?.href === next?.href ? current : next);
  }, []);

  useEffect(() => {
    syncActiveCall();
    window.addEventListener(ACTIVE_CALL_CHANGED_EVENT, syncActiveCall);
    window.addEventListener('storage', syncActiveCall);
    return () => {
      window.removeEventListener(ACTIVE_CALL_CHANGED_EVENT, syncActiveCall);
      window.removeEventListener('storage', syncActiveCall);
    };
  }, [syncActiveCall]);

  // Restore the floating call panel position, keeping it inside the visible screen.
  useEffect(() => {
    const restorePosition = () => {
      try {
        const raw = window.localStorage.getItem('medxverse.activeCallMiniPosition');
        const saved = raw ? JSON.parse(raw) as { x?: number; y?: number } : null;
        const width = Math.min(390, window.innerWidth - 24);
        const maxX = Math.max(12, window.innerWidth - width - 12);
        const maxY = Math.max(12, window.innerHeight - (window.innerWidth < 640 ? 285 : 350));
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
          setMiniPosition({ x: Math.max(12, Math.min(saved.x, maxX)), y: Math.max(12, Math.min(saved.y, maxY)) });
        } else {
          setMiniPosition({ x: maxX, y: maxY });
        }
      } catch {
        setMiniPosition({ x: Math.max(12, window.innerWidth - 402), y: Math.max(12, window.innerHeight - 120) });
      }
    };
    restorePosition();
    window.addEventListener('resize', restorePosition);
    return () => window.removeEventListener('resize', restorePosition);
  }, []);

  const onMiniPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    if (!miniPosition) return;
    miniPositionRef.current = miniPosition;
    dragState.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: miniPosition.x, originY: miniPosition.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onMiniPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const width = Math.min(390, window.innerWidth - 24);
    const next = {
      x: Math.max(12, Math.min(drag.originX + event.clientX - drag.startX, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(drag.originY + event.clientY - drag.startY, window.innerHeight - (window.innerWidth < 640 ? 285 : 350))),
    };
    miniPositionRef.current = next;
    setMiniPosition(next);
  };
  const onMiniPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) return;
    dragState.current = null;
    const position = miniPositionRef.current || miniPosition;
    if (position) { try { window.localStorage.setItem('medxverse.activeCallMiniPosition', JSON.stringify(position)); } catch { /* Position persistence is optional. */ } }
  };

  // Support opening a call URL directly, not only through a Join button.
  useEffect(() => {
    const match = pathname?.match(/^\/(staff|portal)\/call\/([^/]+)/);
    if (!match) return;
    const sessionId = decodeURIComponent(match[2]);
    const existing = readActiveCall();
    if (existing?.sessionId === sessionId) {
      setActiveCall((current) => current?.sessionId === existing.sessionId && current?.href === existing.href ? current : existing);
      return;
    }
    const directCall: ActiveTelemedicineCall = {
      sessionId,
      href: pathname || `/${match[1]}/call/${match[2]}`,
      title: 'Video consultation',
      startedAt: new Date().toISOString(),
    };
    try { window.localStorage.setItem(ACTIVE_TELEMEDICINE_CALL_KEY, JSON.stringify(directCall)); } catch { /* Continue in-memory. */ }
    setActiveCall(directCall);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    if (!activeCall?.sessionId) {
      setSession(null);
      setError('');
      return;
    }
    setSession(null);
    setError('');
    void telemedicineService.getSessions().then((result) => {
      if (cancelled) return;
      const found = (result.sessions || []).find((item) => item._id === activeCall.sessionId) || null;
      if (!found) throw new Error('This consultation could not be found or you do not have access to it.');
      setSession(found);
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load the active consultation.');
    });
    return () => { cancelled = true; };
  }, [activeCall?.sessionId]);

  const clearCall = useCallback(() => {
    try { window.localStorage.removeItem(ACTIVE_TELEMEDICINE_CALL_KEY); } catch { /* Ignore storage errors. */ }
    setActiveCall(null);
    setSession(null);
    const isPatient = account?.userType === 'PATIENT';
    router.push(isPatient ? '/portal/telemedicine' : '/staff/messages/consultations');
  }, [account?.userType, router]);

  const displayName = useMemo(() => {
    if (account?.name) return account.name;
    return account?.userType === 'PATIENT' ? 'Patient' : 'MedXVerse staff member';
  }, [account?.name, account?.userType]);

  useEffect(() => {
    if (!activeCall) return;
    const onHangUp = () => window.dispatchEvent(new Event(HANG_UP_ACTIVE_CALL_EVENT));
    // The visible mini-call's hang-up action triggers the same in-call hang-up
    // control as the full interface, rather than merely hiding the call.
    window.addEventListener('medxverse:request-hangup', onHangUp);
    return () => window.removeEventListener('medxverse:request-hangup', onHangUp);
  }, [activeCall]);

  if (!activeCall) return null;

  const returnToCall = () => router.push(activeCall.href);
  const hangUp = () => window.dispatchEvent(new Event('medxverse:request-hangup'));
  const isPatient = account?.userType === 'PATIENT';
  const callAvailable = Boolean(session && session.consultationType !== 'CHAT' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(session.status) && (session.status === 'IN_PROGRESS' || new Date(session.scheduledStartTime).getTime() <= Date.now()));

  return (
    <div className={isCallRoute ? 'fixed inset-0 z-[200] overflow-y-auto bg-white/10 p-3 backdrop-blur-sm sm:p-6' : 'pointer-events-none fixed inset-0 z-[200]'}>
      <div
        onPointerDown={!isCallRoute ? onMiniPointerDown : undefined}
        onPointerMove={!isCallRoute ? onMiniPointerMove : undefined}
        onPointerUp={!isCallRoute ? onMiniPointerUp : undefined}
        onPointerCancel={!isCallRoute ? onMiniPointerUp : undefined}
        style={!isCallRoute && miniPosition ? { left: miniPosition.x, top: miniPosition.y, width: 'min(390px, calc(100vw - 24px))' } : undefined}
        className={isCallRoute ? 'pointer-events-auto mx-auto w-full max-w-6xl pt-2' : 'pointer-events-auto fixed overflow-hidden rounded-2xl border border-[#b9ded3]/70 bg-white/45 shadow-2xl backdrop-blur-md'}
      >
        {isCallRoute ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#cde7e1] bg-white/80 px-4 py-3 text-[#174f45] shadow-sm backdrop-blur-xl">
            <div className="min-w-0"><p className="text-sm font-bold">MedXVerse active call</p><p className="mt-0.5 truncate text-xs text-slate-600">Navigate to any portal page; your call stays connected.</p></div>
            <button type="button" onClick={() => router.push(isPatient ? '/portal/telemedicine' : '/staff/messages/consultations')} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#b9ded3] px-3 py-2 text-xs font-semibold text-[#1b7b68] hover:bg-[#eaf6f2]"><ArrowUpRight className="h-4 w-4" /> Minimize call</button>
          </div>
        ) : (
          <div className="flex cursor-move touch-none items-center gap-3 bg-white/65 px-4 py-3.5 backdrop-blur-md" title="Drag to move this call panel">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1b7b68]">{/voice/i.test(activeCall.title) ? <PhoneCall className="h-4 w-4" /> : <Video className="h-4 w-4" />}</span>
            <button type="button" onClick={returnToCall} className="min-w-0 flex-1 text-left"><span className="block text-xs font-bold text-[#174f45]">Call in progress</span><span className="mt-0.5 block truncate text-[10px] text-slate-600">{activeCall.title} · Tap to return</span></button>
            <button type="button" onClick={returnToCall} aria-label="Return to call interface" title="Return to call" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1b7b68] text-white hover:bg-[#176c5c]"><ArrowUpRight className="h-4 w-4" /></button>
            <button type="button" onClick={hangUp} aria-label="Hang up active call" title="Hang up" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"><X className="h-4 w-4" /></button>
          </div>
        )}
        <div className={isCallRoute ? 'w-full' : 'max-h-[370px] overflow-hidden'}>
          {error ? <div role="alert" className="rounded-2xl bg-white p-6 text-sm text-rose-700">{error}</div> : callAvailable && session ? <JitsiMeetingEmbed key={activeCall.sessionId} sessionId={session._id} displayName={displayName} voiceOnly={session.consultationType === 'VOICE'} compact={!isCallRoute} recordCallSummary={!isPatient} onJoined={() => { if (!isPatient && session.status === 'WAITING_ROOM') void telemedicineService.updateStatus(session._id, 'IN_PROGRESS').then(setSession).catch(() => undefined); }} onClose={clearCall} /> : <div className="rounded-2xl bg-white/90 p-6 text-sm text-slate-600 backdrop-blur-xl">{session ? 'This consultation is no longer available to join.' : 'Loading your secure consultation…'}</div>}
        </div>
      </div>
    </div>
  );
}
