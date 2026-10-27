"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, Ambulance, CheckCircle2, Clock3, ExternalLink, Filter, Loader2,
  MapPin, RefreshCw, Search, Send, ShieldAlert, Siren, Activity, ShieldCheck,
  PhoneCall, Users, AlertTriangle, XCircle, Crosshair,
} from 'lucide-react';
import {
  medxRescueService,
  type IncidentPriority,
  type IncidentStatus,
  type RescueIncident,
  type RescueVehicle,
  type RoadRouteEstimate,
  type DispatchEscalation,
  type LiveFleetData,
} from '@/services/medxrescue.service';
import DynamicAerialMap from '@/components/medxrescue/DynamicAerialMap';

const PRIORITIES: Exclude<IncidentPriority, 'UNTRIAGED'>[] = ['ROUTINE', 'URGENT', 'CRITICAL'];
const ACTIVE_STATUSES: IncidentStatus[] = [
  'REQUEST_RECEIVED', 'DISPATCH_REVIEW', 'OFFERED_TO_CREW',
  'CREW_ACCEPTED_PENDING_CONFIRMATION', 'CREW_CONFIRMED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING',
];
const MANUAL_STATUS_OPTIONS: IncidentStatus[] = [
  'DISPATCH_REVIEW', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'CANCELLED', 'NO_RESOURCE_AVAILABLE',
];
const label = (value?: string) => (value || 'UNKNOWN').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const coordinates = (incident: RescueIncident) => incident.location?.coordinates
  ? `${incident.location.coordinates[1].toFixed(5)}, ${incident.location.coordinates[0].toFixed(5)}`
  : incident.locationDescription || incident.landmark || 'Location not provided';

