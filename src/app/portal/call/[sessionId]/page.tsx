'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, Loader2, Video } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { telemedicineService, type TelemedicinePerson, type TelemedicineSession } from '@/services/telemedicine.service';

function personName(person: TelemedicinePerson | string | undefined, fallback: string): string {
  if (!person) return fallback;
  if (typeof person === 'string') return 'Consultation participant';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || fallback;
}

export default function PatientCallPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const account = useAuthStore((state) => state.account);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
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
    try {
      const result = await telemedicineService.getSessions();
      const found = (result.sessions || []).find((item) => item._id === sessionId) || null;
      if (!found) {
        throw new Error('This consultation could not be found or you do not have access to it.');
      }
      setSession(found);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this consultation.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || account?.userType !== 'PATIENT') {
      router.replace('/portal/login');
      return;
    }
    void loadSession();
  }, [account?.userType, hasHydrated, isAuthenticated, loadSession, router]);

  const patientName = account?.name || 'Patient';
  const doctorName = session ? personName(session.doctorId, 'Your care team') : 'Your care team';
  const ended = session && ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(session.status);
  const unavailable = session && (session.consultationType === 'CHAT' || ended || (session.status !== 'IN_PROGRESS' && new Date(session.scheduledStartTime).getTime() > Date.now()));

  return (

      <main className="mx-auto w-full max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/portal/telemedicine" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1b7b68]">
              <ArrowLeft className="h-4 w-4" /> Back to virtual care
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
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#1b7b68]" /> Loading consultation…
          </div>
        ) : session ? (
          <div className="grid gap-4 w-full">
            <div className="min-w-0">
              <section className="flex min-h-[160px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                <Video className="h-8 w-8 text-[#1b7b68]" />
                <h2 className="mt-3 text-base font-bold text-slate-900">Your call is managed by the persistent call interface.</h2>
                <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Use “Minimize call” to browse the patient portal without disconnecting.</p>
              </section>
            </div>
          </div>
        ) : null}
      </main>

  );
}
