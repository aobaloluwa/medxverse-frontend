"use client";

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3, Crosshair, HeartPulse, MapPin, PhoneCall, ShieldCheck, Siren } from 'lucide-react';
import { medxRescueService } from '@/services/medxrescue.service';

const teal = '#1b7b68';

function OSMPreview({ latitude, longitude }: { latitude: number; longitude: number }) {
  const delta = 0.012;
  const bbox = `${longitude-delta},${latitude-delta},${longitude+delta},${latitude+delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  return <iframe title="Selected emergency location map" src={src} className="h-52 w-full rounded-xl border border-slate-200" loading="lazy" />;
}

export default function MedxRescueGuestPage() {
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [callerIsPatient, setCallerIsPatient] = useState(true);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [triageAnswers, setTriageAnswers] = useState<Record<string, string>>({});
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [accuracy, setAccuracy] = useState<number | undefined>();
  const [locationState, setLocationState] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ reference: string; token: string; status: string } | null>(null);
  const idempotencyKeyRef = useRef('');

  const locate = () => {
    setError('');
    if (!navigator.geolocation) {
      setLocationState('error');
      setError('This browser cannot access device location. Enter the coordinates from a trusted map or provide a precise landmark.');
      return;
    }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setAccuracy(position.coords.accuracy);
        setLocationState('success');
      },
      () => {
        setLocationState('error');
        setError('Location access was unavailable. You can still enter coordinates manually and provide a landmark.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!callerPhone.trim() || !chiefComplaint.trim()) {
      setError('Enter a callback phone number and briefly describe the emergency.');
      return;
    }
    const hasLatitude = latitude.trim() !== '';
    const hasLongitude = longitude.trim() !== '';
    if (hasLatitude !== hasLongitude) {
      setError('Enter both latitude and longitude, or clear both and provide a landmark or location description.');
      return;
    }
    const hasCoordinates = hasLatitude && hasLongitude;
    if (hasCoordinates && (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
      setError('The coordinates are invalid. Correct them or clear both fields and provide a landmark or location description.');
      return;
    }
    if (!hasCoordinates && !landmark.trim() && !locationDescription.trim()) {
      setError('Provide a landmark, street/address description, or GPS coordinates so dispatch can locate the emergency. Do not delay calling emergency services.');
      return;
    }
    setSubmitting(true);
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `mrx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      const key = idempotencyKeyRef.current;
      const response = await medxRescueService.createGuestIncident({
        callerName: callerName.trim() || undefined,
        callerPhone: callerPhone.trim(),
        callerIsPatient,
        patientName: callerIsPatient ? undefined : patientName.trim() || undefined,
        patientAge: patientAge ? Number(patientAge) : undefined,
        chiefComplaint: chiefComplaint.trim(),
        additionalDetails: additionalDetails.trim() || undefined,
        landmark: landmark.trim() || undefined,
        locationDescription: locationDescription.trim() || undefined,
        latitude: hasCoordinates ? lat : undefined,
        longitude: hasCoordinates ? lng : undefined,
        locationAccuracyMeters: hasCoordinates ? accuracy : undefined,
        triageAnswers: Object.entries(triageAnswers).filter(([, answer]) => answer).map(([questionId, answer]) => ({ questionId, answer })),
        intakeChannel: 'GUEST_WEB',
      }, key);
      const incident = response.data;
      const reference = incident.reference || incident.publicReference;
      if (!reference || !response.accessToken) throw new Error('The server response did not include the secure tracking details. Contact the dispatcher and do not submit repeatedly.');
      sessionStorage.setItem(`medxrescue:${reference}`, response.accessToken);
      setCreated({ reference, token: response.accessToken, status: incident.status });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not send the emergency request. Please call local emergency services where available.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <main className="min-h-screen bg-[#f5faf9] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#1b7b68]"><CheckCircle2 size={30}/></div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#1b7b68]">MedXRescue Nexus</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Emergency request received</h1>
            <p className="mt-3 leading-7 text-slate-600">Your request has been recorded. A human dispatcher must review it. <strong>This is not confirmation that an ambulance has been dispatched.</strong></p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your reference</p>
              <p className="mt-1 break-all text-xl font-bold text-slate-900">{created.reference}</p>
              <p className="mt-3 text-sm text-slate-600">Keep this reference private. Your secure tracking access is stored in this browser tab.</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={`/medxrescue/status?reference=${encodeURIComponent(created.reference)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-3 text-sm font-bold text-white hover:bg-[#166657]">Track request <ArrowRight size={16}/></Link>
              <a href="tel:112" className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-5 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50"><PhoneCall size={16}/> Call 112 where available</a>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">If the situation is immediately life-threatening, call the locally available emergency number. MedXRescue web intake does not automatically place a phone call.</p>
          </div>
        </div>
      </main>
    );
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasLocation = latitude.trim() !== '' && longitude.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  return (
    <main className="min-h-screen bg-[#f5faf9] text-slate-800">
      <header className="border-b border-teal-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b7b68] text-white"><HeartPulse size={23}/></span>
            <span><span className="block text-sm font-extrabold tracking-tight text-slate-900">MedXVerse</span><span className="block text-xs font-semibold text-[#1b7b68]">MedXRescue Nexus</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/medxrescue/fleet" className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/80 px-3.5 py-2 text-xs font-extrabold text-[#1b7b68] hover:bg-teal-100">
              <Siren size={15} /> Aerial Satellite Radar
            </Link>
            <Link href="/auth/login" className="text-sm font-semibold text-slate-600 hover:text-[#1b7b68]">Staff sign in</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500"/> Emergency assistance request</div>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl">Get emergency help started.</h1>
          <p className="max-w-xl text-base leading-7 text-slate-600">Share the emergency and your location so a dispatcher can review the request. You do not need a MedXVerse account or patient ID.</p>
          <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle size={21}/></div>
              <div><h2 className="font-bold text-slate-900">Need urgent help right now?</h2><p className="mt-1 text-sm leading-6 text-slate-600">Call your local emergency service if available. This website does not call emergency services automatically and cannot guarantee an ambulance is available.</p><a href="tel:112" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"><PhoneCall size={16}/> Call 112 where available</a></div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[{icon:ShieldCheck,title:'Guest access',text:'No account required'},{icon:Clock3,title:'Human review',text:'Dispatcher-led response'},{icon:MapPin,title:'Location first',text:'GPS and landmarks'}].map((item)=><div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4"><item.icon size={19} className="text-[#1b7b68]"/><p className="mt-3 text-sm font-bold text-slate-900">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p></div>)}
          </div>
          <Link href="/medxrescue/providers" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1b7b68] hover:underline">Ambulance provider? Apply for verification <ArrowRight size={15}/></Link>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]">Emergency intake</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Tell us what is happening</h2><p className="mt-1 text-sm text-slate-500">Fields marked required are needed to submit.</p></div>
            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-[#1b7b68] sm:flex"><Siren size={25}/></div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">Your name <span className="font-normal text-slate-400">(optional)</span><input value={callerName} onChange={e=>setCallerName(e.target.value)} maxLength={120} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100" placeholder="Name of caller"/></label>
            <label className="block text-sm font-semibold text-slate-700">Callback phone number <span className="text-rose-600">*</span><input required value={callerPhone} onChange={e=>setCallerPhone(e.target.value)} maxLength={40} autoComplete="tel" inputMode="tel" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100" placeholder="e.g. +234 801 234 5678"/></label>
          </div>
          <fieldset className="mt-5"><legend className="text-sm font-semibold text-slate-700">Who needs assistance?</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setCallerIsPatient(true)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${callerIsPatient?'border-[#1b7b68] bg-teal-50 text-[#1b7b68]':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Myself</button><button type="button" onClick={()=>setCallerIsPatient(false)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${!callerIsPatient?'border-[#1b7b68] bg-teal-50 text-[#1b7b68]':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Someone else</button></div></fieldset>
          {!callerIsPatient && <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Patient name (optional)<input value={patientName} onChange={e=>setPatientName(e.target.value)} maxLength={120} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100"/></label><label className="block text-sm font-semibold text-slate-700">Approximate age (optional)<input type="number" min="0" max="120" value={patientAge} onChange={e=>setPatientAge(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100"/></label></div>}
          <label className="mt-5 block text-sm font-semibold text-slate-700">What is the emergency? <span className="text-rose-600">*</span><textarea required value={chiefComplaint} onChange={e=>setChiefComplaint(e.target.value)} maxLength={500} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100" placeholder="Briefly describe what happened and any immediate danger."/></label>
          <section className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
            <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600"><Activity size={18}/></div><div><h3 className="text-sm font-extrabold text-slate-900">Quick emergency safety questions</h3><p className="mt-1 text-xs leading-5 text-slate-600">Answer if you can do so safely. These answers help a human dispatcher review urgency; they are not a diagnosis and do not replace emergency services. You can submit without answering every question.</p></div></div>
            <div className="mt-4 space-y-3">
              {[
                { id: 'unconscious', question: 'Is the person unconscious or unresponsive?' },
                { id: 'not_breathing', question: 'Is the person not breathing normally?' },
                { id: 'severe_breathing_difficulty', question: 'Is there severe difficulty breathing?' },
                { id: 'severe_bleeding', question: 'Is there severe or uncontrolled bleeding?' },
                { id: 'stroke_signs', question: 'Are there sudden stroke-like signs (face drooping, arm weakness, speech difficulty)?' },
                { id: 'seizure', question: 'Is the person having a seizure now or repeated seizures?' },
              ].map(item => <fieldset key={item.id} className="rounded-xl border border-slate-200 bg-white p-3"><legend className="px-1 text-xs font-bold leading-5 text-slate-800">{item.question}</legend><div className="mt-2 flex flex-wrap gap-2">{['YES', 'NO', 'UNSURE'].map(answer => <button key={answer} type="button" aria-pressed={triageAnswers[item.id] === answer} onClick={() => setTriageAnswers(current => ({ ...current, [item.id]: current[item.id] === answer ? '' : answer }))} className={`rounded-lg border px-3 py-2 text-xs font-bold ${triageAnswers[item.id] === answer ? answer === 'YES' ? 'border-rose-300 bg-rose-100 text-rose-800' : 'border-[#1b7b68] bg-teal-50 text-[#1b7b68]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{answer === 'UNSURE' ? 'Not sure' : answer}</button>)}</div></fieldset>)}
            </div>
            {Object.values(triageAnswers).some(answer => answer === 'YES') && <p className="mt-3 rounded-lg border border-rose-200 bg-white p-3 text-xs font-semibold leading-5 text-rose-800">A serious warning sign may be present. Call the locally available emergency service immediately if you can. Submitting this form does not place a call or confirm an ambulance.</p>}
          </section>
          <label className="mt-4 block text-sm font-semibold text-slate-700">Additional details <span className="font-normal text-slate-400">(optional)</span><textarea value={additionalDetails} onChange={e=>setAdditionalDetails(e.target.value)} maxLength={2000} rows={2} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-teal-100" placeholder="Relevant information to help the dispatcher (do not delay requesting help)."/></label>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">Emergency location</p><p className="mt-1 text-xs text-slate-500">GPS is helpful but not required if you can describe the location or give a recognizable landmark.</p></div><button type="button" onClick={locate} disabled={locationState==='loading'} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2.5 text-xs font-bold text-[#1b7b68] disabled:opacity-60"><Crosshair size={15}/>{locationState==='loading'?'Finding location…':'Use my location'}</button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Latitude (optional)<input type="number" step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68]" placeholder="6.5244"/></label><label className="block text-xs font-semibold text-slate-600">Longitude (optional)<input type="number" step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68]" placeholder="3.3792"/></label></div>
            <label className="mt-3 block text-xs font-semibold text-slate-600">Landmark, street or directions<input value={landmark} onChange={e=>setLandmark(e.target.value)} maxLength={500} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68]" placeholder="Nearest junction, building, gate or recognizable landmark"/></label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">Location description (optional)<textarea value={locationDescription} onChange={e=>setLocationDescription(e.target.value)} maxLength={500} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68]" placeholder="Street, estate, LGA, nearby junction, floor or other directions"/></label>
            {hasLocation && <div className="mt-3"><OSMPreview latitude={lat} longitude={lng}/><p className="mt-1 text-right text-[10px] text-slate-400">Map data © OpenStreetMap contributors</p></div>}
            {locationState==='success' && <p className="mt-3 text-xs font-semibold text-emerald-700">Location captured{accuracy ? ` (accuracy about ${Math.round(accuracy)} m)` : ''}. Confirm the map pin is close to the emergency.</p>}
          </div>
          {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          <button type="submit" disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"><Siren size={20}/>{submitting?'Sending emergency request…':'Send emergency request'}</button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">Submitting records a request; it does not guarantee availability or dispatch. If you can safely call emergency services, do so.</p>
        </form>
      </section>
      <footer className="border-t border-teal-100 bg-white px-4 py-5 text-center text-xs text-slate-500">MedXRescue Nexus · Emergency requests are reviewed by authorized human dispatchers.</footer>
    </main>
  );
}
