'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
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
  scheduledStartTime: string;
  meetingUrl?: string;
  meetingRoomId?: string;
  chiefComplaint?: string;
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
  const selectedIdRef = useRef('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const previousMessageIdsRef = useRef<Set<string>>(new Set());
  const [newMessageCount, setNewMessageCount] = useState(0);

  const [sessions, setSessions] = useState<Consultation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionSaving, setPrescriptionSaving] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('');
  const [dispensingId, setDispensingId] = useState('');
  const [prescriptionForm, setPrescriptionForm] = useState({
    facilityName: '', prescriberName: '', professionalRegistrationNumber: '',
    patientFullName: '', patientDob: '', patientNumber: '', allergies: '',
    diagnosis: '', clinicalNotes: '', medications: [{ genericName: '', strengthForm: '', dosageFrequency: '', duration: '', quantity: '', route: '' }],
    patientInstructions: '', pharmacistInstructions: '',
    prescriberAuthorizationId: '', digitalSignature: '',
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
      const result = Array.isArray(payload?.sessions) ? payload.sessions : Array.isArray(payload) ? payload : [];
      setSessions(result);
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
    wasAtBottomRef.current = true;
    previousMessageIdsRef.current = new Set();
  }, [selectedId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    void loadMessages(selectedId, true);
    if (!selectedId) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages(selectedId, false);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !wasAtBottomRef.current) return;
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });
  }, [messages]);

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
    return sessions.filter((session) => {
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

    // Open the staff-specific call interface inside the existing staff layout.
    window.location.assign(`/staff/call/${encodeURIComponent(session._id)}`);
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
    apiClient.get(`/telemedicine/sessions/${encodeURIComponent(selectedId)}/prescriptions`)
      .then((response) => {
        const value = unwrap<any>(response, []);
        if (active) setPrescriptions(Array.isArray(value) ? value : Array.isArray(value?.prescriptions) ? value.prescriptions : []);
      })
      .catch(() => { if (active) setPrescriptions([]); });
    return () => { active = false; };
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

  async function issuePrescription(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const patient = typeof selected.patientId === 'string' ? undefined : selected.patientId;
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
        facilityName: prescriptionForm.facilityName.trim(),
        prescriberName: prescriptionForm.prescriberName.trim(),
        registrationNumber: prescriptionForm.professionalRegistrationNumber.trim(),
        patientSnapshot: {
          fullName: prescriptionForm.patientFullName.trim() || patientName(selected),
          dateOfBirth: prescriptionForm.patientDob || undefined,
          patientIdNumber: patient?.mrn || undefined,
          contactNumber: prescriptionForm.patientNumber.trim() || patient?.phone || undefined,
          knownDrugAllergies: prescriptionForm.allergies.split(',').map((item) => item.trim()).filter(Boolean),
        },
        diagnosis: prescriptionForm.diagnosis.trim(),
        clinicalNotes: prescriptionForm.clinicalNotes.trim(),
        medications,
        patientInstructions: prescriptionForm.patientInstructions.trim(),
        pharmacistInstructions: prescriptionForm.pharmacistInstructions.trim(),
        genericSubstitutionPermitted: prescriptionForm.genericSubstitutionPermitted,
        refillAuthorized: prescriptionForm.refillAuthorized,
        numberOfRefills: Number(prescriptionForm.numberOfRefills || 0),
        controlledSubstance: prescriptionForm.controlledSubstance,
        prescriberAuthorizationId: prescriptionForm.prescriberAuthorizationId.trim(),
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
    <div className="relative h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] overflow-hidden overscroll-none rounded-3xl border border-slate-100 bg-white font-sans shadow-sm">
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

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">
                    {avatarLetters(patientName(selected))}
                  </div>

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

                  {selected.consultationType !== 'CHAT' && (
                    <button
                      type="button"
                      onClick={() => void joinConsultation(selected)}
                      className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1b7b68] px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#176c5c] sm:flex-none sm:px-3.5"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>{selected.status === 'IN_PROGRESS' ? 'Join call' : 'Start consultation'}</span>
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
                <form onSubmit={issuePrescription} className="mx-2 mt-2 max-h-[42vh] overflow-y-auto rounded-2xl border border-[#cde7e1] bg-[#f8fcfb] p-3 sm:mx-4 sm:mt-3 sm:max-h-[48vh] sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">MHMS Telemedicine Prescription</h3>
                      <p className="text-[10px] text-slate-500">Issued prescriptions are saved to the consultation and sent to the HMS EHR.</p>
                    </div>
                    <button type="button" onClick={() => setShowPrescriptionForm(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {([
                      ['facilityName', 'Facility / Hospital name'],
                      ['prescriberName', 'Prescriber full name'],
                      ['professionalRegistrationNumber', 'Professional registration number'],
                      ['patientFullName', 'Patient full name'],
                      ['patientDob', 'Patient date of birth'],
                      ['patientNumber', 'Patient contact number'],
                      ['allergies', 'Known drug allergies (comma separated)'],
                      ['diagnosis', 'Diagnosis'],
                      ['clinicalNotes', 'Clinical notes'],
                      ['prescriberAuthorizationId', 'Prescriber authorization ID'],
                      ['digitalSignature', 'Digital signature (typed name)'],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="text-[10px] font-semibold text-slate-600">
                        {label}
                        <input
                          required={['facilityName','prescriberName','professionalRegistrationNumber','diagnosis','prescriberAuthorizationId','digitalSignature'].includes(field)}
                          type={field === 'patientDob' ? 'date' : 'text'}
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
                  <button type="submit" disabled={prescriptionSaving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                    {prescriptionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
                    Issue prescription
                  </button>
                </form>
              )}

              {prescriptions.length > 0 && (
                <div className="mx-4 mt-3 rounded-xl border border-slate-100 bg-white p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Issued prescriptions</p>
                  <div className="flex flex-wrap gap-2">
                    {prescriptions.map((prescription) => (
                      <div key={prescription._id || prescription.verificationId} className="rounded-lg bg-[#f0faf7] px-3 py-2 text-xs text-slate-700">
                        <p className="font-semibold">{prescription.diagnosis || 'Prescription'} · {prescription.status || 'ISSUED'}</p>
                        <p className="mt-1 break-all text-[10px] text-slate-500">Verification ID: {prescription.verificationId || 'Pending'}</p>
                        {['PHARMACIST', 'HOSPITAL_ADMIN'].includes(String(account?.role || '').toUpperCase()) && prescription.status !== 'DISPENSED' && prescription.status !== 'CANCELLED' && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input value={pharmacyName} onChange={(event) => setPharmacyName(event.target.value)} placeholder="Pharmacy name" className="h-8 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[10px] outline-none focus:border-[#1b7b68]" />
                            <button type="button" onClick={() => void dispensePrescription(prescription._id)} disabled={dispensingId === prescription._id} className="rounded-lg bg-[#1b7b68] px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                              {dispensingId === prescription._id ? 'Saving…' : 'Record dispensing'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                ref={messagesContainerRef}
                onScroll={(event) => {
                  const el = event.currentTarget;
                  wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                  if (wasAtBottomRef.current) setNewMessageCount(0);
                }}
                className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5"
              >
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1b7b68]" />
                  </div>
                ) : messages.length ? (
                  <div className="mx-auto max-w-3xl space-y-3">
                    {messages.map((message) => {
                      const mine = message.senderModel !== 'Patient' || message.senderId === currentUserId;

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
                {newMessageCount > 0 && (
                  <div className="sticky bottom-2 z-20 flex justify-center pointer-events-none">
                    <button type="button" onClick={() => { const el = messagesContainerRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); setNewMessageCount(0); }} className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#b8ddd2] bg-white px-4 py-2 text-xs font-bold text-[#176b5b] shadow-lg transition hover:bg-[#eff9f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b7b68]">
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b7b68] px-1 text-[10px] text-white">{newMessageCount}</span>
                      {newMessageCount === 1 ? '1 new message' : `${newMessageCount} new messages`}
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

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

              {selected.consultationType !== 'CHAT' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => void joinConsultation(selected)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#176c5c]"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>{selected.status === 'IN_PROGRESS' ? 'Join video room' : 'Start consultation'}</span>
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
    </div>
  );
}
