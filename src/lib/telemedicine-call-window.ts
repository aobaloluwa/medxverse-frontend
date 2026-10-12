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
    window.localStorage.setItem(ACTIVE_TELEMEDICINE_CALL_KEY, JSON.stringify(state));
  } catch {
    // The route can still open if browser storage is unavailable.
  }
  window.dispatchEvent(new Event(ACTIVE_CALL_CHANGED_EVENT));
  if (navigate) navigate(href);
  else window.location.assign(href);
}
