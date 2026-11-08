"use client";

import { useCallback, useEffect, useState } from "react";
import AmbulanceShell from "@/components/medxrescue/AmbulanceShell";
import { medxRescueService, type RescueVehicle } from "@/services/medxrescue.service";
import {
  Activity,
  AlertCircle,
  Ambulance,
  CheckCircle2,
  Crosshair,
  RefreshCw,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE_URL } from "@/services/appointment.service";

const label = (value?: string) =>
  (value || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function RescueVehiclePage() {
  const account = useAuthStore((state) => state.account);
  const token = useAuthStore((state) => state.token);
  const [vehicle, setVehicle] = useState<RescueVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Edit Modal State
  const [editModal, setEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    registrationNumber: "",
    makeModel: "",
    vehicleClass: "ADVANCED_LIFE_SUPPORT",
    equipment: "",
    crewQualifications: "",
  });

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const meRes = await fetch(`${API_BASE_URL}/medxrescue/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);
      if (meRes && meRes.ok) {
        const payload = await meRes.json();
        if (payload?.data?.vehicle) {
          setVehicle(payload.data.vehicle);
          setEditForm({
            registrationNumber: payload.data.vehicle.registrationNumber || "",
            makeModel: payload.data.vehicle.makeModel || "",
            vehicleClass: payload.data.vehicle.vehicleClass || "ADVANCED_LIFE_SUPPORT",
            equipment: Array.isArray(payload.data.vehicle.equipment)
              ? payload.data.vehicle.equipment.join(", ")
              : "",
            crewQualifications: Array.isArray(payload.data.vehicle.crewQualifications)
              ? payload.data.vehicle.crewQualifications.join(", ")
              : "",
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle?._id) return;
    setEditLoading(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API_BASE_URL}/medxrescue/vehicles/${vehicle._id}/reapply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationNumber: editForm.registrationNumber.trim(),
          makeModel: editForm.makeModel.trim(),
          vehicleClass: editForm.vehicleClass,
          equipment: editForm.equipment.split(",").map((v) => v.trim()).filter(Boolean),
          crewQualifications: editForm.crewQualifications.split(",").map((v) => v.trim()).filter(Boolean),
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Could not update vehicle details.");
      }

      setNotice("Vehicle details updated successfully!");
      setEditModal(false);
      void loadVehicle();
    } catch (err: any) {
      setError(err?.message || "Failed to update vehicle details.");
    } finally {
      setEditLoading(false);
    }
  };

  const updateGps = () => {
    if (!navigator.geolocation) {
      setError("Browser geolocation is unavailable on this device.");
      return;
    }
    setGpsBusy(true);
    setError("");
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          if (vehicle?._id && (vehicle as any).providerId) {
            await medxRescueService.updateVehicleLocation(
              vehicle._id,
              {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracyMeters: pos.coords.accuracy,
              },
              (vehicle as any).providerId
            );
            setNotice(`Live GPS coordinates updated successfully! (±${Math.round(pos.coords.accuracy)}m accuracy)`);
            void loadVehicle();
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not update vehicle GPS location.");
        } finally {
          setGpsBusy(false);
        }
      },
      () => {
        setGpsBusy(false);
        setError("GPS permission denied or location unavailable.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const toggleStatus = async (status: "AVAILABLE" | "OFFLINE" | "BUSY") => {
    if (!vehicle?._id || !(vehicle as any).providerId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await medxRescueService.setVehicleOperationalStatus(vehicle._id, status, (vehicle as any).providerId);
      setNotice(`Ambulance status updated to ${label(status)}.`);
      void loadVehicle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update vehicle operational status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AmbulanceShell>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/60 bg-teal-50 px-3 py-1 text-xs font-semibold text-[#1b7b68]">
              <Ambulance size={14} /> Vehicle Readiness &amp; Equipment
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Ambulance Operational Status
            </h1>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              Manage vehicle readiness, update live GPS location fixes, inspect medical equipment, or edit vehicle specifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEditModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1b7b68]/20 transition-all hover:bg-[#156354]"
            >
              <Wrench size={14} /> Edit Vehicle Details
            </button>

            <button
              onClick={() => void loadVehicle()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#1b7b68]/30 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Status
            </button>
          </div>
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

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status & GPS Card */}
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity size={18} className="text-[#1b7b68]" /> Vehicle Operational State
              </h2>
              <span className="rounded-full border border-teal-200/60 bg-teal-50 px-3 py-1 text-xs font-bold text-[#1b7b68]">
                {label(vehicle?.status || "AVAILABLE")}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">Assigned Vehicle Registration</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{vehicle?.registrationNumber || "AMB-911-RES"}</p>
              <p className="text-xs text-slate-600 mt-0.5">{vehicle?.makeModel || "Mercedes Sprinter ALS"}</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 mb-2">Set Operational Availability</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => void toggleStatus("AVAILABLE")}
                  disabled={busy}
                  className="rounded-2xl bg-teal-50 border border-teal-200/80 py-2.5 text-xs font-bold text-[#1b7b68] hover:bg-teal-100/70 disabled:opacity-50 transition-all"
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => void toggleStatus("BUSY")}
                  disabled={busy}
                  className="rounded-2xl bg-amber-50 border border-amber-200/80 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100/70 disabled:opacity-50 transition-all"
                >
                  Busy
                </button>
                <button
                  type="button"
                  onClick={() => void toggleStatus("OFFLINE")}
                  disabled={busy}
                  className="rounded-2xl bg-slate-50 border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-all"
                >
                  Offline
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={updateGps}
                disabled={gpsBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] py-3 text-xs font-bold text-white shadow-md shadow-[#1b7b68]/20 transition-all hover:bg-[#156354] disabled:opacity-50"
              >
                <Crosshair size={16} className={gpsBusy ? "animate-spin" : ""} />
                {gpsBusy ? "Capturing High-Accuracy GPS..." : "Update Device GPS Location Now"}
              </button>
            </div>
          </section>

          {/* Equipment & Qualifications */}
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-[#1b7b68]" />
                <h2 className="text-base font-bold text-slate-900">Onboard Medical Equipment</h2>
              </div>
              <button
                onClick={() => setEditModal(true)}
                className="text-xs font-bold text-[#1b7b68] hover:underline"
              >
                Edit Specification
              </button>
            </div>

            <div className="space-y-2">
              {(vehicle?.equipment || [
                "Automated External Defibrillator (AED)",
                "Portable Mechanical Ventilator",
                "Oxygen Cylinder & Regulator",
                "ECG Monitor",
                "Emergency Trauma Kit",
              ]).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <CheckCircle2 size={16} className="text-[#1b7b68] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 mb-2">Crew Qualifications &amp; Certifications</p>
              <div className="flex flex-wrap gap-2">
                {(vehicle?.crewQualifications || ["Paramedic", "Emergency Medical Technician", "ACLS Certified"]).map((qual, idx) => (
                  <span key={idx} className="rounded-full bg-teal-50 border border-teal-200/60 px-3 py-1 text-xs font-semibold text-[#1b7b68]">
                    {qual}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* EDIT VEHICLE MODAL */}
        {editModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Wrench size={18} className="text-[#1b7b68]" />
                  Edit Vehicle Specifications
                </h3>
                <button onClick={() => setEditModal(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    required
                    value={editForm.registrationNumber}
                    onChange={(e) => setEditForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Vehicle Make &amp; Model *</label>
                  <input
                    type="text"
                    required
                    value={editForm.makeModel}
                    onChange={(e) => setEditForm((p) => ({ ...p, makeModel: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Ambulance Class</label>
                  <select
                    value={editForm.vehicleClass}
                    onChange={(e) => setEditForm((p) => ({ ...p, vehicleClass: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-xs outline-none focus:border-[#1b7b68]"
                  >
                    <option value="ADVANCED_LIFE_SUPPORT">Advanced Life Support (ALS)</option>
                    <option value="BASIC_LIFE_SUPPORT">Basic Life Support (BLS)</option>
                    <option value="ICU_AMBULANCE">ICU Ambulance</option>
                    <option value="NEONATAL">Neonatal Intensive Care</option>
                    <option value="PATIENT_TRANSPORT">Patient Transport</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Equipment Inventory (comma separated)</label>
                  <textarea
                    rows={2}
                    value={editForm.equipment}
                    onChange={(e) => setEditForm((p) => ({ ...p, equipment: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Crew Qualifications (comma separated)</label>
                  <textarea
                    rows={2}
                    value={editForm.crewQualifications}
                    onChange={(e) => setEditForm((p) => ({ ...p, crewQualifications: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-xs outline-none focus:border-[#1b7b68]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditModal(false)}
                    className="w-1/2 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="w-1/2 rounded-2xl bg-[#1b7b68] py-3 text-xs font-bold text-white shadow-md shadow-[#1b7b68]/20 transition-all hover:bg-[#156354] disabled:opacity-50"
                  >
                    {editLoading ? "Saving Changes..." : "Save Vehicle Details"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AmbulanceShell>
  );
}
