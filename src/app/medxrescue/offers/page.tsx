"use client";

import { useCallback, useEffect, useState } from 'react';
import AmbulanceShell from '@/components/medxrescue/AmbulanceShell';
import { medxRescueService, type DispatchOffer } from '@/services/medxrescue.service';
import { ListOrdered, Radio, RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, Ambulance, FileText } from 'lucide-react';

const label = (value?: string) => (value || 'UNKNOWN').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function RescueOffersPage() {
  const [offers, setOffers] = useState<DispatchOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await medxRescueService.listOffers();
      setOffers(response.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dispatch offer history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  return (
    <AmbulanceShell>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50 px-3 py-1 text-xs font-semibold text-[#1b7b68]">
              <ListOrdered size={14} /> Mission Offers &amp; Dispatch History
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Dispatch Waves &amp; History
            </h1>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Review active dispatch wave offers, crew responses, and past emergency assignments.
            </p>
          </div>

          <button
            onClick={() => void loadOffers()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#1b7b68]/30 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh History
          </button>
        </div>

        {error && (
          <div className="flex gap-2.5 rounded-2xl border border-rose-200/60 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-base font-bold text-slate-900">Active &amp; Recent Dispatch Offers</h2>
          <p className="mt-1 text-xs text-slate-500">Offers are sent in 90-second dispatcher waves. Active offers require immediate crew acceptance.</p>

          {loading ? (
            <div className="p-10 text-center text-xs text-slate-500">Loading dispatch history...</div>
          ) : offers.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-[#f7fcfb] border border-teal-100/60 p-10 text-center">
              <CheckCircle2 size={32} className="mx-auto text-[#1b7b68]" />
              <p className="mt-3 font-bold text-slate-800">No Pending Dispatch Wave Offers</p>
              <p className="mt-1 text-xs text-slate-500">New emergency dispatch offers will pop up here when sent by the hospital dispatcher.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {offers.map((offer) => {
                const incident = typeof offer.incidentId === 'object' ? (offer.incidentId as any) : null;
                const vehicle = typeof offer.vehicleId === 'object' ? (offer.vehicleId as any) : null;
                const provider = typeof offer.providerId === 'object' ? (offer.providerId as any) : null;
                const isExpired = new Date(offer.expiresAt).getTime() <= Date.now() || offer.status === 'EXPIRED';
                const displayStatus = isExpired && offer.status === 'PENDING' ? 'EXPIRED' : offer.status;

                return (
                  <div key={offer._id} className="py-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            displayStatus === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            displayStatus === 'DECLINED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            displayStatus === 'EXPIRED' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-teal-50 text-[#1b7b68] border-teal-200/60'
                          }`}>
                            {label(displayStatus)}
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {incident?.publicReference || 'Emergency Incident'}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-bold text-slate-900">{incident?.chiefComplaint || 'Emergency dispatch offer'}</p>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <p className="font-bold text-slate-700">Offered: {offer.offeredAt ? new Date(offer.offeredAt).toLocaleString() : ''}</p>
                        {offer.respondedAt && <p className="mt-0.5 text-[11px]">Responded: {new Date(offer.respondedAt).toLocaleString()}</p>}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned Vehicle</p>
                        <p className="mt-0.5 font-bold text-slate-900">{vehicle ? `${vehicle.registrationNumber} · ${vehicle.makeModel}` : 'Ambulance Unit'}</p>
                        <p className="text-[11px] text-slate-500">{provider?.displayName || 'Rescue Partner'}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Patient &amp; Contact</p>
                        <p className="mt-0.5 font-bold text-slate-900">{incident?.callerName || incident?.patientName || 'Emergency Caller'}</p>
                        <p className="text-[11px] text-[#1b7b68]">{incident?.callerPhone || 'Phone available'}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Landmark Location</p>
                        <p className="mt-0.5 font-bold text-slate-900">📍 {incident?.landmark || incident?.locationDescription || 'Location reported'}</p>
                      </div>
                    </div>

                    {offer.responseNote && (
                      <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-2.5 text-xs text-teal-900 font-medium">
                        <strong>Audit Rationale:</strong> {offer.responseNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AmbulanceShell>
  );
}
