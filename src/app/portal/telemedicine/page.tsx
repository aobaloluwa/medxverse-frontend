'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowDown,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  Paperclip,
  Phone,
  Pill,
  Plus,
  RefreshCw,
  Send,
  Stethoscope,
  VideoIcon,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import PatientShell from '@/components/patient/PatientShell';
import ChatAttachmentViewer from '@/components/chat/ChatAttachmentViewer';
import JitsiMeetingEmbed from '@/components/telemedicine/JitsiMeetingEmbed';
import {
  telemedicineService,
  type TelemedicineMessage,
  type TelemedicinePerson,
  type TelemedicineSession,
  type ConsultationType,
  type TelemedicineStatus,
} from '@/services/telemedicine.service';



const statusLabels: Record<TelemedicineStatus, string> = {
  WAITING_ROOM: 'Waiting room',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

const statusStyles: Record<TelemedicineStatus, string> = {
  WAITING_ROOM: 'bg-amber-50 text-amber-700',
  IN_PROGRESS: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-rose-50 text-rose-700',
  NO_SHOW: 'bg-orange-50 text-orange-700',
};

const displayName = (person?: TelemedicinePerson | string) =>
  typeof person === 'string'
    ? person
    : person
      ? `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Care team member'
      : 'Not assigned';

const idOf = (person?: TelemedicinePerson | string) =>
  typeof person === 'string' ? person : person?._id || '';


const formatDateTime = (value?: string) => {
  if (!value) return 'Time not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time not set' : date.toLocaleString();
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'VC';

export default function TelemedicinePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const account = useAuthStore((state) => state.account);
  const isPatientPortal = account?.userType === 'PATIENT';
  const isPatientLinked = Boolean(account?.hospitalId && account?.patientId);

  const [sessions, setSessions] = useState<TelemedicineSession[]>([]);
  const [patients, setPatients] = useState<TelemedicinePerson[]>([]);
  const [doctors, setDoctors] = useState<TelemedicinePerson[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [embeddedCallSessionId, setEmbeddedCallSessionId] = useState('');
  const [messages, setMessages] = useState<TelemedicineMessage[]>([]);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const previousMessageIdsRef = useRef<Set<string>>(new Set());
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [messageText, setMessageText] = useState('');
  const [messageAttachment, setMessageAttachment] = useState<File | null>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [viewingPrescription, setViewingPrescription] = useState<any | null>(null);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [consultationType, setConsultationType] = useState<ConsultationType>('VIDEO');
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [followUpOfSessionId, setFollowUpOfSessionId] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedSession = useMemo(
    () => sessions.find((session) => session._id === selectedId) || null,
    [sessions, selectedId],
  );

  const newestFirstSessions = useMemo(() => [...sessions].sort((a, b) => {
    const activityTime = (session: TelemedicineSession) => {
      const record = session as TelemedicineSession & {
        lastMessageAt?: string;
        updatedAt?: string;
        createdAt?: string;
        lastMessage?: { sentAt?: string; createdAt?: string };
      };
      const raw = record.lastMessageAt || record.lastMessage?.sentAt || record.lastMessage?.createdAt;
      // Sort by the last chat message only, never by booking, session, or update dates.
      const time = raw ? new Date(raw).getTime() : 0;
      return Number.isFinite(time) ? time : 0;
    };
    return activityTime(b) - activityTime(a);
  }), [sessions]);

  const refresh = useCallback(async () => {
    if (isPatientPortal && !isPatientLinked) {
      setLoading(false);
      setSessions([]);
      setPatients([]);
      setDoctors([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [directory, sessionResult] = await Promise.all([
        telemedicineService.getDirectory(),
        telemedicineService.getSessions(),
      ]);
      setPatients(directory.patients || []);
      setDoctors(directory.doctors || []);
      const sessionItems = sessionResult.sessions || [];

      // Resolve each session's latest message before the consultation list is shown.
      // Do not wait for the user to open a session to learn its real chat timestamp.
      const items = await Promise.all(sessionItems.map(async (session) => {
        try {
          const history = await telemedicineService.getMessages(session._id);
          const latestMessage = [...(history || [])].sort((a, b) => {
            const timestamp = (message: TelemedicineMessage) => {
              const raw = message.sentAt || (message as any).createdAt;
              const value = raw ? new Date(raw).getTime() : 0;
              return Number.isFinite(value) ? value : 0;
            };
            return timestamp(b) - timestamp(a);
          })[0];
          if (!latestMessage) return session;
          return { ...session, lastMessageAt: latestMessage.sentAt || (latestMessage as any).createdAt || (session as any).lastMessageAt } as TelemedicineSession;
        } catch {
          return session;
        }
      }));
      setSessions(items);
      const requestedSessionId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('sessionId')
        : null;
      const requestedSessionExists = Boolean(
        requestedSessionId && items.some((item) => item._id === requestedSessionId)
      );

      setSelectedId((current) => {
        if (requestedSessionExists && requestedSessionId) return requestedSessionId;
        return items.some((item) => item._id === current) ? current : ''; // Start with the chat list; user opens a session explicitly.
      });

      // Legacy patient links now open the dedicated patient call page.
      // Staff can continue to use the embedded call experience in this workspace.
      if (requestedSessionExists && requestedSessionId) {
        if (isPatientPortal) {
          router.replace(`/portal/call/${encodeURIComponent(requestedSessionId)}`);
        } else {
          setEmbeddedCallSessionId(requestedSessionId);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load telemedicine data. Please sign in with your hospital account and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [isPatientPortal, isPatientLinked, router]);

  useEffect(() => {
    if (isAuthenticated && (!isPatientPortal || isPatientLinked)) {
      void refresh();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isPatientPortal, isPatientLinked, refresh]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const loadMessages = async () => {
      try {
        const data = await telemedicineService.getMessages(selectedId);
        if (!cancelled) {
          setMessages(data || []);
          const latestMessage = [...(data || [])].sort((a, b) => {
            const timeOf = (message: TelemedicineMessage) => {
              const time = new Date(message.sentAt || (message as any).createdAt || 0).getTime();
              return Number.isFinite(time) ? time : 0;
            };
            return timeOf(b) - timeOf(a);
          })[0];
          if (latestMessage) {
            setSessions((current) => current.map((item) => item._id === selectedId
              ? { ...item, lastMessageAt: latestMessage.sentAt || (latestMessage as any).createdAt || (item as any).lastMessageAt } as TelemedicineSession
              : item));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load consultation messages.');
        }
      }
    };

    void loadMessages();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) { setPrescriptions([]); return; }
    let active = true;
    const loadPrescriptions = () => {
      telemedicineService.getSessionPrescriptions(selectedId)
        .then((items) => { if (active) setPrescriptions(Array.isArray(items) ? items : []); })
        .catch(() => { if (active) setPrescriptions([]); });
    };
    loadPrescriptions();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadPrescriptions();
    }, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [selectedId]);

  useEffect(() => {
    setNewMessageCount(0);
    wasAtBottomRef.current = true;
    previousMessageIdsRef.current = new Set();
  }, [selectedId]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container || !wasAtBottomRef.current) return;
    requestAnimationFrame(() => container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }));
  }, [messages]);

  useEffect(() => {
    const previousIds = previousMessageIdsRef.current;
    if (previousIds.size > 0 && !wasAtBottomRef.current) {
      const incomingCount = messages.filter((message) => {
        if (previousIds.has(String(message._id)) || String(message._id).startsWith('local-')) return false;
        const userId = String(account?.patientId || account?.userId || account?.id || '');
        const isMine = (Boolean(message.senderId && userId) && String(message.senderId) === userId) ||
          (isPatientPortal ? message.senderModel === 'Patient' : message.senderModel !== 'Patient');
        return !isMine;
      }).length;
      if (incomingCount > 0) setNewMessageCount((count) => count + incomingCount);
    }
    previousMessageIdsRef.current = new Set(messages.map((message) => String(message._id)));
  }, [messages, account?.patientId, account?.userId, account?.id, isPatientPortal]);

  async function createSession(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const created = await telemedicineService.createSession({
        patientId: isPatientPortal ? account?.patientId || account?.userId || '' : patientId,
        doctorId,
        consultationType,
        scheduledStartTime: new Date(scheduledStartTime).toISOString(),
        chiefComplaint: chiefComplaint.trim(),
        ...(followUpOfSessionId ? { followUpOfSessionId } : {}),
      });
      setSessions((current) => [created, ...current]);
      setSelectedId(created._id);
      setShowBooking(false);
      setPatientId('');
      setDoctorId('');
      setChiefComplaint('');
      setScheduledStartTime('');
      setFollowUpOfSessionId('');
      setNotice('Consultation booked and waiting-room session created.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book the consultation.');
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = messageText.trim();
    const fileToSend = messageAttachment;
    if (!selectedId || (!body && !fileToSend) || sending) return;
    if (fileToSend && fileToSend.size > 10 * 1024 * 1024) {
      setError('Attachments must be 10 MB or smaller.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const attachment = fileToSend
        ? await telemedicineService.uploadMessageAttachment(selectedId, fileToSend)
        : undefined;
      const created = await telemedicineService.sendMessage(
        selectedId,
        body || (attachment ? attachment.name : ''),
        attachment,
      );
      setMessages((current) =>
        current.some((item) => item._id === created._id) ? current : [...current, created],
      );
      setSessions((current) => current.map((item) => item._id === selectedId
        ? { ...item, lastMessageAt: created.sentAt || new Date().toISOString() } as TelemedicineSession
        : item));
      setMessageText('');
      setMessageAttachment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: TelemedicineStatus) {
    if (!selectedSession) return;
    setError('');
    try {
      const updated = await telemedicineService.updateStatus(selectedSession._id, status);
      setSessions((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
      setNotice(`Consultation marked ${statusLabels[status].toLowerCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update consultation status.');
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-5 py-20">
        <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
            <Activity className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">MedXVerse Virtual Care</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Sign in to access your consultations and hospital virtual-care services.
          </p>
          <a
            href="/portal/login"
            className="mt-6 inline-flex rounded-xl bg-[#1b7b68] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#176c5c]"
          >
            Patient sign in
          </a>
        </div>
      </main>
    );
  }

  if (isPatientPortal && !isPatientLinked) {
    return (
      <PatientShell>
        <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center text-slate-800">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
              <Activity className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#1b7b68]">
              Patient portal
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Connect your hospital first</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Your patient portal account is ready, but it is not yet linked to a hospital patient record.
              Connect the hospital where you are registered before booking consultations or viewing your care team.
            </p>
            <a
              href="/portal"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#176c5c]"
            >
              Connect to a hospital <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </PatientShell>
    );
  }

  const workspace = (
    <div className="space-y-4 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">
            {isPatientPortal ? 'Patient workspace' : 'MedXVerse MHMS'}
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-800 sm:text-2xl">
            Virtual care
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage consultations, join appointments and message your care team.
          </p>
        </div> */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowBooking(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#176c5c]"
          >
            <Plus className="h-4 w-4" /> Book consultation
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
          <button type="button" className="ml-auto" onClick={() => setNotice('')} aria-label="Dismiss notice">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid h-[calc(100dvh-6.5rem)] min-h-[460px] max-h-none grid-cols-1 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm md:h-[calc(100vh-7rem)] md:min-h-[600px] md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_260px]">
        <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-slate-100 bg-white`}>
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Consultation centre</p>
                <h2 className="mt-1 text-base font-bold text-slate-800">My consultations</h2>
              </div>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-xl bg-[#e8f5f3] px-2 text-xs font-bold text-[#1b7b68]">
                {sessions.length}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Upcoming and recent sessions</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex h-40 items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" /> Loading consultations…
              </div>
            ) : sessions.length ? (
              newestFirstSessions.map((session) => {
                const active = session._id === selectedId;
                const otherName = isPatientPortal
                  ? `Dr. ${displayName(session.doctorId)}`
                  : displayName(session.patientId);
                return (
                  <button
                    key={session._id}
                    type="button"
                    onClick={() => setSelectedId(session._id)}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${active ? 'bg-[#e8f5f3]' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${active ? 'bg-[#1b7b68] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {initials(otherName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-bold text-slate-800">{otherName}</p>
                        <span className="shrink-0 pt-0.5 text-[9px] text-slate-400">{formatTime(session.scheduledStartTime)}</span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-slate-500">
                        {session.chiefComplaint || `${session.consultationType} consultation`}
                      </p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${statusStyles[session.status]}`}>
                        {statusLabels[session.status]}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-5 text-center">
                <CalendarClock className="mx-auto h-7 w-7 text-slate-200" />
                <p className="mt-3 text-xs font-semibold text-slate-600">No consultations yet</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">Book a consultation to get started with virtual care.</p>
                <button type="button" onClick={() => setShowBooking(true)} className="mt-4 rounded-xl bg-[#1b7b68] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white">
                  Book consultation
                </button>
              </div>
            )}
          </div>
        </aside>

        <section className={`${selectedId ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col overflow-hidden bg-[#f8fafc]`}>
          {selectedSession ? (
            <>
              <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => setSelectedId('')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 md:hidden" aria-label="Back to consultations">←</button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">
                    {initials(isPatientPortal ? `Dr. ${displayName(selectedSession.doctorId)}` : displayName(selectedSession.patientId))}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-slate-800">
                      {isPatientPortal ? `Dr. ${displayName(selectedSession.doctorId)}` : displayName(selectedSession.patientId)}
                    </h2>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-slate-400">
                      {selectedSession.consultationType} consultation · {statusLabels[selectedSession.status]}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => setShowSessionDetails(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cde7e1] bg-[#f0faf7] px-2.5 py-2 text-[10px] font-bold text-[#1b7b68] lg:hidden">
                    <CalendarClock className="h-3.5 w-3.5" /> Details
                  </button>
                  <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] font-bold ${statusStyles[selectedSession.status]}`}>
                    {statusLabels[selectedSession.status]}
                  </span>
                </div>
              </header>

              {/* Appointment details and follow-up actions live in the context panel, keeping the chat area focused on messages. */}

              {!isPatientPortal && embeddedCallSessionId === selectedSession._id && selectedSession.consultationType !== 'CHAT' && (
                <div className="shrink-0 border-b border-slate-100 bg-white p-3 sm:p-4">
                  <JitsiMeetingEmbed
                    sessionId={selectedSession._id}
                    displayName={isPatientPortal ? `Patient ${displayName(selectedSession.patientId)}` : `Dr. ${displayName(selectedSession.doctorId)}`}
                    voiceOnly={selectedSession.consultationType === 'VOICE'}
                  recordCallSummary={!isPatientPortal}
                    onJoined={() => {
                      if (!isPatientPortal && selectedSession.status === 'WAITING_ROOM') void changeStatus('IN_PROGRESS');
                    }}
                    onLeft={() => {
                      if (!isPatientPortal && selectedSession.status === 'IN_PROGRESS') void changeStatus('COMPLETED');
                    }}
                    onClose={() => setEmbeddedCallSessionId('')}
                  />
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Consultation messages</h3>
                    <p className="mt-0.5 text-[10px] text-slate-400">Messages refresh automatically while this session is open.</p>
                  </div>
                  <MessageCircle className="h-4 w-4 text-[#1b7b68]" />
                </div> */}
                <div
                  ref={messagesScrollRef}
                  onScroll={(event) => {
                    const el = event.currentTarget;
                    wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                    if (wasAtBottomRef.current) setNewMessageCount(0);
                  }}
                  className="relative min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4"
                >
                  {messages.length === 0 && prescriptions.length === 0 ? (
                    <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><MessageCircle className="h-5 w-5" /></div>
                      <p className="mt-3 text-xs font-semibold text-slate-600">No messages yet</p>
                      <p className="mt-1 text-[10px] text-slate-400">Start a secure conversation with your care team below.</p>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-3xl space-y-3">
                      {messages.map((message) => {
                        const currentUserId = String(account?.patientId || account?.userId || account?.id || '');
                        const isMine =
                          (Boolean(message.senderId && currentUserId) && String(message.senderId) === currentUserId) ||
                          (isPatientPortal ? message.senderModel === 'Patient' : message.senderModel !== 'Patient');
                        const prescriptionNotice = /Prescription issued\s*\(([^)]+)\)/i.exec(message.messageText || '');
                        if (prescriptionNotice && prescriptions.some((item) => item.verificationId === prescriptionNotice[1] || item._id === prescriptionNotice[1])) return null;

                        if (message.messageType === 'CALL_SUMMARY' && message.callSummary) {
                          const call = message.callSummary;
                          const minutes = Math.floor(call.durationSeconds / 60);
                          const seconds = call.durationSeconds % 60;
                          const durationLabel = minutes > 0
                            ? `${minutes} min${seconds ? ` ${seconds} sec` : ''}`
                            : `${seconds} sec`;
                          const CallIcon = call.callType === 'VIDEO' ? VideoIcon : Phone;
                          return (
                            <div key={message._id} className="flex justify-center py-1">
                              <div className="flex max-w-[95%] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 shadow-sm">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                                  <CallIcon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800">{call.callType === 'VIDEO' ? 'Video call' : 'Voice call'}</p>
                                  <p className="mt-0.5 text-[11px] text-slate-600">{durationLabel} · {call.participantCount} {call.participantCount === 1 ? 'participant' : 'participants'} joined</p>
                                  <p className="mt-1 text-[9px] text-slate-400">{formatTime(message.sentAt) || formatDateTime(message.sentAt)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={message._id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[92%] rounded-2xl px-3 py-2.5 shadow-sm sm:max-w-[82%] sm:px-4 ${
                                isMine
                                  ? 'rounded-br-md bg-[#1b7b68] text-white'
                                  : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                              }`}
                            >
                              {!isMine && (
                                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#1b7b68]">
                                  {isPatientPortal
                                    ? `Dr. ${displayName(selectedSession.doctorId)}`
                                    : message.senderModel === 'Patient'
                                    ? displayName(selectedSession.patientId)
                                    : 'Care team'}
                                </p>
                              )}
                              {message.messageText && !(message.attachmentUrl && message.messageText === message.attachmentName) && (
                                <p className="whitespace-pre-wrap break-words text-sm leading-5">
                                  {message.messageText}
                                </p>
                              )}
                              {message.attachmentUrl && (
                                <ChatAttachmentViewer
                                  url={message.attachmentUrl}
                                  name={message.attachmentName}
                                  mimeType={message.attachmentMimeType}
                                  size={message.attachmentSize}
                                  mine={isMine}
                                />
                              )}
                              <div
                                className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                                  isMine ? 'text-white/70' : 'text-slate-400'
                                }`}
                              >
                                <span>{formatTime(message.sentAt) || formatDateTime(message.sentAt)}</span>
                                {isMine && <Check className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {prescriptions.length > 0 && (
                        <div className="space-y-2 pt-2">
                          {prescriptions.map((prescription) => (
                            <div key={prescription._id || prescription.verificationId} className="flex items-center gap-3 rounded-2xl border border-[#cde7e1] bg-white p-3 shadow-sm">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><Pill className="h-5 w-5" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-800">{prescription.diagnosis || 'Prescription issued'}</p>
                                <p className="mt-0.5 text-[10px] text-slate-500">{prescription.prescriberName || 'Care team'} · {prescription.dateIssued ? formatDateTime(prescription.dateIssued) : 'Prescription details available'}</p>
                                <p className="mt-0.5 text-[9px] text-slate-400">{(prescription.medications || []).length} medication{(prescription.medications || []).length === 1 ? '' : 's'} · {String(prescription.status || 'ISSUED').replace(/_/g, ' ')}</p>
                              </div>
                              <button type="button" onClick={() => setViewingPrescription(prescription)} className="shrink-0 rounded-xl border border-[#cde7e1] bg-[#f0faf7] px-3 py-2 text-[10px] font-bold text-[#1b7b68] hover:bg-[#e5f5ef]">View details</button>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  )}
                  {newMessageCount > 0 && (
                    <div className="sticky bottom-2 z-20 flex justify-center pointer-events-none">
                      <button type="button" onClick={() => { const el = messagesScrollRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); setNewMessageCount(0); }} className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#b8ddd2] bg-white px-4 py-2 text-xs font-bold text-[#176b5b] shadow-lg transition hover:bg-[#eff9f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b7b68]">
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b7b68] px-1 text-[10px] text-white">{newMessageCount}</span>
                        {newMessageCount === 1 ? '1 new message' : `${newMessageCount} new messages`}
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <form onSubmit={sendMessage} className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
                  {messageAttachment && (
                    <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-2 text-xs text-slate-600">
                      <span className="truncate">{messageAttachment.name}</span>
                      <button type="button" onClick={() => setMessageAttachment(null)} className="font-semibold text-rose-600">Remove</button>
                    </div>
                  )}
                  <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#1b7b68] focus-within:bg-white">
                    <label className="flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-xl px-2 text-slate-600 hover:bg-slate-100" title="Attach image or document">
                      <Paperclip className="h-4 w-4" />
                      <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf" onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (file && file.size > 10 * 1024 * 1024) {
                          setError('Attachments must be 10 MB or smaller.');
                          setMessageAttachment(null);
                        } else {
                          setError('');
                          setMessageAttachment(file);
                        }
                        event.currentTarget.value = '';
                      }} />
                    </label>
                    <input
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      maxLength={4000}
                      placeholder="Write a secure consultation message…"
                      className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    <button type="submit" disabled={sending || (!messageText.trim() && !messageAttachment)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-[#176c5c] disabled:cursor-not-allowed disabled:opacity-50">
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><Stethoscope className="h-7 w-7" /></div>
              <h2 className="mt-5 text-base font-bold text-slate-800">Your virtual-care consultations</h2>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">Choose a consultation from the list to open its messages. Your chats stay closed until you select one.</p>
              <button type="button" onClick={() => setShowBooking(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <Plus className="h-3.5 w-3.5" /> Book consultation
              </button>
            </div>
          )}
        </section>

        <aside className="hidden min-h-0 min-w-0 overflow-y-auto border-l border-slate-100 bg-white p-4 lg:block">
          {selectedSession ? (
            <div className="space-y-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Consultation details</p>
                <h3 className="mt-1 text-sm font-bold text-slate-800">{selectedSession.consultationType} session</h3>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">{formatDateTime(selectedSession.scheduledStartTime)}</p>
              </div>
              <div className="space-y-2">
                {selectedSession.consultationType !== 'CHAT' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selectedSession.status) && (
                  isPatientPortal ? (
                    <Link href={`/portal/call/${encodeURIComponent(selectedSession._id)}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#176c5c]">
                      <VideoIcon className="h-4 w-4" /> Join consultation
                    </Link>
                  ) : (
                    <button type="button" onClick={() => setEmbeddedCallSessionId(selectedSession._id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#176c5c]">
                      <VideoIcon className="h-4 w-4" /> {embeddedCallSessionId === selectedSession._id ? 'Call open below' : 'Join consultation'}
                    </button>
                  )
                )}
                <button type="button" onClick={() => {
                  setPatientId(isPatientPortal ? account?.patientId || '' : idOf(selectedSession.patientId));
                  setDoctorId(idOf(selectedSession.doctorId));
                  setConsultationType(selectedSession.consultationType);
                  setChiefComplaint(`Follow-up consultation for ${selectedSession._id}`);
                  setFollowUpOfSessionId(selectedSession._id);
                  setShowBooking(true);
                }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#cde7e1] bg-[#f0faf7] px-3 py-2.5 text-xs font-bold text-[#1b7b68] transition hover:bg-[#e5f5ef]">
                  <Plus className="h-4 w-4" /> Book follow-up
                </button>
                {!isPatientPortal && selectedSession.status === 'WAITING_ROOM' && (
                  <button type="button" onClick={() => void changeStatus('IN_PROGRESS')} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Start session</button>
                )}
                {!isPatientPortal && selectedSession.status === 'IN_PROGRESS' && (
                  <button type="button" onClick={() => void changeStatus('COMPLETED')} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Complete session</button>
                )}
                {isPatientPortal && selectedSession.status === 'WAITING_ROOM' && (
                  <button type="button" onClick={() => void changeStatus('CANCELLED')} className="w-full rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Cancel consultation</button>
                )}
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">Care team</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[10px] font-bold text-[#1b7b68]">{initials(`Dr. ${displayName(selectedSession.doctorId)}`)}</div>
                  <div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">Dr. {displayName(selectedSession.doctorId)}</p><p className="text-[10px] text-slate-400">Consulting doctor</p></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Session status</p>
                <span className={`mt-3 inline-flex rounded-full px-2.5 py-1.5 text-[10px] font-bold ${statusStyles[selectedSession.status]}`}>{statusLabels[selectedSession.status]}</span>
                <p className="mt-3 text-[10px] leading-4 text-slate-500">{selectedSession.status === 'WAITING_ROOM' ? 'Your session is scheduled. Keep this page open and join when you are ready.' : selectedSession.status === 'IN_PROGRESS' ? 'Your consultation is in progress.' : 'Check the session details above for the latest consultation information.'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Consultation reason</p>
                <p className="mt-2 break-words text-xs leading-5 text-slate-600">{selectedSession.chiefComplaint || 'No reason provided.'}</p>
              </div>
            </div>
          ) : (
            <div className="pt-3 text-center">
              <Activity className="mx-auto h-6 w-6 text-slate-200" />
              <p className="mt-2 text-xs font-semibold text-slate-500">Session context</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">Appointment status, doctor and session details appear here when you select a consultation.</p>
            </div>
          )}
        </aside>
      </div>

      {showSessionDetails && selectedSession && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 lg:hidden" onClick={() => setShowSessionDetails(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="session-details-title" className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">MedXVerse virtual care</p>
                <h2 id="session-details-title" className="mt-1 text-base font-bold text-slate-800">Consultation details</h2>
              </div>
              <button type="button" onClick={() => setShowSessionDetails(false)} aria-label="Close consultation details" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="break-words text-sm font-semibold text-slate-800">{selectedSession.chiefComplaint || 'Consultation details'}</p>
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" /> Scheduled: {formatDateTime(selectedSession.scheduledStartTime)}</p>
              {selectedSession.actualStartTime && <p className="text-xs leading-5 text-slate-500">Call started: {formatDateTime(selectedSession.actualStartTime)}{selectedSession.endTime ? ` · Ended: ${formatDateTime(selectedSession.endTime)}` : ' · In progress'}{typeof selectedSession.durationMinutes === 'number' ? ` · Duration: ${selectedSession.durationMinutes} min` : ''}</p>}
              <p className="text-xs text-slate-500">Status: {statusLabels[selectedSession.status]}</p>
            </div>
            <div className="mt-4 space-y-2">
              {selectedSession.consultationType !== 'CHAT' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selectedSession.status) && (
                isPatientPortal ? <Link href={`/portal/call/${encodeURIComponent(selectedSession._id)}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-3 text-xs font-bold text-white"><VideoIcon className="h-4 w-4" /> Join consultation</Link> : <button type="button" onClick={() => { setEmbeddedCallSessionId(selectedSession._id); setShowSessionDetails(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-3 text-xs font-bold text-white"><VideoIcon className="h-4 w-4" /> Join consultation</button>
              )}
              <button type="button" onClick={() => {
                setPatientId(isPatientPortal ? account?.patientId || '' : idOf(selectedSession.patientId));
                setDoctorId(idOf(selectedSession.doctorId));
                setConsultationType(selectedSession.consultationType);
                setChiefComplaint(`Follow-up consultation for ${selectedSession._id}`);
                setFollowUpOfSessionId(selectedSession._id);
                setShowSessionDetails(false);
                setShowBooking(true);
              }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#cde7e1] bg-[#f0faf7] px-3 py-3 text-xs font-bold text-[#1b7b68]"><Plus className="h-4 w-4" /> Book follow-up</button>
            </div>
          </section>
        </div>
      )}

      {showBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="booking-title" className="my-8 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">Virtual care</p>
                <h2 id="booking-title" className="mt-1 text-lg font-bold text-slate-800">Book a consultation</h2>
                <p className="mt-1 text-xs text-slate-500">Choose your care team, appointment type and time.</p>
              </div>
              <button type="button" onClick={() => setShowBooking(false)} aria-label="Close booking form" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={createSession} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {!isPatientPortal && (
                <label className="text-xs font-semibold text-slate-700">Patient
                  <select required value={patientId} onChange={(event) => setPatientId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#1b7b68]">
                    <option value="">Choose patient</option>
                    {patients.map((patient) => <option key={patient._id} value={patient._id}>{displayName(patient)}{patient.mrn ? ` · ${patient.mrn}` : ''}</option>)}
                  </select>
                </label>
              )}
              <label className="text-xs font-semibold text-slate-700">Doctor / specialist
                <select required value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#1b7b68]">
                  <option value="">Choose doctor</option>
                  {doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{displayName(doctor)}{doctor.specialization ? ` · ${doctor.specialization}` : doctor.department ? ` · ${doctor.department}` : ''}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">Consultation type
                <select value={consultationType} onChange={(event) => setConsultationType(event.target.value as ConsultationType)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#1b7b68]">
                  <option value="VIDEO">Video consultation</option><option value="VOICE">Voice call</option><option value="CHAT">Messaging only</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">Date and time
                <input required type="datetime-local" min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} value={scheduledStartTime} onChange={(event) => setScheduledStartTime(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#1b7b68]" />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Reason for consultation
                <textarea value={chiefComplaint} onChange={(event) => setChiefComplaint(event.target.value)} maxLength={1000} rows={3} placeholder="Briefly describe what you would like help with" className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-[#1b7b68]" />
              </label>
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2">
                <button type="button" onClick={() => setShowBooking(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving || (!isPatientPortal && !patientId) || !doctorId || !scheduledStartTime} className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#176c5c] disabled:cursor-not-allowed disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirm consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingPrescription && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setViewingPrescription(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="prescription-details-title" className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><Pill className="h-5 w-5" /></div>
                <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">MedXVerse · Prescription</p><h2 id="prescription-details-title" className="mt-1 text-base font-bold text-slate-800">{viewingPrescription.diagnosis || 'Prescription details'}</h2><p className="mt-1 text-[10px] text-slate-500">{viewingPrescription.prescriberName || 'Care team'} · {viewingPrescription.dateIssued ? formatDateTime(viewingPrescription.dateIssued) : 'Date not provided'}</p></div>
              </div>
              <button type="button" onClick={() => setViewingPrescription(null)} aria-label="Close prescription details" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-800">Medication details</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700">{String(viewingPrescription.status || 'ISSUED').replace(/_/g, ' ')}</span></div>
                {(viewingPrescription.medications || []).length ? <div className="mt-2 space-y-2">{viewingPrescription.medications.map((medication: any, index: number) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-sm font-bold text-slate-800">{index + 1}. {medication.genericName || 'Medication'}{medication.strengthForm ? ` · ${medication.strengthForm}` : ''}</p><div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2"><p><span className="font-semibold">Dose / frequency:</span> {medication.dosageFrequency || 'Not specified'}</p><p><span className="font-semibold">Duration:</span> {medication.duration || 'Not specified'}</p><p><span className="font-semibold">Quantity:</span> {medication.quantity || 'Not specified'}</p><p><span className="font-semibold">Route:</span> {medication.route || 'Not specified'}</p></div></div>)}</div> : <p className="mt-2 text-xs text-slate-500">Medication details are not available from the server response.</p>}
              </div>
              {viewingPrescription.patientSnapshot?.fullName && !isPatientPortal && <p className="text-xs text-slate-600"><span className="font-semibold">Patient:</span> {viewingPrescription.patientSnapshot.fullName}</p>}
              {viewingPrescription.clinicalNotes && <div className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clinical notes</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{viewingPrescription.clinicalNotes}</p></div>}
              {viewingPrescription.patientSnapshot?.knownDrugAllergies?.length > 0 && <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Known drug allergies</p><p className="mt-1 text-xs text-amber-900">{viewingPrescription.patientSnapshot.knownDrugAllergies.join(', ')}</p></div>}
              {viewingPrescription.patientInstructions && <div className="rounded-xl border border-[#cde7e1] bg-[#f5fbf9] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">Patient instructions</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{viewingPrescription.patientInstructions}</p></div>}
              {!isPatientPortal && viewingPrescription.pharmacistInstructions && <div className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pharmacist instructions</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{viewingPrescription.pharmacistInstructions}</p></div>}
              {viewingPrescription.verificationId && <p className="break-all text-[10px] text-slate-400">Verification ID: {viewingPrescription.verificationId}</p>}
              {viewingPrescription.facilityName && <p className="text-[10px] text-slate-500">Facility: {viewingPrescription.facilityName}</p>}
              {viewingPrescription.registrationNumber && <p className="text-[10px] text-slate-500">Professional registration: {viewingPrescription.registrationNumber}</p>}
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">
                {typeof viewingPrescription.genericSubstitutionPermitted === 'boolean' && <span className="rounded-full bg-slate-100 px-2 py-1">Generic substitution: {viewingPrescription.genericSubstitutionPermitted ? 'Permitted' : 'Not permitted'}</span>}
                {typeof viewingPrescription.refillAuthorized === 'boolean' && <span className="rounded-full bg-slate-100 px-2 py-1">Refills: {viewingPrescription.refillAuthorized ? `${viewingPrescription.numberOfRefills || 0} authorized` : 'Not authorized'}</span>}
                {viewingPrescription.controlledSubstance && <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-800">Controlled substance</span>}
              </div>
              {viewingPrescription.digitalSignature && <p className="text-[10px] text-slate-500">Signed by: {viewingPrescription.digitalSignature}{viewingPrescription.signedAt ? ` · ${formatDateTime(viewingPrescription.signedAt)}` : ''}</p>}

            </div>
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-3"><button type="button" onClick={() => setViewingPrescription(null)} className="rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white">Close details</button></div>
          </section>
        </div>
      )}
    </div>
  );

  return isPatientPortal ? <PatientShell>{workspace}</PatientShell> : workspace;
}
