'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Clock3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Images,
  FileText,
  Paperclip,
  Pill,
  Phone,
  RefreshCw,
  Search,
  Send,
  Video,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import ChatAttachmentViewer from '@/components/chat/ChatAttachmentViewer';
import { openTelemedicineCall } from '@/lib/telemedicine-call-window';
import { API_BASE_URL } from '@/services/appointment.service';
import { useAuthStore } from '@/store/useAuthStore';

type PatientRef = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  phone?: string;
};

type DoctorRef = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  specialization?: string;
};

type Consultation = {
  _id: string;
  patientId: string | PatientRef;
  doctorId: string | DoctorRef;
  consultationType: 'VIDEO' | 'VOICE' | 'CHAT';
  status: 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  doctorAcceptedAt?: string;
  doctorAcceptedByName?: string;
  scheduledStartTime: string;
  meetingUrl?: string;
  meetingRoomId?: string;
  chiefComplaint?: string;
  lastMessageAt?: string;
  updatedAt?: string;
  createdAt?: string;
  lastMessage?: { sentAt?: string; createdAt?: string };
};

type ConsultationMessage = {
  _id: string;
  sessionId: string;
  senderId: string;
  senderModel: 'User' | 'Patient';
  messageText: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
  prescriptionId?: string;
  messageType?: 'TEXT' | 'CALL_STARTED' | 'CALL_SUMMARY';
  callSummary?: {
  callId: string;
  callType: 'VIDEO' | 'VOICE';
  durationSeconds: number;
  participantCount: number;
  /** True when nobody answered/joined the call. */
  missedCall?: boolean;
};
  sentAt: string;
};



function unwrap<T>(response: any, fallback: T): T {
  let value = response;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!value || typeof value !== 'object' || !('data' in value)) break;
    value = value.data;
  }
  return (value ?? fallback) as T;
}

function patientName(session: Consultation): string {
  if (typeof session.patientId === 'string') return 'Patient consultation';
  return `${session.patientId?.firstName || ''} ${session.patientId?.lastName || ''}`.trim() || 'Patient consultation';
}

function formatDate(value?: string): string {
  if (!value) return 'Time not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time not set'
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: Consultation['status']): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function avatarLetters(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'P'
  );
}

