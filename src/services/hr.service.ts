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

export const HrService = {
  // Stats
  async getStats() {
    return requestJson<any>(
      `${API_BASE_URL}/hr/stats`,
      { method: 'GET' },
      'Failed to fetch HR statistics'
    );
  },

  // Recruitment
  async getApplications() {
    return requestJson<any>(
      `${API_BASE_URL}/hr/applications`,
      { method: 'GET' },
      'Failed to fetch job applications'
    );
  },

  async createApplication(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/hr/applications`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to create job application'
    );
  },

  async updateApplicationStage(id: string, stage: string) {
    return requestJson<any>(
      `${API_BASE_URL}/hr/applications/${encodeURIComponent(id)}/stage`,
      { method: 'PATCH', body: JSON.stringify({ stage }) },
      'Failed to update application stage'
    );
  },

  // Leave
  async getLeaveRequests() {
    return requestJson<any>(
      `${API_BASE_URL}/hr/leave`,
      { method: 'GET' },
      'Failed to fetch leave requests'
    );
  },

  async createLeaveRequest(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/hr/leave`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to submit leave request'
    );
  },

  async updateLeaveStatus(id: string, status: string, rejectionReason?: string) {
    return requestJson<any>(
      `${API_BASE_URL}/hr/leave/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify({ status, rejectionReason }) },
      'Failed to update leave status'
    );
  },

  // Licenses
  async getLicenses() {
    return requestJson<any>(
      `${API_BASE_URL}/hr/licenses`,
      { method: 'GET' },
      'Failed to fetch license credentials'
    );
  },

  async createLicense(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/hr/licenses`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to record license credential'
    );
  },

  // MedxLearn CME
  async getCmeCourses() {
    return requestJson<any>(
      `${API_BASE_URL}/hr/cme`,
      { method: 'GET' },
      'Failed to fetch CME course records'
    );
  },

  async createCmeCourse(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/hr/cme`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to log CME course'
    );
  },

  // Appraisals
  async getAppraisals() {
    return requestJson<any>(
      `${API_BASE_URL}/hr/appraisals`,
      { method: 'GET' },
      'Failed to fetch performance appraisals'
    );
  },

  async createAppraisal(data: any) {
    return requestJson<any>(
      `${API_BASE_URL}/hr/appraisals`,
      { method: 'POST', body: JSON.stringify(data) },
      'Failed to save performance appraisal'
    );
  },
};
