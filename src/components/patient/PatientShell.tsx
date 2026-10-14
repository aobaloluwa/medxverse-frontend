"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CalendarClock,
  ChevronRight,
  Home,
  Hospital,
  LogOut,
  PanelLeft,
  ShieldCheck,
  Stethoscope,
  Video,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

type PatientShellProps = { children: React.ReactNode };

const navigation = [
  { label: "Overview", href: "/portal", icon: Home },
  { label: "Find a doctor", href: "/portal/doctors", icon: Stethoscope },
  { label: "Virtual care", href: "/portal/telemedicine", icon: Video },
];

export default function PatientShell({ children }: PatientShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { account, isAuthenticated, hasHydrated, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = account?.name || "Patient";
  const initials = useMemo(
    () => displayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    [displayName],
  );

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || account?.userType !== "PATIENT") {
      router.replace("/portal/login");
    }
  }, [account?.userType, hasHydrated, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.replace("/portal/login");
  };

  if (!hasHydrated || !isAuthenticated || account?.userType !== "PATIENT") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]">
        <Activity className="h-7 w-7 animate-pulse text-[#1b7b68]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] font-sans text-slate-800">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) setMobileOpen((value) => !value);
              else setCollapsed((value) => !value);
            }}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-[#e8f5f3] hover:text-[#1b7b68]"
            aria-label="Toggle sidebar"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>
          <Link href="/portal" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20">
              <Hospital className="h-5 w-5" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold tracking-tight text-slate-800">MedXverse Patient</p>
              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Patient Workspace</p>
            </div>
          </Link>
        </div>

        <div className="hidden max-w-xl flex-1 px-6 md:block">
          <Link href="/portal" className="block rounded-2xl border border-slate-100 bg-slate-50 py-2.5 px-4 text-xs text-slate-400 transition hover:border-[#1b7b68]/30 hover:bg-white">
            Manage your care and hospital connection
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/portal/telemedicine" aria-label="Virtual care" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-[#1b7b68]">
            <CalendarClock className="h-5 w-5" />
          </Link>
          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#1b7b68]/20 bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">
              {initials || "PT"}
            </div>
            <div className="hidden max-w-32 sm:block">
              <p className="truncate text-[11px] font-bold text-slate-800">{displayName}</p>
              <p className="truncate text-[9px] uppercase tracking-wider text-slate-400">Patient account</p>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 top-16 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden" />
      )}

      <aside className={`fixed bottom-0 left-0 top-16 z-40 flex flex-col border-r border-slate-100 bg-white py-3.5 transition-all duration-300 ${collapsed ? "w-20 px-2.5" : "w-64 px-3"} ${mobileOpen ? "translate-x-0 w-64 px-3 shadow-2xl" : "-translate-x-full md:translate-x-0"}`}>
        <div className="mb-4 flex items-center justify-between px-2">
          {!collapsed && <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Patient workspace</p><p className="mt-1 text-xs font-semibold text-slate-700">Your care, in one place</p></div>}
          <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 md:hidden" aria-label="Close sidebar"><X className="h-4 w-4" /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(`${item.href}/`));
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${active ? "bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20" : "text-slate-500 hover:bg-[#e8f5f3] hover:text-[#1b7b68]"} ${collapsed ? "justify-center px-0" : ""}`}>
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-[#1b7b68]"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-80" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
          {!collapsed && <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5"><p className="truncate text-[11px] font-bold text-slate-800">{displayName}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{account?.email || "Patient account"}</p></div>}
          <button type="button" onClick={handleLogout} className={`flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 px-3 py-2 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 ${collapsed ? "px-0" : ""}`}>
            <LogOut className="h-3.5 w-3.5" />{!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div className={`pt-16 transition-all duration-300 ${collapsed ? "md:pl-20" : "md:pl-64"}`}>
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1700px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