export default function StaffPatientConsultationsPage() {
  const { account } = useAuthStore();
  const currentUserId = account?.userId || account?.id || account?._id || '';
  const router = useRouter();
  const selectedIdRef = useRef('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const previousMessageIdsRef = useRef<Set<string>>(new Set());
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const [sessions, setSessions] = useState<Consultation[]>([]);
  const sessionsRef = useRef<Consultation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showLabRequestForm, setShowLabRequestForm] = useState(false);
  const [labRequests, setLabRequests] = useState<any[]>([]);
  const [labSaving, setLabSaving] = useState(false);
  const [acceptingOrder, setAcceptingOrder] = useState(false);
  const [labRequestForm, setLabRequestForm] = useState({ testName: '', testCategory: 'CLINICAL_CHEMISTRY', sampleType: 'Blood', priority: 'ROUTINE', notes: '' });
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [viewingPrescription, setViewingPrescription] = useState<any | null>(null);
  const [showChatProfile, setShowChatProfile] = useState(false);
  const [prescriptionSaving, setPrescriptionSaving] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('');
  const [dispensingId, setDispensingId] = useState('');
  const [prescriptionForm, setPrescriptionForm] = useState({
    diagnosis: '', clinicalNotes: '', medications: [{ genericName: '', strengthForm: '', dosageFrequency: '', duration: '', quantity: '', route: '' }],
    patientInstructions: '', pharmacistInstructions: '',
    digitalSignature: '',
    genericSubstitutionPermitted: false, refillAuthorized: false,
    numberOfRefills: '0', controlledSubstance: false,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');

  const loadSessions = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const response = await apiClient.get('/telemedicine/sessions', {
        params: { page: 1, limit: 50 },
      });
      const payload = unwrap<any>(response, {});
      const result: Consultation[] = Array.isArray(payload?.sessions) ? payload.sessions : Array.isArray(payload) ? payload : [];

      // Fetch each consultation's latest chat activity during the initial list load.
      // This prevents the list from changing order only after a chat is opened.
      const hydratedSessions = showSpinner ? await Promise.all(result.map(async (session) => {
        try {
          const messageResponse = await apiClient.get(`/telemedicine/messages/session/${encodeURIComponent(session._id)}`);
          const messagePayload = unwrap<any>(messageResponse, []);
          const items: ConsultationMessage[] = Array.isArray(messagePayload)
            ? messagePayload
            : Array.isArray(messagePayload?.messages)
              ? messagePayload.messages
              : Array.isArray(messagePayload?.items)
                ? messagePayload.items
                : [];
          const latestMessage = [...items].sort((a, b) => {
            const timestamp = (message: ConsultationMessage) => {
              const raw = message.sentAt || (message as any).createdAt;
              const value = raw ? new Date(raw).getTime() : 0;
              return Number.isFinite(value) ? value : 0;
            };
            return timestamp(b) - timestamp(a);
          })[0];
          if (!latestMessage) return session;
          return { ...session, lastMessageAt: latestMessage.sentAt || (latestMessage as any).createdAt || session.lastMessageAt };
        } catch {
          return session;
        }
      })) : result.map((session) => {
        // Keep the timestamps hydrated on first load when the periodic session
        // refresh does not include chat activity metadata.
        const previous = sessionsRef.current.find((item) => item._id === session._id);
        return session.lastMessageAt || !previous?.lastMessageAt
          ? session
          : { ...session, lastMessageAt: previous.lastMessageAt };
      });
      sessionsRef.current = hydratedSessions;
      setSessions(hydratedSessions);
      // Do not auto-open the first consultation; let the user choose one.
      setError('');
    } catch (cause: any) {
      setError(cause?.message || 'Unable to load patient consultations. Check your staff session and backend deployment.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (sessionId: string, showSpinner = false) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    if (showSpinner) setLoadingMessages(true);
    try {
      const response = await apiClient.get(`/telemedicine/messages/session/${encodeURIComponent(sessionId)}`);
      const payload = unwrap<any>(response, []);
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.messages)
          ? payload.messages
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
      if (selectedIdRef.current !== sessionId) return;
      const latestMessage = [...items].sort((a: ConsultationMessage, b: ConsultationMessage) => {
        const timeOf = (message: ConsultationMessage) => {
          const time = new Date(message.sentAt || (message as any).createdAt || 0).getTime();
          return Number.isFinite(time) ? time : 0;
        };
        return timeOf(b) - timeOf(a);
      })[0] as ConsultationMessage | undefined;
      if (latestMessage) {
        const latestTimestamp = latestMessage.sentAt || (latestMessage as any).createdAt;
        sessionsRef.current = sessionsRef.current.map((item) => item._id === sessionId
          ? { ...item, lastMessageAt: latestTimestamp || item.lastMessageAt }
          : item);
        setSessions(sessionsRef.current);
      }
      setMessages((current) => {
        const pending = current.filter(
          (message) => message.sessionId === sessionId && String(message._id).startsWith('local-'),
        );
        const merged = [...items];
        for (const message of pending) {
          if (!merged.some((item: ConsultationMessage) => item._id === message._id)) {
            merged.push(message);
          }
        }
        return merged;
      });
    } catch (cause: any) {
      setError(cause?.message || 'Unable to load this consultation’s messages.');
    } finally {
      if (showSpinner) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions(true);
    const interval = window.setInterval(() => void loadSessions(false), 10000);
    return () => window.clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    setNewMessageCount(0);
    setIsAtBottom(true);
    wasAtBottomRef.current = true;
    previousMessageIdsRef.current = new Set();
  }, [selectedId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    setMessages([]);
    setPrescriptions([]);
    void loadMessages(selectedId, true);
    if (!selectedId) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages(selectedId, false);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !wasAtBottomRef.current) return;
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, prescriptions]);

  useEffect(() => {
    const previousIds = previousMessageIdsRef.current;
    if (previousIds.size > 0 && !wasAtBottomRef.current) {
      const incomingCount = messages.filter((message) =>
        !previousIds.has(String(message._id)) &&
        !String(message._id).startsWith('local-') &&
        message.senderModel === 'Patient'
      ).length;
      if (incomingCount > 0) setNewMessageCount((count) => count + incomingCount);
    }
    previousMessageIdsRef.current = new Set(messages.map((message) => String(message._id)));
  }, [messages]);

  const selected = useMemo(() => sessions.find((item) => item._id === selectedId) || null, [sessions, selectedId]);

  const filteredSessions = useMemo(() => {
    const newestFirst = [...sessions].sort((a, b) => {
      const activityTime = (session: Consultation) => {
        const record = session as Consultation & { createdAt?: string; updatedAt?: string };
        const candidates = [record.lastMessageAt, record.lastMessage?.sentAt, record.lastMessage?.createdAt, record.createdAt]
          .map((value) => value ? new Date(value).getTime() : 0)
          .filter((value) => Number.isFinite(value));
        // Sort by latest chat activity, but keep newly created consultations visible even before their first message.
        return Math.max(0, ...candidates);
      };
      return activityTime(b) - activityTime(a);
    });

    return newestFirst.filter((session) => {
      if (filter === 'ACTIVE' && session.status !== 'WAITING_ROOM' && session.status !== 'IN_PROGRESS') {
        return false;
      }
      if (filter === 'UPCOMING' && (session.status !== 'WAITING_ROOM' || new Date(session.scheduledStartTime).getTime() <= Date.now())) {
        return false;
      }
      if (filter === 'COMPLETED' && session.status !== 'COMPLETED') {
        return false;
      }

      const query = search.trim().toLowerCase();
      if (!query) return true;

      const pName = patientName(session).toLowerCase();
      const complaint = (session.chiefComplaint || '').toLowerCase();
      return pName.includes(query) || complaint.includes(query);
    });
  }, [sessions, filter, search]);

  const sendMessage = async () => {
    if (!selected || (!draft.trim() && !attachmentFile) || sending) return;
    if (!selected.doctorAcceptedAt) {
      setError('Messaging is locked until the assigned doctor accepts this consultation order.');
      return;
    }
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status)) {
      setError('This consultation has ended. Messages are disabled. The patient can book a follow-up consultation.');
      return;
    }
    if (attachmentFile && attachmentFile.size > 10 * 1024 * 1024) {
      setError('Attachments must be 10 MB or smaller.');
      return;
    }
    const text = draft.trim();
    const fileToSend = attachmentFile;
    setDraft('');
    setSending(true);
    const optimistic: ConsultationMessage = {
      _id: `local-${Date.now()}`,
      sessionId: selected._id,
      senderId: currentUserId,
      senderModel: 'User',
      messageText: text,
      sentAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setSessions((current) => current.map((item) => item._id === selected._id
      ? { ...item, lastMessageAt: optimistic.sentAt }
      : item));
    try {
      let attachment: { url: string; name: string; mimeType: string; size: number } | undefined;
      if (fileToSend) {
        const form = new FormData();
        form.append('file', fileToSend);
        const uploadResponse = await fetch(`${API_BASE_URL}/telemedicine/messages/session/${encodeURIComponent(selected._id)}/attachments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: form,
        });
        const uploadPayload = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok || uploadPayload?.success === false) {
          throw new Error(uploadPayload?.message || 'Attachment upload failed.');
        }
        attachment = uploadPayload.data;
      }
      const response = await apiClient.post('/telemedicine/messages', {
        sessionId: selected._id,
        messageText: text || attachment?.name || '',
        ...(attachment ? { attachmentUrl: attachment.url, attachmentName: attachment.name, attachmentMimeType: attachment.mimeType, attachmentSize: attachment.size } : {}),
      });
      const saved = unwrap<ConsultationMessage | null>(response, null);
      if (saved?._id) {
        setMessages((current) => current.map((item) => item._id === optimistic._id ? saved : item));
      } else {
        await loadMessages(selected._id, false);
      }
      setAttachmentFile(null);
    } catch (cause: any) {
      setMessages((current) => current.filter((item) => item._id !== optimistic._id));
      void loadSessions(false);
      setDraft(text);
      if (fileToSend) setAttachmentFile(fileToSend);
      setError(cause?.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const joinConsultation = async (session: Consultation) => {
    setError('');
    if (session.consultationType === 'CHAT') {
      setError('This is a messages-only consultation. Voice and video calls are disabled.');
      return;
    }
    if (!session.doctorAcceptedAt) {
      setError('Accept this consultation order before starting the call.');
      return;
    }
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(session.status)) {
      setError('This consultation has ended. Book a follow-up consultation to start a new session.');
      return;
    }
    if (new Date(session.scheduledStartTime).getTime() > Date.now()) {
      setError(`This call is not available yet. It can be joined at ${new Date(session.scheduledStartTime).toLocaleString()}.`);
      return;
    }

    if (!session.meetingRoomId && !session.meetingUrl) {
      setError('This consultation has no meeting link or room ID. Ask the administrator to check the consultation setup.');
      return;
    }

    if (session.status === 'WAITING_ROOM') {
      try {
        await apiClient.patch(
          `/telemedicine/sessions/${encodeURIComponent(session._id)}/status`,
          { status: 'IN_PROGRESS' }
        );
        setSessions((current) =>
          current.map((item) =>
            item._id === session._id ? { ...item, status: 'IN_PROGRESS' } : item
          )
        );
      } catch (cause: any) {
        setError(cause?.message || 'The call page will open, but consultation status could not be updated.');
      }
    }

    // Open the call in its own named window so it can remain connected while staff navigate the main app.
    openTelemedicineCall(session._id, `/staff/call/${encodeURIComponent(session._id)}`, `${session.consultationType === 'VOICE' ? 'Voice' : 'Video'} consultation`, router.push);
  };

  const completeConsultation = async (session: Consultation) => {
    try {
      await apiClient.patch(`/telemedicine/sessions/${encodeURIComponent(session._id)}/status`, { status: 'COMPLETED' });
      setSessions((current) => current.map((item) => item._id === session._id ? { ...item, status: 'COMPLETED' } : item));
    } catch (cause: any) {
      setError(cause?.message || 'Unable to complete this consultation.');
    }
  };

  useEffect(() => {
    if (!selectedId) { setPrescriptions([]); return; }
    let active = true;
    const loadPrescriptions = () => {
      apiClient.get(`/telemedicine/sessions/${encodeURIComponent(selectedId)}/prescriptions`)
        .then((response) => {
          const value = unwrap<any>(response, []);
          if (active) setPrescriptions(Array.isArray(value) ? value : Array.isArray(value?.prescriptions) ? value.prescriptions : []);
        })
        .catch(() => { if (active) setPrescriptions([]); });
    };
    loadPrescriptions();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadPrescriptions();
    }, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [selectedId]);

  async function dispensePrescription(prescriptionId: string) {
    if (!pharmacyName.trim()) {
      setError('Enter the pharmacy name before recording dispensing.');
      return;
    }
    setDispensingId(prescriptionId);
    setError('');
    try {
      const response = await apiClient.patch(`/telemedicine/prescriptions/${encodeURIComponent(prescriptionId)}/dispense`, {
        pharmacyName: pharmacyName.trim(),
        pharmacistName: account?.name || `${account?.firstName || ''} ${account?.lastName || ''}`.trim(),
      });
      const updated = unwrap<any>(response, {});
      setPrescriptions((current) => current.map((item) => item._id === prescriptionId ? updated : item));
      setPharmacyName('');
    } catch (cause: any) {
      setError(cause?.message || 'Unable to record prescription dispensing.');
    } finally {
      setDispensingId('');
    }
  }

  useEffect(() => {
    if (!selectedId) { setLabRequests([]); return; }
    let active = true;
    const loadLabRequests = async () => {
      try {
        const response = await apiClient.get(`/telemedicine/sessions/${encodeURIComponent(selectedId)}/lab-requests`);
        const value = unwrap<any>(response, []);
        if (active) setLabRequests(Array.isArray(value) ? value : Array.isArray(value?.orders) ? value.orders : []);
      } catch {
        if (active) setLabRequests([]);
      }
    };
    void loadLabRequests();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadLabRequests();
    }, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [selectedId]);

  async function acceptConsultationOrder() {
    if (!selected) return;
    setAcceptingOrder(true);
    setError('');
    try {
      const response = await apiClient.patch(`/telemedicine/sessions/${encodeURIComponent(selected._id)}/accept`, {});
      const updated = unwrap<any>(response, {});
      const acceptedAt = updated?.doctorAcceptedAt || updated?.data?.doctorAcceptedAt || new Date().toISOString();
      const doctorName = String(account?.name || `${account?.firstName || ''} ${account?.lastName || ''}`.trim() || 'Doctor');
      setSessions((current) => current.map((item) => item._id === selected._id ? { ...item, doctorAcceptedAt: acceptedAt, doctorAcceptedByName: doctorName } : item));
    } catch (cause: any) {
      setError(cause?.message || 'Unable to accept this consultation order.');
    } finally {
      setAcceptingOrder(false);
    }
  }

  async function submitLabRequest(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (!labRequestForm.testName.trim() || !labRequestForm.sampleType.trim()) {
      setError('Enter the laboratory test and sample type.');
      return;
    }
    setLabSaving(true);
    setError('');
    try {
      const response = await apiClient.post(`/telemedicine/sessions/${encodeURIComponent(selected._id)}/lab-requests`, {
        testName: labRequestForm.testName.trim(),
        testCategory: labRequestForm.testCategory,
        sampleType: labRequestForm.sampleType.trim(),
        priority: labRequestForm.priority,
        isStat: labRequestForm.priority === 'STAT',
        notes: labRequestForm.notes.trim(),
      });
      const created = unwrap<any>(response, {});
      setLabRequests((current) => [created?.data || created, ...current]);
      setShowLabRequestForm(false);
      setLabRequestForm({ testName: '', testCategory: 'CLINICAL_CHEMISTRY', sampleType: 'Blood', priority: 'ROUTINE', notes: '' });
    } catch (cause: any) {
      setError(cause?.message || 'Unable to send the laboratory request. Confirm that consultation payment is verified.');
    } finally {
      setLabSaving(false);
    }
  }

  async function issuePrescription(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const medications = prescriptionForm.medications.map((item) => ({
      genericName: item.genericName.trim(),
      strengthForm: item.strengthForm.trim(),
      dosageFrequency: item.dosageFrequency.trim(),
      duration: item.duration.trim(),
      quantity: item.quantity.trim(),
      route: item.route.trim(),
    }));
    if (!medications.length || medications.some((item) => !item.genericName || !item.strengthForm || !item.dosageFrequency || !item.duration || !item.quantity || !item.route)) {
      setError('Complete all fields for every medication before issuing the prescription.');
      return;
    }
    setPrescriptionSaving(true);
    setError('');
    try {
      const response = await apiClient.post(`/telemedicine/sessions/${encodeURIComponent(selected._id)}/prescriptions`, {
        // Facility, prescriber, and patient identity are derived by the backend
        // from the authenticated doctor and the selected consultation session.
        diagnosis: prescriptionForm.diagnosis.trim(),
        clinicalNotes: prescriptionForm.clinicalNotes.trim(),
        medications,
        patientInstructions: prescriptionForm.patientInstructions.trim(),
        pharmacistInstructions: prescriptionForm.pharmacistInstructions.trim(),
        genericSubstitutionPermitted: prescriptionForm.genericSubstitutionPermitted,
        refillAuthorized: prescriptionForm.refillAuthorized,
        numberOfRefills: Number(prescriptionForm.numberOfRefills || 0),
        controlledSubstance: prescriptionForm.controlledSubstance,
        digitalSignature: prescriptionForm.digitalSignature.trim(),
        signedAt: new Date().toISOString(),
      });
      const created = unwrap<any>(response, {});
      setPrescriptions((current) => [created, ...current]);
      setShowPrescriptionForm(false);
      setPrescriptionForm((current) => ({ ...current, diagnosis: '', clinicalNotes: '', medications: [{ genericName: '', strengthForm: '', dosageFrequency: '', duration: '', quantity: '', route: '' }], patientInstructions: '', pharmacistInstructions: '' }));
    } catch (cause: any) {
      setError(cause?.message || 'Unable to issue the prescription.');
    } finally {
      setPrescriptionSaving(false);
    }
  }

  return (
    <div className="relative h-[calc(100dvh-6rem)] max-h-none min-h-0 md:h-[calc(100vh-6rem)] overflow-hidden overscroll-none rounded-xl sm:rounded-3xl border border-slate-100 bg-white font-sans shadow-sm">
      <div className="grid h-full grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)_240px]">
        {/* Left Sidebar */}
        <aside
          className={`${
            selectedId ? 'hidden md:flex' : 'flex'
          } min-h-0 flex-col border-r border-slate-100 bg-white`}
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">
                  Communication centre
                </p>
                <h1 className="mt-1 text-lg font-bold text-slate-800">
                  Patient care
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/staff/messages"
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-100"
                  title="Back to staff messages"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Staff chat</span>
                </Link>

                <button
                  type="button"
                  onClick={() => void loadSessions(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                  aria-label="Refresh consultations"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search consultations"
                className="h-10 w-full rounded-xl border border-slate-100 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68] focus:bg-white"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                    filter === item
                      ? 'bg-[#1b7b68] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item === 'ALL' ? 'All' : item === 'ACTIVE' ? 'Waiting / live' : item === 'UPCOMING' ? 'Upcoming' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-none">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />
              </div>
            ) : filteredSessions.length ? (
              filteredSessions.map((session) => {
                const pName = patientName(session);
                const active = selectedId === session._id;

                return (
                  <button
                    key={session._id}
                    type="button"
                    onClick={() => setSelectedId(session._id)}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                      active ? 'bg-[#e8f5f3]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        active ? 'bg-[#1b7b68] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {avatarLetters(pName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-slate-800">
                          {pName}
                        </p>
                        <span className="shrink-0 text-[9px] text-slate-400">
                          {formatTime(session.scheduledStartTime)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-1">
                        <p className="flex items-center gap-1 truncate text-[10px] text-slate-400">
                          {session.consultationType === 'VIDEO' ? (
                            <Video className="h-3 w-3 shrink-0" />
                          ) : session.consultationType === 'VOICE' ? (
                            <Phone className="h-3 w-3 shrink-0" />
                          ) : (
                            <MessageCircle className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{session.chiefComplaint || `${session.consultationType} consultation`}</span>
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                            session.status === 'IN_PROGRESS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : session.status === 'WAITING_ROOM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {statusLabel(session.status)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-5 text-center">
                <MessageCircle className="mx-auto h-7 w-7 text-slate-200" />
                <p className="mt-3 text-xs font-semibold text-slate-600">
                  No consultations found
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  Patient consultations assigned to your account will appear here.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Center Chat View */}
        <section
          className={`${
            selectedId ? 'flex' : 'hidden md:flex'
          } min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]`}
        >
          {selected ? (
            <>
              <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId('')}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 md:hidden"
                    aria-label="Back to consultations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <button type="button" onClick={() => setShowChatProfile(true)} title="Open chat profile" aria-label="Open patient chat profile" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-xs font-bold text-[#1b7b68] ring-offset-2 transition hover:ring-2 hover:ring-[#1b7b68]">
                    {avatarLetters(patientName(selected))}
                  </button>

                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-slate-800">
                      {patientName(selected)}
                    </h2>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-slate-400">
                      {selected.consultationType} · {formatDate(selected.scheduledStartTime)} · {statusLabel(selected.status)}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void loadMessages(selected._id, true)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
                    title="Refresh messages"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setShowChatProfile(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 lg:hidden"><ClipboardCheck className="h-3.5 w-3.5" /> Details</button>

                  {account?.role?.toUpperCase() === 'DOCTOR' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) && (
                    selected.doctorAcceptedAt ? (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Order accepted</span>
                    ) : (
                      <button type="button" disabled={acceptingOrder} onClick={() => void acceptConsultationOrder()} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                        {acceptingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                        {acceptingOrder ? 'Accepting…' : 'Accept order'}
                      </button>
                    )
                  )}
                  {account?.role?.toUpperCase() === 'DOCTOR' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) && (
                    <button type="button" onClick={() => setShowLabRequestForm(true)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-2 text-[10px] font-bold text-violet-700 hover:bg-violet-100">
                      <FlaskConical className="h-3.5 w-3.5" /> Lab request
                    </button>
                  )}

                  {selected.consultationType !== 'CHAT' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) && (
                    <button
                      type="button"
                      disabled={!selected.doctorAcceptedAt || new Date(selected.scheduledStartTime).getTime() > Date.now()}
                      title={!selected.doctorAcceptedAt ? 'Accept the consultation order first' : new Date(selected.scheduledStartTime).getTime() > Date.now() ? `Available at ${new Date(selected.scheduledStartTime).toLocaleString()}` : 'Join consultation'}
                      onClick={() => void joinConsultation(selected)}
                      className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1b7b68] px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#176c5c] disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-none sm:px-3.5"
                    >
                      {selected.consultationType === 'VOICE' ? <Phone className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                      <span>{!selected.doctorAcceptedAt ? 'Accept order first' : new Date(selected.scheduledStartTime).getTime() > Date.now() ? `Available ${new Date(selected.scheduledStartTime).toLocaleString()}` : selected.status === 'IN_PROGRESS' ? (selected.consultationType === 'VOICE' ? 'Join voice call' : 'Join video call') : (selected.consultationType === 'VOICE' ? 'Start voice call' : 'Start video call')}</span>
                    </button>
                  )}

                  {selected.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      onClick={() => void completeConsultation(selected)}
                      className="rounded-xl border border-slate-200 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      Complete
                    </button>
                  )}
                  {account?.role?.toUpperCase() === 'DOCTOR' && (
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionForm((value) => !value)}
                      className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#cde7e1] bg-[#f0faf7] px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-[#1b7b68] sm:flex-none sm:px-3"
                    >
                      <Pill className="h-3.5 w-3.5" />
                      Prescription
                    </button>
                  )}
                </div>
              </header>

              {error && (
                <div className="mx-4 mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}

              {showPrescriptionForm && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-md sm:p-6"
                  onClick={() => { if (!prescriptionSaving) setShowPrescriptionForm(false); }}
                >
                  <form
                    onSubmit={issuePrescription}
                    onClick={(event) => event.stopPropagation()}
                    className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl"
                  >
                    <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/70 bg-white/75 px-4 py-4 sm:px-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68] shadow-sm">
                          <Pill className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">MedXVerse · Telemedicine</p>
                          <h3 className="mt-0.5 text-base font-bold text-slate-900 sm:text-lg">Create prescription</h3>
                          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Saved to this consultation and sent to the HMS EHR.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={prescriptionSaving}
                        onClick={() => setShowPrescriptionForm(false)}
                        aria-label="Close prescription form"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                      {error && (
                        <div className="mb-4 rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 text-xs leading-5 text-rose-700">
                          {error}
                        </div>
                      )}
                      <div className="mb-4 rounded-xl border border-[#1b7b68]/15 bg-[#1b7b68]/5 px-3 py-2.5 text-xs leading-5 text-slate-600">
                        Patient, doctor, facility, registration and allergy details are linked automatically from this consultation and verified MedXVerse records.
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {([
                      ['diagnosis', 'Diagnosis'],
                      ['clinicalNotes', 'Clinical notes'],
                      ['digitalSignature', 'Digital signature (typed name)'],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="text-[10px] font-semibold text-slate-600">
                        {label}
                        <input
                          required={field === 'diagnosis' || field === 'digitalSignature'}
                          type="text"
                          value={(prescriptionForm as any)[field]}
                          onChange={(event) => setPrescriptionForm((current) => ({ ...current, [field]: event.target.value }))}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-700 outline-none focus:border-[#1b7b68]"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">Medication details (up to 6)</h4>
                    <button type="button" disabled={prescriptionForm.medications.length >= 6} onClick={() => setPrescriptionForm((current) => ({ ...current, medications: [...current.medications, { genericName: '', strengthForm: '', dosageFrequency: '', duration: '', quantity: '', route: '' }] }))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#1b7b68] disabled:opacity-40">Add medication</button>
                  </div>
                  {prescriptionForm.medications.map((medication, index) => (
                    <div key={index} className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-600">Medication {index + 1}
                        {prescriptionForm.medications.length > 1 && <button type="button" onClick={() => setPrescriptionForm((current) => ({ ...current, medications: current.medications.filter((_, itemIndex) => itemIndex !== index) }))} className="text-rose-600">Remove</button>}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {([
                          ['genericName', 'Generic name'],
                          ['strengthForm', 'Strength / dosage form'],
                          ['dosageFrequency', 'Dosage / frequency'],
                          ['duration', 'Duration'],
                          ['quantity', 'Quantity'],
                          ['route', 'Route'],
                        ] as const).map(([field, label]) => (
                          <label key={field} className="text-[10px] font-semibold text-slate-600">{label}
                            <input required value={medication[field]} onChange={(event) => setPrescriptionForm((current) => ({ ...current, medications: current.medications.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.value } : item) }))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-normal outline-none focus:border-[#1b7b68]" />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="text-[10px] font-semibold text-slate-600">Patient instructions<textarea value={prescriptionForm.patientInstructions} onChange={(event) => setPrescriptionForm((current) => ({ ...current, patientInstructions: event.target.value }))} className="mt-1 min-h-16 w-full rounded-lg border border-slate-200 p-2 text-xs font-normal" /></label>
                    <label className="text-[10px] font-semibold text-slate-600">Pharmacist instructions<textarea value={prescriptionForm.pharmacistInstructions} onChange={(event) => setPrescriptionForm((current) => ({ ...current, pharmacistInstructions: event.target.value }))} className="mt-1 min-h-16 w-full rounded-lg border border-slate-200 p-2 text-xs font-normal" /></label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-slate-600">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={prescriptionForm.genericSubstitutionPermitted} onChange={(event) => setPrescriptionForm((current) => ({ ...current, genericSubstitutionPermitted: event.target.checked }))} /> Generic substitution permitted</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={prescriptionForm.refillAuthorized} onChange={(event) => setPrescriptionForm((current) => ({ ...current, refillAuthorized: event.target.checked }))} /> Refills authorized</label>
                    <label className="flex items-center gap-1.5">Number of refills <input type="number" min="0" max="12" value={prescriptionForm.numberOfRefills} onChange={(event) => setPrescriptionForm((current) => ({ ...current, numberOfRefills: event.target.value }))} className="h-8 w-16 rounded border border-slate-200 px-2" /></label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={prescriptionForm.controlledSubstance} onChange={(event) => setPrescriptionForm((current) => ({ ...current, controlledSubstance: event.target.checked }))} /> Controlled substance</label>
                  </div>
                    </div>
                    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200/70 bg-white/80 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
                      <button
                        type="button"
                        disabled={prescriptionSaving}
                        onClick={() => setShowPrescriptionForm(false)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button type="submit" disabled={prescriptionSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#176c5c] disabled:cursor-not-allowed disabled:opacity-50">
                        {prescriptionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
                        {prescriptionSaving ? 'Issuing prescription…' : 'Issue prescription'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showLabRequestForm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" onClick={() => { if (!labSaving) setShowLabRequestForm(false); }}>
                  <form onSubmit={submitLabRequest} onClick={(event) => event.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-700">HMS Laboratory</p><h3 className="mt-1 text-base font-bold text-slate-900">New laboratory request</h3><p className="mt-1 text-xs text-slate-500">For {patientName(selected)} · linked to this consultation and patient record</p></div>
                      <button type="button" disabled={labSaving} onClick={() => setShowLabRequestForm(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close laboratory request"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Test / investigation name *<input required value={labRequestForm.testName} onChange={(event) => setLabRequestForm((current) => ({ ...current, testName: event.target.value }))} placeholder="e.g. Full blood count" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-violet-500" /></label>
                      <label className="text-xs font-semibold text-slate-700">Laboratory department<select value={labRequestForm.testCategory} onChange={(event) => setLabRequestForm((current) => ({ ...current, testCategory: event.target.value }))} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"><option value="HAEMATOLOGY">Haematology</option><option value="CLINICAL_CHEMISTRY">Clinical chemistry</option><option value="MICROBIOLOGY">Microbiology</option><option value="PARASITOLOGY">Parasitology</option><option value="IMMUNOLOGY_SEROLOGY">Immunology / serology</option><option value="HISTOPATHOLOGY">Histopathology</option><option value="CYTOLOGY">Cytology</option><option value="MOLECULAR_DIAGNOSTICS">Molecular diagnostics</option><option value="BLOOD_BANK">Blood bank</option><option value="GENETICS">Genetics</option></select></label>
                      <label className="text-xs font-semibold text-slate-700">Sample type *<input required value={labRequestForm.sampleType} onChange={(event) => setLabRequestForm((current) => ({ ...current, sampleType: event.target.value }))} placeholder="Blood, urine, swab…" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-violet-500" /></label>
                      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Priority<select value={labRequestForm.priority} onChange={(event) => setLabRequestForm((current) => ({ ...current, priority: event.target.value }))} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="STAT">STAT — immediate</option></select></label>
                      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Clinical notes / instructions<textarea value={labRequestForm.notes} onChange={(event) => setLabRequestForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Clinical indication, collection instructions…" className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-violet-500" /></label>
                    </div>
                    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end"><button type="button" disabled={labSaving} onClick={() => setShowLabRequestForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" disabled={labSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-50">{labSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}{labSaving ? 'Sending request…' : 'Send to HMS Lab'}</button></div>
                  </form>
                </div>
              )}

              <div
                ref={messagesContainerRef}
                onScroll={(event) => {
                  const el = event.currentTarget;
                  wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                  setIsAtBottom(wasAtBottomRef.current);
                  if (wasAtBottomRef.current) setNewMessageCount(0);
                }}
                className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5"
              >
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1b7b68]" />
                  </div>
                ) : (messages.length > 0 || prescriptions.length > 0 || Boolean(selected.doctorAcceptedAt)) ? (
                  <div className="mx-auto max-w-3xl space-y-3">
                    {selected.doctorAcceptedAt && (
                      <div className="flex justify-center py-1" role="status" aria-live="polite">
                        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-[11px] font-semibold text-emerald-800 shadow-sm">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Dr. {selected.doctorAcceptedByName || String(account?.name || `${account?.firstName || ''} ${account?.lastName || ''}`.trim() || (typeof selected.doctorId === 'object' ? `${selected.doctorId.firstName || ''} ${selected.doctorId.lastName || ''}`.trim() : 'Doctor'))} Accepted your consultation order
                          <span className="hidden sm:inline text-emerald-600">· {formatDate(selected.doctorAcceptedAt)}</span>
                        </div>
                      </div>
                    )}
                    {labRequests.length > 0 && (
                      <section className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-3 sm:p-4">
                        <div className="mb-2 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-violet-700" /><h3 className="text-xs font-bold text-violet-900">Laboratory requests</h3><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-violet-700">{labRequests.length}</span></div>
                        <div className="space-y-2">{labRequests.map((order: any, index: number) => <div key={String(order._id || order.id || index)} className="rounded-xl border border-violet-100 bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-xs font-bold text-slate-800">{order.testName || order.panelName || 'Laboratory investigation'}</p><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold uppercase text-violet-700">{String(order.status || 'PENDING').replace(/_/g, ' ')}</span></div><p className="mt-1 text-[10px] text-slate-500">{String(order.testCategory || '').replace(/_/g, ' ')} · {order.sampleType || 'Sample not specified'} · {String(order.priority || 'ROUTINE').replace(/_/g, ' ')}</p>{order.notes && <p className="mt-1 whitespace-pre-wrap text-[11px] text-slate-600">{order.notes}</p>}</div>)}</div>
                      </section>
                    )}
                    {[
                        ...messages.map((message) => ({
                          kind: 'message' as const,
                          timestamp: new Date(message.sentAt || 0).getTime() || 0,
                          message,
                        })),
                        ...prescriptions.map((prescription: any) => ({
                          kind: 'prescription' as const,
                          timestamp: new Date(prescription.dateIssued || prescription.createdAt || 0).getTime() || 0,
                          prescription,
                        })),
                      ].sort((a, b) => a.timestamp - b.timestamp).map((timelineItem) => {
                        if (timelineItem.kind === 'prescription') {
                          const prescription = timelineItem.prescription;
                          const prescriptionKey = String(prescription._id || prescription.verificationId || timelineItem.timestamp);
                          const isExpanded = String(viewingPrescription?._id || viewingPrescription?.verificationId || '') === prescriptionKey;
                          return (
                            <div key={`prescription-${prescriptionKey}`} className="flex justify-center py-1">
                              <article className="w-full max-w-[95%] overflow-hidden rounded-2xl border border-[#cde7e1] bg-white shadow-sm">
                                <div className="flex items-start gap-3 p-3 sm:p-4">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><Pill className="h-5 w-5" /></div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#1b7b68]">Prescription issued</p>
                                    <p className="mt-0.5 break-words text-sm font-bold text-slate-800">{prescription.diagnosis || 'Prescription details'}</p>
                                    <p className="mt-1 text-[10px] text-slate-500">{prescription.prescriberName || 'Care team'} · {prescription.dateIssued ? formatDate(prescription.dateIssued) : 'Date not provided'}</p>
                                    <p className="mt-1 text-[10px] text-slate-500">{(prescription.medications || []).length} medication{(prescription.medications || []).length === 1 ? '' : 's'} · {String(prescription.status || 'ISSUED').replace(/_/g, ' ')}</p>
                                  </div>
                                  <button type="button" onClick={() => setViewingPrescription(isExpanded ? null : prescription)} aria-expanded={isExpanded} className="shrink-0 rounded-xl border border-[#cde7e1] bg-[#f0faf7] px-3 py-2 text-[10px] font-bold text-[#1b7b68] hover:bg-[#e5f5ef]">{isExpanded ? 'Hide details' : 'View details'}</button>
                                </div>
                                {isExpanded && (
                                  <div className="space-y-3 border-t border-[#e3f1ed] bg-[#fbfefd] p-3 sm:p-4">
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Medication details</p>
                                      {(prescription.medications || []).length ? (
                                        <div className="mt-2 space-y-2">
                                          {prescription.medications.map((medication: any, index: number) => (
                                            <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
                                              <p className="text-xs font-bold text-slate-800">{index + 1}. {medication.genericName || 'Medication'}{medication.strengthForm ? ` · ${medication.strengthForm}` : ''}</p>
                                              <div className="mt-2 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600 sm:grid-cols-2">
                                                <p><span className="font-semibold">Dose / frequency:</span> {medication.dosageFrequency || 'Not specified'}</p>
                                                <p><span className="font-semibold">Duration:</span> {medication.duration || 'Not specified'}</p>
                                                <p><span className="font-semibold">Quantity:</span> {medication.quantity || 'Not specified'}</p>
                                                <p><span className="font-semibold">Route:</span> {medication.route || 'Not specified'}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : <p className="mt-1 text-xs text-slate-500">Medication details are not available.</p>}
                                    </div>
                                    {prescription.clinicalNotes && <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clinical notes</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{prescription.clinicalNotes}</p></div>}
                                    {prescription.patientInstructions && <div className="rounded-xl border border-[#cde7e1] bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">Patient instructions</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{prescription.patientInstructions}</p></div>}
                                    {prescription.pharmacistInstructions && <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pharmacist instructions</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{prescription.pharmacistInstructions}</p></div>}
                                    {prescription.verificationId && <p className="break-all text-[10px] text-slate-400">Verification ID: {prescription.verificationId}</p>}
                                  </div>
                                )}
                              </article>
                            </div>
                          );
                        }
                        const message = timelineItem.message;

                      const mine = message.senderModel !== 'Patient' || message.senderId === currentUserId;
                      const prescriptionNotice = /Prescription issued\s*\(([^)]+)\)/i.exec(message.messageText || '');
                      if (prescriptionNotice && prescriptions.some((item) => item.verificationId === prescriptionNotice[1] || item._id === prescriptionNotice[1])) return null;

                      if (message.messageType === 'CALL_STARTED' && message.callSummary) {
                        const call = message.callSummary;
                        // Older builds could create separate IDs for the ringing row and its
                        // final summary. Hide the stale ringing row when a matching later summary
                        // exists, so one call is represented by one activity card.
                        const startedAt = new Date(message.sentAt || 0).getTime();
                        const hasLaterSummary = messages.some((candidate) => {
                          if (candidate.messageType !== 'CALL_SUMMARY' || !candidate.callSummary) return false;
                          if (candidate.callSummary.callType !== call.callType) return false;
                          const summaryAt = new Date(candidate.sentAt || 0).getTime();
                          return summaryAt >= startedAt && summaryAt - startedAt <= 10 * 60 * 1000;
                        });
                        if (hasLaterSummary) return null;
                        const CallIcon = call.callType === 'VIDEO' ? Video : Phone;
                        return (
                          <div key={message._id} className="flex justify-center py-1">
                            <div className="flex max-w-[95%] items-center gap-3 rounded-2xl border border-[#b9ded3] bg-[#f5fbf9] px-4 py-3 text-slate-700 shadow-sm">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                                <CallIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800">{call.callType === 'VIDEO' ? 'Video call' : 'Voice call'}</p>
                                <p className="mt-0.5 text-[11px] font-semibold text-[#1b7b68]">Calling…</p>
                                <p className="mt-1 text-[9px] text-slate-400">{formatTime(message.sentAt)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (message.messageType === 'CALL_SUMMARY' && message.callSummary) {
                        const call = message.callSummary;
                        const isMissedCall = Boolean(call.missedCall);
                        const minutes = Math.floor(call.durationSeconds / 60);
                        const seconds = call.durationSeconds % 60;
                        const durationLabel = minutes > 0
                          ? `${minutes} min${seconds ? ` ${seconds} sec` : ''}`
                          : `${seconds} sec`;
                        const CallIcon = call.callType === 'VIDEO' ? Video : Phone;
                        return (
                          <div key={message._id} className="flex justify-center py-1">
                            <div className="flex max-w-[95%] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 shadow-sm">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                                <CallIcon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800">{call.callType === 'VIDEO' ? 'Video call' : 'Voice call'}</p>
                                <p className={`mt-0.5 text-[11px] ${isMissedCall ? 'font-semibold text-red-600' : 'text-slate-600'}`}>{isMissedCall ? 'Missed call' : `${durationLabel} · ${call.participantCount} ${call.participantCount === 1 ? 'participant' : 'participants'} joined`}</p>
                                <p className="mt-1 text-[9px] text-slate-400">{formatTime(message.sentAt)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={message._id}
                          className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[92%] rounded-2xl px-3 py-2.5 shadow-sm sm:max-w-[82%] sm:px-4 ${
                              mine
                                ? 'rounded-br-md bg-[#1b7b68] text-white'
                                : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                            }`}
                          >
                            {!mine && (
                              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1b7b68]">
                                {message.senderModel === 'Patient' ? 'Patient' : 'Care team'}
                              </p>
                            )}

                            {message.messageText && !(message.attachmentUrl && message.messageText === message.attachmentName) && (
                              <p className="whitespace-pre-wrap text-sm leading-5">{message.messageText}</p>
                            )}
                            {message.attachmentUrl && (
                              <ChatAttachmentViewer
                                url={message.attachmentUrl}
                                name={message.attachmentName}
                                mimeType={message.attachmentMimeType}
                                size={message.attachmentSize}
                                mine={mine}
                              />
                            )}

                            <div
                              className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                                mine ? 'text-white/60' : 'text-slate-400'
                              }`}
                            >
                              <span>{formatTime(message.sentAt)}</span>
                              {mine && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                      <MessageCircle className="h-6 w-6" />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-700">
                      Start the patient conversation
                    </h3>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                      Messages sent here are delivered directly to the patient in their portal consultation room.
                    </p>
                  </div>
                )}
                {(!isAtBottom || newMessageCount > 0) && (
                  <div className="sticky bottom-2 z-20 flex justify-center pointer-events-none">
                    <button type="button" onClick={() => { const el = messagesContainerRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); setNewMessageCount(0); setIsAtBottom(true); wasAtBottomRef.current = true; }} className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#b8ddd2] bg-white px-4 py-2 text-xs font-bold text-[#176b5b] shadow-lg transition hover:bg-[#eff9f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b7b68]">
                      {newMessageCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b7b68] px-1 text-[10px] text-white">{newMessageCount}</span>}
                      {newMessageCount > 0 ? (newMessageCount === 1 ? '1 new message' : `${newMessageCount} new messages`) : 'Back to latest'}
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) && !selected.doctorAcceptedAt ? (
                <div className="shrink-0 border-t border-amber-100 bg-amber-50 px-4 py-5 text-center">
                  <p className="text-sm font-bold text-amber-900">Accept the consultation order to unlock chat</p>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-amber-800">The patient and care team can exchange messages after the assigned doctor accepts this order.</p>
                </div>
              ) : !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) ? (
              <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
                {attachmentFile && (
                  <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="truncate">{attachmentFile.name}</span>
                    <button type="button" onClick={() => setAttachmentFile(null)} className="font-semibold text-rose-600">Remove</button>
                  </div>
                )}
                <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#1b7b68] focus-within:bg-white">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onComposerKeyDown}
                    rows={2}
                    placeholder="Write a secure patient consultation message..."
                    className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100">
                        <Paperclip className="h-3.5 w-3.5" /> Attach
                        <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf" onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          if (file && file.size > 10 * 1024 * 1024) {
                            setError('Attachments must be 10 MB or smaller.');
                            setAttachmentFile(null);
                          } else {
                            setError('');
                            setAttachmentFile(file);
                          }
                          event.currentTarget.value = '';
                        }} />
                      </label>
                      <span className="px-1 text-[10px] text-slate-400">Press Enter to send</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={(!draft.trim() && !attachmentFile) || sending}
                      className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              </div>
              ) : (
                <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-4 text-center text-xs text-slate-500">
                  {['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status)
                    ? 'This consultation has ended. Messaging and calls are disabled. The patient can book a follow-up consultation.'
                    : 'Secure messaging is available during active consultations, regardless of whether the booked call is voice or video.'}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                <Video className="h-7 w-7 text-[#1b7b68]" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-800">
                Patient consultation room
              </h2>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                Select a consultation from the queue on the left to review details, chat with the patient, or attend their video call.
              </p>
            </div>
          )}
        </section>

        {/* Right Info Sidebar */}
        <aside className="hidden min-w-0 max-w-60 border-l border-slate-100 bg-white p-4 lg:block overflow-y-auto">
          {selected ? (
            <div className="space-y-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Patient
                </p>

                <h3 className="mt-1 text-sm font-bold text-slate-800">
                  {patientName(selected)}
                </h3>

                {typeof selected.patientId === 'object' && selected.patientId?.mrn && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    MRN: {selected.patientId.mrn}
                  </p>
                )}

                {typeof selected.patientId === 'object' && selected.patientId?.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>{selected.patientId.phone}</span>
                  </p>
                )}
              </div>

              {selected.chiefComplaint && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Chief Complaint
                  </p>
                  <p className="mt-1 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs leading-5 text-slate-600">
                    {selected.chiefComplaint}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Consultation Type
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  {selected.consultationType === 'VIDEO' ? (
                    <Video className="h-3.5 w-3.5 text-[#1b7b68]" />
                  ) : selected.consultationType === 'VOICE' ? (
                    <Phone className="h-3.5 w-3.5 text-[#1b7b68]" />
                  ) : (
                    <MessageCircle className="h-3.5 w-3.5 text-[#1b7b68]" />
                  )}
                  {selected.consultationType} Consultation
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Status
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    selected.status === 'IN_PROGRESS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : selected.status === 'WAITING_ROOM'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusLabel(selected.status)}
                </span>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Scheduled Time
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{formatDate(selected.scheduledStartTime)}</span>
                </p>
              </div>

              {selected.consultationType !== 'CHAT' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!selected.doctorAcceptedAt || new Date(selected.scheduledStartTime).getTime() > Date.now()}
                    title={!selected.doctorAcceptedAt ? 'Accept the consultation order first' : new Date(selected.scheduledStartTime).getTime() > Date.now() ? `Available at ${new Date(selected.scheduledStartTime).toLocaleString()}` : 'Start or join consultation'}
                    onClick={() => void joinConsultation(selected)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#176c5c] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {selected.consultationType === 'VOICE' ? <Phone className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                    <span>{!selected.doctorAcceptedAt ? 'Accept order first' : new Date(selected.scheduledStartTime).getTime() > Date.now() ? `Available ${new Date(selected.scheduledStartTime).toLocaleString()}` : selected.status === 'IN_PROGRESS' ? (selected.consultationType === 'VOICE' ? 'Join voice call' : 'Join video call') : (selected.consultationType === 'VOICE' ? 'Start voice call' : 'Start video call')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-400">Select a consultation to view details</p>
            </div>
          )}
        </aside>
      </div>

      {showChatProfile && selected && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:p-5" onClick={() => setShowChatProfile(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="staff-chat-profile-title" className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">MedXVerse chat</p><h2 id="staff-chat-profile-title" className="mt-1 text-base font-bold text-slate-900">Consultation details</h2></div>
              <button type="button" onClick={() => setShowChatProfile(false)} aria-label="Close chat profile" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-6 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-lg font-bold text-[#1b7b68]">{avatarLetters(patientName(selected))}</div>
                <div className="min-w-0"><h3 className="break-words text-lg font-bold text-slate-900">{patientName(selected)}</h3><p className="mt-1 text-xs text-slate-500">Patient · {selected.consultationType} consultation</p><p className="mt-1 text-[11px] text-slate-400">{statusLabel(selected.status)} · {formatDate(selected.scheduledStartTime)}</p></div>
              </div>
              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Patient</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{patientName(selected)}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">MRN</p><p className="mt-1 break-words text-xs font-semibold text-slate-700">{typeof selected.patientId === 'object' ? selected.patientId.mrn || 'Not available' : 'Not available'}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Phone</p><p className="mt-1 break-words text-xs font-semibold text-slate-700">{typeof selected.patientId === 'object' ? selected.patientId.phone || 'Not available' : 'Not available'}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Consultation type</p><p className="mt-1 text-xs font-semibold text-slate-700">{selected.consultationType} Consultation</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</p><p className="mt-1 text-xs font-semibold text-slate-700">{statusLabel(selected.status)}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Scheduled time</p><p className="mt-1 text-xs font-semibold text-slate-700">{formatDate(selected.scheduledStartTime)}</p></div>
                </div>
                <div className="mt-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Consultation reason</p><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{selected.chiefComplaint || 'No reason provided.'}</p></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {account?.role?.toUpperCase() === 'DOCTOR' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) && (selected.doctorAcceptedAt ? <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Order accepted</span> : <button type="button" disabled={acceptingOrder} onClick={() => void acceptConsultationOrder()} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 disabled:opacity-50">{acceptingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}{acceptingOrder ? 'Accepting…' : 'Accept order'}</button>)}
                  {account?.role?.toUpperCase() === 'DOCTOR' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) && <button type="button" onClick={() => { setShowChatProfile(false); setShowLabRequestForm(true); }} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700"><FlaskConical className="h-3.5 w-3.5" /> Lab request</button>}
                  {account?.role?.toUpperCase() === 'DOCTOR' && <button type="button" onClick={() => { setShowChatProfile(false); setShowPrescriptionForm(true); }} className="inline-flex items-center gap-1.5 rounded-xl border border-[#cde7e1] bg-[#f0faf7] px-3 py-2 text-[10px] font-bold text-[#1b7b68]"><Pill className="h-3.5 w-3.5" /> Prescription</button>}
                  {selected.consultationType !== 'CHAT' && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(selected.status) && <button type="button" disabled={!selected.doctorAcceptedAt || new Date(selected.scheduledStartTime).getTime() > Date.now()} onClick={() => void joinConsultation(selected)} title={!selected.doctorAcceptedAt ? 'Accept order first' : new Date(selected.scheduledStartTime).getTime() > Date.now() ? `Available at ${formatDate(selected.scheduledStartTime)}` : 'Start video call'} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b7b68] px-3 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{selected.consultationType === 'VOICE' ? <Phone className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}{!selected.doctorAcceptedAt ? 'Accept order first' : new Date(selected.scheduledStartTime).getTime() > Date.now() ? `Available ${formatDate(selected.scheduledStartTime)}` : selected.status === 'IN_PROGRESS' ? 'Join call' : 'Start video call'}</button>}
                </div>
              </section>
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700"><Images className="h-4 w-4 text-[#1b7b68]" /> Media</h3>
                {messages.filter((item) => item.attachmentUrl && String(item.attachmentMimeType || '').startsWith('image/')).length ? (
                  <div className="grid grid-cols-3 items-start gap-2 sm:grid-cols-4 lg:grid-cols-6">{messages.filter((item) => item.attachmentUrl && String(item.attachmentMimeType || '').startsWith('image/')).map((item) => <div key={item._id} className="min-w-0"><ChatAttachmentViewer url={item.attachmentUrl!} name={item.attachmentName || 'Shared image'} mimeType={item.attachmentMimeType} size={(item as any).attachmentSize} thumbnail /></div>)}</div>
                ) : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No images shared in this chat yet.</p>}
              </section>
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700"><FileText className="h-4 w-4 text-[#1b7b68]" /> Documents</h3>
                <div className="space-y-2">{messages.filter((item) => item.attachmentUrl && !String(item.attachmentMimeType || '').startsWith('image/')).map((item) => <div key={item._id} className="min-w-0"><ChatAttachmentViewer url={item.attachmentUrl!} name={item.attachmentName || 'Shared document'} mimeType={item.attachmentMimeType} size={(item as any).attachmentSize} /></div>)}</div>
                {!messages.some((item) => item.attachmentUrl && !String(item.attachmentMimeType || '').startsWith('image/')) && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No documents shared in this chat yet.</p>}
              </section>
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700"><Pill className="h-4 w-4 text-[#1b7b68]" /> Prescriptions in this chat</h3>
                {prescriptions.length ? <div className="space-y-2">{prescriptions.map((item: any) => <article key={item._id || item.verificationId} className="rounded-xl border border-slate-100 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold text-slate-800">{item.diagnosis || 'Prescription'}</p><p className="mt-1 text-[10px] text-slate-500">{item.dateIssued ? formatDate(item.dateIssued) : 'Date not available'}</p></div><span className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[9px] font-bold text-[#1b7b68]">{item.status || 'ISSUED'}</span></div><p className="mt-2 text-[11px] text-slate-600">{Array.isArray(item.medications) ? item.medications.map((med: any) => med.genericName).filter(Boolean).join(', ') : 'Medication details unavailable'}</p><button type="button" onClick={() => { setViewingPrescription(item); setShowChatProfile(false); }} className="mt-2 text-[10px] font-bold text-[#1b7b68] hover:underline">View prescription details</button></article>)}</div> : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No prescriptions have been issued in this chat.</p>}
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
