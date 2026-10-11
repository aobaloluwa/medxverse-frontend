'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, Loader2, Video } from 'lucide-react';
import JitsiMeetingEmbed from '@/components/telemedicine/JitsiMeetingEmbed';
import { useAuthStore } from '@/store/useAuthStore';
import { telemedicineService, type TelemedicineSession } from '@/services/telemedicine.service';

function personName(person: TelemedicineSession['patientId'] | TelemedicineSession['doctorId']): string {
  if (typeof person === 'string') return 'Consultation participant';
  return `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Consultation participant';
}


export default function StaffCallPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
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
    try {
      const result = await telemedicineService.getSessions();
      const found = (result.sessions || []).find((item) => item._id === sessionId) || null;
      if (!found) throw new Error('This consultation could not be found or you do not have access to it.');
      setSession(found);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this consultation.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const displayName = account?.name || 'MedXVerse staff member';

  const updateStatus = async (status: 'IN_PROGRESS' | 'COMPLETED') => {
    if (!session) return;
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

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/staff/messages/consultations" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1b7b68]">
            <ArrowLeft className="h-4 w-4" /> Back to consultations
          </Link>
        </div>
        {session && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              <CalendarClock className="h-4 w-4 text-[#1b7b68]" />
              {new Date(session.scheduledStartTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {session.status === 'WAITING_ROOM' && (
              <button type="button" disabled={statusSaving} onClick={() => void updateStatus('IN_PROGRESS')} className="rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#176c5c] disabled:opacity-60">
                {statusSaving ? 'Updating…' : 'Start consultation'}
              </button>
            )}
            {session.status === 'IN_PROGRESS' && (
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
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#1b7b68]" /> Loading consultation…
        </div>
      ) : session ? (
        <div className="grid gap-4 w-full">
          <div className="min-w-0">
            {session.consultationType !== 'CHAT' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(session.status) ? (
              <JitsiMeetingEmbed
                sessionId={session._id}
                displayName={displayName}
                voiceOnly={session.consultationType === 'VOICE'}
                recordCallSummary
                onJoined={() => { if (session.status === 'WAITING_ROOM') void updateStatus('IN_PROGRESS'); }}
                onLeft={() => { /* A participant leaving does not necessarily mean the consultation is complete. */ }}
                onClose={() => router.push('/staff/messages/consultations')}
              />
            ) : (
              <section className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                <Video className="h-10 w-10 text-[#1b7b68]" />
                <h2 className="mt-4 text-lg font-bold text-slate-900">Video call unavailable</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{session.consultationType === 'CHAT' ? 'This is a messages-only consultation. Voice and video calls are disabled.' : 'This consultation has ended. The patient can book a follow-up consultation.'}</p>
              </section>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
