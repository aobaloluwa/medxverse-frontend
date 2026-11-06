"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Ambulance,
  ArrowRight,
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
  const hospitalName = (account as any)?.hospitalName || "Host Hospital Emergency Dept";
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

  return (
    <div className="min-h-screen bg-[#f4faf8] font-sans antialiased text-slate-900">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-teal-100 bg-white shadow-sm transition-all duration-300 lg:flex lg:flex-col ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-teal-50 px-4">
          <Link href="/medxrescue/crew" className="flex items-center gap-3 overflow-hidden">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b7b68] to-[#125447] text-white shadow-md shadow-teal-900/10">
              <Siren size={20} className="animate-pulse" />
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-black tracking-tight text-slate-900">MedXRescue</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">Crew Workstation</p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-teal-50 hover:text-[#1b7b68] transition"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navigation.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-extrabold transition ${
                  active
                    ? "bg-[#1b7b68] text-white shadow-md shadow-teal-900/15"
                    : "text-slate-600 hover:bg-teal-50 hover:text-[#1b7b68]"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className={`shrink-0 ${active ? "text-white" : "text-[#1b7b68]"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-teal-50 p-3">
          <div className={`flex items-center gap-3 rounded-2xl border border-teal-100 bg-[#f7fcfb] p-2.5 ${collapsed ? "justify-center" : ""}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1b7b68] text-xs font-black text-white">
              {initials}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-slate-900">{displayName}</p>
                <p className="truncate text-[10px] font-semibold text-slate-500">{userRole}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={`mt-2 flex w-full items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 p-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100/70 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white p-4 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-teal-50 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b7b68] text-white">
                    <Siren size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-900">MedXRescue</p>
                    <p className="text-[10px] font-bold uppercase text-[#1b7b68]">Crew Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                  <X size={18} />
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
                      className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-extrabold ${
                        active ? "bg-[#1b7b68] text-white" : "text-slate-600 hover:bg-teal-50"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700"
            >
              <LogOut size={16} /> Sign out
            </button>
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-teal-100 bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-teal-100 bg-teal-50/50 p-2 text-slate-600 hover:text-[#1b7b68] lg:hidden"
            >
              <Menu size={18} />
            </button>

            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/80 px-3 py-1 text-xs font-extrabold text-[#1b7b68]">
                <Building2 size={13} /> {hospitalName}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                Live GPS Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-extrabold text-slate-900 sm:text-sm">{displayName}</p>
              <p className="text-[10px] font-extrabold uppercase text-[#1b7b68]">{userRole}</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b7b68] text-sm font-black text-white shadow-md shadow-teal-900/10">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
