import { apiClient } from '@/lib/api-client';

export type GeoPoint = { type?: 'Point'; coordinates: [number, number] };
export type IncidentStatus =
  | 'REQUEST_RECEIVED' | 'DISPATCH_REVIEW' | 'OFFERED_TO_CREW'
  | 'CREW_ACCEPTED_PENDING_CONFIRMATION' | 'CREW_CONFIRMED'
  | 'EN_ROUTE' | 'ON_SCENE' | 'TRANSPORTING'
  | 'HANDED_OVER' | 'CANCELLED' | 'NO_RESOURCE_AVAILABLE';
export type IncidentPriority = 'UNTRIAGED' | 'ROUTINE' | 'URGENT' | 'CRITICAL';
export type TriageUrgency = 'IMMEDIATE' | 'URGENT' | 'ROUTINE' | 'UNKNOWN';
export type GpsFreshness = 'LIVE' | 'DELAYED' | 'STALE' | 'UNAVAILABLE';

export interface TriageAnswer { questionId: string; answer: string }
export interface RescueTracking {
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: string;
  locationAccuracyMeters?: number;
  freshness: GpsFreshness;
  isStale: boolean;
}
export interface RescueIncident {
  _id?: string;
  id?: string;
  publicReference?: string;
  reference?: string;
  status: IncidentStatus;
  priority?: IncidentPriority;
  chiefComplaint: string;
  callerName?: string;
  callerPhone?: string;
  callerIsPatient?: boolean;
  patientName?: string;
  patientAge?: number;
  additionalDetails?: string;
  location?: GeoPoint;
  locationDescription?: string;
  landmark?: string;
  locationAccuracyMeters?: number;
  triageAnswers?: TriageAnswer[];
  triageUrgency?: TriageUrgency;
  triageSuggestedUrgency?: TriageUrgency;
  triageReviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  events?: Array<{ status: IncidentStatus; at: string; note?: string; actorType?: string }>;
  crewConfirmed?: boolean;
  statusMessage?: string;
  tracking?: RescueTracking;
  providerId?: { _id?: string; displayName?: string; verificationStatus?: string } | string;
  vehicleId?: { _id?: string; registrationNumber?: string; makeModel?: string; vehicleClass?: string; status?: string; location?: GeoPoint; locationUpdatedAt?: string; locationAccuracyMeters?: number } | string;
  destinationFacilityId?: { _id?: string; name?: string; address?: string } | string;
}
export interface RescueProvider {
  _id: string;
  legalName: string;
  displayName: string;
  registrationNumber?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  operatingAreas: string[];
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  operationalStatus: 'OFFLINE' | 'AVAILABLE' | 'BUSY';
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt?: string;
}
export type RescueVehicleClass = 'BASIC_LIFE_SUPPORT' | 'ADVANCED_LIFE_SUPPORT' | 'PATIENT_TRANSPORT' | 'ICU_AMBULANCE' | 'NEONATAL';
export interface RescueVehicle {
  _id: string;
  providerId?: string;
  provider?: { id: string; displayName: string; operatingAreas?: string[] };
  registrationNumber: string;
  makeModel: string;
  vehicleClass: string;
  status: string;
  location?: GeoPoint;
  locationUpdatedAt?: string;
  locationAccuracyMeters?: number;
  equipment?: string[];
  crewQualifications?: string[];
  distanceKm?: number;
  gpsFreshness?: GpsFreshness | 'FRESH';
  requiresDispatcherSuitabilityReview?: boolean;
}
export interface RoadRouteEstimate {
  provider: string;
  distanceMeters: number;
  durationSeconds: number;
  calculatedAt?: string;
  polyline?: string;
}
export interface DispatchOffer {
  _id: string;
  status: string;
  expiresAt: string;
  offeredAt: string;
  incidentId: RescueIncident | string;
  vehicleId: RescueVehicle | string;
  responseNote?: string;
}
export interface DispatchEscalation {
  incidentId: string;
  reference: string;
  status: IncidentStatus;
  channel: '112' | 'PHONE_DISPATCH' | 'MANUAL_PROVIDER_CONTACT' | 'OTHER';
  recordedAt: string;
}
export interface LiveVehicleItem {
  id: string;
  registrationNumber: string;
  makeModel: string;
  vehicleClass: string;
  status: string;
  location?: GeoPoint;
  locationUpdatedAt?: string;
  locationAccuracyMeters?: number;
  freshness: GpsFreshness;
  provider?: { id: string; displayName: string; legalName?: string };
  activeIncident?: { id: string; reference: string; status: IncidentStatus; priority: IncidentPriority; chiefComplaint: string; location?: GeoPoint };
}
export interface LiveIncidentItem {
  id: string;
  reference: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  chiefComplaint: string;
  landmark?: string;
  location?: GeoPoint;
  createdAt?: string;
  vehicle?: { id: string; registrationNumber: string; makeModel: string; location?: GeoPoint };
}
export interface LiveFacilityItem {
  id: string;
  name: string;
  facilityType: string;
  address: string;
  location?: GeoPoint;
  capabilities?: string[];
  phone?: string;
}
export interface LiveFleetData {
  vehicles: LiveVehicleItem[];
  incidents: LiveIncidentItem[];
  facilities: LiveFacilityItem[];
  timestamp: string;
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string; accessToken?: string; reused?: boolean };

