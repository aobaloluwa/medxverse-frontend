"use client";

import { useCallback, useEffect, useState } from "react";
import AmbulanceShell from "@/components/medxrescue/AmbulanceShell";
import {
  medxRescueService,
  type IncidentStatus,
  type RescueIncident,
} from "@/services/medxrescue.service";
import {
  Activity,
  AlertCircle,
  Ambulance,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Crosshair,
  HeartPulse,
  Hospital,
  MapPin,
  Navigation,
  PhoneCall,
  Radio,
  RefreshCw,
  ShieldCheck,
  Siren,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { playEmergencyBeeper } from "@/lib/emergency-beeper";
import DynamicAerialMap from "@/components/medxrescue/DynamicAerialMap";

const ALL_STAGES: { status: IncidentStatus; label: string; detail: string; stepNumber: number }[] = [
  {
    status: "CREW_ACCEPTED_PENDING_CONFIRMATION",
    label: "Crew accepted mission",
    detail: "Ambulance crew accepted the mission; dispatcher validating.",
    stepNumber: 4,
  },
  {
    status: "CREW_CONFIRMED",
    label: "Ambulance confirmed",
    detail: "Hospital confirmed verified ambulance crew and vehicle.",
    stepNumber: 5,
  },
  {
    status: "EN_ROUTE",
    label: "Ambulance en route",
    detail: "Confirmed ambulance is travelling to reported location.",
    stepNumber: 6,
  },
  {
    status: "ON_SCENE",
    label: "Arrived on scene",
    detail: "Ambulance crew has arrived at the reported location.",
    stepNumber: 7,
  },
  {
    status: "TRANSPORTING",
    label: "Transporting to hospital",
    detail: "Patient is aboard and being transported to hospital ED.",
    stepNumber: 8,
  },
  {
    status: "HANDED_OVER",
    label: "Handover complete",
    detail: "Patient handed over to emergency department team.",
    stepNumber: 9,
  },
];

const label = (value?: string) =>
  (value || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function ActiveMissionsPage() {
  const [incidents, setIncidents] = useState<RescueIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMissions = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await medxRescueService.listOffers();
      const rawOffers = response.data || [];
      const extractedIncidents: RescueIncident[] = [];
      const seenIds = new Set<string>();

      for (const item of rawOffers) {
        const inc = typeof item.incidentId === "object" ? (item.incidentId as any) : null;
        if (inc && inc._id && !seenIds.has(String(inc._id))) {
          seenIds.add(String(inc._id));
          extractedIncidents.push(inc);
        }
      }

      setIncidents(extractedIncidents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load active emergency missions.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMissions();
    const timer = window.setInterval(() => void loadMissions(true), 10000);
    return () => window.clearInterval(timer);
  }, [loadMissions]);

  const updateStage = async (incidentId: string, status: IncidentStatus) => {
    setBusy(incidentId);
    setError("");
    setNotice("");
    try {
      const res = await medxRescueService.updateIncidentStatus(
        incidentId,
        status,
        `Status updated to ${label(status)} by ambulance crew.`
      );

      if (status === "EN_ROUTE") playEmergencyBeeper("DISPATCH_BEEP");
      else if (status === "ON_SCENE") playEmergencyBeeper("ON_SCENE");
      else if (status === "TRANSPORTING") playEmergencyBeeper("SIREN", 3);

      setNotice(res.message || `Mission milestone updated to ${label(status)}.`);
      await loadMissions(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update mission stage.");
    } finally {
      setBusy("");
    }
  };

  const activeMissions = incidents.filter((i) =>
    ["CREW_ACCEPTED_PENDING_CONFIRMATION", "CREW_CONFIRMED", "EN_ROUTE", "ON_SCENE", "TRANSPORTING"].includes(i.status)
  );

  return (
    <AmbulanceShell>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50 px-3 py-1 text-xs font-semibold text-[#1b7b68]">
              <Activity size={14} /> Active Missions &amp; Emergency Progression
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Ongoing Emergency Responses
            </h1>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Track active emergency missions, update live milestone stages, stream vehicle telemetry, and complete clinical hospital handovers.
            </p>
          </div>

          <button
            onClick={() => void loadMissions()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#1b7b68]/30 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Missions
          </button>
        </div>

        {error && (
          <div className="flex gap-2.5 rounded-2xl border border-rose-200/60 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="flex gap-2.5 rounded-2xl border border-emerald-200/60 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        {/* Missions List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-100 bg-white p-12 text-xs font-bold text-slate-500 shadow-sm">
            <RefreshCw className="animate-spin text-[#1b7b68]" size={18} /> Loading active emergency missions...
          </div>
        ) : activeMissions.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#1b7b68]">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">No Active Emergency Responses</h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">
              When you accept a dispatch offer from the crew workstation, the active emergency response and milestone timeline controls will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeMissions.map((incident) => {
              const currentStepObj = ALL_STAGES.find((s) => s.status === incident.status) || ALL_STAGES[0];
              const coords = incident.location?.coordinates;

              return (
                <section key={incident._id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6 space-y-6">
                  {/* Mission Info Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-teal-200/60 bg-teal-50 px-3 py-1 text-xs font-bold text-[#1b7b68]">
                          {incident.publicReference || "EMERGENCY RESPONSE"}
                        </span>
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                          {label(incident.priority || "URGENT")}
                        </span>
                      </div>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        {incident.chiefComplaint || "Emergency Medical Request"}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Patient: <strong className="text-slate-800">{incident.patientName || incident.callerName || "Reported Patient"}</strong> · Contact: <strong className="text-slate-800">{incident.callerPhone || "Phone provided"}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500">Current Milestone Stage</p>
                      <p className="text-sm font-bold text-[#1b7b68] mt-0.5">{currentStepObj.label}</p>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-500">Reported Landmark / Address</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        📍 {incident.landmark || incident.locationDescription || "Emergency Location Reported"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">GPS Coordinates</p>
                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {coords ? `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}` : "Device GPS Active"}
                      </p>
                    </div>
                  </div>

                  {/* Milestone Stages Progress Timeline */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Emergency Milestone Timeline &amp; Stage Updates
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {ALL_STAGES.map((stage) => {
                        const incId = String(incident._id || incident.id || '');
                        const isCurrent = incident.status === stage.status;
                        const isDone = ALL_STAGES.findIndex((s) => s.status === incident.status) > ALL_STAGES.findIndex((s) => s.status === stage.status);

                        return (
                          <button
                            key={stage.status}
                            type="button"
                            onClick={() => void updateStage(incId, stage.status)}
                            disabled={busy === incId}
                            className={`flex flex-col justify-between rounded-2xl p-4 text-left transition-all border ${
                              isCurrent
                                ? "border-[#1b7b68] bg-teal-50/80 shadow-md ring-2 ring-[#1b7b68]/30"
                                : isDone
                                  ? "border-emerald-200 bg-emerald-50/60 opacity-80"
                                  : "border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                                  isCurrent ? "bg-[#1b7b68] text-white" : isDone ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                                }`}>
                                  {stage.stepNumber}
                                </span>
                                {isCurrent && (
                                  <span className="rounded-full bg-[#1b7b68] px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                                    Active Stage
                                  </span>
                                )}
                              </div>

                              <p className="mt-2.5 text-xs font-bold text-slate-900">{stage.label}</p>
                              <p className="mt-1 text-[11px] text-slate-500 leading-4">{stage.detail}</p>
                            </div>

                            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#1b7b68]">
                              {isCurrent ? "Set as Active" : isDone ? "Completed ✓" : "Click to Update"} <ArrowRight size={12} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage Quick Action Bar */}
                  <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void updateStage(String(incident._id || incident.id || ''), "EN_ROUTE")}
                      disabled={busy === String(incident._id || incident.id || '')}
                      className="flex-1 rounded-2xl bg-[#1b7b68] py-3 text-xs font-bold text-white shadow-md shadow-[#1b7b68]/20 transition-all hover:bg-[#156354] disabled:opacity-50"
                    >
                      🚗 Start Driving En Route (Stage 6)
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateStage(String(incident._id || incident.id || ''), "ON_SCENE")}
                      disabled={busy === String(incident._id || incident.id || '')}
                      className="flex-1 rounded-2xl bg-amber-600 py-3 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-all hover:bg-amber-700 disabled:opacity-50"
                    >
                      📍 Arrived On Scene (Stage 7)
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateStage(String(incident._id || incident.id || ''), "TRANSPORTING")}
                      disabled={busy === String(incident._id || incident.id || '')}
                      className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:bg-rose-700 disabled:opacity-50"
                    >
                      🚑 Transporting to ED (Stage 8)
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateStage(String(incident._id || incident.id || ''), "HANDED_OVER")}
                      disabled={busy === String(incident._id || incident.id || '')}
                      className="flex-1 rounded-2xl bg-emerald-700 py-3 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition-all hover:bg-emerald-800 disabled:opacity-50"
                    >
                      🏥 Complete ED Handover (Stage 9)
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AmbulanceShell>
  );
}
