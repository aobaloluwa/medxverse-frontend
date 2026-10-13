import { API_BASE_URL, getAuthHeaders } from '@/services/appointment.service';

export type TelemedicineStatus = 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ConsultationType = 'VIDEO' | 'VOICE' | 'CHAT';

export interface TelemedicinePerson {
  _id: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  staffId?: string;
  phone?: string;
  email?: string;
  role?: string;
  department?: string;
  specialization?: string;
  status?: string;
}

export interface TelemedicineSession {
  _id: string;
  appointmentId?: string | { _id?: string; appointmentDate?: string; startTime?: string; status?: string };
  patientId: TelemedicinePerson | string;
  doctorId: TelemedicinePerson | string;
  consultationType: ConsultationType;
  status: TelemedicineStatus;
  scheduledStartTime: string;
  meetingRoomId: string;
  meetingUrl?: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  actualStartTime?: string;
  callStartedAt?: string;
  callEndedAt?: string;
  activeCallId?: string;
  callInitiatorType?: 'PATIENT' | 'STAFF';
  endTime?: string;
  durationMinutes?: number;
}

export interface TelemedicineMessage {
  _id: string;
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
    missedCall?: boolean;
  };
  sentAt: string;
}

export interface TelemedicineMedication {
  genericName: string;
  strengthForm: string;
  dosageFrequency: string;
  duration: string;
  quantity: string;
  route: string;
}

export interface TelemedicinePatientSnapshot {
  fullName: string;
  dateOfBirth?: string;
  patientIdNumber?: string;
  contactNumber?: string;
  residentialAddress?: string;
  knownDrugAllergies?: string[];
}

export interface TelemedicinePrescriptionInput {
  // Identity and facility fields are resolved by the backend from the session.
  telemedicinePlatform?: string;
  diagnosis: string;
  clinicalNotes?: string;
  medications: TelemedicineMedication[];
  patientInstructions?: string;
  pharmacistInstructions?: string;
  genericSubstitutionPermitted?: boolean;
  refillAuthorized?: boolean;
  numberOfRefills?: number;
  controlledSubstance?: boolean;
  digitalSignature: string;
}

export interface TelemedicinePrescription {
  _id: string;
  verificationId: string;
  status: 'ISSUED' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'CANCELLED';
  facilityName: string;
  prescriberName: string;
  professionalRegistrationNumber: string;
  dateIssued: string;
  patientSnapshot?: TelemedicinePatientSnapshot;
  diagnosis: string;
  clinicalNotes?: string;
  medications: TelemedicineMedication[];
  patientInstructions?: string;
  pharmacistInstructions?: string;
  genericSubstitutionPermitted?: boolean;
  refillAuthorized?: boolean;
  numberOfRefills?: number;
  controlledSubstance?: boolean;
  pharmacyDispensing?: { dispensedBy?: string; pharmacyName?: string; dateDispensed?: string; notes?: string };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/telemedicine${path}`, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init.headers || {}) },
    cache: 'no-store',
  });
  const raw = await response.text();
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Telemedicine request failed (${response.status})`);
  }
  return payload.data as T;
}

export interface JaaSMeetingToken {
  domain: '8x8.vc';
  appId: string;
  roomName: string;
  jwt: string;
  meetingUrl: string;
  expiresAt: string;
}

export const telemedicineService = {
  getMeetingToken: (sessionId: string) =>
    request<JaaSMeetingToken>(`/sessions/${encodeURIComponent(sessionId)}/meeting-token`),
  getDirectory: () => request<{ patients: TelemedicinePerson[]; doctors: TelemedicinePerson[] }>('/directory'),
  getSessions: () => request<{ sessions: TelemedicineSession[]; total: number; page: number; totalPages: number }>('/sessions?limit=50'),
  createSessionForAppointment: (appointmentId: string) =>
    request<TelemedicineSession>(`/sessions/from-appointment/${encodeURIComponent(appointmentId)}`, { method: 'POST' }),
  createSession: (input: { patientId: string; doctorId: string; consultationType: Exclude<ConsultationType, 'CHAT'>; scheduledStartTime: string; chiefComplaint?: string; followUpOfSessionId?: string }) =>
    request<TelemedicineSession>('/sessions', { method: 'POST', body: JSON.stringify(input) }),
  updateStatus: (id: string, status: TelemedicineStatus, clinicalNotes?: string) =>
    request<TelemedicineSession>(`/sessions/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, clinicalNotes }) }),
  markCallStarted: (sessionId: string, callId: string) =>
    request<TelemedicineSession>(`/sessions/${encodeURIComponent(sessionId)}/call-started`, { method: 'POST', body: JSON.stringify({ callId }) }),
  getMessages: (sessionId: string) => request<TelemedicineMessage[]>(`/messages/session/${encodeURIComponent(sessionId)}`),
  recordCallSummary: (sessionId: string, input: { callId: string; durationSeconds: number; participantCount: number; missedCall?: boolean }) =>
    request<TelemedicineMessage>(`/sessions/${encodeURIComponent(sessionId)}/call-summary`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  sendMessage: (sessionId: string, messageText: string, attachment?: { url: string; name: string; mimeType: string; size: number }) =>
    request<TelemedicineMessage>('/messages', { method: 'POST', body: JSON.stringify({
      sessionId, messageText,
      ...(attachment ? { attachmentUrl: attachment.url, attachmentName: attachment.name, attachmentMimeType: attachment.mimeType, attachmentSize: attachment.size } : {}),
    }) }),
  uploadMessageAttachment: async (sessionId: string, file: File): Promise<{ url: string; name: string; mimeType: string; size: number }> => {
    const form = new FormData();
    form.append('file', file);
    const headers = getAuthHeaders();
    delete headers['Content-Type'];
    const response = await fetch(`${API_BASE_URL}/telemedicine/messages/session/${encodeURIComponent(sessionId)}/attachments`, {
      method: 'POST',
      headers,
      body: form,
      cache: 'no-store',
    });
    const raw = await response.text();
    let payload: any = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    if (!response.ok || payload.success === false) throw new Error(payload.message || `Attachment upload failed (${response.status})`);
    return payload.data;
  },
  issuePrescription: (sessionId: string, input: TelemedicinePrescriptionInput) =>
    request<TelemedicinePrescription>(`/sessions/${encodeURIComponent(sessionId)}/prescriptions`, { method: 'POST', body: JSON.stringify(input) }),
  getSessionPrescriptions: (sessionId: string) =>
    request<TelemedicinePrescription[]>(`/sessions/${encodeURIComponent(sessionId)}/prescriptions`),
  dispensePrescription: (prescriptionId: string, input: { pharmacyName: string; pharmacistName?: string; notes?: string }) =>
    request<TelemedicinePrescription>(`/prescriptions/${encodeURIComponent(prescriptionId)}/dispense`, { method: 'PATCH', body: JSON.stringify(input) }),
  verifyPrescription: (verificationId: string) =>
    request<any>(`/prescriptions/verify/${encodeURIComponent(verificationId)}`),
};