function StatusPill({ status }: { status: string }) {
  const colour = ['CREW_CONFIRMED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'HANDED_OVER'].includes(status)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : ['NO_RESOURCE_AVAILABLE', 'CANCELLED'].includes(status)
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : ['OFFERED_TO_CREW', 'CREW_ACCEPTED_PENDING_CONFIRMATION'].includes(status)
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-slate-200 bg-slate-50 text-slate-600';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${colour}`}>{label(status)}</span>;
}

function IncidentMap({ incident }: { incident: RescueIncident | null }) {
  const coords = incident?.location?.coordinates;
  if (!coords) return <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center"><MapPin size={26} className="text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">No GPS coordinates recorded</p><p className="mt-1 max-w-xs px-3 text-xs text-slate-400">{incident?.locationDescription || incident?.landmark || 'Use the reported landmark and confirm the location with the caller.'}</p></div>;
  const [lng, lat] = coords;
  const delta = 0.015;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${lng-delta},${lat-delta},${lng+delta},${lat+delta}`)}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <div><iframe title="Selected incident location" src={src} className="h-56 w-full rounded-2xl border border-slate-200" loading="lazy" /><p className="mt-1 text-right text-[10px] text-slate-400">Map data © OpenStreetMap contributors</p><a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#1b7b68] hover:underline">Open full map <ExternalLink size={12} /></a></div>;
}

export default function MedxRescueDispatchPage() {
  const [activeTab, setActiveTab] = useState<'RADAR' | 'CONSOLE'>('RADAR');
  const [incidents, setIncidents] = useState<RescueIncident[]>([]);
  const [liveFleet, setLiveFleet] = useState<LiveFleetData | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [priority, setPriority] = useState<Exclude<IncidentPriority, 'UNTRIAGED'>>('URGENT');
  const [reason, setReason] = useState('');
  const [candidates, setCandidates] = useState<RescueVehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [routeVehicleId, setRouteVehicleId] = useState('');
  const [routeEstimate, setRouteEstimate] = useState<RoadRouteEstimate | null>(null);
  const [routeError, setRouteError] = useState('');
  const [escalationChannel, setEscalationChannel] = useState<DispatchEscalation['channel']>('112');

  const loadFleet = useCallback(async () => {
    try {
      const res = await medxRescueService.getLiveFleet();
      setLiveFleet(res.data);
    } catch (e) {
      // ignore live fleet error on background polling
    }
  }, []);

  const seedFleet = async () => {
    setSeeding(true); setError(''); setNotice('');
    try {
      const res = await medxRescueService.seedDemoFleet();
      setNotice(res.message || 'Demo ambulance fleet seeded on the map!');
      await loadFleet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not seed demo fleet.');
    } finally {
      setSeeding(false);
    }
  };

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await medxRescueService.listIncidents();
      const items = response.data?.incidents || [];
      setIncidents(items);
      setTotal(response.data?.total || items.length);
      setSelectedId(current => items.some(i => String(i._id || i.id) === current) ? current : String(items[0]?._id || items[0]?.id || ''));
      void loadFleet();
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load emergency incidents. Check your access role and backend connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadFleet]);


  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(true), 12000);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => incidents.filter(incident => {
    if (filter === 'ACTIVE' && !ACTIVE_STATUSES.includes(incident.status)) return false;
    if (filter !== 'ACTIVE' && filter !== 'ALL' && incident.status !== filter) return false;
    const haystack = `${incident.publicReference || ''} ${incident.callerName || ''} ${incident.callerPhone || ''} ${incident.chiefComplaint || ''} ${incident.landmark || ''} ${incident.locationDescription || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [incidents, filter, search]);

  const selected = incidents.find(i => String(i._id || i.id) === selectedId) || filtered[0] || null;
  const selectedKey = String(selected?._id || selected?.id || '');
  const incidentLat = selected?.location?.coordinates?.[1];
  const incidentLng = selected?.location?.coordinates?.[0];
  const routeVehicle = candidates.find(vehicle => vehicle._id === routeVehicleId);

  useEffect(() => {
    if (!routeVehicle?.location?.coordinates || !Number.isFinite(incidentLat) || !Number.isFinite(incidentLng)) {
      setRouteEstimate(null);
      setRouteError(routeVehicleId ? 'A route estimate needs incident coordinates and vehicle GPS.' : '');
      return;
    }
    let cancelled = false;
    setRouteEstimate(null);
    setRouteError('');
    void medxRescueService.getRouteEstimate(
      routeVehicle.location.coordinates[1], routeVehicle.location.coordinates[0],
      Number(incidentLat), Number(incidentLng),
    ).then(response => { if (!cancelled) setRouteEstimate(response.data); })
      .catch(e => { if (!cancelled) setRouteError(e instanceof Error ? e.message : 'Road route estimate is unavailable.'); });
    return () => { cancelled = true; };
  }, [selectedKey, routeVehicleId, candidates, incidentLat, incidentLng, routeVehicle]);

  const loadCandidates = async () => {
    if (!selectedKey) return;
    setCandidateLoading(true);
    setError('');
    setNotice('');
    setSelectedVehicles([]);
    try {
      const response = await medxRescueService.getEligibleVehicles(selectedKey);
      const items = response.data || [];
      setCandidates(items);
      setRouteVehicleId('');
      setNotice(items.length ? 'Eligible candidates loaded. Review coverage, vehicle/crew suitability and operating area before approving this offer wave.' : 'No eligible vehicles with fresh GPS are currently available. Contact dispatch partners and use the approved fallback procedure if urgent.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load eligible vehicles.');
      setCandidates([]);
    } finally {
      setCandidateLoading(false);
    }
  };

  const updateStatus = async (status: IncidentStatus) => {
    if (!selectedKey) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await medxRescueService.updateIncidentStatus(selectedKey, status, reason.trim() || undefined);
      setNotice(response.message || `Incident status updated to ${label(status)}.`);
      setReason('');
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update incident status.'); }
    finally { setBusy(false); }
  };

  const updatePriority = async () => {
    if (!selectedKey) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await medxRescueService.updateIncidentPriority(selectedKey, priority, reason.trim() || undefined);
      setNotice('Priority saved and triage review recorded. This does not replace clinical assessment.');
      setReason('');
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update priority.'); }
    finally { setBusy(false); }
  };

  const sendOfferWave = async () => {
    if (!selectedKey || !selectedVehicles.length) {
      setError('Select one or more eligible vehicles for the dispatcher-approved first wave.');
      return;
    }
    if (selectedVehicles.length > 20) {
      setError('A single offer wave can include at most 20 vehicles.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await medxRescueService.createDispatchOfferWave(selectedKey, selectedVehicles, 90);
      setNotice(response.message || `Parallel offer wave sent to ${selectedVehicles.length} eligible provider vehicle(s). Dispatch is not confirmed yet.`);
      setCandidates([]);
      setSelectedVehicles([]);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send the parallel offer wave.'); }
    finally { setBusy(false); }
  };

  const confirmAssignment = async (approve: boolean) => {
    if (!selectedKey) return;
    const explanation = reason.trim();
    if (!approve && !explanation) {
      setError('Enter a reason before rejecting an accepted crew assignment.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await medxRescueService.confirmAcceptedAssignment(selectedKey, approve, explanation || undefined);
      setNotice(response.message || (approve ? 'Assignment confirmed by dispatcher.' : 'Assignment was not confirmed.'));
      setReason('');
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not process assignment confirmation.'); }
    finally { setBusy(false); }
  };

  const recordEscalation = async (channel: DispatchEscalation['channel']) => {
    if (!selectedKey) return;
    const note = reason.trim();
    if (!window.confirm(channel === '112'
      ? 'This records that the dispatcher is escalating through 112. It will not place the call. Have you contacted or are you now contacting the emergency service?'
      : 'Record this fallback action? This records the action only and does not contact the provider or caller.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await medxRescueService.recordEmergencyEscalation(selectedKey, channel, note || undefined);
      setNotice(response.message || `Fallback action recorded: ${label(channel)}.`);
      setReason('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not record fallback escalation.'); }
    finally { setBusy(false); }
  };

  const activeCount = incidents.filter(i => ACTIVE_STATUSES.includes(i.status)).length;
  const awaitingReview = incidents.filter(i => ['REQUEST_RECEIVED', 'DISPATCH_REVIEW', 'CREW_ACCEPTED_PENDING_CONFIRMATION'].includes(i.status)).length;
  const confirmed = incidents.filter(i => ['CREW_CONFIRMED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING'].includes(i.status)).length;
  const immediateSuggested = selected?.triageSuggestedUrgency === 'IMMEDIATE' || selected?.triageUrgency === 'IMMEDIATE';

  useEffect(() => {
    if (selected?.priority && selected.priority !== 'UNTRIAGED') setPriority(selected.priority);
    else setPriority('URGENT');
    setCandidates([]);
    setSelectedVehicles([]);
    setRouteVehicleId('');
  }, [selectedKey, selected?.priority]);

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#1b7b68]"><Siren size={15} /> MedXRescue Nexus Command</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Emergency dispatch &amp; Aerial Radar</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Live Uber-style ambulance tracking with satellite aerial imagery, triage review, and parallel dispatch wave confirmation.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* View Switcher Tabs */}
        <div className="flex rounded-xl bg-slate-200/80 p-1 font-bold text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('RADAR')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${activeTab === 'RADAR' ? 'bg-[#1b7b68] text-white shadow' : 'text-slate-700 hover:text-slate-900'}`}
          >
            <Crosshair size={14} /> Aerial Satellite Radar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CONSOLE')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${activeTab === 'CONSOLE' ? 'bg-[#1b7b68] text-white shadow' : 'text-slate-700 hover:text-slate-900'}`}
          >
            <Activity size={14} /> Dispatch Console
          </button>
        </div>

        <button
          onClick={() => void seedFleet()}
          disabled={seeding}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          <Ambulance size={15} /> {seeding ? 'Seeding demo units…' : 'Seed Demo Fleet'}
        </button>

        <Link href="/hms/medxrescue/providers" className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2.5 text-xs font-bold text-[#1b7b68] hover:bg-teal-50"><Users size={15} /> Provider verification</Link>
        <button onClick={() => void load()} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: 'Total requests', value: total, icon: Activity, colour: 'text-[#1b7b68]', sub: 'Requests returned by backend' }, { label: 'Active incidents', value: activeCount, icon: Siren, colour: 'text-rose-600', sub: 'Not yet closed' }, { label: 'Awaiting review', value: awaitingReview, icon: Clock3, colour: 'text-amber-600', sub: 'Includes accepted crew awaiting confirmation' }, { label: 'Confirmed / responding', value: confirmed, icon: Ambulance, colour: 'text-emerald-600', sub: 'Dispatcher-confirmed assignments' }].map(card => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-500">{card.label}</p><card.icon size={18} className={card.colour} /></div><p className="mt-3 text-3xl font-extrabold tabular-nums text-slate-950">{loading ? '—' : card.value}</p><p className="mt-1 text-[11px] text-slate-400">{card.sub}</p></div>)}
    </div>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    {notice && <div role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} className="shrink-0" />{notice}</div>}

    {/* Radar Tab View */}
    {activeTab === 'RADAR' && (
      <section className="space-y-4">
        <DynamicAerialMap
          vehicles={liveFleet?.vehicles || []}
          incidents={liveFleet?.incidents || []}
          facilities={liveFleet?.facilities || []}
          selectedIncidentId={selectedKey}
          onSelectIncident={(id) => {
            setSelectedId(id);
            setActiveTab('CONSOLE');
          }}
          onRefresh={() => void loadFleet()}
          loading={refreshing}
          heightClass="h-[680px]"
        />
      </section>
    )}

    {activeTab === 'CONSOLE' && (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)]">

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-extrabold text-slate-900">Incident queue</h2><p className="mt-1 text-xs text-slate-500">Priority and age should guide review; confirm clinical context with the caller when possible.</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#1b7b68]">{filtered.length} shown</span></div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reference, phone, complaint…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1b7b68]" /></div><div className="relative"><Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select value={filter} onChange={e => setFilter(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-8 pr-8 text-sm outline-none focus:border-[#1b7b68]"><option value="ACTIVE">Active only</option><option value="ALL">All statuses</option>{[...new Set(incidents.map(i => i.status))].map(status => <option key={status} value={status}>{label(status)}</option>)}</select></div></div>
        </div>
        <div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">
          {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Loading incidents…</div>
            : filtered.length === 0 ? <div className="p-10 text-center"><CheckCircle2 size={28} className="mx-auto text-[#1b7b68]" /><p className="mt-3 font-bold text-slate-800">No incidents in this view</p><p className="mt-1 text-sm text-slate-500">New guest requests appear here after the backend records them.</p></div>
            : filtered.map(item => { const id = String(item._id || item.id || ''); const urgent = item.triageSuggestedUrgency === 'IMMEDIATE' || item.triageUrgency === 'IMMEDIATE' || item.priority === 'CRITICAL'; return <button key={id} onClick={() => setSelectedId(id)} className={`w-full p-4 text-left transition hover:bg-teal-50/40 ${selectedKey === id ? 'border-l-4 border-l-[#1b7b68] bg-teal-50/60' : 'border-l-4 border-l-transparent'}`}><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="break-all text-xs font-extrabold text-slate-900">{item.publicReference || id || 'Incident'}</p><p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800">{item.chiefComplaint}</p></div><StatusPill status={item.status} /></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={12} />{item.landmark || item.locationDescription || coordinates(item)}</span><span>{label(item.priority)}</span>{urgent && <span className="inline-flex items-center gap-1 font-bold text-rose-700"><AlertTriangle size={12} /> Immediate review flag</span>}<span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Time unavailable'}</span></div></button>; })}
        </div>
      </section>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-[#1b7b68]">Selected incident</p><h2 className="mt-1 break-all text-lg font-extrabold text-slate-950">{selected?.publicReference || 'Choose a request'}</h2></div>{selected && <StatusPill status={selected.status} />}</div>
          {selected ? <>
            {immediateSuggested && <div className="mt-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle size={18} className="shrink-0" /><div><p className="font-extrabold">Immediate-review suggestion</p><p className="mt-1 text-xs leading-5">A structured answer triggered a conservative red-flag hint. This is not a diagnosis; promptly review with the caller and follow approved emergency protocols.</p></div></div>}
            <p className="mt-4 text-sm leading-6 text-slate-700">{selected.chiefComplaint}</p>
            {selected.additionalDetails && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{selected.additionalDetails}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Caller</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{selected.callerName || 'Name not supplied'}</p><a href={selected.callerPhone ? `tel:${selected.callerPhone}` : undefined} className="mt-1 block break-all text-xs text-[#1b7b68]">{selected.callerPhone || 'Phone unavailable'}</a></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Priority</p><p className="mt-1 text-sm font-bold text-slate-800">{label(selected.priority)}</p><p className="mt-1 text-xs text-slate-500">Dispatcher reviewed priority</p></div></div>
            <div className="mt-4"><p className="text-xs font-bold text-slate-600">Reported location</p><p className="mt-1 text-sm text-slate-700">{selected.landmark || selected.locationDescription || 'No landmark supplied'}</p><p className="mt-1 text-xs text-slate-500">{coordinates(selected)}{selected.locationAccuracyMeters ? ` · GPS accuracy ±${Math.round(selected.locationAccuracyMeters)} m` : ''}</p><div className="mt-3"><IncidentMap incident={selected} /></div></div>
            <div className="mt-5 rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-slate-900">Structured triage answers</h3><span className="text-[10px] font-bold text-slate-500">{selected.triageAnswers?.length || 0} recorded</span></div>{selected.triageAnswers?.length ? <div className="mt-3 space-y-2">{selected.triageAnswers.map(answer => <div key={answer.questionId} className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2 text-xs"><span className="text-slate-600">{label(answer.questionId)}</span><span className={`font-extrabold ${['YES', 'TRUE'].includes(answer.answer.toUpperCase()) ? 'text-rose-700' : 'text-slate-800'}`}>{label(answer.answer)}</span></div>)}</div> : <p className="mt-2 text-xs leading-5 text-slate-500">No structured answers were supplied. Review the complaint directly with the caller; absence of answers does not mean low risk.</p>}<p className="mt-3 text-[10px] leading-4 text-slate-400">Suggested urgency: {label(selected.triageSuggestedUrgency)} · Reviewed urgency: {label(selected.triageUrgency)}</p></div>

            {selected.status === 'CREW_ACCEPTED_PENDING_CONFIRMATION' && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-2"><Clock3 size={18} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="font-extrabold text-amber-900">Crew accepted — dispatcher confirmation required</p><p className="mt-1 text-xs leading-5 text-amber-800">The acceptance is not yet a confirmed dispatch. Validate crew, vehicle, availability and suitability before approving.</p></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={() => void confirmAssignment(true)} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-3 text-sm font-extrabold text-white disabled:opacity-50"><ShieldCheck size={15} /> Confirm assignment</button><button onClick={() => void confirmAssignment(false)} disabled={busy || !reason.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-3 text-sm font-bold text-rose-700 disabled:opacity-50"><XCircle size={15} /> Reject acceptance</button></div><p className="mt-2 text-[11px] text-amber-800">For rejection, enter a reason in the decision note below.</p></div>}

            <div className="mt-5 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-600">Decision note / reason <span className="font-normal text-slate-400">(required to reject an accepted assignment)</span><textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68]" placeholder="Document suitability checks, decision rationale or fallback action" /></label>
              <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-600">Set priority<select value={priority} onChange={e => setPriority(e.target.value as typeof priority)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-2.5 text-xs outline-none focus:border-[#1b7b68]">{PRIORITIES.map(p => <option key={p} value={p}>{label(p)}</option>)}</select></label><button onClick={() => void updatePriority()} disabled={busy || ['HANDED_OVER', 'CANCELLED'].includes(selected.status)} className="self-end rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs font-extrabold text-[#1b7b68] disabled:opacity-50">Save triage review</button></div>
              <label className="mt-3 block text-xs font-bold text-slate-600">Manual status action<select value="" onChange={e => { if (e.target.value) void updateStatus(e.target.value as IncidentStatus); }} disabled={busy || ['HANDED_OVER', 'CANCELLED'].includes(selected.status) || selected.status === 'CREW_ACCEPTED_PENDING_CONFIRMATION'} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#1b7b68] disabled:opacity-60"><option value="">Choose a permitted status action…</option>{MANUAL_STATUS_OPTIONS.filter(s => s !== selected.status).map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">Offers, accepted-pending-confirmation, confirmed assignments and clinical handover must use their dedicated workflows. Do not manually mark a crew as dispatched.</p>
            </div>
          </> : <div className="py-12 text-center text-sm text-slate-500">Select an incident from the queue.</div>}
        </section>

        {selected && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#1b7b68]"><Users size={18} /></div><div><h2 className="font-extrabold text-slate-900">Approve parallel provider offers</h2><p className="mt-1 text-xs leading-5 text-slate-500">Load verified, available vehicles with fresh GPS. Review operating area and clinical suitability yourself before approving the first wave.</p></div></div>
          <button onClick={() => void loadCandidates()} disabled={candidateLoading || busy || ['CREW_ACCEPTED_PENDING_CONFIRMATION', 'CREW_CONFIRMED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'HANDED_OVER', 'CANCELLED'].includes(selected.status)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-extrabold text-[#1b7b68] disabled:opacity-50"><Crosshair size={15} />{candidateLoading ? 'Loading eligible vehicles…' : 'Find eligible vehicles'}</button>
          {candidates.length > 0 && <>
            <div className="mt-4 flex items-center justify-between gap-2"><p className="text-sm font-extrabold text-slate-900">Eligible candidates ({candidates.length})</p><button onClick={() => setSelectedVehicles(selectedVehicles.length === candidates.length ? [] : candidates.map(v => v._id))} className="text-xs font-bold text-[#1b7b68]">{selectedVehicles.length === candidates.length ? 'Clear selection' : 'Select all'}</button></div>
            <div className="mt-3 space-y-2">{candidates.map(vehicle => {
              const gpsTime = vehicle.locationUpdatedAt ? new Date(vehicle.locationUpdatedAt) : null;
              const gpsAge = gpsTime ? Math.max(0, Math.round((Date.now() - gpsTime.getTime()) / 1000)) : null;
              const checked = selectedVehicles.includes(vehicle._id);
              return <div key={vehicle._id} className={`rounded-xl border p-3 transition ${checked ? 'border-[#1b7b68] bg-teal-50/70' : 'border-slate-200 hover:border-teal-200'}`}><div className="flex items-start gap-3"><input aria-label={`Select ${vehicle.registrationNumber} for dispatch offer wave`} type="checkbox" checked={checked} onChange={e => setSelectedVehicles(prev => e.target.checked ? [...prev, vehicle._id].slice(0, 20) : prev.filter(id => id !== vehicle._id))} className="mt-1 h-4 w-4 accent-[#1b7b68]" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-extrabold text-slate-900">{vehicle.registrationNumber} · {vehicle.makeModel}</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">GPS fresh</span></div><p className="mt-1 text-xs text-slate-600">{vehicle.provider?.displayName || 'Verified provider'} · {label(vehicle.vehicleClass)}</p><p className="mt-1 text-[11px] text-slate-500">{typeof vehicle.distanceKm === 'number' ? `Approx. ${vehicle.distanceKm} km straight-line distance` : 'Distance unavailable'} · GPS updated {gpsAge === null ? 'time unavailable' : `${gpsAge}s ago`}{vehicle.locationAccuracyMeters ? ` · accuracy ±${Math.round(vehicle.locationAccuracyMeters)} m` : ''}</p>{vehicle.provider?.operatingAreas?.length ? <p className="mt-1 text-[11px] text-slate-500">Operating areas: {vehicle.provider.operatingAreas.join(', ')}</p> : null}<p className="mt-1 text-[10px] font-semibold text-amber-700">Confirm coverage, crew qualification and equipment before sending.</p><button type="button" onClick={e => { e.preventDefault(); setRouteVehicleId(vehicle._id); }} className="mt-2 text-xs font-bold text-[#1b7b68] hover:underline">Check road estimate</button></div></div></div>;
            })}</div>
            {routeEstimate && <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/70 p-3"><p className="text-xs font-extrabold text-[#1b7b68]">Road route estimate · {routeEstimate.provider.toUpperCase()}</p><p className="mt-1 text-sm font-bold text-slate-900">{(routeEstimate.distanceMeters / 1000).toFixed(1)} km · {Math.max(1, Math.round(routeEstimate.durationSeconds / 60))} min estimated</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Planning estimate only, not a guaranteed arrival time.</p></div>}
            {routeError && routeVehicleId && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">Road estimate unavailable: {routeError}. Do not guess an ETA.</p>}
            <button onClick={() => void sendOfferWave()} disabled={busy || !selectedVehicles.length || selectedVehicles.length > 20} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#166657] disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} /> Send parallel offer wave ({selectedVehicles.length})</button>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Offers expire after 90 seconds. Only a validated acceptance followed by dispatcher confirmation becomes a confirmed assignment.</p>
          </>}
          {candidates.length === 0 && !candidateLoading && <p className="mt-3 text-xs leading-5 text-slate-500">No shortlist loaded yet. Eligible candidates require verified providers, available vehicles, and recent GPS data.</p>}
        </section>}

        {selected && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"><div className="flex gap-3"><ShieldAlert size={20} className="shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-amber-900">Emergency fallback / escalation</p><p className="mt-1 text-xs leading-5 text-amber-800">Use this when no provider accepts, a delay becomes unsafe, or the platform is unavailable. Recording an escalation does not make a phone call.</p><label className="mt-3 block text-xs font-bold text-amber-900">Fallback channel<select value={escalationChannel} onChange={e => setEscalationChannel(e.target.value as DispatchEscalation['channel'])} className="mt-1.5 w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm"><option value="112">112 / local emergency service</option><option value="PHONE_DISPATCH">Phone dispatch</option><option value="MANUAL_PROVIDER_CONTACT">Manual provider contact</option><option value="OTHER">Other approved procedure</option></select></label><button onClick={() => void recordEscalation(escalationChannel)} disabled={busy || ['CANCELLED', 'HANDED_OVER'].includes(selected.status)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-extrabold text-amber-900 disabled:opacity-50"><PhoneCall size={15} /> Record fallback action</button></div></div></section>}
      </div>
    </div>)}

    <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex gap-3"><ShieldCheck size={20} className="shrink-0 text-[#1b7b68]" /><div><p className="text-sm font-extrabold text-slate-900">Operational safety</p><p className="mt-1 text-xs leading-5 text-slate-500">This interface does not place calls automatically. Do not claim an ambulance is on the way until a verified crew and vehicle are confirmed. Map distances and route ETAs are estimates; follow approved clinical and dispatch protocols.</p></div></div></div>
  </div>;
}

