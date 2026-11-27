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

export const QualityComplianceService = {
  // Stats
  async getStats() {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/stats`,
      { method: 'GET' },
      'Failed to fetch Quality & Compliance stats'
    );
  },

  // Incidents
  async getIncidents() {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/incidents`,
      { method: 'GET' },
      'Failed to fetch incident reports'
    );
  },

  async createIncident(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/incidents`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create incident report'
    );
  },

  // Consents
  async getConsents() {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/consents`,
      { method: 'GET' },
      'Failed to fetch consent forms'
    );
  },

  async createConsent(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/consents`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create consent form'
    );
  },

  // Birth & Death
  async getBirthDeath() {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/birth-death`,
      { method: 'GET' },
      'Failed to fetch birth/death records'
    );
  },

  async createBirthDeath(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/birth-death`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to issue birth/death certificate'
    );
  },

  // Disease Surveillance
  async getSurveillance() {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/surveillance`,
      { method: 'GET' },
      'Failed to fetch disease surveillance logs'
    );
  },

  async createSurveillance(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/surveillance`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to log disease surveillance report'
    );
  },

  // NDPA Audit Logs
  async getNdpaAuditLogs() {
    return requestJson<any>(
      `${API_BASE_URL}/quality-compliance/ndpa-audit`,
      { method: 'GET' },
      'Failed to fetch NDPA audit logs'
    );
  },
};