export const medxRescueService = {
  createGuestIncident: async (input: Record<string, unknown>, idempotencyKey: string) =>
    apiClient.post<never, ApiEnvelope<RescueIncident>>('/medxrescue/incidents', input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  getGuestIncident: async (reference: string, token: string) =>
    apiClient.get<never, ApiEnvelope<RescueIncident>>(`/medxrescue/incidents/public/${encodeURIComponent(reference)}`, {
      headers: { 'X-Emergency-Access-Token': token },
    }),
  updateGuestLocation: async (reference: string, token: string, input: Record<string, unknown>) =>
    apiClient.patch<never, ApiEnvelope<RescueIncident>>(`/medxrescue/incidents/public/${encodeURIComponent(reference)}/location`, input, {
      headers: { 'X-Emergency-Access-Token': token },
    }),
  cancelGuestIncident: async (reference: string, token: string, reason?: string) =>
    apiClient.post<never, ApiEnvelope<RescueIncident>>(`/medxrescue/incidents/public/${encodeURIComponent(reference)}/cancel`, { reason }, {
      headers: { 'X-Emergency-Access-Token': token },
    }),
  listIncidents: async () => apiClient.get<never, ApiEnvelope<{ incidents: RescueIncident[]; total: number; page: number; limit: number }>>('/medxrescue/incidents?limit=100'),
  updateIncidentStatus: async (id: string, status: IncidentStatus, reason?: string) =>
    apiClient.patch<never, ApiEnvelope<RescueIncident>>(`/medxrescue/incidents/${id}/status`, { status, reason }),
  updateIncidentPriority: async (id: string, priority: Exclude<IncidentPriority, 'UNTRIAGED'>, reason?: string) =>
    apiClient.patch<never, ApiEnvelope<RescueIncident>>(`/medxrescue/incidents/${id}/priority`, { priority, reason }),
  listProviders: async () =>
    apiClient.get<never, ApiEnvelope<RescueProvider[]>>('/medxrescue/providers'),
  listProvidersForReview: async () =>
    apiClient.get<never, ApiEnvelope<RescueProvider[]>>('/medxrescue/providers/review-queue'),
  reviewProvider: async (providerId: string, status: RescueProvider['verificationStatus'], notes?: string) =>
    apiClient.patch<never, ApiEnvelope<RescueProvider>>(`/medxrescue/providers/${encodeURIComponent(providerId)}/review`, { status, notes }),
  setProviderOperationalStatus: async (providerId: string, status: RescueProvider['operationalStatus']) =>
    apiClient.patch<never, ApiEnvelope<RescueProvider>>(`/medxrescue/providers/${encodeURIComponent(providerId)}/operational-status`, { status }),
  addProviderVehicle: async (providerId: string, input: { registrationNumber: string; makeModel: string; vehicleClass: RescueVehicleClass; equipment: string[]; crewQualifications: string[] }) =>
    apiClient.post<never, ApiEnvelope<RescueVehicle>>(`/medxrescue/providers/${encodeURIComponent(providerId)}/vehicles`, input),
  setVehicleOperationalStatus: async (vehicleId: string, status: 'AVAILABLE' | 'OFFLINE' | 'BUSY' | 'MAINTENANCE', providerId?: string) =>
    apiClient.patch<never, ApiEnvelope<RescueVehicle>>(`/medxrescue/vehicles/${encodeURIComponent(vehicleId)}/operational-status`, { status, ...(providerId ? { providerId } : {}) }),
  getEligibleVehicles: async (incidentId: string) =>
    apiClient.get<never, ApiEnvelope<RescueVehicle[]>>('/medxrescue/dispatch/eligible-vehicles', { params: { incidentId } }),
  createDispatchOfferWave: async (incidentId: string, vehicleIds: string[], expiresInSeconds = 90) =>
    apiClient.post<never, ApiEnvelope<DispatchOffer[]>>(`/medxrescue/incidents/${incidentId}/dispatch-offers`, { vehicleIds, expiresInSeconds }),
  confirmAcceptedAssignment: async (incidentId: string, approve: boolean, reason?: string) =>
    apiClient.patch<never, ApiEnvelope<RescueIncident>>(`/medxrescue/incidents/${incidentId}/assignment-confirmation`, { approve, reason }),
  recordEmergencyEscalation: async (incidentId: string, channel: DispatchEscalation['channel'], reason?: string) =>
    apiClient.post<never, ApiEnvelope<DispatchEscalation>>(`/medxrescue/incidents/${incidentId}/escalations`, { channel, reason }),
  listProviderVehicles: async (providerId: string) =>
    apiClient.get<never, ApiEnvelope<RescueVehicle[]>>(`/medxrescue/providers/${encodeURIComponent(providerId)}/vehicles`),
  updateVehicleLocation: async (vehicleId: string, input: { latitude: number; longitude: number; accuracyMeters?: number }, providerId?: string) =>
    apiClient.patch<never, ApiEnvelope<RescueVehicle>>(`/medxrescue/vehicles/${encodeURIComponent(vehicleId)}/location`, { ...input, ...(providerId ? { providerId } : {}) }),
  getRouteEstimate: async (originLatitude: number, originLongitude: number, destinationLatitude: number, destinationLongitude: number) =>
    apiClient.get<never, ApiEnvelope<RoadRouteEstimate>>('/medxrescue/routing/estimate', {
      params: { originLatitude, originLongitude, destinationLatitude, destinationLongitude },
    }),
  submitProvider: async (input: Record<string, unknown>) =>
    apiClient.post<never, ApiEnvelope<Record<string, unknown>>>('/medxrescue/providers/apply', input),
  listOffers: async (providerId?: string) =>
    apiClient.get<never, ApiEnvelope<DispatchOffer[]>>(`/medxrescue/dispatch-offers${providerId ? `?providerId=${encodeURIComponent(providerId)}` : ''}`),
  respondToOffer: async (offerId: string, input: { accept: boolean; vehicleId: string; providerId?: string; note?: string }) =>
    apiClient.post<never, ApiEnvelope<DispatchOffer>>(`/medxrescue/dispatch-offers/${offerId}/respond`, input),
  getLiveFleet: async () =>
    apiClient.get<never, ApiEnvelope<LiveFleetData>>('/medxrescue/fleet/live'),
  seedDemoFleet: async () =>
    apiClient.post<never, ApiEnvelope<{ provider: unknown; vehicles: unknown[] }>>('/medxrescue/fleet/seed-demo'),
};

