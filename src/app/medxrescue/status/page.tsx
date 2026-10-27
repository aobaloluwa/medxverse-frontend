"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Ambulance, ArrowLeft, CheckCircle2, Clock3, Loader2, MapPin, PhoneCall, RefreshCw, Siren, XCircle } from 'lucide-react';
import { medxRescueService, type RescueIncident, type IncidentStatus } from '@/services/medxrescue.service';

const steps: { status: IncidentStatus; label: string; detail: string }[] = [
  { status: 'REQUEST_RECEIVED', label: 'Request received', detail: 'The request has been recorded.' },
  { status: 'DISPATCH_REVIEW', label: 'Dispatch review', detail: 'A dispatcher is reviewing the request.' },
  { status: 'OFFERED_TO_CREW', label: 'Suitable providers contacted', detail: 'The dispatcher approved an offer wave. Provider responses are still pending.' },
  { status: 'CREW_ACCEPTED_PENDING_CONFIRMATION', label: 'Crew accepted · awaiting dispatcher', detail: 'A crew accepted the offer. A dispatcher must validate and confirm the assignment before it is considered dispatched.' },
  { status: 'CREW_CONFIRMED', label: 'Crew and vehicle confirmed', detail: 'A dispatcher confirmed the verified crew and vehicle assignment.' },
  { status: 'EN_ROUTE', label: 'En route', detail: 'The confirmed crew is travelling to the location.' },
  { status: 'ON_SCENE', label: 'On scene', detail: 'The crew has reported arrival.' },
  { status: 'TRANSPORTING', label: 'Transporting', detail: 'The patient is being transported.' },
  { status: 'HANDED_OVER', label: 'Handed over', detail: 'The receiving facility handover is recorded.' },
];

