'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, Loader2, Video, Siren } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { telemedicineService, type TelemedicineSession } from '@/services/telemedicine.service';
import { openTelemedicineCall } from '@/lib/telemedicine-call-window';

function personName(person: TelemedicineSession['patientId'] | TelemedicineSession['doctorId']): string {
  if (typeof person === 'string') return 'Consultation participant';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Consultation participant';
}

export default function StaffCallPage() {
  const params = useParams<{ sessionId: string }>();
  const account = useAuthStore((state) => state.account);
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('');

    const isEmergency = sessionId.toLowerCase().startsWith('emergency-');
    const callTitle = isEmergency ? '🚨 Emergency SOS Voice Call' : 'Virtual Care Call';
    openTelemedicineCall(sessionId, `/staff/call/${encodeURIComponent(sessionId)}`, callTitle);

    try {
      if (isEmergency) {
        setSession({
          _id: sessionId,
          patientId: 'Emergency Patient',
          doctorId: account?.name || 'Hospital Dispatcher',
          consultationType: 'VOICE',
          status: 'IN_PROGRESS',
          scheduledStartTime: new Date().toISOString(),
          meetingRoomId: `medxverse-${sessionId}`,
        } as any);
        return;
      }

      const result = await telemedicineService.getSessions();
      const found = (result.sessions || []).find((item) => item._id === sessionId) || null;
      if (found) {
        setSession(found);
      } else {
        setSession({
          _id: sessionId,
          patientId: 'Patient',
          doctorId: account?.name || 'MedXVerse Staff',
          consultationType: 'VIDEO',
          status: 'IN_PROGRESS',
          scheduledStartTime: new Date().toISOString(),
          meetingRoomId: `medxverse-${sessionId}`,
        } as any);
      }
    } catch {
      setSession({
        _id: sessionId,
        patientId: 'Patient',
        doctorId: account?.name || 'MedXVerse Staff',
        consultationType: 'VIDEO',
        status: 'IN_PROGRESS',
        scheduledStartTime: new Date().toISOString(),
        meetingRoomId: `medxverse-${sessionId}`,
      } as any);
    } finally {
      setLoading(false);
    }
  }, [sessionId, account?.name]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const updateStatus = async (status: 'IN_PROGRESS' | 'COMPLETED') => {
    if (!session || session._id.startsWith('emergency-')) return;
    setStatusSaving(true);
    try {
      const updated = await telemedicineService.updateStatus(session._id, status);
      setSession(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update consultation status.');
    } finally {
      setStatusSaving(false);
    }
  };

  const isEmergency = sessionId?.toLowerCase().startsWith('emergency-');

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={isEmergency ? '/hms/medxrescue' : '/staff/messages/consultations'} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1b7b68]">
            <ArrowLeft className="h-4 w-4" /> {isEmergency ? 'Back to Dispatch Console' : 'Back to Consultations'}
          </Link>
        </div>
        {session && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              <CalendarClock className="h-4 w-4 text-[#1b7b68]" />
              {new Date(session.scheduledStartTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {session.status === 'WAITING_ROOM' && !isEmergency && (
              <button type="button" disabled={statusSaving || new Date(session.scheduledStartTime).getTime() > Date.now()} onClick={() => void updateStatus('IN_PROGRESS')} className="rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#176c5c] disabled:opacity-60">
                {statusSaving ? 'Updating…' : new Date(session.scheduledStartTime).getTime() > Date.now() ? `Available at ${new Date(session.scheduledStartTime).toLocaleString()}` : 'Start consultation'}
              </button>
            )}
            {session.status === 'IN_PROGRESS' && !isEmergency && (
              <button type="button" disabled={statusSaving} onClick={() => void updateStatus('COMPLETED')} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                {statusSaving ? 'Updating…' : 'Complete consultation'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-100 bg-white text-sm text-slate-500 shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#1b7b68]" /> Connecting call…
        </div>
      ) : session ? (
        <div className="grid gap-4 w-full">
          <div className="min-w-0">
            <section className={`flex min-h-[220px] flex-col items-center justify-center rounded-3xl border p-8 text-center shadow-sm ${
              isEmergency ? 'border-rose-200 bg-rose-50/50' : 'border-teal-100 bg-white'
            }`}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-3 ${
                isEmergency ? 'bg-rose-100 text-rose-700' : 'bg-teal-50 text-[#1b7b68]'
              }`}>
                {isEmergency ? <Siren className="h-7 w-7 animate-pulse" /> : <Video className="h-7 w-7" />}
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                {isEmergency ? '🚨 Emergency SOS Call Active' : 'Consultation Call Active'}
              </h2>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                Your call is managed by the persistent call window. Use "Minimize call" to navigate between dispatch or consultation pages without disconnecting.
              </p>
            </section>
          </div>
        </div>
      ) : null}
    </main>
  );
}
