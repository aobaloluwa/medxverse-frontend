"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity, AlertTriangle, Ambulance, ArrowRight, CheckCircle2, Clock3,
  Crosshair, HeartPulse, MapPin, PhoneCall, ShieldCheck, Siren, XCircle,
  Loader2, RefreshCw, Building2, WifiOff, Video, Phone, Check, RefreshCcw
} from 'lucide-react';
import {
  medxRescueService,
  type LiveFleetData,
  type RescueIncident,
  type IncidentStatus
} from '@/services/medxrescue.service';
import DynamicAerialMap from '@/components/medxrescue/DynamicAerialMap';
import { openTelemedicineCall } from '@/lib/telemedicine-call-window';
import { offlineGpsTracker } from '@/lib/offline-gps-tracker';
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

export default function MedxRescueGuestPage() {
  const router = useRouter();
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

  // Uber-style Smart Hospital Matching State
  const [matchedHospital, setMatchedHospital] = useState<{ matchedHospital: any; distanceKm: number; estimatedEtaMinutes: number; acceptanceId: string } | null>(null);
  const [matchingHospital, setMatchingHospital] = useState(false);
  const [excludedFacilityIds, setExcludedFacilityIds] = useState<string[]>([]);
  const [hospitalConfirmed, setHospitalConfirmed] = useState(false);

  // Active tracking state
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [activeIncident, setActiveIncident] = useState<RescueIncident | null>(null);
  const [familyLink, setFamilyLink] = useState('');
  const [generatingFamilyLink, setGeneratingFamilyLink] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveFleet, setLiveFleet] = useState<LiveFleetData | null>(null);

  const idempotencyKeyRef = useRef('');

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

  // Load existing active emergency from browser session/local storage
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
        const savedMatch = localStorage.getItem(`medxrescue_match:${ref}`);
        if (savedMatch) {
          try { setMatchedHospital(JSON.parse(savedMatch)); } catch {}
        }
        const savedConfirmed = localStorage.getItem(`medxrescue_confirmed:${ref}`);
        if (savedConfirmed === 'true') {
          setHospitalConfirmed(true);
        }
      }
    }
  }, []);

  // Save matchedHospital and hospitalConfirmed to localStorage for full reload persistence
  useEffect(() => {
    if (typeof window === 'undefined' || !activeRef) return;
    if (matchedHospital) {
      localStorage.setItem(`medxrescue_match:${activeRef}`, JSON.stringify(matchedHospital));
    }
    localStorage.setItem(`medxrescue_confirmed:${activeRef}`, String(hospitalConfirmed));
  }, [activeRef, matchedHospital, hospitalConfirmed]);

  // Fetch live fleet telemetry for map
  const loadFleet = useCallback(async () => {
    try {
      const res = await medxRescueService.getLiveFleet();
      setLiveFleet(res.data);
    } catch {
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

  // Auto GPS Location detector with high precision
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  // Launch Emergency Voice Call via Telemedicine calling engine
  const triggerEmergencyVoiceCall = () => {
    const callSessionId = activeRef ? `emergency-voice-${activeRef}` : `emergency-voice-${Date.now()}`;
    openTelemedicineCall(
      callSessionId,
      '/medxrescue',
      `Emergency Voice Call (${callerName || 'Guest SOS'})`,
      (url) => router.push(url)
    );
  };

  // Run Uber-style Smart Hospital Matching Preview (does NOT start countdown until confirmed)
  const runSmartHospitalMatch = async (incidentId: string, exclude: string[] = []) => {
    setMatchingHospital(true);
    setError('');
    try {
      const res = await medxRescueService.previewSmartHospital(incidentId, exclude);
      setMatchedHospital({ matchedHospital: res.data.matchedHospital, distanceKm: res.data.distanceKm, estimatedEtaMinutes: res.data.estimatedEtaMinutes, acceptanceId: '' });
      setNotice(`Suggested nearest hospital: ${res.data.matchedHospital.name} (${res.data.distanceKm} km away, ~${res.data.estimatedEtaMinutes}m ETA). Please review and confirm.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not match with an available hospital.');
    } finally {
      setMatchingHospital(false);
    }
  };

  // Confirm Hospital Match (Starts 20-min countdown & notifies facility)
  const confirmHospitalMatch = async () => {
    if (!activeIncident || !matchedHospital) return;
    const incidentId = String(activeIncident._id || activeIncident.id || '');
    if (!incidentId) return;
    setMatchingHospital(true);
    setError('');
    try {
      const res = await medxRescueService.matchSmartHospital(incidentId, excludedFacilityIds);
      setMatchedHospital(res.data);
      setHospitalConfirmed(true);
      setNotice(`Hospital ${res.data.matchedHospital.name} confirmed! Dispatched to hospital queue and 20-minute countdown started.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not confirm hospital match.');
    } finally {
      setMatchingHospital(false);
    }
  };

  // Submit Guest Emergency SOS
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

    if (!hasCoordinates && !hasLandmark) {
      setError('Emergency Location is REQUIRED! Allow GPS access or type a recognizable landmark address so dispatch can locate you.');
      return;
    }

    setSubmitting(true);
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `mrx-guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      const key = idempotencyKeyRef.current;
      const combinedDetails = [
        additionalDetails.trim(),
        patientCount ? `Approx. Patients: ${patientCount}` : '',
        language && language !== 'English' ? `Preferred Language: ${language}` : '',
        accessibilityNeeds ? `Accessibility Needs: ${accessibilityNeeds}` : ''
      ].filter(Boolean).join(' | ');

      const res = await medxRescueService.createGuestIncident({
        callerName: callerName.trim() || undefined,
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
        intakeChannel: 'GUEST_WEB',
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
      setNotice('Emergency SOS created! Finding nearest available hospital for your review...');

      const incidentId = String(incident._id || incident.id || '');
      if (incidentId) {
        await runSmartHospitalMatch(incidentId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send emergency request.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const cancelRequest = async () => {
    if (!activeRef || !activeToken || !window.confirm('Cancel this emergency request?')) return;
    try {
      const res = await medxRescueService.cancelGuestIncident(activeRef, activeToken, 'Cancelled by guest');
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

  const createdAtMs = activeIncident?.createdAt ? new Date(activeIncident.createdAt).getTime() : Date.now();
  const expiresAtMs = createdAtMs + 20 * 60 * 1000;
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(1200);

  useEffect(() => {
    if (!activeIncident || !hospitalConfirmed || activeIncident.crewConfirmed || isClosed) return;
    const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
    setTimeRemainingSec(remaining);

    const interval = setInterval(() => {
      const rem = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setTimeRemainingSec(rem);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeIncident, hospitalConfirmed, expiresAtMs, isClosed]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins}m ${remainingSec < 10 ? '0' : ''}${remainingSec}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f7f6] via-[#f5faf9] to-[#eef6f5] font-sans antialiased text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-teal-100 shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-102">
            <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b7b68] to-[#125547] text-white shadow-md shadow-teal-900/10"><HeartPulse size={21}/></span>
            <span><span className="block text-xs sm:text-sm font-black tracking-tight text-slate-900">MedXVerse</span><span className="block text-[10px] sm:text-xs font-bold text-[#1b7b68]">MedXRescue Nexus</span></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/medxrescue/fleet" className="inline-flex items-center gap-1 rounded-xl sm:rounded-2xl border border-teal-200/80 bg-teal-50/90 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-extrabold text-[#1b7b68] hover:bg-teal-100 transition shadow-xs">
              <Siren size={14} /> <span className="hidden xs:inline">Aerial </span>Radar
            </Link>
            <Link href="/auth/login" className="text-[11px] sm:text-xs font-bold text-slate-600 hover:text-[#1b7b68] transition">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 text-xs font-extrabold flex items-center gap-3 shadow-sm">
            <WifiOff size={18} className="text-amber-700 shrink-0" />
            <div>
              <p className="font-black text-amber-950">Offline Mode Active</p>
              <p className="font-normal text-amber-800">
                GPS tracking coordinates are being recorded locally on your device and will auto-sync when online.
              </p>
            </div>
          </div>
        )}

        {/* Hero Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-white p-6 sm:p-8 border border-teal-100/80 shadow-xl shadow-teal-950/5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#1b7b68] border border-teal-200/60 mb-2">
              <Siren size={15} className="text-[#1b7b68]" />Smart Emergency Dispatch
            </div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-4xl tracking-tight">
              Order Emergency Assistance
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Request an emergency ambulance instantly. Our intelligent geospatial algorithm matches you with the nearest available hospital. You remain in full control and must confirm your hospital match before dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={triggerEmergencyVoiceCall}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4.5 py-3 text-xs font-black text-white hover:bg-[#166657] shadow-lg shadow-teal-900/25 transition-all hover:scale-102"
            >
              <PhoneCall size={16} className="text-rose-300 animate-pulse" /> Emergency Voice Call
            </button>

            <a
              href="tel:112"
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4.5 py-3 text-xs font-black text-white hover:bg-rose-700 shadow-lg shadow-rose-900/25 transition-all hover:scale-102"
            >
              <PhoneCall size={15} /> Direct 112 Call
            </a>
          </div>
        </div>

        {/* Main Grid Layout: Map & Tracking on One Side, SOS Intake Form on Other */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">

          {/* Left Column: Live Satellite Map & Status Progress Tracker */}
          <div className="space-y-6">

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl shadow-slate-200/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-[#1b7b68]">
                    <HeartPulse size={19} />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Live Satellite Emergency Radar (Ogbomoso)</h2>
                    <p className="text-[11px] text-slate-500">LAUTECH LTH, BUTH, General Hospital &amp; live ambulance fleet</p>
                  </div>
                </div>

                {activeRef && (
                  <button
                    type="button"
                    onClick={() => void refreshStatus()}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Sync
                  </button>
                )}
              </div>

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
                heightClass="h-[320px] sm:h-[400px] lg:h-[480px]"
              />
            </div>

            {/* Uber-Style Smart Hospital Matching Display Card (Shown BEFORE confirmation) */}
            {activeIncident && matchedHospital && !hospitalConfirmed && (
              <div className="rounded-3xl border-2 border-teal-400 bg-gradient-to-br from-teal-50/90 to-white p-6 shadow-2xl shadow-teal-900/10 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-teal-200/70 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1b7b68] text-white shadow-md">
                      <Building2 size={22} />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#1b7b68]">
                        Suggested Nearest Hospital Match
                      </span>
                      <h3 className="text-xl font-black text-slate-900">
                        {matchedHospital.matchedHospital.name}
                      </h3>
                    </div>
                  </div>
                  <span className="rounded-2xl bg-teal-200/80 px-3.5 py-1.5 text-xs font-black text-teal-900 shadow-xs">
                    {matchedHospital.distanceKm} km away (~{matchedHospital.estimatedEtaMinutes} min ETA)
                  </span>
                </div>

                <div className="text-xs text-slate-700 space-y-1.5 bg-white/80 p-4 rounded-2xl border border-teal-100">
                  <p><strong>Address:</strong> {matchedHospital.matchedHospital.address}</p>
                  <p><strong>Emergency Contact:</strong> {matchedHospital.matchedHospital.emergencyContactPhone}</p>
                  {matchedHospital.matchedHospital.capabilities?.length > 0 && (
                    <p><strong>Capabilities:</strong> {matchedHospital.matchedHospital.capabilities.join(', ')}</p>
                  )}
                  <p className="text-[11px] text-amber-800 font-bold pt-1">⚠️ This request is currently PENDING. No hospital or countdown timer has started until you explicitly confirm below.</p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={matchingHospital}
                    onClick={() => void confirmHospitalMatch()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] px-5 py-3.5 text-xs font-black text-white hover:bg-[#166657] shadow-xl shadow-teal-900/20 transition-all hover:scale-102 disabled:opacity-60"
                  >
                    <Check size={16} /> {matchingHospital ? 'Confirming Dispatch…' : 'Confirm Hospital Match & Dispatch'}
                  </button>

                  <button
                    type="button"
                    disabled={matchingHospital}
                    onClick={() => {
                      const currentFacId = matchedHospital.matchedHospital._id;
                      const newExcluded = [...excludedFacilityIds, currentFacId];
                      setExcludedFacilityIds(newExcluded);
                      const incidentId = String(activeIncident._id || activeIncident.id || '');
                      if (incidentId) {
                        void runSmartHospitalMatch(incidentId, newExcluded);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-teal-300 bg-white px-4.5 py-3.5 text-xs font-black text-[#1b7b68] hover:bg-teal-50 transition shadow-xs"
                  >
                    <RefreshCcw size={14} className={matchingHospital ? 'animate-spin' : ''} /> Decline / Find Alternative
                  </button>
                </div>
              </div>
            )}

            {/* Active SOS Tracking Timeline (Shown ONLY AFTER hospital match confirmation) */}
            {activeIncident && hospitalConfirmed && (
              <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-xl shadow-slate-200/50 space-y-5 animate-in fade-in duration-300">
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

                  <span className={`rounded-full px-3.5 py-1 text-xs font-black uppercase ${
                    currentStatus === 'NO_RESOURCE_AVAILABLE' ? 'bg-rose-100 text-rose-800 border border-rose-200' : isClosed ? 'bg-slate-100 text-slate-700' : 'bg-teal-50 text-[#1b7b68] border border-teal-200'
                  }`}>
                    {activeIncident.status.replaceAll('_', ' ')}
                  </span>
                </div>

                {!activeIncident.crewConfirmed && !isClosed && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        <Clock3 size={15} className="text-amber-700" /> Hospital Acceptance Timeout
                      </span>
                      <span className="rounded-xl bg-amber-200 px-2.5 py-0.5 text-xs font-black text-amber-900 tabular-nums">
                        {formatTimer(timeRemainingSec)}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Requests automatically expire if no hospital or ambulance confirms within 20 minutes.
                    </p>
                  </div>
                )}

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
                        <p className="font-bold text-slate-700">Share this secure link with family:</p>
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
            <form onSubmit={submitEmergency} className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6">
              <div className="border-b border-slate-100 pb-5 text-center">
                <span className="text-xs font-black uppercase tracking-widest text-rose-600">
                  Guest Emergency Dispatch
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Request Ambulance Help</h2>
                <p className="text-xs text-slate-500 mt-1.5">
                  Fill in your details below, then press the big round SOS button to initiate an uncommitted pending request.
                </p>

                {/* Big Round Glowing Emergency SOS Button (Uber Style) */}
                <div className="py-6 flex flex-col items-center justify-center">
                  <button
                    type="submit"
                    disabled={submitting || (Boolean(activeIncident) && !isClosed)}
                    className="group relative flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-rose-600 via-rose-600 to-rose-700 p-4 text-white shadow-2xl shadow-rose-900/30 transition-all duration-300 hover:scale-105 hover:from-rose-500 hover:to-rose-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-8 border-rose-100 animate-pulse"
                  >
                    <Siren size={42} className="transition-transform duration-300 group-hover:rotate-12" />
                    <span className="mt-1 text-lg font-black tracking-widest">EMERGENCY</span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-rose-100">SOS DISPATCH</span>
                  </button>
                  <p className="mt-3.5 text-xs font-bold text-slate-500">Tap to preview nearest hospital &amp; confirm dispatch</p>
                </div>
              </div>

              {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 shadow-xs">{error}</div>}
              {notice && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-xs font-semibold text-[#1b7b68] shadow-xs">{notice}</div>}

              {/* Location & Landmark Section (REQUIRED) */}
              <div className="rounded-2xl border-2 border-teal-500/40 bg-teal-50/40 p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={17} className="text-[#1b7b68]" />
                    <span className="text-xs font-black text-slate-900">Emergency Location <span className="text-rose-600">*</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={locate}
                    disabled={locationState === 'loading'}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3.5 py-2 text-xs font-extrabold text-[#1b7b68] hover:bg-teal-50 shadow-xs transition"
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
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
                    <span className="font-black flex items-center gap-1.5">
                      ✓ GPS Location Auto-Captured ({Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)})
                    </span>
                    <span className="text-[10px] font-bold opacity-80">±{accuracy ? Math.round(accuracy) : 10}m</span>
                  </div>
                )}

                {/* Ogbomoso Quick-Select Location Presets */}
                <div className="pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Ogbomoso Quick-Select Location Presets:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'LAUTECH Teaching Hospital', lat: 8.1432, lng: 4.2558 },
                      { name: 'Bowen Univ. Teaching Hosp. (BUTH)', lat: 8.1278, lng: 4.2415 },
                      { name: 'General Hospital Ogbomoso', lat: 8.1320, lng: 4.2610 },
                      { name: 'Takie Square', lat: 8.1315, lng: 4.2502 },
                      { name: 'Arowomole', lat: 8.1520, lng: 4.2810 },
                    ].map(loc => (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => {
                          setLatitude(String(loc.lat));
                          setLongitude(String(loc.lng));
                          setAccuracy(5);
                          setLandmark(`${loc.name}, Ogbomoso, Oyo State`);
                          setLocationDescription(`${loc.name}, Ogbomoso, Oyo State, Nigeria`);
                          setLocationState('success');
                        }}
                        className="rounded-xl border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#1b7b68] hover:bg-teal-50 shadow-xs transition"
                      >
                        📍 {loc.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Landmark / Street Address {!hasCoordinates && <span className="text-rose-600">*</span>}
                  </label>
                  <input
                    type="text"
                    required={!hasCoordinates}
                    value={landmark}
                    onChange={e => setLandmark(e.target.value)}
                    placeholder="e.g. Opposite LAUTECH Main Gate, Takie, Ogbomoso"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              {/* Caller & Contact Information */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name (Optional)</label>
                  <input
                    type="text"
                    value={callerName}
                    onChange={e => setCallerName(e.target.value)}
                    placeholder="e.g. Guest Caller"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Callback Phone <span className="text-rose-600">*</span></label>
                  <input
                    type="tel"
                    required
                    value={callerPhone}
                    onChange={e => setCallerPhone(e.target.value)}
                    placeholder="e.g. +234 801 234 5678"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              {/* Patient Option */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Who Needs Help?</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCallerIsPatient(true)}
                    className={`rounded-xl border py-3 text-xs font-black transition ${callerIsPatient ? 'border-[#1b7b68] bg-teal-50 text-[#1b7b68] shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Myself
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallerIsPatient(false)}
                    className={`rounded-xl border py-3 text-xs font-black transition ${!callerIsPatient ? 'border-[#1b7b68] bg-teal-50 text-[#1b7b68] shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Someone Else
                  </button>
                </div>
              </div>

              {/* Emergency Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">What is the Emergency? <span className="text-rose-600">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  placeholder="Briefly describe symptoms (e.g. Severe breathing difficulty, accident)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-medium text-slate-800 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {/* Quick Triage Safety Questions */}
              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 space-y-3 shadow-xs">
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
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
                      <span className="text-xs font-bold text-slate-700">{item.q}</span>
                      <div className="flex gap-1.5">
                        {['YES', 'NO'].map(ans => (
                          <button
                            key={ans}
                            type="button"
                            onClick={() => setTriageAnswers(prev => ({ ...prev, [item.id]: prev[item.id] === ans ? '' : ans }))}
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                              triageAnswers[item.id] === ans
                                ? ans === 'YES' ? 'bg-rose-600 text-white shadow-xs' : 'bg-[#1b7b68] text-white shadow-xs'
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
            </form>
          </div>
        </div>
      </main>

      <footer className="border-t border-teal-100 bg-white px-4 py-6 text-center text-xs text-slate-500 mt-16 shadow-inner">
        MedXRescue Nexus · Uber-Style Smart Hospital Matching Engine with Explicit Patient Confirmation.
      </footer>
    </div>
  );
}
