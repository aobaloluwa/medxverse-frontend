"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Ambulance,
  Building2,
  ChevronRight,
  Crosshair,
  Home,
  Hospital,
  ListOrdered,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  PanelLeft,
  Search,
  ShieldCheck,
  Siren,
  UserCheck,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

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
  const { account, isAuthenticated, hasHydrated, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = account?.name || "Paramedic Crew";
  const hospitalName = (account as any)?.hospitalName || "Host Hospital Workspace";
  const userRole = (account as any)?.role || "Paramedic";

  const initials = useMemo(
    () => displayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AM",
    [displayName],
  );

  useEffect(() => {
    if (!hasHydrated) return;

    const isAuthPage = pathname === "/medxrescue/login" || pathname === "/medxrescue/register" || pathname === "/medxrescue";
    if (isAuthPage) return;

    if (!isAuthenticated) {
      router.replace("/medxrescue/login");
    }
  }, [hasHydrated, isAuthenticated, pathname, router]);

  const handleLogout = () => {
    logout();
    router.replace("/medxrescue/login");
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
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-800 sm:flex">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
            Live GPS Active
          </span>

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
        <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7f6] p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
