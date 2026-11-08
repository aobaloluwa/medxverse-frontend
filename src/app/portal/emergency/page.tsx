"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity, AlertTriangle, Ambulance, ArrowRight, CheckCircle2, Clock3,
  Crosshair, HeartPulse, MapPin, PhoneCall, ShieldCheck, Siren, XCircle,
  Loader2, RefreshCw, Building2, WifiOff, Video, Phone
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  medxRescueService,
  type LiveFleetData,
  type RescueIncident,
  type IncidentStatus
} from '@/services/medxrescue.service';
import DynamicAerialMap from '@/components/medxrescue/DynamicAerialMap';
import { openTelemedicineCall } from '@/lib/telemedicine-call-window';
import { offlineGpsTracker, type GpsBreadcrumb } from '@/lib/offline-gps-tracker';
import { playEmergencyBeeper } from '@/lib/emergency-beeper';

const steps: { status: IncidentStatus; label: string; detail: string }[] = [
  { status: 'REQUEST_RECEIVED', label: 'Request received', detail: 'Recorded in MedXVerse Nexus. Hospital dispatch team notified.' },
  { status: 'DISPATCH_REVIEW', label: 'Hospital dispatch review', detail: 'A hospital dispatcher is evaluating triage and shortlisting ambulances.' },
  { status: 'OFFERED_TO_CREW', label: 'Ambulance offered', detail: 'Dispatch wave sent to verified partner ambulances.' },
  { status: 'CREW_ACCEPTED_PENDING_CONFIRMATION', label: 'Crew accepted', detail: 'Ambulance crew accepted the mission; dispatcher validating.' },
  { status: 'CREW_CONFIRMED', label: 'Ambulance confirmed', detail: 'Hospital confirmed verified ambulance crew and vehicle.' },
  { status: 'EN_ROUTE', label: 'Ambulance en route', detail: 'Confirmed ambulance is travelling to your location.' },
  { status: 'ON_SCENE', label: 'Arrived on scene', detail: 'Ambulance crew has arrived at the reported location.' },
  { status: 'TRANSPORTING', label: 'Transporting to hospital', detail: 'Patient is aboard and being transported to hospital ED.' },
  { status: 'HANDED_OVER', label: 'Handover complete', detail: 'Patient handed over to emergency department team.' },
];

