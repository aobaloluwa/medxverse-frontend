"use client";

export interface GpsBreadcrumb {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  timestamp: string;
}

const OFFLINE_GPS_QUEUE_KEY = 'medxrescue:offline_gps_breadcrumbs';

export const offlineGpsTracker = {
  /** Record a GPS coordinate breadcrumb locally (works offline) */
  recordBreadcrumb(point: GpsBreadcrumb) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(OFFLINE_GPS_QUEUE_KEY);
      const queue: GpsBreadcrumb[] = raw ? JSON.parse(raw) : [];
      queue.push(point);
      // Keep last 100 breadcrumbs
      localStorage.setItem(OFFLINE_GPS_QUEUE_KEY, JSON.stringify(queue.slice(-100)));
    } catch {
      // Storage fallback
    }
  },

  /** Get all queued offline breadcrumbs */
  getQueuedBreadcrumbs(): GpsBreadcrumb[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(OFFLINE_GPS_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /** Clear queued offline breadcrumbs after successful upload */
  clearQueue() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(OFFLINE_GPS_QUEUE_KEY);
    } catch {
      // Storage fallback
    }
  },

  /** Auto sync queued breadcrumbs when network comes back online */
  async syncQueue(uploadFn: (breadcrumbs: GpsBreadcrumb[]) => Promise<void>): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.onLine) return false;
    const queue = this.getQueuedBreadcrumbs();
    if (queue.length === 0) return false;

    try {
      await uploadFn(queue);
      this.clearQueue();
      return true;
    } catch {
      return false;
    }
  }
};
