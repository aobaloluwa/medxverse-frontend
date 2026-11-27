import { API_BASE_URL, getAuthHeaders } from '@/services/appointment.service';
import { handleUnauthorizedResponse } from '@/lib/auth-session';

async function requestJson<T>(url: string, init: RequestInit = {}, message: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // Preserve fallback error
  }

  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorizedResponse();
    }
    throw new Error(json?.message || `${message} (${res.status})`);
  }

  return json as T;
}

export const FrontDeskService = {
  // --- Referrals ---
  async getReferrals(params: { type?: string; status?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.type) query.set('type', params.type);
    if (params.status) query.set('status', params.status);
    return requestJson<any>(
      `${API_BASE_URL}/referrals?${query.toString()}`,
      { method: 'GET' },
      'Failed to fetch referrals'
    );
  },

  async createReferral(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/referrals`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create referral'
    );
  },

  async updateReferralStatus(id: string, status: string, notes?: string) {
    return requestJson<any>(
      `${API_BASE_URL}/referrals/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify({ status, notes }) },
      'Failed to update referral status'
    );
  },

  async getReferralStats() {
    return requestJson<any>(
      `${API_BASE_URL}/referrals/stats`,
      { method: 'GET' },
      'Failed to fetch referral statistics'
    );
  },

  // --- Visitor Passes ---
  async getVisitorPasses(params: { status?: string; patientId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.patientId) query.set('patientId', params.patientId);
    return requestJson<any>(
      `${API_BASE_URL}/visitors?${query.toString()}`,
      { method: 'GET' },
      'Failed to fetch visitor passes'
    );
  },

  async issueVisitorPass(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/visitors`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to issue visitor pass'
    );
  },

  async checkInVisitor(passId: string) {
    return requestJson<any>(
      `${API_BASE_URL}/visitors/${encodeURIComponent(passId)}/check-in`,
      { method: 'PATCH' },
      'Failed to check-in visitor'
    );
  },

  async checkOutVisitor(passId: string) {
    return requestJson<any>(
      `${API_BASE_URL}/visitors/${encodeURIComponent(passId)}/check-out`,
      { method: 'PATCH' },
      'Failed to check-out visitor'
    );
  },

  async revokeVisitorPass(passId: string) {
    return requestJson<any>(
      `${API_BASE_URL}/visitors/${encodeURIComponent(passId)}/revoke`,
      { method: 'PATCH' },
      'Failed to revoke visitor pass'
    );
  },

  // --- Queue Tickets ---
  async getQueue(params: { department?: string; providerId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.department) query.set('department', params.department);
    if (params.providerId) query.set('providerId', params.providerId);
    return requestJson<any>(
      `${API_BASE_URL}/appointments/queue?${query.toString()}`,
      { method: 'GET' },
      'Failed to fetch queue'
    );
  },

  async createWalkInQueue(data: { patientId: string; providerId: string; department?: string; priority?: string; notes?: string }) {
    return requestJson<any>(
      `${API_BASE_URL}/appointments/queue/walk-in`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to issue queue ticket'
    );
  },

  async updateQueueTicket(ticketId: string, status: string, delayMinutes?: number) {
    return requestJson<any>(
      `${API_BASE_URL}/appointments/queue/${encodeURIComponent(ticketId)}`,
      { method: 'PATCH', body: JSON.stringify({ status, delayMinutes }) },
      'Failed to update queue ticket'
    );
  },

  // --- Admissions & Discharge ---
  async getAdmissions(params: { status?: string; wardId?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.wardId) query.set('wardId', params.wardId);
    return requestJson<any>(
      `${API_BASE_URL}/admissions?${query.toString()}`,
      { method: 'GET' },
      'Failed to fetch admissions'
    );
  },

  async admitPatient(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/admissions`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to admit patient'
    );
  },

  async dischargePatient(admissionId: string, dischargeSummary: string) {
    return requestJson<any>(
      `${API_BASE_URL}/admissions/${encodeURIComponent(admissionId)}/discharge`,
      { method: 'POST', body: JSON.stringify({ dischargeSummary }) },
      'Failed to discharge patient'
    );
  },
};