export default function MedxRescueStatusPage() {
  const [reference, setReference] = useState('');
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('reference') || '';
    setReference(value);
  }, []);
  const [incident, setIncident] = useState<RescueIncident | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [landmark, setLandmark] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    if (!reference) { setError('The request reference is missing.'); setLoading(false); return; }
    const token = sessionStorage.getItem(`medxrescue:${reference}`);
    if (!token) { setError('Secure tracking access is not available in this browser tab. Return to the tab where the request was created or contact the dispatcher with your reference.'); setLoading(false); return; }
    if (!quiet) setRefreshing(true);
    try {
      const response = await medxRescueService.getGuestIncident(reference, token);
      setIncident(response.data);
      setLandmark(response.data.landmark || '');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to refresh the emergency status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reference]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const id = window.setInterval(() => { void refresh(true); }, 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const cancel = async () => {
    if (!incident || !window.confirm('Cancel this emergency request? If a crew is already confirmed, you must contact the dispatcher directly.')) return;
    const token = sessionStorage.getItem(`medxrescue:${reference}`);
    if (!token) return;
    setCancelBusy(true); setMessage(''); setError('');
    try {
      const response = await medxRescueService.cancelGuestIncident(reference, token, 'Cancelled by caller from secure status page');
      setIncident(response.data);
      setMessage(response.message || 'Cancellation request recorded.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not cancel this request.'); }
    finally { setCancelBusy(false); }
  };

  const updateLocation = async () => {
    const token = sessionStorage.getItem(`medxrescue:${reference}`);
    if (!token || !incident) return;
    setError(''); setMessage('');
    if (!navigator.geolocation) { setError('This browser cannot access device location.'); return; }
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const response = await medxRescueService.updateGuestLocation(reference, token, {
          latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy, landmark: landmark.trim() || undefined,
        });
        setIncident(response.data); setMessage('Your updated location was sent securely.');
      } catch (e) { setError(e instanceof Error ? e.message : 'Location update failed.'); }
    }, () => setError('Could not access location. Check device permissions and try again.'), { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
  };

  const status = incident?.status;
  const closed = status === 'CANCELLED' || status === 'HANDED_OVER';
  const currentIndex = steps.findIndex(step => step.status === status || (step.status === 'REQUEST_RECEIVED' && status === 'OFFERED_TO_CREW'));
  const coords = incident?.location?.coordinates;
  const lat = coords?.[1]; const lng = coords?.[0];
  const mapSrc = Number.isFinite(lat) && Number.isFinite(lng)
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${Number(lng)-0.012},${Number(lat)-0.012},${Number(lng)+0.012},${Number(lat)+0.012}`)}&layer=mapnik&marker=${lat}%2C${lng}`
    : '';

  return <main className="min-h-screen bg-[#f5faf9] px-4 py-8 text-slate-800 sm:px-6"><div className="mx-auto max-w-4xl">
    <Link href="/medxrescue" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1b7b68] hover:underline"><ArrowLeft size={16}/> Back to MedXRescue</Link>
    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]">Secure request tracking</p><h1 className="mt-2 text-3xl font-extrabold text-slate-950">Emergency status</h1><p className="mt-2 text-sm text-slate-500">Reference: <span className="font-bold text-slate-800">{reference || 'Not provided'}</span></p></div><button onClick={()=>void refresh()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={refreshing?'animate-spin':''}/> Refresh</button></div>
      {loading && <div className="flex items-center gap-3 py-12 text-sm text-slate-500"><Loader2 className="animate-spin"/> Loading secure status…</div>}
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {message && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}
      {incident && <>
        <div className={`mt-6 rounded-2xl border p-5 ${status==='NO_RESOURCE_AVAILABLE'?'border-rose-200 bg-rose-50':status==='CREW_CONFIRMED'||status==='EN_ROUTE'||status==='ON_SCENE'||status==='TRANSPORTING'?'border-emerald-200 bg-emerald-50':'border-teal-100 bg-teal-50/60'}`}>
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1b7b68] shadow-sm">{status==='CANCELLED'?<XCircle/>:status==='HANDED_OVER'?<CheckCircle2/>:<Clock3/>}</div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current status</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">{(status||'REQUEST_RECEIVED').replaceAll('_',' ')}</h2><p className="mt-2 text-sm leading-6 text-slate-700">{status==='OFFERED_TO_CREW'?'A dispatch offer has been sent, but crew acceptance is still pending.':status==='CREW_ACCEPTED_PENDING_CONFIRMATION'?'A crew has accepted, but the dispatcher has not confirmed the assignment yet. Do not treat this as a confirmed dispatch.':status==='NO_RESOURCE_AVAILABLE'?'No suitable resource is currently confirmed. Contact local emergency services where available and do not wait on this page alone.':status==='REQUEST_RECEIVED'?'Your request has been received. A human dispatcher must review it.':status==='CREW_CONFIRMED'||status==='EN_ROUTE'||status==='ON_SCENE'||status==='TRANSPORTING'?'A dispatcher has confirmed the verified crew and vehicle. Keep your phone available and check the tracking freshness below.':status==='HANDED_OVER'?'The receiving facility handover has been recorded.':status==='CANCELLED'?'This request has been cancelled.':'A dispatcher is reviewing your request.'}</p></div></div>
        </div>
        {status==='NO_RESOURCE_AVAILABLE' && <div className="mt-4 rounded-xl border border-rose-200 p-4"><p className="font-bold text-rose-800">No ambulance confirmed</p><p className="mt-1 text-sm leading-6 text-rose-700">Please call the locally available emergency service or seek immediate help nearby. The system will not claim a vehicle is on the way.</p><a href="tel:112" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white"><PhoneCall size={15}/> Call 112 where available</a></div>}
        <div className="mt-7"><h3 className="font-bold text-slate-900">Response progress</h3><div className="mt-4 space-y-0">{steps.map((step,index)=>{const done=index<currentIndex || step.status===status; const active=step.status===status; return <div key={step.status} className="relative flex gap-3 pb-5 last:pb-0"><div className="flex w-7 shrink-0 flex-col items-center"><span className={`z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${done?'border-[#1b7b68] bg-[#1b7b68] text-white':'border-slate-200 bg-white text-slate-400'}`}>{done?<CheckCircle2 size={15}/>:index+1}</span>{index<steps.length-1&&<span className={`mt-1 w-px flex-1 ${index<currentIndex?'bg-[#1b7b68]':'bg-slate-200'}`}/>}</div><div className="min-w-0 pb-1"><p className={`text-sm font-bold ${active?'text-[#1b7b68]':'text-slate-800'}`}>{step.label}{step.status==='CREW_CONFIRMED'&&incident.crewConfirmed?' · Dispatcher confirmed':''}</p><p className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</p></div></div>})}</div></div>
        <div className="mt-7"><div className="mb-3 flex items-center gap-2"><MapPin size={17} className="text-[#1b7b68]"/><h3 className="font-bold text-slate-900">Reported emergency location</h3></div>{mapSrc && <><iframe title="Reported emergency location" src={mapSrc} className="h-64 w-full rounded-2xl border border-slate-200" loading="lazy"/><p className="mt-1 text-right text-[10px] text-slate-400">Map data © OpenStreetMap contributors</p></>}<p className="mt-2 text-sm font-semibold text-slate-800">{incident.landmark || incident.locationDescription || 'No landmark or address description supplied'}</p>{lat !== undefined && lng !== undefined && <p className="mt-1 text-xs text-slate-500">{lat.toFixed(5)}, {lng.toFixed(5)}{incident.locationAccuracyMeters ? ` · GPS accuracy ±${Math.round(incident.locationAccuracyMeters)} m` : ''}</p>}{!mapSrc && <p className="mt-1 text-xs leading-5 text-slate-500">No GPS map is available for this request. Dispatch should confirm the landmark or address with the caller.</p>}</div>
        {['CREW_CONFIRMED','EN_ROUTE','ON_SCENE','TRANSPORTING'].includes(status || '') && <section className="mt-7 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Ambulance size={18} className="text-[#1b7b68]"/><h3 className="font-extrabold text-slate-900">Assigned ambulance tracking</h3></div><p className="mt-1 text-sm text-slate-600">Tracking appears only after dispatcher confirmation. The location is based on the vehicle's last reported GPS update.</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${incident.tracking?.freshness==='LIVE'?'bg-emerald-100 text-emerald-800':incident.tracking?.freshness==='DELAYED'?'bg-amber-100 text-amber-800':'bg-rose-100 text-rose-800'}`}>{incident.tracking?.freshness || 'UNAVAILABLE'}</span>
          </div>
          {incident.tracking?.latitude !== undefined && incident.tracking?.longitude !== undefined ? <>
            <p className="mt-3 text-sm font-bold text-slate-900">{incident.tracking.latitude.toFixed(5)}, {incident.tracking.longitude.toFixed(5)}</p>
            <p className="mt-1 text-xs text-slate-600">Last GPS update: {incident.tracking.locationUpdatedAt ? new Date(incident.tracking.locationUpdatedAt).toLocaleString() : 'Time unavailable'}{incident.tracking.locationAccuracyMeters !== undefined ? ` · accuracy ±${Math.round(incident.tracking.locationAccuracyMeters)} m` : ''}</p>
            {incident.tracking.isStale && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">This location is stale. It may not represent the ambulance's current position. Contact the dispatcher for an update.</p>}
            <iframe title="Last reported ambulance location" src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${incident.tracking.longitude-0.012},${incident.tracking.latitude-0.012},${incident.tracking.longitude+0.012},${incident.tracking.latitude+0.012}`)}&layer=mapnik&marker=${incident.tracking.latitude}%2C${incident.tracking.longitude}`} className="mt-3 h-56 w-full rounded-xl border border-slate-200" loading="lazy"/>
            <p className="mt-1 text-right text-[10px] text-slate-400">Map data © OpenStreetMap contributors</p>
          </> : <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Vehicle GPS is currently unavailable. The assignment may still be confirmed, but the map cannot show a reliable live position. Contact the dispatcher if needed.</div>}
          <p className="mt-3 text-[11px] leading-5 text-slate-500">The map refreshes with status updates. A browser may pause background refreshes when inactive; for urgent updates, call the dispatcher rather than relying on this page alone.</p>
        </section>}
        {!closed && <div className="mt-7 rounded-2xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Update your location</h3><label className="mt-3 block text-sm font-semibold text-slate-700">Landmark or directions<input value={landmark} onChange={e=>setLandmark(e.target.value)} maxLength={500} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100" placeholder="Gate, nearby shop, road or junction"/></label><button onClick={()=>void updateLocation()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-3 text-sm font-bold text-white hover:bg-[#166657]"><MapPin size={15}/> Share current location</button></div>}
        {!closed && <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-xs leading-5 text-slate-500">This page refreshes status about every 15 seconds. Keep your phone available. It does not replace a phone call to emergency services.</p><button onClick={()=>void cancel()} disabled={cancelBusy || status==='CREW_ACCEPTED_PENDING_CONFIRMATION'||status==='CREW_CONFIRMED'||status==='EN_ROUTE'||status==='ON_SCENE'||status==='TRANSPORTING'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"><XCircle size={15}/>{cancelBusy?'Cancelling…':'Cancel request'}</button></div>}
      </>}
    </div>
    <p className="mt-4 text-center text-xs leading-5 text-slate-500">If a crew is already confirmed, contact the dispatcher directly for cancellation or urgent updates.</p>
  </div></main>;
}
