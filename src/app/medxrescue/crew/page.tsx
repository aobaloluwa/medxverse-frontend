"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ambulance, AlertCircle, CheckCircle2, Clock3, Loader2, MapPin,
  RefreshCw, ShieldCheck, XCircle, Radio, Wifi, WifiOff, Crosshair,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { medxRescueService, type DispatchOffer, type RescueIncident, type RescueVehicle } from '@/services/medxrescue.service';

const idOf = (value: unknown) => typeof value === 'string' ? value : value && typeof value === 'object' && '_id' in value ? String((value as { _id: unknown })._id) : '';
const incidentOf = (value: RescueIncident | string) => typeof value === 'string' ? null : value;
const vehicleOf = (value: RescueVehicle | string) => typeof value === 'string' ? null : value;

type ActiveTracking = { vehicleId: string; registration: string; makeModel: string };

export default function MedxRescueCrewPage() {
  const router = useRouter();
  const { isAuthenticated, account, hasHydrated } = useAuthStore();
  const [offers, setOffers] = useState<DispatchOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeTracking, setActiveTracking] = useState<ActiveTracking | null>(null);
  const [trackingState, setTrackingState] = useState<'OFF' | 'STARTING' | 'LIVE' | 'ERROR'>('OFF');
  const [lastGpsSent, setLastGpsSent] = useState<Date | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastGpsPostRef = useRef(0);
  const gpsPostInFlightRef = useRef(false);
  const activeTrackingRef = useRef<ActiveTracking | null>(null);

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

  if (!hasHydrated || !isAuthenticated) return <div className="flex min-h-screen items-center justify-center bg-[#f5faf9]"><Loader2 className="animate-spin text-[#1b7b68]" /></div>;

  return <main className="min-h-screen bg-[#f5faf9] px-4 py-8 text-slate-800 sm:px-6"><div className="mx-auto max-w-5xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]"><Ambulance size={16} /> MedXRescue Nexus · Crew</div><h1 className="mt-2 text-3xl font-extrabold text-slate-950">Dispatch offers</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review offers for your linked provider. Accepting means the crew is willing to respond; the dispatcher must still validate and confirm the assignment.</p><p className="mt-2 text-xs text-slate-500">Signed in as {account?.name || 'Rescue team member'}</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh offers</button></div>

    {error && <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    {notice && <div role="status" className="mt-5 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} className="shrink-0" />{notice}</div>}

    {activeTracking && <section className="mt-5 rounded-2xl border border-teal-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#1b7b68]"><Radio size={19} /></div><div><h2 className="font-extrabold text-slate-900">Vehicle GPS sharing</h2><p className="mt-1 text-sm text-slate-600">{activeTracking.registration} {activeTracking.makeModel ? `· ${activeTracking.makeModel}` : ''}</p><p className="mt-1 text-xs text-slate-500">Updates are sent while this page is active and location permission remains available.</p></div></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${trackingState === 'LIVE' ? 'bg-emerald-50 text-emerald-700' : trackingState === 'ERROR' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{trackingState === 'LIVE' ? <Wifi size={13} /> : <WifiOff size={13} />}{trackingState === 'LIVE' ? 'GPS updates active' : trackingState === 'ERROR' ? 'GPS issue' : 'Starting GPS'}</span></div><div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><p>Last successful update: <strong>{lastGpsSent ? lastGpsSent.toLocaleTimeString() : 'Waiting for first update'}</strong></p><p>Reported accuracy: <strong>{gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)} m` : 'Not available'}</strong></p></div><button onClick={stopGps} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50"><WifiOff size={15} /> Stop GPS sharing</button><p className="mt-3 text-[11px] leading-5 text-slate-500">If the browser is closed, suspended, or the phone loses connectivity, updates may stop. This web page does not guarantee background GPS while the screen is locked.</p></section>}

    {loading ? <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="animate-spin" /> Loading offers…</div>
      : offers.length === 0 ? <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#1b7b68]"><CheckCircle2 size={26} /></div><h2 className="mt-4 text-lg font-extrabold text-slate-900">No pending dispatch offers</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">New offers appear here when dispatch sends them to your linked provider. This page refreshes automatically. If you are already assigned, follow the provider's operational communication procedure.</p></div>
      : <div className="mt-6 grid gap-4">{offers.map(offer => {
        const incident = incidentOf(offer.incidentId);
        const vehicle = vehicleOf(offer.vehicleId);
        const coords = incident?.location?.coordinates;
        const expired = new Date(offer.expiresAt).getTime() <= Date.now();
        const trackingThis = activeTracking?.vehicleId === (vehicle?._id || idOf(offer.vehicleId));
        return <section key={offer._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-[#1b7b68]">Incoming dispatch offer</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">{incident?.publicReference || 'Incident details unavailable'}</h2><p className="mt-1 text-xs text-slate-500">Expires {new Date(offer.expiresAt).toLocaleTimeString()}</p></div><span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${expired ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}><Clock3 size={11} className="mr-1 inline" />{expired ? 'Offer expired' : 'Pending acceptance'}</span></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vehicle</p><p className="mt-1 font-bold text-slate-900">{vehicle ? `${vehicle.registrationNumber} · ${vehicle.makeModel}` : 'Assigned vehicle'}</p><p className="mt-1 text-xs text-slate-500">{vehicle?.vehicleClass?.replaceAll('_', ' ') || 'Vehicle class unavailable'}</p><p className="mt-1 text-xs text-slate-500">GPS: {vehicle?.locationUpdatedAt ? new Date(vehicle.locationUpdatedAt).toLocaleTimeString() : 'No timestamp'}{vehicle?.locationAccuracyMeters !== undefined ? ` · ±${Math.round(vehicle.locationAccuracyMeters)} m` : ''}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Reported location</p><p className="mt-1 text-sm font-semibold text-slate-800">{incident?.landmark || incident?.locationDescription || 'No landmark supplied'}</p>{coords && <p className="mt-1 text-xs text-slate-500">{coords[1].toFixed(5)}, {coords[0].toFixed(5)}</p>}</div></div>
          <div className="mt-4"><p className="text-sm font-bold text-slate-900">Emergency summary</p><p className="mt-1 text-sm leading-6 text-slate-600">{incident?.chiefComplaint || 'The dispatcher has not supplied a summary.'}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">Only use the information provided to assess whether your crew and vehicle can safely respond. Contact dispatch if essential information is missing.</p></div>
          <label className="mt-4 block text-xs font-bold text-slate-600">Optional response note<textarea rows={2} value={notes[offer._id] || ''} onChange={e => setNotes(previous => ({ ...previous, [offer._id]: e.target.value }))} maxLength={500} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68]" placeholder="Add a short note for dispatch" /></label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button onClick={() => void respond(offer, true)} disabled={busy === offer._id || expired} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#166657] disabled:opacity-50"><ShieldCheck size={16} />{busy === offer._id ? 'Submitting…' : 'Accept offer'}</button><button onClick={() => void respond(offer, false)} disabled={busy === offer._id || expired} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle size={16} /> Decline offer</button></div>
          <button onClick={() => trackingThis ? stopGps() : startGps(offer)} disabled={expired || trackingState === 'STARTING'} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-extrabold text-[#1b7b68] hover:bg-teal-100 disabled:opacity-50"><Crosshair size={15} />{trackingThis ? 'Stop sharing GPS for this vehicle' : 'Start sharing vehicle GPS'}</button>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Accepting does not yet mean the ambulance is confirmed. The dispatcher must validate and confirm the assignment. Start GPS sharing only when authorized and when the selected vehicle is operating under your provider.</p>
        </section>;
      })}</div>}
  </div></main>;
}
