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
    // Fallback
  }

  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorizedResponse();
    }
    throw new Error(json?.message || `${message} (${res.status})`);
  }

  return json as T;
}

export const NursingService = {
  // MAR
  async getMarLogs(params: { patientId?: string; status?: string } = {}) {
    const query = new URLSearchParams();
    if (params.patientId) query.set('patientId', params.patientId);
    if (params.status) query.set('status', params.status);

    return requestJson<any>(
      `${API_BASE_URL}/nursing/mar?${query.toString()}`,
      { method: 'GET' },
      'Failed to fetch MAR logs'
    );
  },

  async createMarLog(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/nursing/mar`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create MAR log'
    );
  },

  async updateMarStatus(id: string, status: string, reasonHeldOrRefused?: string) {
    return requestJson<any>(
      `${API_BASE_URL}/nursing/mar/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify({ status, reasonHeldOrRefused }) },
      'Failed to update MAR status'
    );
  },

  // Nursing Notes & Handover
  async getNursingNotes(params: { patientId?: string; shiftType?: string } = {}) {
    const query = new URLSearchParams();
    if (params.patientId) query.set('patientId', params.patientId);
    if (params.shiftType) query.set('shiftType', params.shiftType);

    return requestJson<any>(
      `${API_BASE_URL}/nursing/notes?${query.toString()}`,
      { method: 'GET' },
      'Failed to fetch nursing notes'
    );
  },

  async createNursingNote(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/nursing/notes`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create nursing note'
    );
  },

  // Fluid Balance
  async getFluidBalance(patientId: string) {
    return requestJson<any>(
      `${API_BASE_URL}/nursing/fluid-balance/${encodeURIComponent(patientId)}`,
      { method: 'GET' },
      'Failed to fetch fluid balance'
    );
  },

  async createFluidBalance(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/nursing/fluid-balance`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to record fluid balance'
    );
  },

  // Station Summary
  async getStationSummary() {
    return requestJson<any>(
      `${API_BASE_URL}/nursing/station-summary`,
      { method: 'GET' },
      'Failed to fetch nursing station summary'
    );
  },
};
