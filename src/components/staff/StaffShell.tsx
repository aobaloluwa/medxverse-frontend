'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  ClipboardList,
  Home,
  LogOut,
  MessageCircle,
  PanelLeft,
  Search,
  Settings,
  Stethoscope,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { communicationService } from '@/services/communication.service';
import { staffNotificationsService } from '@/services/staff-notifications.service';
import { staffAccountService } from '@/services/staff-account.service';

const navigation = [
  { label: 'Workspace', href: '/staff', icon: Home },
  { label: 'Messages', href: '/staff/messages', icon: MessageCircle },
  { label: 'Consultations', href: '/staff/messages/consultations', icon: ClipboardList },
  { label: 'My Patients', href: '/staff/patients', icon: Users },
  { label: 'Tasks & Tickets', href: '/staff/tasks', icon: Ticket },
  { label: 'Work Activity', href: '/staff/activity', icon: Activity },
  { label: 'Notifications', href: '/staff/notifications', icon: Bell },
];

interface StaffShellProps {
  children: React.ReactNode;
}

export default function StaffShell({ children }: StaffShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { account, isAuthenticated, hasHydrated, logout } = useAuthStore();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [staffHospitalName, setStaffHospitalName] = useState<
    string | undefined
  >(undefined);

  const displayName = account?.name || 'Staff member';

  const hospitalName =
    staffHospitalName ||
    (account?.hospital && typeof account.hospital === 'object'
      ? account.hospital.name
      : undefined);

  const initials = useMemo(
    () =>
      displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
    [displayName],
  );

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/staff');
      return;
    }

    if (account?.userType !== 'STAFF') {
      router.replace(account?.accountType === 'HMO' ? '/hmo' : '/hms');
    }
  }, [account, hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hasHydrated || account?.userType !== 'STAFF') return;

    let cancelled = false;

    const publishPresence = () => {
      void communicationService.setPresence('ONLINE').then(() => {
        if (!cancelled) setOnline(true);
      }).catch(() => {
        if (!cancelled) setOnline(false);
      });
    };

    publishPresence();
    // Refresh the last-seen timestamp while the staff portal is open. The
    // directory treats ONLINE presence older than two minutes as offline.
    const heartbeat = window.setInterval(publishPresence, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      void communicationService.setPresence('OFFLINE').catch(() => undefined);
    };
  }, [account?.userType, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || account?.userType !== 'STAFF') return;

    let cancelled = false;

    void staffAccountService
      .getProfile()
      .then((profile) => {
        if (!cancelled) {
          setStaffHospitalName(profile.hospital?.name);
        }
      })
      .catch(() => undefined);

    const loadCount = async () => {
      try {
        const count = await staffNotificationsService.getUnreadCount();

        if (!cancelled) {
          setNotificationCount(count);
        }
      } catch {
        if (!cancelled) {
          setNotificationCount(0);
        }
      }
    };

    void loadCount();

    const timer = window.setInterval(loadCount, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [account?.userType, hasHydrated]);

  const handleLogout = () => {
    void communicationService.setPresence('OFFLINE').catch(() => undefined);
    logout();
    router.replace('/auth/login');
  };

  if (
    !hasHydrated ||
    !isAuthenticated ||
    account?.userType !== 'STAFF'
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]">
        <Activity className="h-7 w-7 animate-pulse text-[#1b7b68]" />
      </div>
    );
  }

  const settingsActive =
    pathname === '/staff/settings' ||
    pathname.startsWith('/staff/settings/');

  return (
    <div className="min-h-screen bg-[#f4f7f6] font-sans text-slate-800">
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

          <Link href="/staff" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20">
              <Stethoscope className="h-5 w-5" />
            </div>

            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold tracking-tight text-slate-800">
                MedXverse Staff
              </p>

              <p className="truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {hospitalName || 'Hospital Workspace'}
              </p>
            </div>
          </Link>
        </div>

        <div className="hidden max-w-xl flex-1 px-6 md:block">
          <Link href="/staff/messages" className="relative block">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-slate-400 transition hover:border-[#1b7b68]/30 hover:bg-white">
              Search staff, conversations, patients...
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <Link
            href="/staff/messages"
            className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-[#1b7b68]"
            aria-label="Messages"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>

          <Link
            href="/staff/notifications"
            className="relative rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-[#1b7b68]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />

            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white ring-2 ring-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Link>

          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#1b7b68]/20 bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">
              {initials || 'ST'}
            </div>

            <div className="hidden max-w-32 sm:block">
              <p className="truncate text-[11px] font-bold text-slate-800">
                {displayName}
              </p>

              <p className="truncate text-[9px] uppercase tracking-wider text-slate-400">
                {online ? 'Online' : 'Offline'} · {account.role || 'Staff'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 top-16 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-16 z-40 flex flex-col border-r border-slate-100 bg-white py-3.5 transition-all duration-300 ${
          collapsed ? 'w-20 px-2.5' : 'w-64 px-3'
        } ${
          mobileOpen
            ? 'translate-x-0 w-64 px-3 shadow-2xl'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="mb-4 flex items-center justify-between px-2">
          {!collapsed && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Clinical workspace
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-700">
                Your hospital, your work
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 md:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              item.href === '/staff/messages'
                ? pathname === '/staff/messages' ||
                  (pathname.startsWith('/staff/messages/') &&
                    !pathname.startsWith('/staff/messages/consultations'))
                : pathname === item.href ||
                  (item.href !== '/staff' &&
                    pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20'
                    : 'text-slate-500 hover:bg-[#e8f5f3] hover:text-[#1b7b68]'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-[#1b7b68]'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}

          {!collapsed && (
            <div className="px-3 pb-1 pt-6 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Account
            </div>
          )}

          <Link
            href="/staff/settings"
            onClick={() => setMobileOpen(false)}
            title={collapsed ? 'Settings' : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
              settingsActive
                ? 'bg-[#1b7b68] text-white shadow-md shadow-[#1b7b68]/20'
                : 'text-slate-500 hover:bg-[#e8f5f3] hover:text-[#1b7b68]'
            } ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <Settings
              className={`h-4 w-4 shrink-0 ${
                settingsActive
                  ? 'text-white'
                  : 'text-slate-400 group-hover:text-[#1b7b68]'
              }`}
            />

            {!collapsed && <span>Settings</span>}
          </Link>
        </nav>

        <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
          {!collapsed && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
              <p className="truncate text-[11px] font-bold text-slate-800">
                {displayName}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                {account.email}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 px-3 py-2 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 ${
              collapsed ? 'px-0' : ''
            }`}
          >
            <LogOut className="h-3.5 w-3.5" />

            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div
        className={`pt-16 transition-all duration-300 ${
          collapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1700px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}