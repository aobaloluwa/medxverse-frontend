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

export const ClinicalSpecialtyService = {
  async getEncounters(params: { specialty?: string; patientId?: string; page?: number } = {}) {
    const query = new URLSearchParams();
    if (params.specialty) query.set('specialty', params.specialty);
    if (params.patientId) query.set('patientId', params.patientId);
    if (params.page) query.set('page', String(params.page));

    return requestJson<any>(
      `${API_BASE_URL}/clinical-specialties?${query.toString()}`,
      { method: 'GET' },
      'Failed to fetch specialty encounters'
    );
  },

  async createEncounter(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/clinical-specialties`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create specialty encounter'
    );
  },

  async getStats() {
    return requestJson<any>(
      `${API_BASE_URL}/clinical-specialties/stats`,
      { method: 'GET' },
      'Failed to fetch specialty statistics'
    );
  },
};
