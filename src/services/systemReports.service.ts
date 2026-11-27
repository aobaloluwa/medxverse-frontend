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

export const SystemReportsService = {
  // Stats
  async getStats() {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/stats`,
      { method: 'GET' },
      'Failed to fetch system statistics'
    );
  },

  // Branches
  async getBranches() {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/branches`,
      { method: 'GET' },
      'Failed to fetch hospital branches'
    );
  },

  async createBranch(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/branches`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create branch'
    );
  },

  // RBAC
  async getRbacRoles() {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/rbac`,
      { method: 'GET' },
      'Failed to fetch RBAC roles'
    );
  },

  async createRbacRole(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/rbac`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create RBAC role'
    );
  },

  // Integrations
  async getIntegrations() {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/integrations`,
      { method: 'GET' },
      'Failed to fetch integration gateways'
    );
  },

  // Backups
  async getBackups() {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/backups`,
      { method: 'GET' },
      'Failed to fetch backup logs'
    );
  },

  async triggerBackup() {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/backups`,
      { method: 'POST' },
      'Failed to trigger manual database backup'
    );
  },

  // Support Tickets
  async getTickets() {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/tickets`,
      { method: 'GET' },
      'Failed to fetch support tickets'
    );
  },

  async createTicket(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/system-reports/tickets`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to submit support ticket'
    );
  },
};
