"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Video,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  telemedicineService,
  type TelemedicinePerson,
} from "@/services/telemedicine.service";

type DoctorProfile = TelemedicinePerson & {
  profilePhotoUrl?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  photoUrl?: string;
  imageUrl?: string;
  isOnline?: boolean;
  online?: boolean;
  presenceStatus?: string;
  bio?: string;
  qualifications?: string[] | string;
  yearsOfExperience?: number;
  consultationFee?: number;
};

function doctorName(doctor: DoctorProfile) {
  return `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() || "Doctor";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "DR";
}

function photoOf(doctor: DoctorProfile) {
  return doctor.profilePhotoUrl || doctor.profileImageUrl || doctor.avatarUrl || doctor.photoUrl || doctor.imageUrl || "";
}

function onlineState(doctor: DoctorProfile): "online" | "offline" | "unknown" {
  const presence = String(doctor.presenceStatus || "").toLowerCase();
  if (doctor.isOnline === true || doctor.online === true || ["online", "available", "active"].includes(presence)) return "online";
  if (doctor.isOnline === false || doctor.online === false || ["offline", "away", "unavailable"].includes(presence)) return "offline";
  return "unknown";
}

function formatMoney(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return "Fee not set";
  return `₦${Number(value).toLocaleString("en-NG")}`;
}

function availabilityText(doctor: DoctorProfile) {
  if (!doctor.availability?.length) return "Schedule not published";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return doctor.availability.slice(0, 3).map((slot) => {
    const day = dayNames[slot.dayOfWeek] || "Day";
    return `${day} · ${slot.startTime}–${slot.endTime}`;
  }).join("  /  ");
}

export default function PatientDoctorsPage() {
  const router = useRouter();
  const account = useAuthStore((state) => state.account);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [sort, setSort] = useState("recommended");

  const loadDoctors = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const directory = await telemedicineService.getDirectory();
      const list = Array.isArray(directory?.doctors) ? directory.doctors : [];
      setDoctors(list.filter((item) => item && item._id).map((item) => item as DoctorProfile));
      if (!list.length) setError("No doctors were returned by the hospital directory yet.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load the doctor directory.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || account?.userType !== "PATIENT") {
      router.replace("/portal/login");
      return;
    }
    void loadDoctors();
  }, [account?.userType, hasHydrated, isAuthenticated, loadDoctors, router]);

  const departments = useMemo(() => {
    const unique = new Set<string>();
    doctors.forEach((doctor) => {
      if (doctor.department?.trim()) unique.add(doctor.department.trim());
    });
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = doctors.filter((doctor) => {
      const name = doctorName(doctor).toLowerCase();
      const specialties = (doctor.specialties || []).map((item) => `${item.specialty || ""} ${item.subSpecialty || ""}`).join(" ").toLowerCase();
      const matchesSearch = !query || [name, doctor.email || "", doctor.department || "", doctor.specialization || "", doctor.role || "", specialties].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (department === "all" || doctor.department === department);
    });
    if (sort === "fee-low") filtered.sort((a, b) => Number(a.consultationFee ?? Number.MAX_SAFE_INTEGER) - Number(b.consultationFee ?? Number.MAX_SAFE_INTEGER));
    if (sort === "online") filtered.sort((a, b) => Number(onlineState(b) === "online") - Number(onlineState(a) === "online"));
    if (sort === "name") filtered.sort((a, b) => doctorName(a).localeCompare(doctorName(b)));
    return filtered;
  }, [doctors, search, department, sort]);

  if (!hasHydrated || !isAuthenticated || account?.userType !== "PATIENT") {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]"><Activity className="h-7 w-7 animate-pulse text-[#1b7b68]" /></div>;
  }

  return (

      <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
        <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-900/[0.025] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1b7b68]/10 text-[#1b7b68]">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#1b7b68]">Patient self-service · Virtual care</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">Find your doctor</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Browse your hospital's care team, compare specialties and consultation fees, check availability, and book a new private consultation.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600"><ShieldCheck className="h-4 w-4 text-[#1b7b68]" /> Hospital directory</span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600"><Video className="h-4 w-4 text-[#1b7b68]" /> Virtual consultations</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#1b7b68]">Care team</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Meet our doctors</h2>
              <p className="mt-1 text-sm text-slate-500">Every booking creates its own consultation session, even if you have chatted with this doctor before.</p>
            </div>
            <button type="button" onClick={() => void loadDoctors(true)} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-[#1b7b68]/30 hover:text-[#1b7b68] disabled:opacity-50 sm:self-auto">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh directory
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_200px_180px] sm:p-4">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#1b7b68] focus-within:bg-white">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, specialty or department" className="w-full bg-transparent py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400" />
            </label>
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-[#1b7b68]">
              <option value="all">All departments</option>
              {departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-[#1b7b68]">
              <option value="recommended">Recommended order</option>
              <option value="online">Online doctors first</option>
              <option value="fee-low">Lowest consultation fee</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          {error && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-amber-900">{error}</p>
              <button type="button" onClick={() => void loadDoctors()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-bold text-white">Try again</button>
            </div>
          )}

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-3xl border border-slate-100 bg-white p-5"><div className="h-24 w-24 rounded-2xl bg-slate-100" /><div className="mt-5 h-4 w-2/3 rounded bg-slate-100" /><div className="mt-3 h-3 w-1/2 rounded bg-slate-100" /><div className="mt-8 h-20 rounded-xl bg-slate-50" /></div>)}
            </div>
          ) : filteredDoctors.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDoctors.map((doctor) => {
                const name = doctorName(doctor);
                const photo = photoOf(doctor);
                const presence = onlineState(doctor);
                const specialties = (doctor.specialties || []).map((item) => item.specialty).filter(Boolean);
                const primarySpecialty = specialties[0] || doctor.specialization || doctor.role?.replace(/_/g, " ") || "Medical professional";
                const specialtyText = specialties.length > 1 ? specialties.slice(1, 3).join(" · ") : doctor.specialties?.[0]?.subSpecialty;
                const qualificationText = Array.isArray(doctor.qualifications) ? doctor.qualifications.join(" · ") : doctor.qualifications;
                return (
                  <article key={doctor._id} className="group flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#1b7b68]/30 hover:shadow-xl hover:shadow-slate-900/5">
                    <div className="h-2 bg-gradient-to-r from-[#1b7b68] via-[#40ad93] to-[#c2eee3]" />
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-[#e8f5f3]">
                          {photo ? <img src={photo} alt={`${name} profile`} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-[#1b7b68]">{initials(name)}</div>}
                          <span className={`absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full border-2 border-white ${presence === "online" ? "bg-emerald-500" : presence === "offline" ? "bg-slate-400" : "bg-amber-400"}`} />
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${presence === "online" ? "bg-emerald-50 text-emerald-700" : presence === "offline" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${presence === "online" ? "bg-emerald-500" : presence === "offline" ? "bg-slate-400" : "bg-amber-400"}`} />
                            {presence === "online" ? "Online now" : presence === "offline" ? "Offline" : "Status unavailable"}
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-lg font-extrabold leading-snug text-slate-900">{name}</h3>
                          <p className="mt-1 text-xs font-semibold capitalize text-[#1b7b68]">{primarySpecialty}</p>
                          {doctor.department && <p className="mt-1 truncate text-xs text-slate-500">{doctor.department}</p>}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {doctor.role && <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold capitalize text-slate-600">{doctor.role.replace(/_/g, " ").toLowerCase()}</span>}
                        {specialtyText && <span className="rounded-lg bg-[#e8f5f3] px-2.5 py-1.5 text-[10px] font-bold text-[#176c5c]">{specialtyText}</span>}
                        {typeof doctor.yearsOfExperience === "number" && <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600">{doctor.yearsOfExperience}+ years experience</span>}
                      </div>

                      <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-start gap-2.5 text-xs text-slate-600"><Wallet className="mt-0.5 h-4 w-4 shrink-0 text-[#1b7b68]" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consultation fee</p><p className="mt-0.5 text-base font-extrabold text-slate-900">{formatMoney(doctor.consultationFee)}</p></div></div>
                        <div className="flex items-start gap-2.5 text-xs leading-5 text-slate-600"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#1b7b68]" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clinic hours</p><p className="mt-0.5">{availabilityText(doctor)}</p></div></div>
                        {doctor.email && <div className="flex min-w-0 items-center gap-2.5 text-xs text-slate-600"><Mail className="h-4 w-4 shrink-0 text-[#1b7b68]" /><span className="truncate">{doctor.email}</span></div>}
                        {doctor.phone && <div className="flex items-center gap-2.5 text-xs text-slate-600"><Phone className="h-4 w-4 shrink-0 text-[#1b7b68]" /><span>{doctor.phone}</span></div>}
                      </div>

                      <div className="mt-5 flex flex-1 flex-col">
                        {doctor.bio && <p className="mb-4 line-clamp-3 text-xs leading-5 text-slate-500">{doctor.bio}</p>}
                        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-1">
                          <Link href={`/portal/telemedicine?book=1&doctorId=${encodeURIComponent(doctor._id)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#176c5c]">
                            <CalendarDays className="h-4 w-4" /> Book doctor <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                          <Link href={`/portal/telemedicine?doctorId=${encodeURIComponent(doctor._id)}`} aria-label={`Open virtual care with ${name}`} title="Open virtual care" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-600 transition hover:border-[#1b7b68]/30 hover:text-[#1b7b68]">
                            <Video className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : !error ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><UserRound className="h-7 w-7" /></div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">No matching doctors</h3>
              <p className="mt-2 text-sm text-slate-500">Try another name, specialty or department, or clear the filters.</p>
              <button type="button" onClick={() => { setSearch(""); setDepartment("all"); setSort("recommended"); }} className="mt-4 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-[#d4ebe5] bg-[#f0faf7] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-extrabold text-slate-800">Already have a consultation?</p><p className="mt-1 text-xs text-slate-600">Return to your virtual care inbox to chat with your assigned doctor or join a scheduled call.</p></div>
          <Link href="/portal/telemedicine" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#b8ddd3] bg-white px-4 py-3 text-xs font-bold text-[#176c5c] hover:bg-[#e8f5f3]">Open virtual care <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>

  );
}
