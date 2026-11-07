"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ambulance, AlertCircle, CheckCircle2, Clock3, Loader2, MapPin,
  RefreshCw, ShieldCheck, XCircle, Radio, Wifi, WifiOff, Crosshair,
  ClipboardList, Activity, Stethoscope, FileText, Send, CheckSquare
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { medxRescueService, type DispatchOffer, type RescueIncident, type RescueVehicle } from '@/services/medxrescue.service';
import AmbulanceShell from '@/components/medxrescue/AmbulanceShell';

const idOf = (value: unknown) => typeof value === 'string' ? value : value && typeof value === 'object' && '_id' in value ? String((value as { _id: unknown })._id) : '';
const incidentOf = (value: RescueIncident | string) => typeof value === 'string' ? null : value;
const vehicleOf = (value: RescueVehicle | string) => typeof value === 'string' ? null : value;

type ActiveTracking = { vehicleId: string; registration: string; makeModel: string };

export default function MedxRescueCrewPage() {
  const router = useRouter();
  const { isAuthenticated, account, hasHydrated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'OFFERS' | 'PRESHIFT' | 'EPCR'>('OFFERS');

  // Offers state
  const [offers, setOffers] = useState<DispatchOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  // GPS Tracking
  const [activeTracking, setActiveTracking] = useState<ActiveTracking | null>(null);
  const [trackingState, setTrackingState] = useState<'OFF' | 'STARTING' | 'LIVE' | 'ERROR'>('OFF');
  const [lastGpsSent, setLastGpsSent] = useState<Date | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastGpsPostRef = useRef(0);
  const gpsPostInFlightRef = useRef(false);
  const activeTrackingRef = useRef<ActiveTracking | null>(null);

  // Pre-Shift Checklist State
  const [preShiftVehicleId, setPreShiftVehicleId] = useState('');
  const [fuelPercent, setFuelPercent] = useState(100);
  const [oxygenPsi, setOxygenPsi] = useState(2000);
  const [aedOk, setAedOk] = useState(true);
  const [monitorOk, setMonitorOk] = useState(true);
  const [airwayOk, setAirwayOk] = useState(true);
  const [ppeOk, setPpeOk] = useState(true);
  const [stretcherOk, setStretcherOk] = useState(true);
  const [medsOk, setMedsOk] = useState(true);
  const [checklistNotes, setChecklistNotes] = useState('');
  const [submittingChecklist, setSubmittingChecklist] = useState(false);

  // ePCR Form State
  const [epcrIncidentId, setEpcrIncidentId] = useState('');
  const [epcrVehicleId, setEpcrVehicleId] = useState('');
  const [epcrChiefComplaint, setEpcrChiefComplaint] = useState('');
  const [epcrHpi, setEpcrHpi] = useState('');
  const [epcrAirway, setEpcrAirway] = useState('Clear and patent');
  const [epcrBreathing, setEpcrBreathing] = useState('Equal chest expansion, normal breath sounds');
  const [epcrCirculation, setEpcrCirculation] = useState('Strong radial pulse, CRT < 2s');
  const [epcrDisability, setEpcrDisability] = useState('Alert (GCS 15)');
  const [epcrExposure, setEpcrExposure] = useState('No gross hemorrhage or deformities');
  const [epcrAllergies, setEpcrAllergies] = useState('NKDA');
  const [epcrMeds, setEpcrMeds] = useState('None');
  const [epcrSigns, setEpcrSigns] = useState('');
  const [epcrTriageTag, setEpcrTriageTag] = useState<'RED' | 'YELLOW' | 'GREEN' | 'BLACK'>('YELLOW');
  const [epcrClinicianSignature, setEpcrClinicianSignature] = useState('');
  const [savingEpcr, setSavingEpcr] = useState(false);

  // Vitals Ingestion State
  const [vitalHr, setVitalHr] = useState<number | ''>(80);
  const [vitalSys, setVitalSys] = useState<number | ''>(120);
  const [vitalDia, setVitalDia] = useState<number | ''>(80);
  const [vitalSpo2, setVitalSpo2] = useState<number | ''>(98);
  const [vitalRr, setVitalRr] = useState<number | ''>(16);
  const [vitalTemp, setVitalTemp] = useState<number | ''>(36.8);
  const [vitalGcs, setVitalGcs] = useState<number | ''>(15);
  const [savingVital, setSavingVital] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const response = await medxRescueService.listOffers();
      setOffers(response.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load crew offers. Confirm this account is linked to a verified rescue provider.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace('/auth/login');
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      void load();
      const timer = window.setInterval(() => void load(true), 15000);
      return () => window.clearInterval(timer);
    }
  }, [hasHydrated, isAuthenticated, load]);

  const stopGps = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    activeTrackingRef.current = null;
    setActiveTracking(null);
    setTrackingState('OFF');
  }, []);

  useEffect(() => () => {
    if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  const startGps = (offer: DispatchOffer) => {
    const vehicle = vehicleOf(offer.vehicleId);
    const vehicleId = vehicle?._id || idOf(offer.vehicleId);
    if (!vehicleId) { setError('Vehicle information is missing from this offer. Contact dispatch.'); return; }
    if (!navigator.geolocation) { setError('This browser does not support location sharing. Contact dispatch and follow your provider’s fallback procedure.'); return; }
    if (watchIdRef.current !== null) stopGps();
    const target: ActiveTracking = {
      vehicleId,
      registration: vehicle?.registrationNumber || 'Assigned vehicle',
      makeModel: vehicle?.makeModel || '',
    };
    activeTrackingRef.current = target;
    setActiveTracking(target);
    setTrackingState('STARTING');
    setError('');
    setNotice('Allow location access and keep this page active while sharing GPS. Browser tracking can pause when the page is suspended.');
    watchIdRef.current = navigator.geolocation.watchPosition(async position => {
      const current = activeTrackingRef.current;
      if (!current || current.vehicleId !== vehicleId) return;
      setGpsAccuracy(position.coords.accuracy);
      setTrackingState('LIVE');
      const now = Date.now();
      if (now - lastGpsPostRef.current < 5000 || gpsPostInFlightRef.current) return;
      gpsPostInFlightRef.current = true;
      lastGpsPostRef.current = now;
      try {
        await medxRescueService.updateVehicleLocation(vehicleId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        setLastGpsSent(new Date());
      } catch (e) {
        setTrackingState('ERROR');
        setError(e instanceof Error ? e.message : 'GPS could not be sent to the backend. Check provider/vehicle status and contact dispatch if the error continues.');
      } finally {
        gpsPostInFlightRef.current = false;
      }
    }, positionError => {
      setTrackingState('ERROR');
      setError(positionError.code === positionError.PERMISSION_DENIED
        ? 'Location permission was denied. Enable location access or contact dispatch with your current location.'
        : 'GPS is unavailable or timed out. The last reported location may be stale; contact dispatch if you cannot restore GPS.');
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  };

  const respond = async (offer: DispatchOffer, accept: boolean) => {
    const vehicle = vehicleOf(offer.vehicleId);
    const vehicleId = vehicle?._id || idOf(offer.vehicleId);
    if (!vehicleId) { setError('Vehicle information is missing from this offer. Contact dispatch.'); return; }
    if (accept && !window.confirm('Confirm that your assigned crew, vehicle, equipment and current availability can safely fulfil this response? Your acceptance will still require dispatcher confirmation.')) return;
    setBusy(offer._id); setError(''); setNotice('');
    try {
      const response = await medxRescueService.respondToOffer(offer._id, {
        accept, vehicleId, note: notes[offer._id] || undefined,
      });
      setNotice(response.message || (accept
        ? 'Offer accepted. The incident is awaiting dispatcher confirmation; it is not yet a confirmed dispatch.'
        : 'Offer declined. Dispatch can continue searching for another suitable provider.'));
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not respond to offer.');
    } finally {
      setBusy('');
    }
  };

  const submitPreShiftChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preShiftVehicleId) { setError('Vehicle ID is required for pre-shift inspection.'); return; }
    setSubmittingChecklist(true); setError(''); setNotice('');
    try {
      const res = await medxRescueService.submitPreShiftChecklist(preShiftVehicleId, {
        fuelLevelPercent: fuelPercent,
        oxygenPressurePsi: oxygenPsi,
        aedFunctional: aedOk,
        monitorFunctional: monitorOk,
        airwayKitComplete: airwayOk,
        ppeStocked: ppeOk,
        stretcherFunctional: stretcherOk,
        essentialMedsStocked: medsOk,
        notes: checklistNotes,
      });
      setNotice(res.message || 'Pre-shift inspection checklist saved successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit pre-shift checklist.');
    } finally {
      setSubmittingChecklist(false);
    }
  };

  const saveVitalObservation = async () => {
    if (!epcrIncidentId) { setError('Specify Incident ID before recording vitals.'); return; }
    setSavingVital(true); setError(''); setNotice('');
    try {
      await medxRescueService.recordClinicalObservation(epcrIncidentId, {
        heartRateBpm: vitalHr !== '' ? Number(vitalHr) : undefined,
        systolicBpMmHg: vitalSys !== '' ? Number(vitalSys) : undefined,
        diastolicBpMmHg: vitalDia !== '' ? Number(vitalDia) : undefined,
        spO2Percent: vitalSpo2 !== '' ? Number(vitalSpo2) : undefined,
        respiratoryRateBpm: vitalRr !== '' ? Number(vitalRr) : undefined,
        temperatureCelsius: vitalTemp !== '' ? Number(vitalTemp) : undefined,
        gcsScore: vitalGcs !== '' ? Number(vitalGcs) : undefined,
        deviceProvenance: 'MedXRescue Crew Device',
      });
      setNotice('Clinical vitals recorded and transmitted live to receiving hospital & dispatch.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record vital observations.');
    } finally {
      setSavingVital(false);
    }
  };

  const saveEpcrRecord = async (sign = false) => {
    if (!epcrIncidentId || !epcrVehicleId) { setError('Incident ID and Vehicle ID are required for ePCR.'); return; }
    if (sign && !epcrClinicianSignature) { setError('Clinician name/signature is required to finalize ePCR.'); return; }
    setSavingEpcr(true); setError(''); setNotice('');
    try {
      const res = await medxRescueService.saveEPCR(epcrIncidentId, {
        vehicleId: epcrVehicleId,
        chiefComplaint: epcrChiefComplaint || 'Emergency Dispatch Response',
        historyOfPresentIllness: epcrHpi,
        abcdeAssessment: {
          airway: epcrAirway,
          breathing: epcrBreathing,
          circulation: epcrCirculation,
          disability: epcrDisability,
          exposure: epcrExposure,
        },
        sampleHistory: {
          signsSymptoms: epcrSigns,
          allergies: epcrAllergies,
          medications: epcrMeds,
        },
        triageTag: epcrTriageTag,
        clinicianSignature: epcrClinicianSignature,
        isSigned: sign,
      });
      setNotice(res.message || (sign ? 'ePCR signed and finalized.' : 'ePCR draft saved successfully.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save ePCR.');
    } finally {
      setSavingEpcr(false);
    }
  };

  if (!hasHydrated || !isAuthenticated) return <div className="flex min-h-screen items-center justify-center bg-[#f5faf9]"><Loader2 className="animate-spin text-[#1b7b68]" /></div>;

  return (
    <AmbulanceShell>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50 px-3 py-1 text-xs font-semibold text-[#1b7b68]">
              <Ambulance size={14} /> Crew Workstation &amp; OS
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Ambulance Crew Workstation
            </h1>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Manage live dispatch offers, share vehicle GPS telemetry, run pre-shift equipment inspections, and record ePCR patient care records.
            </p>
          </div>

          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#1b7b68]/30 hover:bg-slate-50 disabled:opacity-50 sm:self-center"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Offers
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/80 gap-6">
          <button
            onClick={() => setActiveTab('OFFERS')}
            className={`pb-3 text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'OFFERS'
                ? 'border-b-2 border-[#1b7b68] text-[#1b7b68] font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Radio size={16} /> Dispatch Offers &amp; Telemetry
          </button>
          <button
            onClick={() => setActiveTab('PRESHIFT')}
            className={`pb-3 text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'PRESHIFT'
                ? 'border-b-2 border-[#1b7b68] text-[#1b7b68] font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ClipboardList size={16} /> Pre-Shift Inspection
          </button>
          <button
            onClick={() => setActiveTab('EPCR')}
            className={`pb-3 text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'EPCR'
                ? 'border-b-2 border-[#1b7b68] text-[#1b7b68] font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Stethoscope size={16} /> ePCR &amp; Live Vitals
          </button>
        </div>

        {error && <div role="alert" className="flex gap-2.5 rounded-2xl border border-rose-200/60 bg-rose-50 p-4 text-xs font-semibold text-rose-700"><AlertCircle size={18} className="shrink-0 text-rose-600" /><span>{error}</span></div>}
        {notice && <div role="status" className="flex gap-2.5 rounded-2xl border border-emerald-200/60 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"><CheckCircle2 size={18} className="shrink-0 text-emerald-600" /><span>{notice}</span></div>}

        {/* TAB 1: DISPATCH OFFERS & TELEMETRY */}
        {activeTab === 'OFFERS' && (
          <div className="mt-6 space-y-6">
            {activeTracking && (
              <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#1b7b68]"><Radio size={19} /></div>
                    <div>
                      <h2 className="font-extrabold text-slate-900">Vehicle GPS sharing</h2>
                      <p className="mt-1 text-sm text-slate-600">{activeTracking.registration} {activeTracking.makeModel ? `· ${activeTracking.makeModel}` : ''}</p>
                      <p className="mt-1 text-xs text-slate-500">Updates are sent while this page is active and location permission remains available.</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${trackingState === 'LIVE' ? 'bg-emerald-50 text-emerald-700' : trackingState === 'ERROR' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                    {trackingState === 'LIVE' ? <Wifi size={13} /> : <WifiOff size={13} />}
                    {trackingState === 'LIVE' ? 'GPS updates active' : trackingState === 'ERROR' ? 'GPS issue' : 'Starting GPS'}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <p>Last successful update: <strong>{lastGpsSent ? lastGpsSent.toLocaleTimeString() : 'Waiting for first update'}</strong></p>
                  <p>Reported accuracy: <strong>{gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)} m` : 'Not available'}</strong></p>
                </div>
                <button onClick={stopGps} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50">
                  <WifiOff size={15} /> Stop GPS sharing
                </button>
              </section>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
                <Loader2 className="animate-spin" /> Loading offers…
              </div>
            ) : offers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#1b7b68]">
                  <CheckCircle2 size={26} />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-slate-900">No pending dispatch offers</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  New offers appear here when dispatch sends them to your linked provider. This page refreshes automatically.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {offers.map(offer => {
                  const incident = incidentOf(offer.incidentId);
                  const vehicle = vehicleOf(offer.vehicleId);
                  const coords = incident?.location?.coordinates;
                  const expired = new Date(offer.expiresAt).getTime() <= Date.now();
                  const trackingThis = activeTracking?.vehicleId === (vehicle?._id || idOf(offer.vehicleId));
                  return (
                    <section key={offer._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-[#1b7b68]">Incoming dispatch offer</p>
                          <h2 className="mt-1 text-xl font-extrabold text-slate-950">{incident?.publicReference || 'Incident details unavailable'}</h2>
                          <p className="mt-1 text-xs text-slate-500">Expires {new Date(offer.expiresAt).toLocaleTimeString()}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${expired ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          <Clock3 size={11} className="mr-1 inline" />{expired ? 'Offer expired' : 'Pending acceptance'}
                        </span>
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vehicle</p>
                          <p className="mt-1 font-bold text-slate-900">{vehicle ? `${vehicle.registrationNumber} · ${vehicle.makeModel}` : 'Assigned vehicle'}</p>
                          <p className="mt-1 text-xs text-slate-500">{vehicle?.vehicleClass?.replaceAll('_', ' ') || 'Vehicle class unavailable'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Reported location</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{incident?.landmark || incident?.locationDescription || 'No landmark supplied'}</p>
                          {coords && <p className="mt-1 text-xs text-slate-500">{coords[1].toFixed(5)}, {coords[0].toFixed(5)}</p>}
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-bold text-slate-900">Emergency summary</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{incident?.chiefComplaint || 'The dispatcher has not supplied a summary.'}</p>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <button onClick={() => void respond(offer, true)} disabled={busy === offer._id || expired} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#166657] disabled:opacity-50">
                          <ShieldCheck size={16} />{busy === offer._id ? 'Submitting…' : 'Accept offer'}
                        </button>
                        <button onClick={() => void respond(offer, false)} disabled={busy === offer._id || expired} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                          <XCircle size={16} /> Decline offer
                        </button>
                      </div>
                      <button onClick={() => trackingThis ? stopGps() : startGps(offer)} disabled={expired || trackingState === 'STARTING'} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-extrabold text-[#1b7b68] hover:bg-teal-100 disabled:opacity-50">
                        <Crosshair size={15} />{trackingThis ? 'Stop sharing GPS for this vehicle' : 'Start sharing vehicle GPS'}
                      </button>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRE-SHIFT INSPECTION CHECKLIST */}
        {activeTab === 'PRESHIFT' && (
          <form onSubmit={submitPreShiftChecklist} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <CheckSquare className="text-[#1b7b68]" size={20} /> Pre-Shift Equipment & Readiness Inspection
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Verify vehicle equipment before marking your ambulance operationally AVAILABLE. All items must pass safety protocols.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700">
                Vehicle Registration / ID *
                <input
                  type="text"
                  required
                  placeholder="e.g. AMB-001-OGB"
                  value={preShiftVehicleId}
                  onChange={e => setPreShiftVehicleId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1b7b68]"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Fuel Level ({fuelPercent}%)
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fuelPercent}
                  onChange={e => setFuelPercent(Number(e.target.value))}
                  className="mt-2 w-full accent-[#1b7b68]"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Main Oxygen Cylinder Pressure (PSI)
                <input
                  type="number"
                  min="0"
                  max="3000"
                  value={oxygenPsi}
                  onChange={e => setOxygenPsi(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1b7b68]"
                />
              </label>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Equipment Checklist</p>

              <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" checked={aedOk} onChange={e => setAedOk(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#1b7b68]" />
                Defibrillator / AED tested and fully charged
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" checked={monitorOk} onChange={e => setMonitorOk(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#1b7b68]" />
                ECG / Patient Monitor functional with sensors
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" checked={airwayOk} onChange={e => setAirwayOk(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#1b7b68]" />
                Airway & Suction Kit complete (BVM, ET, OPA/NPA)
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" checked={ppeOk} onChange={e => setPpeOk(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#1b7b68]" />
                Personal Protective Equipment (PPE) stocked
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" checked={stretcherOk} onChange={e => setStretcherOk(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#1b7b68]" />
                Main Stretcher & Spine Board operational
              </label>

              <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 cursor-pointer">
                <input type="checkbox" checked={medsOk} onChange={e => setMedsOk(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-[#1b7b68]" />
                Essential Emergency Medications stocked
              </label>
            </div>

            <label className="mt-6 block text-xs font-bold text-slate-700">
              Inspection Notes / Defect Comments
              <textarea
                rows={2}
                value={checklistNotes}
                onChange={e => setChecklistNotes(e.target.value)}
                placeholder="Note any missing items or maintenance issues..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#1b7b68]"
              />
            </label>

            <button
              type="submit"
              disabled={submittingChecklist}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#166657] disabled:opacity-50"
            >
              {submittingChecklist ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Submit Inspection
            </button>
          </form>
        )}

        {/* TAB 3: EPCR & LIVE VITALS RECORDER */}
        {activeTab === 'EPCR' && (
          <div className="mt-6 space-y-6">
            {/* Live Vitals Entry */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="text-[#1b7b68]" size={20} /> Live Telemetry Vitals Ingestion
              </h2>
              <p className="mt-1 text-xs text-slate-500">Record repeat vital observations during transit. Vitals stream in real-time to the receiving hospital trauma team.</p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="block text-xs font-bold text-slate-700">
                  Heart Rate (BPM)
                  <input type="number" value={vitalHr} onChange={e => setVitalHr(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Systolic BP (mmHg)
                  <input type="number" value={vitalSys} onChange={e => setVitalSys(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Diastolic BP (mmHg)
                  <input type="number" value={vitalDia} onChange={e => setVitalDia(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  SpO2 (%)
                  <input type="number" value={vitalSpo2} onChange={e => setVitalSpo2(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Resp Rate (BPM)
                  <input type="number" value={vitalRr} onChange={e => setVitalRr(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Temp (°C)
                  <input type="number" step="0.1" value={vitalTemp} onChange={e => setVitalTemp(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  GCS (3-15)
                  <input type="number" value={vitalGcs} onChange={e => setVitalGcs(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <div className="flex items-end">
                  <button onClick={saveVitalObservation} disabled={savingVital} className="w-full h-10 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1b7b68] text-xs font-bold text-white hover:bg-[#166657]">
                    {savingVital ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Transmit Vitals
                  </button>
                </div>
              </div>
            </section>

            {/* ePCR Full Form */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="text-[#1b7b68]" size={20} /> Electronic Patient Care Report (ePCR)
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Incident ID *
                  <input type="text" placeholder="e.g. 64f1a2b3..." value={epcrIncidentId} onChange={e => setEpcrIncidentId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Vehicle ID *
                  <input type="text" placeholder="e.g. 64f1a2b3..." value={epcrVehicleId} onChange={e => setEpcrVehicleId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Chief Complaint
                  <input type="text" value={epcrChiefComplaint} onChange={e => setEpcrChiefComplaint(e.target.value)} placeholder="e.g. Chest pain with dyspnea" className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Field Triage Tag (MCI)
                  <select value={epcrTriageTag} onChange={e => setEpcrTriageTag(e.target.value as any)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm font-bold">
                    <option value="RED">🔴 RED (Immediate / Critical)</option>
                    <option value="YELLOW">💛 YELLOW (Urgent)</option>
                    <option value="GREEN">💚 GREEN (Delayed / Minor)</option>
                    <option value="BLACK">🖤 BLACK (Expectant / Deceased)</option>
                  </select>
                </label>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">ABCDE Clinical Assessment</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <input type="text" value={epcrAirway} onChange={e => setEpcrAirway(e.target.value)} placeholder="Airway" className="rounded-xl border border-slate-200 p-2 text-xs" />
                  <input type="text" value={epcrBreathing} onChange={e => setEpcrBreathing(e.target.value)} placeholder="Breathing" className="rounded-xl border border-slate-200 p-2 text-xs" />
                  <input type="text" value={epcrCirculation} onChange={e => setEpcrCirculation(e.target.value)} placeholder="Circulation" className="rounded-xl border border-slate-200 p-2 text-xs" />
                  <input type="text" value={epcrDisability} onChange={e => setEpcrDisability(e.target.value)} placeholder="Disability" className="rounded-xl border border-slate-200 p-2 text-xs" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-bold text-slate-700">
                  Allergies (SAMPLE)
                  <input type="text" value={epcrAllergies} onChange={e => setEpcrAllergies(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Medications (SAMPLE)
                  <input type="text" value={epcrMeds} onChange={e => setEpcrMeds(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Signs & Symptoms
                  <input type="text" value={epcrSigns} onChange={e => setEpcrSigns(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs" />
                </label>
              </div>

              <label className="block text-xs font-bold text-slate-700">
                Lead Clinician Signature / Full Name
                <input type="text" placeholder="e.g. Paramedic Obaloluwa Ajayi, EMT-P #8821" value={epcrClinicianSignature} onChange={e => setEpcrClinicianSignature(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold" />
              </label>

              <div className="flex gap-3 pt-2">
                <button onClick={() => saveEpcrRecord(false)} disabled={savingEpcr} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50">
                  Save ePCR Draft
                </button>
                <button onClick={() => saveEpcrRecord(true)} disabled={savingEpcr} className="flex-1 rounded-xl bg-[#1b7b68] py-2.5 text-xs font-extrabold text-white hover:bg-[#166657]">
                  Finalize & Sign ePCR
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AmbulanceShell>
  );
}
