import { API_BASE_URL, getAuthHeaders } from '@/services/appointment.service';

export interface PatientHospitalConnection {
  connected: boolean;
  hospital: { id: string; name: string; code?: string; logoUrl?: string; address?: string };
  patient: { id: string; name: string; email?: string; mrn?: string; universalPatientId?: string };
  connectedAt?: string;
}

export const patientPortalService = {
  async getConnection(): Promise<PatientHospitalConnection> {
    const response = await fetch(`${API_BASE_URL}/patient-portal/auth/connection`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
      cache: 'no-store',
    });
    const raw = await response.text();
    let payload: any = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || `Unable to restore hospital connection (${response.status}).`);
    }
    return payload.data as PatientHospitalConnection;
  },
};
