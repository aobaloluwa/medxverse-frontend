'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, Loader2, Video, PhoneCall } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { telemedicineService, type TelemedicinePerson, type TelemedicineSession } from '@/services/telemedicine.service';
import { openTelemedicineCall } from '@/lib/telemedicine-call-window';

function personName(person: TelemedicinePerson | string | undefined, fallback: string): string {
  if (!person) return fallback;
  if (typeof person === 'string') return 'Consultation participant';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || fallback;
}

export default function PatientCallPage() {
  const params = useParams<{ sessionId: string }>();
  const account = useAuthStore((state) => state.account);
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setError('A consultation session was not specified.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Immediately trigger openTelemedicineCall so active call overlay initializes automatically
    const isEmergency = sessionId.toLowerCase().startsWith('emergency-');
    const callTitle = isEmergency ? 'Emergency Voice Call' : 'Virtual Care Call';
    const fallbackPath = isEmergency ? '/portal/emergency' : '/portal/telemedicine';
    openTelemedicineCall(sessionId, `/portal/call/${encodeURIComponent(sessionId)}`, callTitle);

    try {
      if (isEmergency) {
        setSession({
          _id: sessionId,
          patientId: account?.name || 'Emergency Patient',
          doctorId: 'Hospital Dispatch Team',
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
        // Fallback session when direct link or guest participant
        setSession({
          _id: sessionId,
          patientId: account?.name || 'Patient Participant',
          doctorId: 'Care Team',
          consultationType: 'VIDEO',
          status: 'IN_PROGRESS',
          scheduledStartTime: new Date().toISOString(),
          meetingRoomId: `medxverse-${sessionId}`,
        } as any);
      }
    } catch {
      // Fallback session if backend sessions lookup fails for guest/unauthenticated calls
      setSession({
        _id: sessionId,
        patientId: account?.name || 'Patient Participant',
        doctorId: 'Care Team',
        consultationType: 'VIDEO',
        status: 'IN_PROGRESS',
        scheduledStartTime: new Date().toISOString(),
        meetingRoomId: `medxverse-${sessionId}`,
      } as any);
    } finally {
      setLoading(false);
    }
  }, [sessionId, account?.name]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const displayName = account?.name || 'Patient Participant';
  const doctorName = session ? personName(session.doctorId, 'Care team') : 'Care team';

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/portal/telemedicine" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1b7b68]">
            <ArrowLeft className="h-4 w-4" /> Back to Virtual Care
          </Link>
        </div>
        {session && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            <CalendarClock className="h-4 w-4 text-[#1b7b68]" />
            {new Date(session.scheduledStartTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-100 bg-white text-sm text-slate-500 shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#1b7b68]" /> Connecting call for {displayName}…
        </div>
      ) : session ? (
        <div className="grid gap-4 w-full">
          <div className="min-w-0">
            <section className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-teal-100 bg-white p-8 text-center shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#1b7b68] mb-3">
                <Video className="h-7 w-7" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                Call Active ({displayName} &amp; {doctorName})
              </h2>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                Your video/voice call is live and managed by MedXVerse persistent call window. Use "Minimize call" to browse without disconnecting.
              </p>
            </section>
          </div>
        </div>
      ) : null}
    </main>
  );
}
