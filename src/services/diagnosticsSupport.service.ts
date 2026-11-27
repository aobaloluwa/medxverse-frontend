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

export const DiagnosticsSupportService = {
  // Stats
  async getStats() {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/stats`,
      { method: 'GET' },
      'Failed to fetch diagnostics statistics'
    );
  },

  // Pathology
  async getPathology() {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/pathology`,
      { method: 'GET' },
      'Failed to fetch pathology reports'
    );
  },

  async createPathology(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/pathology`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create pathology report'
    );
  },

  // Cardiac
  async getCardiac() {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/cardiac`,
      { method: 'GET' },
      'Failed to fetch cardiac reports'
    );
  },

  async createCardiac(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/cardiac`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create cardiac report'
    );
  },

  // CSSD
  async getCssd() {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/cssd`,
      { method: 'GET' },
      'Failed to fetch CSSD batches'
    );
  },

  async createCssd(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/cssd`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create CSSD batch'
    );
  },

  // IPC
  async getIpc() {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/ipc`,
      { method: 'GET' },
      'Failed to fetch IPC surveillance logs'
    );
  },

  async createIpc(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/ipc`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create IPC surveillance entry'
    );
  },

  // Mortuary
  async getMortuary() {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/mortuary`,
      { method: 'GET' },
      'Failed to fetch mortuary records'
    );
  },

  async createMortuary(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/mortuary`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create mortuary record'
    );
  },

  async releaseMortuaryBody(id: string, releasedTo: string) {
    return requestJson<any>(
      `${API_BASE_URL}/diagnostics-support/mortuary/${encodeURIComponent(id)}/release`,
      { method: 'PATCH', body: JSON.stringify({ releasedTo }) },
      'Failed to clear body release'
    );
  },
};
