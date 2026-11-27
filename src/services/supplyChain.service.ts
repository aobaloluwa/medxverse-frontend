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

export const SupplyChainService = {
  // Stats
  async getStats() {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/stats`,
      { method: 'GET' },
      'Failed to fetch supply chain stats'
    );
  },

  // Biomedical
  async getBiomedical() {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/biomedical`,
      { method: 'GET' },
      'Failed to fetch biomedical calibration logs'
    );
  },

  async createBiomedical(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/biomedical`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create biomedical calibration log'
    );
  },

  // Work Orders
  async getWorkOrders() {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/work-orders`,
      { method: 'GET' },
      'Failed to fetch maintenance work orders'
    );
  },

  async createWorkOrder(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/work-orders`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create work order'
    );
  },

  async updateWorkOrder(id: string, status: string) {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/work-orders/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      'Failed to update work order status'
    );
  },

  // Laundry
  async getLaundry() {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/laundry`,
      { method: 'GET' },
      'Failed to fetch laundry logs'
    );
  },

  async createLaundry(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/laundry`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create laundry log'
    );
  },

  // Waste
  async getWaste() {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/waste`,
      { method: 'GET' },
      'Failed to fetch waste manifests'
    );
  },

  async createWaste(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/waste`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to log waste manifest'
    );
  },

  // Fleet
  async getFleet() {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/fleet`,
      { method: 'GET' },
      'Failed to fetch fleet vehicles'
    );
  },

  async createFleet(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/fleet`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to register fleet vehicle'
    );
  },

  async updateFleet(id: string, status: string, driverName?: string) {
    return requestJson<any>(
      `${API_BASE_URL}/supply-chain/fleet/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify({ status, driverName }) },
      'Failed to update fleet vehicle status'
    );
  },
};
