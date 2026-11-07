"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Ambulance,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crosshair,
  Home,
  Hospital,
  ListOrdered,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  PanelLeft,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  UserCheck,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE_URL } from "@/services/appointment.service";

type AmbulanceShellProps = { children: React.ReactNode };

const navigation = [
  { label: "Crew Workstation", href: "/medxrescue/crew", icon: Siren },
  { label: "Fleet Radar & GIS Map", href: "/medxrescue/fleet", icon: Navigation },
  { label: "Mission Offers & History", href: "/medxrescue/offers", icon: ListOrdered },
  { label: "Vehicle & Readiness", href: "/medxrescue/vehicle", icon: Ambulance },
];

export default function AmbulanceShell({ children }: AmbulanceShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { account, isAuthenticated, hasHydrated, logout, token } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Vehicle verification state
  const [vehicle, setVehicle] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [reapplyLoading, setReapplyLoading] = useState(false);
  const [reapplyNotice, setReapplyNotice] = useState("");
  const [reapplyError, setReapplyError] = useState("");

  const [reapplyForm, setReapplyForm] = useState({
    registrationNumber: "",
    makeModel: "",
    vehicleClass: "ADVANCED_LIFE_SUPPORT",
    equipment: "Defibrillator, Ventilator, Oxygen Cylinder, ECG Monitor",
    crewQualifications: "Paramedic, EMT, ACLS Certified",
  });

  const displayName = account?.name || "Paramedic Crew";
  const hospitalName = (account as any)?.hospitalName || "Host Hospital Workspace";
  const userRole = (account as any)?.role || "Paramedic";

  const initials = useMemo(
    () => displayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AM",
    [displayName],
  );

  const loadProfile = async () => {
    if (!token) return;
    setLoadingProfile(true);
    try {
      const res = await fetch(`${API_BASE_URL}/medxrescue/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await res.json();
      if (res.ok && payload.success && payload.data?.vehicle) {
        setVehicle(payload.data.vehicle);
        setReapplyForm({
          registrationNumber: payload.data.vehicle.registrationNumber || "",
          makeModel: payload.data.vehicle.makeModel || "",
          vehicleClass: payload.data.vehicle.vehicleClass || "ADVANCED_LIFE_SUPPORT",
          equipment: Array.isArray(payload.data.vehicle.equipment)
            ? payload.data.vehicle.equipment.join(", ")
            : "Defibrillator, Ventilator, Oxygen Cylinder, ECG Monitor",
          crewQualifications: Array.isArray(payload.data.vehicle.crewQualifications)
            ? payload.data.vehicle.crewQualifications.join(", ")
            : "Paramedic, EMT, ACLS Certified",
        });
      }
    } catch {
      // ignore
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;

    const isAuthPage = pathname === "/medxrescue/login" || pathname === "/medxrescue/register" || pathname === "/medxrescue";
    if (isAuthPage) return;

    if (!isAuthenticated) {
      router.replace("/medxrescue/login");
    } else {
      void loadProfile();
    }
  }, [hasHydrated, isAuthenticated, pathname, router, token]);

  const handleLogout = () => {
    logout();
    router.replace("/medxrescue/login");
  };

  const handleReapplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle?._id) return;
    setReapplyLoading(true);
    setReapplyError("");
    setReapplyNotice("");

    try {
      const res = await fetch(`${API_BASE_URL}/medxrescue/vehicles/${vehicle._id}/reapply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationNumber: reapplyForm.registrationNumber.trim(),
          makeModel: reapplyForm.makeModel.trim(),
          vehicleClass: reapplyForm.vehicleClass,
          equipment: reapplyForm.equipment.split(",").map((v) => v.trim()).filter(Boolean),
          crewQualifications: reapplyForm.crewQualifications.split(",").map((v) => v.trim()).filter(Boolean),
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Could not submit vehicle re-application.");
      }

      setReapplyNotice("Vehicle details updated and re-submitted for hospital review!");
      void loadProfile();
    } catch (err: any) {
      setReapplyError(err?.message || "Re-application failed.");
    } finally {
      setReapplyLoading(false);
    }
  };

  const isAuthPage = pathname === "/medxrescue/login" || pathname === "/medxrescue/register";
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]">
        <Activity className="h-7 w-7 animate-pulse text-[#1b7b68]" />
      </div>
    );
  }

  const vStatus = vehicle?.verificationStatus || (vehicle?.rejectionReason ? "REJECTED" : "VERIFIED");
  const isRejected = Boolean(vehicle) && (vStatus === "REJECTED" || Boolean(vehicle?.rejectionReason));
  const isPending = Boolean(vehicle) && !isRejected && (vStatus === "PENDING" || vStatus === "UNDER_REVIEW");
  const isVerified = !vehicle || (!isRejected && !isPending);

  return (
    <div className="min-h-screen bg-[#f4f7f6] font-sans text-slate-800">
      {/* Topbar Header */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen((value) => !value);
              } else {
                setCollapsed((value) => !value);
              }
            }}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-[#e8f5f3] hover:text-[#1b7b68]"
            aria-label="Toggle navigation"
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          <Link href="/medxrescue/crew" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20">
              <Siren className="h-5 w-5 animate-pulse" />
            </div>

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold tracking-tight text-slate-800">
                MedXRescue Portal
              </p>

              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {hospitalName}
              </p>
            </div>
          </Link>
        </div>

        <div className="hidden max-w-xl flex-1 px-6 md:block">
          <div className="relative block">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search active offers, incidents, vehicles, ePCR records..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-[#1b7b68]/30 hover:bg-white focus:border-[#1b7b68] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {isVerified ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-800 sm:flex">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
              Live GPS Active
            </span>
          ) : isPending ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-800 sm:flex">
              <Clock className="h-3 w-3" />
              Pending Review
            </span>
          ) : (
            <span className="hidden items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-bold text-rose-800 sm:flex">
              <XCircle className="h-3 w-3" />
              Application Rejected
            </span>
          )}

          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#1b7b68]/20 bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">
              {initials}
            </div>

            <div className="hidden max-w-32 sm:block">
              <p className="truncate text-[11px] font-bold text-slate-800">{displayName}</p>
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-[#1b7b68]">
                {userRole}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 top-16 z-40 hidden flex-col border-r border-slate-100 bg-white transition-all duration-300 md:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#1b7b68] font-bold text-white shadow-md shadow-[#1b7b68]/20"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white p-4 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b7b68] text-white">
                    <Siren className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">MedXRescue Portal</p>
                    <p className="text-[10px] font-semibold uppercase text-slate-400">{hospitalName}</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1.5">
                {navigation.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-xs font-semibold ${
                        active ? "bg-[#1b7b68] font-bold text-white shadow-md shadow-[#1b7b68]/20" : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-600"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>
        </div>
      )}

      {/* Main Page Container */}
      <div className={`pt-16 transition-all duration-300 ${collapsed ? "md:pl-20" : "md:pl-64"}`}>
        <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7f6] p-4 md:p-6 lg:p-8">
          {/* LOCKED / PENDING APPROVAL SCREEN */}
          {isPending ? (
            <div className="mx-auto max-w-2xl mt-8 space-y-6">
              <div className="rounded-3xl border border-amber-200/80 bg-white p-6 md:p-8 shadow-sm text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Clock className="h-8 w-8 animate-pulse" />
                </div>

                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800">
                  Pending Hospital Verification
                </span>

                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                  Ambulance Request Sent to Hospital
                </h2>

                <p className="mt-2 text-xs md:text-sm leading-6 text-slate-600">
                  Your vehicle application for <strong className="text-slate-900">{vehicle?.registrationNumber || "AMB-RES"}</strong> ({vehicle?.makeModel || "Ambulance"}) has been sent to <strong className="text-slate-900">{hospitalName}</strong> and is currently awaiting verification.
                </p>

                <div className="mt-5 rounded-2xl bg-amber-50/60 border border-amber-100 p-4 text-left text-xs leading-5 text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700" />
                    Portal Features Locked During Verification:
                  </p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-amber-800 font-medium">
                    <li>Dispatch offer waves and emergency call acceptances</li>
                    <li>Live GPS telemetry broadcasting</li>
                    <li>ePCR patient care recording and hospital handover</li>
                  </ul>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={() => void loadProfile()}
                    disabled={loadingProfile}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] px-5 py-3 text-xs font-bold text-white shadow-md shadow-[#1b7b68]/20 transition-all hover:bg-[#156354]"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingProfile ? "animate-spin" : ""}`} />
                    Refresh Verification Status
                  </button>
                </div>
              </div>
            </div>
          ) : isRejected ? (
            /* LOCKED / REJECTED SCREEN WITH INLINE RE-APPLICATION FORM */
            <div className="mx-auto max-w-2xl mt-8 space-y-6">
              <div className="rounded-3xl border border-rose-200/80 bg-white p-6 md:p-8 shadow-sm">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                    <XCircle className="h-8 w-8" />
                  </div>

                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1 text-xs font-bold text-rose-800">
                    Application Rejected
                  </span>

                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                    Ambulance Application Rejected
                  </h2>

                  <p className="mt-2 text-xs md:text-sm leading-6 text-slate-600">
                    Your vehicle application for <strong className="text-slate-900">{vehicle?.registrationNumber || "AMB-RES"}</strong> was reviewed and rejected by <strong className="text-slate-900">{hospitalName}</strong>.
                  </p>

                  <div className="mt-5 rounded-2xl bg-rose-50/80 border border-rose-200/80 p-4 text-left text-xs leading-5 text-rose-900">
                    <p className="font-bold flex items-center gap-1.5 text-rose-800">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      Hospital Rejection Reason:
                    </p>
                    <p className="mt-2 text-xs font-bold text-rose-900 bg-white p-3 rounded-xl border border-rose-200/60 whitespace-pre-wrap">
                      {vehicle?.rejectionReason || "Please update vehicle equipment, qualifications, or registration details and re-submit your application."}
                    </p>
                  </div>
                </div>

                {/* INLINE RE-APPLICATION FORM DIRECTLY ON THE PAGE */}
                <div className="mt-8 border-t border-slate-100 pt-6 text-left space-y-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-[#1b7b68]" />
                    <h3 className="text-base font-extrabold text-slate-900">
                      Update Vehicle Details &amp; Re-apply
                    </h3>
                  </div>

                  {reapplyNotice && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{reapplyNotice}</span>
                    </div>
                  )}

                  {reapplyError && (
                    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{reapplyError}</span>
                    </div>
                  )}

                  <form onSubmit={handleReapplySubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">Vehicle Registration *</label>
                        <input
                          type="text"
                          required
                          value={reapplyForm.registrationNumber}
                          onChange={(e) => setReapplyForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                          className="mt-1.5 w-full rounded-2xl border border-slate-200 py-3 px-4 text-xs font-medium outline-none focus:border-[#1b7b68]"
                          placeholder="Registration number (e.g. AMB-911-RES)"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700">Make / Model *</label>
                        <input
                          type="text"
                          required
                          value={reapplyForm.makeModel}
                          onChange={(e) => setReapplyForm((p) => ({ ...p, makeModel: e.target.value }))}
                          className="mt-1.5 w-full rounded-2xl border border-slate-200 py-3 px-4 text-xs font-medium outline-none focus:border-[#1b7b68]"
                          placeholder="Make and model"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">Ambulance Class</label>
                      <select
                        value={reapplyForm.vehicleClass}
                        onChange={(e) => setReapplyForm((p) => ({ ...p, vehicleClass: e.target.value }))}
                        className="mt-1.5 w-full rounded-2xl border border-slate-200 py-3 px-4 text-xs font-medium outline-none focus:border-[#1b7b68]"
                      >
                        <option value="ADVANCED_LIFE_SUPPORT">Advanced Life Support (ALS)</option>
                        <option value="BASIC_LIFE_SUPPORT">Basic Life Support (BLS)</option>
                        <option value="ICU_AMBULANCE">ICU Ambulance</option>
                        <option value="NEONATAL">Neonatal Intensive Care</option>
                        <option value="PATIENT_TRANSPORT">Patient Transport</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">Equipment (comma separated)</label>
                      <textarea
                        rows={2}
                        value={reapplyForm.equipment}
                        onChange={(e) => setReapplyForm((p) => ({ ...p, equipment: e.target.value }))}
                        className="mt-1.5 w-full rounded-2xl border border-slate-200 py-3 px-4 text-xs font-medium outline-none focus:border-[#1b7b68]"
                        placeholder="Defibrillator, Ventilator, Oxygen Cylinder"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">Crew Qualifications (comma separated)</label>
                      <textarea
                        rows={2}
                        value={reapplyForm.crewQualifications}
                        onChange={(e) => setReapplyForm((p) => ({ ...p, crewQualifications: e.target.value }))}
                        className="mt-1.5 w-full rounded-2xl border border-slate-200 py-3 px-4 text-xs font-medium outline-none focus:border-[#1b7b68]"
                        placeholder="Paramedic, EMT, ACLS Certified"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reapplyLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] py-3.5 text-xs font-black text-white shadow-md shadow-[#1b7b68]/20 transition-all hover:bg-[#156354] disabled:opacity-50"
                    >
                      {reapplyLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Re-submitting to Hospital...</span>
                        </>
                      ) : (
                        <>
                          <span>Re-submit Vehicle Application</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* UNLOCKED FULL PORTAL FEATURES WHEN VERIFIED */
            children
          )}
        </main>
      </div>
    </div>
  );
}
