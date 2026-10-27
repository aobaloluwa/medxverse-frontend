"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ambulance, CheckCircle2, Clock3, Crosshair, Loader2, RefreshCw, ShieldCheck, XCircle, AlertCircle, Plus, Building2 } from 'lucide-react';
import { medxRescueService, type RescueProvider, type RescueVehicle, type RescueVehicleClass } from '@/services/medxrescue.service';

const label = (value?: string) => (value || 'UNKNOWN').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const vehicleClasses: RescueVehicleClass[] = ['BASIC_LIFE_SUPPORT', 'ADVANCED_LIFE_SUPPORT', 'PATIENT_TRANSPORT', 'ICU_AMBULANCE', 'NEONATAL'];

export default function MedxRescueProviderAdminPage() {
  const [providers, setProviders] = useState<RescueProvider[]>([]);
  const [allProviders, setAllProviders] = useState<RescueProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedProvider, setSelectedProvider] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [vehicleClass, setVehicleClass] = useState<RescueVehicleClass>('BASIC_LIFE_SUPPORT');
  const [equipment, setEquipment] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [newVehicle, setNewVehicle] = useState<RescueVehicle | null>(null);
  const [vehicles, setVehicles] = useState<RescueVehicle[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [gpsBusy, setGpsBusy] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    setError('');
    try {
      const [reviewResponse, allResponse] = await Promise.all([
        medxRescueService.listProvidersForReview(),
        medxRescueService.listProviders(),
      ]);
      const items = reviewResponse.data || [];
      const allItems = allResponse.data || [];
      setProviders(items);
      setAllProviders(allItems);
      setSelectedProvider(current => allItems.some(p => p._id === current) ? current : (allItems.find(p => p.verificationStatus === 'VERIFIED')?._id || items[0]?._id || ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load provider review queue. This page requires an authorized system administrator.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const provider = allProviders.find(item => item._id === selectedProvider);
    if (!provider || provider.verificationStatus !== 'VERIFIED') {
      setVehicles([]);
      return;
    }
    let cancelled = false;
    setVehicleLoading(true);
    void medxRescueService.listProviderVehicles(provider._id)
      .then(response => { if (!cancelled) setVehicles(response.data || []); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this provider fleet.'); })
      .finally(() => { if (!cancelled) setVehicleLoading(false); });
    return () => { cancelled = true; };
  }, [allProviders, selectedProvider]);


  const review = async (provider: RescueProvider, status: RescueProvider['verificationStatus']) => {
    if (status === 'VERIFIED' && !window.confirm('Confirm that the organization, legal authorization, service coverage, contacts, and required supporting evidence have been checked outside this form? Verification makes this provider eligible for operational review.')) return;
    if (status === 'REJECTED' && !notes[provider._id]?.trim()) {
      setError('Enter a reason before rejecting a provider application.');
      return;
    }
    setBusy(provider._id); setError(''); setNotice('');
    try {
      await medxRescueService.reviewProvider(provider._id, status, notes[provider._id]?.trim() || undefined);
      setNotice(`${provider.displayName} marked ${label(status)}.`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update provider verification.'); }
    finally { setBusy(''); }
  };

  const setOperational = async (provider: RescueProvider, status: RescueProvider['operationalStatus']) => {
    if (status === 'AVAILABLE' && !window.confirm('Confirm that this verified provider is staffed, contactable, and ready to receive dispatch offers now?')) return;
    setBusy(provider._id); setError(''); setNotice('');
    try {
      await medxRescueService.setProviderOperationalStatus(provider._id, status);
      setNotice(`${provider.displayName} operational status set to ${label(status)}.`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update provider operational status.'); }
    finally { setBusy(''); }
  };

  const setVehicleStatus = async (vehicle: RescueVehicle, status: 'AVAILABLE' | 'OFFLINE' | 'BUSY' | 'MAINTENANCE') => {
    const provider = allProviders.find(item => item._id === selectedProvider);
    if (!provider) return;
    if (status === 'AVAILABLE' && !window.confirm('Confirm this vehicle is roadworthy, equipped, crewed, and available to accept an emergency response now?')) return;
    setBusy(vehicle._id); setError(''); setNotice('');
    try {
      await medxRescueService.setVehicleOperationalStatus(vehicle._id, status, provider._id);
      const response = await medxRescueService.listProviderVehicles(provider._id);
      setVehicles(response.data || []);
      setNotice(`${vehicle.registrationNumber} marked ${label(status)}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update vehicle status.'); }
    finally { setBusy(''); }
  };

  const captureVehicleGps = async (vehicle: RescueVehicle) => {
    const provider = allProviders.find(item => item._id === selectedProvider);
    if (!provider) return;
    if (!navigator.geolocation) { setError('This browser does not support location access.'); return; }
    setGpsBusy(vehicle._id); setError(''); setNotice('');
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        await medxRescueService.updateVehicleLocation(vehicle._id, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        }, provider._id);
        const response = await medxRescueService.listProviderVehicles(provider._id);
        setVehicles(response.data || []);
        setNotice(`GPS updated for ${vehicle.registrationNumber}. This is a one-time location fix; it will become stale if not refreshed.`);
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not update vehicle GPS. Confirm the provider and vehicle are operational.'); }
      finally { setGpsBusy(''); }
    }, positionError => {
      setGpsBusy('');
      setError(positionError.code === positionError.PERMISSION_DENIED ? 'Location permission was denied. Enable location access to update vehicle GPS.' : 'Could not read current GPS. Check device location settings and try again.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 });
  };

  const addVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const provider = providers.find(p => p._id === selectedProvider);
    if (!provider) { setError('Select a verified provider first.'); return; }
    if (provider.verificationStatus !== 'VERIFIED') { setError('Vehicles can only be registered under a verified provider.'); return; }
    setBusy('vehicle'); setError(''); setNotice(''); setNewVehicle(null);
    try {
      const response = await medxRescueService.addProviderVehicle(provider._id, {
        registrationNumber: registrationNumber.trim(),
        makeModel: makeModel.trim(),
        vehicleClass,
        equipment: equipment.split(',').map(v => v.trim()).filter(Boolean),
        crewQualifications: qualifications.split(',').map(v => v.trim()).filter(Boolean),
      });
      setNewVehicle(response.data);
      const fleetResponse = await medxRescueService.listProviderVehicles(provider._id);
      setVehicles(fleetResponse.data || []);
      setNotice('Vehicle registered. It starts OFFLINE and must be made operational only after physical and credential checks.');
      setRegistrationNumber(''); setMakeModel(''); setEquipment(''); setQualifications('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not register vehicle.'); }
    finally { setBusy(''); }
  };

  return <div className="mx-auto max-w-6xl space-y-6">
    <Link href="/hms/medxrescue" className="inline-flex items-center gap-2 text-sm font-bold text-[#1b7b68] hover:underline"><ArrowLeft size={16} /> Back to emergency dispatch</Link>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]"><Building2 size={15} /> MedXRescue Nexus · Partners</div><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Provider verification</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review provider applications, record a verification decision, manage operational availability, and register approved vehicles. This page does not independently verify documents or credentials.</p></div><button onClick={() => void load()} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh queue</button></div>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} className="shrink-0" />{notice}</div>}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4 sm:p-5"><h2 className="font-extrabold text-slate-900">Applications awaiting review</h2><p className="mt-1 text-xs leading-5 text-slate-500">A submitted application is not a verified or dispatchable provider.</p></div>
        {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Loading applications…</div>
          : providers.length === 0 ? <div className="p-10 text-center"><CheckCircle2 size={28} className="mx-auto text-[#1b7b68]" /><p className="mt-3 font-bold text-slate-800">No applications awaiting review</p><p className="mt-1 text-sm text-slate-500">New provider applications will appear here.</p></div>
          : <div className="divide-y divide-slate-100">{providers.map(provider => <article key={provider._id} className={`p-4 sm:p-5 ${selectedProvider === provider._id ? 'bg-teal-50/50' : ''}`}><button onClick={() => setSelectedProvider(provider._id)} className="w-full text-left"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-extrabold text-slate-900">{provider.displayName}</h3><p className="mt-1 text-xs text-slate-500">{provider.legalName}</p></div><span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-800">{label(provider.verificationStatus)}</span></div><div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><p><strong>Registration:</strong> {provider.registrationNumber || 'Not provided'}</p><p><strong>Contact:</strong> {provider.contactName}</p><p><strong>Phone:</strong> {provider.contactPhone}</p><p><strong>Email:</strong> {provider.contactEmail || 'Not provided'}</p></div><p className="mt-3 text-xs leading-5 text-slate-600"><strong>Operating areas:</strong> {provider.operatingAreas?.join(', ') || 'Not supplied'}</p><p className="mt-2 text-[10px] text-slate-400">Submitted {provider.createdAt ? new Date(provider.createdAt).toLocaleString() : 'time unavailable'}</p></button>
            <label className="mt-3 block text-xs font-bold text-slate-600">Review notes<textarea value={notes[provider._id] || ''} onChange={e => setNotes(previous => ({ ...previous, [provider._id]: e.target.value }))} maxLength={1000} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68]" placeholder="Record checks performed, missing evidence, or reasons for rejection" /></label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><button onClick={() => void review(provider, 'UNDER_REVIEW')} disabled={busy === provider._id} className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"><Clock3 size={13} className="mr-1 inline" /> Under review</button><button onClick={() => void review(provider, 'REJECTED')} disabled={busy === provider._id} className="rounded-lg border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-700 disabled:opacity-50"><XCircle size={13} className="mr-1 inline" /> Reject</button><button onClick={() => void review(provider, 'VERIFIED')} disabled={busy === provider._id} className="rounded-lg bg-[#1b7b68] px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"><ShieldCheck size={13} className="mr-1 inline" /> Verify provider</button></div>
          </article>)}</div>}
      </section>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#1b7b68}" /><h2 className="font-extrabold text-slate-900">Provider operations</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">Operational availability is separate from verification. Do not mark a provider available unless dispatch can reach them and they have current staffed capacity.</p>{allProviders.filter(p => p.verificationStatus === 'VERIFIED').length ? allProviders.filter(p => p.verificationStatus === 'VERIFIED').map(provider => <div key={provider._id} className="mt-3 rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-900">{provider.displayName}</p><span className="text-xs font-bold text-slate-600">{label(provider.operationalStatus)}</span></div><div className="mt-2 flex flex-wrap gap-2"><button onClick={() => void setOperational(provider, 'AVAILABLE')} disabled={busy === provider._id || provider.operationalStatus === 'AVAILABLE'} className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-[#1b7b68] disabled:opacity-50">Mark available</button><button onClick={() => void setOperational(provider, 'OFFLINE')} disabled={busy === provider._id || provider.operationalStatus === 'OFFLINE'} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Mark offline</button><button onClick={() => void setOperational(provider, 'BUSY')} disabled={busy === provider._id || provider.operationalStatus === 'BUSY'} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50">Mark busy</button></div></div>) : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Verified providers will appear here when they have an application record in the review queue. This queue only returns pending/under-review applications.</p>}</section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><Ambulance size={18} className="text-[#1b7b68}" /><h2 className="font-extrabold text-slate-900">Fleet readiness and GPS</h2></div><label className="mt-3 block text-xs font-bold text-slate-600">Select verified provider<select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Select provider</option>{allProviders.filter(p => p.verificationStatus === 'VERIFIED').map(provider => <option key={provider._id} value={provider._id}>{provider.displayName}</option>)}</select></label>{vehicleLoading ? <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading fleet…</p> : vehicles.length ? <div className="mt-3 space-y-3">{vehicles.map(vehicle => { const gpsTime = vehicle.locationUpdatedAt ? new Date(vehicle.locationUpdatedAt) : null; const gpsAge = gpsTime ? Math.max(0, Math.round((Date.now() - gpsTime.getTime()) / 1000)) : null; const fresh = gpsAge !== null && gpsAge <= 300; return <div key={vehicle._id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-extrabold text-slate-900">{vehicle.registrationNumber} · {vehicle.makeModel}</p><p className="mt-1 text-xs text-slate-500">{label(vehicle.vehicleClass)} · {label(vehicle.status)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${fresh ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{fresh ? `GPS ${gpsAge}s ago` : 'GPS missing/stale'}</span></div>{vehicle.locationAccuracyMeters !== undefined && <p className="mt-1 text-[11px] text-slate-500">Last reported accuracy ±{Math.round(vehicle.locationAccuracyMeters)} m</p>}<div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => void captureVehicleGps(vehicle)} disabled={gpsBusy === vehicle._id} className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-[#1b7b68] disabled:opacity-50"><Crosshair size={12} className="mr-1 inline" />{gpsBusy === vehicle._id ? 'Updating GPS…' : 'Update GPS now'}</button><button onClick={() => void setVehicleStatus(vehicle, vehicle.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE')} disabled={busy === vehicle._id || vehicle.status === 'DISPATCHED' || vehicle.status === 'MAINTENANCE'} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">{vehicle.status === 'AVAILABLE' ? 'Mark offline' : 'Mark available'}</button></div><p className="mt-2 text-[10px] leading-4 text-slate-500">An available vehicle still needs fresh GPS, a verified provider, suitable crew/equipment, and dispatcher approval to receive an offer.</p></div>; })}</div> : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Choose a verified provider to view its registered vehicles. Update GPS before dispatch, then keep the crew page active for live updates.</p>}</section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-2"><Ambulance size={18} className="text-[#1b7b68]" /><h2 className="font-extrabold text-slate-900">Register a verified provider vehicle</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">New vehicles start OFFLINE. Validate registration, condition, equipment, crew capability and coverage through your real-world verification process before marking them available.</p><form onSubmit={addVehicle} className="mt-4 space-y-3"><label className="block text-xs font-bold text-slate-600">Provider ID *<select required value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Select a provider</option>{allProviders.filter(p => p.verificationStatus === 'VERIFIED').map(provider => <option key={provider._id} value={provider._id}>{provider.displayName}</option>)}</select></label><label className="block text-xs font-bold text-slate-600">Vehicle registration *<input required maxLength={40} value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Registration number"/></label><label className="block text-xs font-bold text-slate-600">Make / model *<input required maxLength={120} value={makeModel} onChange={e => setMakeModel(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Vehicle make and model"/></label><label className="block text-xs font-bold text-slate-600">Ambulance class *<select value={vehicleClass} onChange={e => setVehicleClass(e.target.value as RescueVehicleClass)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">{vehicleClasses.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label><label className="block text-xs font-bold text-slate-600">Equipment (comma separated)<textarea rows={2} value={equipment} onChange={e => setEquipment(e.target.value)} maxLength={1000} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Oxygen, AED, stretcher"/></label><label className="block text-xs font-bold text-slate-600">Crew qualifications (comma separated)<textarea rows={2} value={qualifications} onChange={e => setQualifications(e.target.value)} maxLength={1000} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Paramedic, BLS, ACLS"/></label><button disabled={busy === 'vehicle' || !allProviders.some(p => p._id === selectedProvider && p.verificationStatus === 'VERIFIED')} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"><Plus size={15} />{busy === 'vehicle' ? 'Registering…' : 'Register vehicle'}</button></form>
        {newVehicle && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">Registered {newVehicle.registrationNumber}. Initial status: {label(newVehicle.status)}.</div>}
        </section>
      </div>
    </div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Verification warning:</strong> This page records authorized review decisions but does not verify identity, registration documents, licensing, insurance, vehicle roadworthiness or staff qualifications by itself. Complete those checks through approved procedures and retain evidence before marking a provider verified.</div>
  </div>;
}
