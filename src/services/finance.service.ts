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

export const FinanceService = {
  // Expenses
  async getExpenses() {
    return requestJson<any>(
      `${API_BASE_URL}/billing/expenses`,
      { method: 'GET' },
      'Failed to fetch hospital expenses'
    );
  },

  async createExpense(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/billing/expenses`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create expense voucher'
    );
  },

  // Payroll
  async getPayroll(monthYear?: string) {
    const query = monthYear ? `?monthYear=${monthYear}` : '';
    return requestJson<any>(
      `${API_BASE_URL}/billing/payroll${query}`,
      { method: 'GET' },
      'Failed to fetch payroll records'
    );
  },

  async createPayroll(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/billing/payroll`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create payroll record'
    );
  },

  // Waivers & Deposits
  async getWaivers() {
    return requestJson<any>(
      `${API_BASE_URL}/billing/waivers`,
      { method: 'GET' },
      'Failed to fetch deposits and waivers'
    );
  },

  async createWaiver(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/billing/waivers`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to record deposit/waiver'
    );
  },

  // Finance Summary
  async getFinanceSummary() {
    return requestJson<any>(
      `${API_BASE_URL}/billing/finance-summary`,
      { method: 'GET' },
      'Failed to fetch financial summary'
    );
  },
};