export default function PatientEmergencyPage() {
  const router = useRouter();
  const { account } = useAuthStore();
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [callerIsPatient, setCallerIsPatient] = useState(true);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [landmark, setLandmark] = useState('');
  const [patientCount, setPatientCount] = useState<number | ''>(1);
  const [language, setLanguage] = useState('English');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('');
  const [latitude, setLatitude] = useState('');

  const [longitude, setLongitude] = useState('');
  const [accuracy, setAccuracy] = useState<number | undefined>();
  const [triageAnswers, setTriageAnswers] = useState<Record<string, string>>({});

  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  // Active tracking state
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [activeIncident, setActiveIncident] = useState<RescueIncident | null>(null);
  const [familyLink, setFamilyLink] = useState('');
  const [generatingFamilyLink, setGeneratingFamilyLink] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveFleet, setLiveFleet] = useState<LiveFleetData | null>(null);

  const idempotencyKeyRef = useRef('');

  // Prefill logged in patient credentials
  useEffect(() => {
    if (account) {
      if (account.name && !callerName) setCallerName(account.name);
      if ((account as any).phone && !callerPhone) setCallerPhone((account as any).phone);
    }
  }, [account, callerName, callerPhone]);

  // Network Status & Offline GPS Queue Auto-Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (activeRef && activeToken) {
        void offlineGpsTracker.syncQueue(async (breadcrumbs) => {
          const last = breadcrumbs[breadcrumbs.length - 1];
          if (last) {
            await medxRescueService.updateGuestLocation(activeRef, activeToken, {
              latitude: last.latitude,
              longitude: last.longitude,
              accuracyMeters: last.accuracyMeters,
            });
          }
        });
      }
    };

    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [activeRef, activeToken]);

  // Load existing active tracking session from localStorage & sessionStorage if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith('medxrescue:'));
    const localKeys = Object.keys(localStorage).filter(k => k.startsWith('medxrescue:'));
    const keys = [...sessionKeys, ...localKeys];

    if (keys.length > 0) {
      const refKey = keys[keys.length - 1];
      const ref = refKey.replace('medxrescue:', '');
      const tok = sessionStorage.getItem(`medxrescue:${ref}`) || localStorage.getItem(`medxrescue:${ref}`);
      if (ref && tok) {
        setActiveRef(ref);
        setActiveToken(tok);
        sessionStorage.setItem(`medxrescue:${ref}`, tok);
        localStorage.setItem(`medxrescue:${ref}`, tok);
      }
    }
  }, []);

  // Fetch live fleet telemetry for map
  const loadFleet = useCallback(async () => {
    try {
      const res = await medxRescueService.getLiveFleet();
      setLiveFleet(res.data);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadFleet();
    const interval = window.setInterval(() => void loadFleet(), 10000);
    return () => window.clearInterval(interval);
  }, [loadFleet]);

  // Refresh active incident status
  const refreshStatus = useCallback(async (quiet = false) => {
    if (!activeRef || !activeToken) return;
    if (!quiet) setRefreshing(true);
    try {
      const res = await medxRescueService.getGuestIncident(activeRef, activeToken);
      setActiveIncident(res.data);
      if (res.data.landmark) setLandmark(res.data.landmark);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to refresh emergency status.');
    } finally {
      setRefreshing(false);
    }
  }, [activeRef, activeToken]);

  useEffect(() => {
    if (activeRef && activeToken) {
      void refreshStatus();
      const timer = window.setInterval(() => void refreshStatus(true), 10000);
      return () => window.clearInterval(timer);
    }
  }, [activeRef, activeToken, refreshStatus]);

  // Auto GPS Location detector (Works online & offline with local breadcrumb recording)
  const locate = useCallback(() => {
    setError('');
    if (!navigator.geolocation) {
      setLocationState('error');
      setError('Browser GPS is unavailable. Please enter a landmark address.');
      return;
    }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(String(lat));
        setLongitude(String(lng));
        setAccuracy(pos.coords.accuracy);
        setLocationState('success');

        // Reverse geocode to fill landmark/description with exact real address
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const geoData = await res.json();
          if (geoData?.display_name) {
            const shortName = geoData.display_name.split(',').slice(0, 3).join(', ');
            setLandmark(shortName);
            setLocationDescription(geoData.display_name);
          }
        } catch {
          // ignore reverse geocoding failure
        }

        // Record breadcrumb locally (for offline queue)
        offlineGpsTracker.recordBreadcrumb({
          latitude: lat,
          longitude: lng,
          accuracyMeters: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
      },
      () => {
        setLocationState('error');
        setError('GPS permission denied. Please enter a landmark or street address.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  }, []);

  // Automatically capture GPS location on mount
  useEffect(() => {
    locate();
  }, [locate]);

  // Launch Emergency Voice Call to Hospital Dispatch via Telemedicine calling engine
  const triggerEmergencyVoiceCall = () => {
    const callSessionId = activeRef ? `emergency-voice-${activeRef}` : `emergency-voice-${Date.now()}`;
    openTelemedicineCall(
      callSessionId,
      '/portal/emergency',
      `Emergency Voice Call (${callerName || 'Patient SOS'})`,
      (url) => router.push(url)
    );
  };

  // Submit Emergency SOS
  const submitEmergency = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!callerPhone.trim() || !chiefComplaint.trim()) {
      setError('Enter a callback phone number and briefly describe the emergency.');
      return;
    }

    const hasCoordinates = latitude.trim() !== '' && longitude.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lng);
    const hasLandmark = landmark.trim() !== '' || locationDescription.trim() !== '';

    // STRICT LOCATION REQUIREMENT
    if (!hasCoordinates && !hasLandmark) {
      setError('Emergency Location is REQUIRED! Allow GPS access or type a recognizable landmark address so dispatch can locate you.');
      return;
    }

    setSubmitting(true);
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `mrx-pat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      const key = idempotencyKeyRef.current;
      const combinedDetails = [
        additionalDetails.trim(),
        patientCount ? `Approx. Patients: ${patientCount}` : '',
        language && language !== 'English' ? `Preferred Language: ${language}` : '',
        accessibilityNeeds ? `Accessibility Needs: ${accessibilityNeeds}` : ''
      ].filter(Boolean).join(' | ');

      const res = await medxRescueService.createGuestIncident({
        callerName: callerName.trim() || account?.name || undefined,
        callerPhone: callerPhone.trim(),
        callerIsPatient,
        patientName: callerIsPatient ? undefined : patientName.trim() || undefined,
        patientAge: patientAge ? Number(patientAge) : undefined,
        chiefComplaint: chiefComplaint.trim(),
        additionalDetails: combinedDetails || undefined,
        landmark: landmark.trim() || undefined,
        locationDescription: locationDescription.trim() || undefined,
        latitude: hasCoordinates ? lat : undefined,
        longitude: hasCoordinates ? lng : undefined,
        locationAccuracyMeters: hasCoordinates ? accuracy : undefined,
        triageAnswers: Object.entries(triageAnswers)
          .filter(([, ans]) => ans)
          .map(([questionId, answer]) => ({ questionId, answer })),
        intakeChannel: 'APP_SOS',
      }, key);

      const incident = res.data;
      const reference = incident.reference || incident.publicReference;
      if (!reference || !res.accessToken) {
        throw new Error('Server response did not include secure tracking access.');
      }

      sessionStorage.setItem(`medxrescue:${reference}`, res.accessToken);
      localStorage.setItem(`medxrescue:${reference}`, res.accessToken);
      setActiveRef(reference);
      setActiveToken(res.accessToken);
      setActiveIncident(incident);
      playEmergencyBeeper('SOS_ALERT', 2);
      setNotice('Emergency SOS request sent successfully! Hospital dispatch teams have been notified.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send emergency request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Location
  const updatePatientLocation = async () => {
    if (!activeRef || !activeToken) return;
    setError('');
    setNotice('');
    if (!navigator.geolocation) {
      setError('Browser cannot access GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await medxRescueService.updateGuestLocation(activeRef, activeToken, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          landmark: landmark.trim() || undefined,
        });
        setActiveIncident(res.data);
        setNotice('Your updated location was sent to the dispatch team.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Location update failed.');
      }
    }, () => setError('Location access denied. Check device permissions.'));
  };

  // Cancel Request
  const cancelRequest = async () => {
    if (!activeRef || !activeToken || !window.confirm('Cancel this emergency request?')) return;
    try {
      const res = await medxRescueService.cancelGuestIncident(activeRef, activeToken, 'Cancelled by patient');
      setActiveIncident(res.data);
      setNotice('Emergency request was cancelled.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel request.');
    }
  };

  const generateFamilyLink = async () => {
    if (!activeRef || !activeToken) return;
    setGeneratingFamilyLink(true);
    setError('');
    try {
      const res = await medxRescueService.createFamilyTrackingLink(activeRef, activeToken);
      const url = `${window.location.origin}/medxrescue/status?reference=${res.data.reference}&token=${res.data.familyToken}`;
      setFamilyLink(url);
      setNotice('Time-limited family tracking link generated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate family tracking link.');
    } finally {
      setGeneratingFamilyLink(false);
    }
  };

  const currentStatus = activeIncident?.status;
  const isClosed = currentStatus === 'CANCELLED' || currentStatus === 'HANDED_OVER' || currentStatus === 'NO_RESOURCE_AVAILABLE';
  const currentIndex = steps.findIndex(s => s.status === currentStatus);
  const hasCoordinates = latitude.trim() !== '' && longitude.trim() !== '';

  // 20-Minute Hospital Acceptance Timeout Countdown Timer
  const createdAtMs = activeIncident?.createdAt ? new Date(activeIncident.createdAt).getTime() : Date.now();
  const expiresAtMs = createdAtMs + 20 * 60 * 1000;
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(1200);

  useEffect(() => {
    if (!activeIncident || activeIncident.crewConfirmed || isClosed) return;
    const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
    setTimeRemainingSec(remaining);

    const interval = setInterval(() => {
      const rem = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setTimeRemainingSec(rem);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeIncident, expiresAtMs, isClosed]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins}m ${remainingSec < 10 ? '0' : ''}${remainingSec}s`;
  };

  return (
    <div className="space-y-6">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 text-xs font-extrabold flex items-center gap-3">
          <WifiOff size={18} className="text-amber-700 shrink-0" />
          <div>
            <p className="font-black text-amber-950">Offline Mode Active</p>
            <p className="font-normal text-amber-800">
              GPS tracking coordinates are being recorded locally on your device. They will automatically sync to hospital dispatch when your connection is restored.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]">
            <Siren size={16} /> MedXVerse Emergency Rescue SOS
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Order Emergency Assistance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Request an emergency ambulance. Hospital dispatchers across MedXVerse Nexus will receive your request and dispatch a verified ambulance to your location in Ogbomoso.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Emergency Voice Call Button (Using Telemedicine Calling Module) */}
          <button
            type="button"
            onClick={triggerEmergencyVoiceCall}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-xs font-black text-white hover:bg-[#166657] shadow-md transition"
          >
            <PhoneCall size={16} className="text-rose-300 animate-pulse" /> Emergency Voice Call to Hospital
          </button>

          <a
            href="tel:112"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-700 shadow-md transition"
          >
            <PhoneCall size={15} /> Direct 112 Call
          </a>
        </div>
      </div>

      {/* Main Grid Layout: Map & Tracking on One Side, SOS Intake Form on Other */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

        {/* Left Column: Live Satellite Map & Status Progress Tracker */}
        <div className="space-y-6">

          {/* Live Satellite Map Container */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#1b7b68]">
                  <HeartPulse size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Live Satellite Emergency Radar (Ogbomoso)</h2>
                  <p className="text-[11px] text-slate-500">LAUTECH LTH, BUTH, General Hospital &amp; live ambulance tracking</p>
                </div>
              </div>

              {activeRef && (
                <button
                  type="button"
                  onClick={() => void refreshStatus()}
                  disabled={refreshing}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Sync
                </button>
              )}
            </div>

            {/* Interactive Aerial Satellite Map Component */}
            <DynamicAerialMap
              vehicles={liveFleet?.vehicles || []}
              incidents={
                activeIncident
                  ? [
                      {
                        id: String(activeIncident._id || activeIncident.id || ''),
                        reference: activeIncident.publicReference || activeIncident.reference || 'SOS',
                        priority: activeIncident.priority || 'URGENT',
                        status: activeIncident.status,
                        location: activeIncident.location,
                      } as any,
                    ]
                  : []
              }
              facilities={liveFleet?.facilities || []}
              selectedIncidentId={activeIncident?.id || activeIncident?._id}
              heightClass="h-[480px]"
            />
          </div>

          {/* Active Request Tracking Card (If SOS Active) */}
          {activeIncident && (
            <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#1b7b68]">
                    Active SOS Tracking
                  </span>
                  <h3 className="text-xl font-black text-slate-900">
                    {activeIncident.publicReference || activeIncident.reference}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{activeIncident.chiefComplaint}</p>
                </div>

                <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
                  currentStatus === 'NO_RESOURCE_AVAILABLE' ? 'bg-rose-100 text-rose-800 border border-rose-200' : isClosed ? 'bg-slate-100 text-slate-700' : 'bg-teal-50 text-[#1b7b68] border border-teal-200'
                }`}>
                  {activeIncident.status.replaceAll('_', ' ')}
                </span>
              </div>

              {/* 20-Minute Hospital Acceptance Expiration Banner */}
              {!activeIncident.crewConfirmed && !isClosed && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                      <Clock3 size={15} className="text-amber-700" /> Hospital Acceptance Timeout
                    </span>
                    <span className="rounded-lg bg-amber-200 px-2 py-0.5 text-xs font-black text-amber-900 tabular-nums">
                      {formatTimer(timeRemainingSec)}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    Requests automatically expire if no hospital or ambulance confirms within 20 minutes.
                  </p>
                </div>
              )}

              {/* Expired Callout Box */}
              {currentStatus === 'NO_RESOURCE_AVAILABLE' && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                    <AlertTriangle size={18} className="text-rose-600" />
                    <span>Request Expired (20-Minute Timeout)</span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    No hospital or ambulance confirmed assignment within 20 minutes. Please call 112 or local emergency dispatch immediately.
                  </p>
                  <a
                    href="tel:112"
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700"
                  >
                    <PhoneCall size={14} /> Call 112 Emergency Services Now
                  </a>
                </div>
              )}

              {/* Progress Steps Timeline */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700">Dispatch Progress Status</p>
                <div className="space-y-2">
                  {steps.map((step, idx) => {
                    const done = idx <= currentIndex;
                    const isCurrent = step.status === currentStatus;
                    return (
                      <div key={step.status} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                          done ? 'bg-[#1b7b68] text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {done ? '✓' : idx + 1}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isCurrent ? 'text-[#1b7b68]' : 'text-slate-700'}`}>
                            {step.label}
                          </p>
                          <p className="text-[11px] text-slate-500">{step.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Location Update & Cancel Controls */}
              {!isClosed && (
                <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2 justify-between items-center">
                    <button
                      type="button"
                      onClick={updatePatientLocation}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-bold text-[#1b7b68] hover:bg-teal-100"
                    >
                      <MapPin size={14} /> Send Updated Location
                    </button>

                    <button
                      type="button"
                      onClick={generateFamilyLink}
                      disabled={generatingFamilyLink}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Crosshair size={14} /> {generatingFamilyLink ? 'Generating...' : 'Get Family Tracking Link'}
                    </button>

                    <button
                      type="button"
                      onClick={cancelRequest}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                    >
                      <XCircle size={14} /> Cancel SOS
                    </button>
                  </div>

                  {familyLink && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-xs">
                      <p className="font-bold text-slate-700">Share this secure link with family (expires when incident closes):</p>
                      <input
                        type="text"
                        readOnly
                        value={familyLink}
                        className="mt-1 w-full rounded border border-slate-200 p-2 text-slate-600 outline-none"
                        onClick={e => e.currentTarget.select()}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: SOS Order Intake Form */}
        <div className="space-y-6">
          <form onSubmit={submitEmergency} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-black uppercase tracking-widest text-rose-600">
                Patient Emergency SOS Request (Ogbomoso Base)
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Request Ambulance Help</h2>
              <p className="text-xs text-slate-500 mt-1">
                Fill in your details below. Hospitals on duty in Ogbomoso will receive your request immediately.
              </p>
            </div>

            {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">{error}</div>}
            {notice && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-xs font-semibold text-[#1b7b68]">{notice}</div>}

            {/* Location & Landmark Section (REQUIRED) */}
            <div className="rounded-2xl border-2 border-teal-500/40 bg-teal-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-[#1b7b68]" />
                  <span className="text-xs font-black text-slate-900">Emergency Location <span className="text-rose-600">*</span></span>
                </div>
                <button
                  type="button"
                  onClick={locate}
                  disabled={locationState === 'loading'}
                  className="inline-flex items-center gap-1 rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs font-extrabold text-[#1b7b68] hover:bg-teal-100 shadow-sm"
                >
                  <Crosshair size={13} /> {locationState === 'loading' ? 'Detecting GPS…' : 'Re-Detect GPS'}
                </button>
              </div>

              {locationState === 'loading' && (
                <div className="flex items-center gap-2 text-xs font-bold text-[#1b7b68]">
                  <Loader2 size={14} className="animate-spin" /> Auto-detecting your GPS location…
                </div>
              )}

              {hasCoordinates && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center justify-between">
                  <span className="font-extrabold flex items-center gap-1">
                    ✓ GPS Location Auto-Captured ({Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)})
                  </span>
                  <span className="text-[10px] font-bold opacity-80">±{accuracy ? Math.round(accuracy) : 10}m</span>
                </div>
              )}

              {locationState === 'error' && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-800">
                  GPS Permission required. Please type your street address or landmark below.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Landmark / Street Address {!hasCoordinates && <span className="text-rose-600">*</span>}
                </label>
                <input
                  type="text"
                  required={!hasCoordinates}
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="e.g. Opposite LAUTECH Main Gate, Takie, Ogbomoso, Oyo State"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
                />
              </div>
            </div>

            {/* Caller & Contact Information */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">Your Name (Optional)</label>
                <input
                  type="text"
                  value={callerName}
                  onChange={e => setCallerName(e.target.value)}
                  placeholder="e.g. Obaloluwa Ajayi"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Callback Phone <span className="text-rose-600">*</span></label>
                <input
                  type="tel"
                  required
                  value={callerPhone}
                  onChange={e => setCallerPhone(e.target.value)}
                  placeholder="e.g. +234 801 234 5678"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
                />
              </div>
            </div>

            {/* Patient Option */}
            <div>
              <label className="block text-xs font-bold text-slate-700">Who Needs Help?</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCallerIsPatient(true)}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition ${callerIsPatient ? 'border-[#1b7b68] bg-teal-50 text-[#1b7b68]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Myself
                </button>
                <button
                  type="button"
                  onClick={() => setCallerIsPatient(false)}
                  className={`rounded-xl border py-2.5 text-xs font-bold transition ${!callerIsPatient ? 'border-[#1b7b68] bg-teal-50 text-[#1b7b68]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Someone Else
                </button>
              </div>
            </div>

            {!callerIsPatient && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Patient Name (Optional)</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Patient Age (Optional)</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>
              </div>
            )}

            {/* Additional Context */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700">Patient Count</label>
                <input
                  type="number"
                  min="1"
                  value={patientCount}
                  onChange={e => setPatientCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700">Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
                >
                  <option value="English">English</option>
                  <option value="Yoruba">Yoruba</option>
                  <option value="Hausa">Hausa</option>
                  <option value="Igbo">Igbo</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700">Accessibility Needs</label>
                <input
                  type="text"
                  placeholder="e.g. Wheelchair, deaf"
                  value={accessibilityNeeds}
                  onChange={e => setAccessibilityNeeds(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
                />
              </div>
            </div>

            {/* Emergency Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700">What is the Emergency? <span className="text-rose-600">*</span></label>
              <textarea
                required
                rows={3}
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                placeholder="Briefly describe symptoms or what happened (e.g. Severe difficulty breathing, chest pain, road accident)"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#1b7b68]"
              />
            </div>

            {/* Quick Triage Safety Questions */}
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-rose-600" />
                <span className="text-xs font-black text-slate-900">Quick Triage Check</span>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'unconscious', q: 'Is the person unconscious or unresponsive?' },
                  { id: 'not_breathing', q: 'Is the person struggling to breathe?' },
                  { id: 'severe_bleeding', q: 'Is there severe bleeding?' },
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">{item.q}</span>
                    <div className="flex gap-1">
                      {['YES', 'NO'].map(ans => (
                        <button
                          key={ans}
                          type="button"
                          onClick={() => setTriageAnswers(prev => ({ ...prev, [item.id]: prev[item.id] === ans ? '' : ans }))}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${
                            triageAnswers[item.id] === ans
                              ? ans === 'YES' ? 'bg-rose-600 text-white' : 'bg-[#1b7b68] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {ans}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Locked Active Request Alert Banner */}
            {activeIncident && !isClosed && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 space-y-1.5 text-amber-900">
                <div className="flex items-center gap-2 font-black text-xs text-amber-950">
                  <Siren size={16} className="text-amber-700 animate-bounce" />
                  <span>Active Emergency SOS Locked ({activeIncident.publicReference || activeIncident.reference})</span>
                </div>
                <p className="text-xs leading-relaxed">
                  You currently have an active emergency request in progress. You cannot dispatch a new SOS until your active request is completed, cancelled, or expires (20m timeout).
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || (Boolean(activeIncident) && !isClosed)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Siren size={18} />
              {submitting ? 'Sending Emergency SOS…' : (activeIncident && !isClosed) ? 'ACTIVE SOS IN PROGRESS (LOCKED)' : 'DISPATCH EMERGENCY SOS NOW'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
