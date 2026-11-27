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
    // Fallback error handling
  }

  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorizedResponse();
    }
    throw new Error(json?.message || `${message} (${res.status})`);
  }

  return json as T;
}

export const MchService = {
  async getRecords(params: { careType?: string; patientId?: string; page?: number } = {}) {
    const query = new URLSearchParams();
    if (params.careType) query.set('careType', params.careType);
    if (params.patientId) query.set('patientId', params.patientId);
    if (params.page) query.set('page', String(params.page));

    return requestJson<any>(
      `${API_BASE_URL}/mch?${query.toString()}`,
      { method: 'GET' },
      'Failed to fetch MCH records'
    );
  },

  async createRecord(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/mch`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create MCH record'
    );
  },

  async addAncVisit(recordId: string, data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/mch/${encodeURIComponent(recordId)}/anc-visits`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to record ANC visit'
    );
  },

  async recordDelivery(recordId: string, data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/mch/${encodeURIComponent(recordId)}/delivery`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to record delivery'
    );
  },

  async addImmunization(recordId: string, data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/mch/${encodeURIComponent(recordId)}/immunizations`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to record immunization'
    );
  },

  async addFamilyPlanning(recordId: string, data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/mch/${encodeURIComponent(recordId)}/family-planning`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to record family planning'
    );
  },

  async addPartograph(recordId: string, data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/mch/${encodeURIComponent(recordId)}/partograph`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to add partograph log'
    );
  },

  async addChildGrowth(recordId: string, data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/mch/${encodeURIComponent(recordId)}/growth`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to record child growth entry'
    );
  },

  async getStats() {
    return requestJson<any>(
      `${API_BASE_URL}/mch/stats`,
      { method: 'GET' },
      'Failed to fetch MCH statistics'
    );
  },
};
