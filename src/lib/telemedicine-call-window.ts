'use client';

export type ActiveTelemedicineCall = {
  sessionId: string;
  href: string;
  title: string;
  startedAt: string;
};

export const ACTIVE_TELEMEDICINE_CALL_KEY = 'medxverse.activeTelemedicineCall';
export const ACTIVE_CALL_CHANGED_EVENT = 'medxverse:active-call-changed';
export const HANG_UP_ACTIVE_CALL_EVENT = 'medxverse:hangup-call';

export function readActiveCall(): ActiveTelemedicineCall | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_TELEMEDICINE_CALL_KEY) ||
                window.localStorage.getItem(ACTIVE_TELEMEDICINE_CALL_KEY);
    return raw ? (JSON.parse(raw) as ActiveTelemedicineCall) : null;
  } catch {
    return null;
  }
}

export function clearActiveCall() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(ACTIVE_TELEMEDICINE_CALL_KEY);
    window.localStorage.removeItem(ACTIVE_TELEMEDICINE_CALL_KEY);
  } catch {
    // Ignore storage errors.
  }
  window.dispatchEvent(new Event(ACTIVE_CALL_CHANGED_EVENT));
}

/** Start the call in the current tab. The persistent call host keeps the meeting
 * mounted in the root layout while Next.js navigates between portal pages. */
export function openTelemedicineCall(
  sessionId: string,
  href: string,
  title: string,
  navigate?: (href: string) => void,
) {
  if (typeof window === 'undefined') return;
  const state: ActiveTelemedicineCall = {
    sessionId,
    href,
    title,
    startedAt: new Date().toISOString(),
  };
  try {
    window.sessionStorage.setItem(ACTIVE_TELEMEDICINE_CALL_KEY, JSON.stringify(state));
  } catch {
    // The route can still open if browser storage is unavailable.
  }
  window.dispatchEvent(new Event(ACTIVE_CALL_CHANGED_EVENT));
  if (navigate) navigate(href);
  else window.location.assign(href);
}
