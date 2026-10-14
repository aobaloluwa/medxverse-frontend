"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCheck, CheckCircle2, CircleAlert, Clock3, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { API_BASE_URL } from "@/services/appointment.service";
import { useAuthStore } from "@/store/useAuthStore";

type PatientNotification = {
  _id: string; title?: string; message?: string; status?: string;
  type?: string; priority?: string; createdAt?: string; data?: Record<string, unknown>;
};

function dateLabel(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function PatientNotificationsPage() {
  const { token, account } = useAuthStore();
  const [items, setItems] = useState<PatientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async (background = false) => {
    if (!token) return;
    background ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/notifications?limit=50`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Unable to load notifications.");
      const data = payload.data || {};
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load notifications."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function markRead(id: string) {
    if (!token || !id) return;
    setBusyId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Could not mark notification as read.");
      setItems((current) => current.map((item) => item._id === id ? { ...item, status: "READ" } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not mark notification as read."); }
    finally { setBusyId(""); }
  }

  async function markAllRead() {
    if (!token || unreadCount === 0) return;
    setBusyId("all"); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, { method: "PATCH", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Could not mark all notifications as read.");
      setItems((current) => current.map((item) => ({ ...item, status: "READ" })));
      setUnreadCount(0);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not mark all notifications as read."); }
    finally { setBusyId(""); }
  }

  async function remove(id: string) {
    if (!token || !id) return;
    setBusyId(id); setError("");
    try {
      const wasUnread = items.some((item) => item._id === id && item.status === "UNREAD");
      const response = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.message || "Could not delete notification.");
      setItems((current) => current.filter((item) => item._id !== id));
      if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not delete notification."); }
    finally { setBusyId(""); }
  }

  const filtered = useMemo(() => filter === "ALL" ? items : items.filter((item) => filter === "UNREAD" ? item.status === "UNREAD" : item.status === "READ"), [filter, items]);

  return (
    <div className="mx-auto max-w-full space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><Link href="/portal" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#1b7b68]"><ArrowLeft className="h-4 w-4" /> Patient dashboard</Link><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Updates & reminders</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Notifications</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Appointment confirmations, payment receipts and other account updates appear here.</p></div>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-[#1b7b68]/30 hover:text-[#1b7b68] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total loaded</p><p className="mt-2 text-2xl font-bold text-slate-900">{items.length}</p></div>
        <div className="rounded-2xl border border-[#cde7e1] bg-[#f5fbf9] p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-[#1b7b68]">Unread</p><p className="mt-2 text-2xl font-bold text-[#1b7b68]">{unreadCount}</p></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Read</p><p className="mt-2 text-2xl font-bold text-slate-900">{items.filter((item) => item.status === "READ").length}</p></div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5"><div className="flex flex-wrap gap-2">{(["ALL", "UNREAD", "READ"] as const).map((tab) => <button key={tab} type="button" onClick={() => setFilter(tab)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${filter === tab ? "bg-[#1b7b68] text-white" : "bg-slate-50 text-slate-500 hover:bg-[#e8f5f3] hover:text-[#1b7b68]"}`}>{tab === "ALL" ? "All notifications" : tab === "UNREAD" ? "Unread" : "Read"}</button>)}</div><button type="button" onClick={() => void markAllRead()} disabled={unreadCount === 0 || busyId !== ""} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><CheckCheck className="h-4 w-4" />Mark all as read</button></div>
        {error && <div role="alert" className="m-4 flex gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div>}
        {loading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />Loading notifications…</div> : filtered.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><CheckCircle2 className="h-6 w-6" /></div><h2 className="mt-4 text-sm font-bold text-slate-800">You're all caught up</h2><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">There are no {filter === "ALL" ? "" : `${filter.toLowerCase()} `}notifications to show right now.</p></div> : <div className="divide-y divide-slate-100">{filtered.map((item) => { const unread = item.status === "UNREAD"; const urgent = item.priority === "URGENT" || item.priority === "CRITICAL"; return <article key={item._id} className={`flex gap-3 p-4 sm:p-5 ${unread ? "bg-[#f5fbf9]/70" : "bg-white"}`}><div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-rose-50 text-rose-600" : "bg-[#e8f5f3] text-[#1b7b68]"}`}><Bell className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold text-slate-800">{item.title || "Patient update"}</h2>{unread && <span className="rounded-full bg-[#1b7b68] px-2 py-0.5 text-[9px] font-bold text-white">NEW</span>}{item.priority && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase text-slate-500">{item.priority}</span>}</div><p className="mt-1 text-xs leading-5 text-slate-600">{item.message || "You have a new update."}</p><p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400"><Clock3 className="h-3 w-3" />{dateLabel(item.createdAt)}</p></div><div className="flex shrink-0 flex-col gap-1"><button type="button" disabled={busyId !== "" || !unread} onClick={() => void markRead(item._id)} title="Mark as read" className="rounded-lg p-2 text-slate-400 hover:bg-[#e8f5f3] hover:text-[#1b7b68] disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /></button><button type="button" disabled={busyId !== ""} onClick={() => void remove(item._id)} title="Delete notification" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div></article>; })}</div>}
        <div className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">Signed in as {account?.email || "patient"} · automatically refreshes every 30 seconds</div>
      </section>
    </div>
  );
}
