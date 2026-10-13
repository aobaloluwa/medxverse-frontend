
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, Phone, PhoneCall, PhoneOff, Video, X } from 'lucide-react';
import {
  openTelemedicineCall,
  ACTIVE_TELEMEDICINE_CALL_KEY,
  type ActiveTelemedicineCall,
} from '@/lib/telemedicine-call-window';
import {
  telemedicineService,
  type TelemedicineSession,
} from '@/services/telemedicine.service';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Additional timestamps used by the incoming-call notification.
 * Keeping these optional avoids requiring every TelemedicineSession
 * response to contain call-specific timestamps.
 */
type CallTrackedSession = TelemedicineSession & {
  callStartedAt?: string | Date | null;
  callEndedAt?: string | Date | null;
  callInitiatorType?: 'PATIENT' | 'STAFF';
};

type IncomingCall = {
  session: TelemedicineSession;
  title: string;
};

function readActiveCall(): ActiveTelemedicineCall | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_TELEMEDICINE_CALL_KEY);
    return raw ? (JSON.parse(raw) as ActiveTelemedicineCall) : null;
  } catch {
    return null;
  }
}

function getTimestamp(value?: string | Date | null): number {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Watches authorized consultation sessions so an incoming call can be
 * displayed while the patient or staff member browses another portal page.
 */
export default function IncomingTelemedicineCallBanner() {
  const router = useRouter();
  const account = useAuthStore((state) => state.account);

  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [dismissedCallId, setDismissedCallId] = useState('');

  const pollingRef = useRef(false);
  const knownIncomingRef = useRef('');

  const userType = account?.userType;

  const checkForIncomingCall = useCallback(async () => {
    if ((userType !== 'PATIENT' && userType !== 'STAFF') || pollingRef.current) return;

    pollingRef.current = true;

    try {
      const result = await telemedicineService.getSessions();
      const activeCall = readActiveCall();

      const sessions = (result.sessions || []) as CallTrackedSession[];

      const candidates = sessions
        .filter((session) => {
          const startedAt = getTimestamp(session.callStartedAt);
          const endedAt = getTimestamp(session.callEndedAt);

          return (
            session.consultationType !== 'CHAT' &&
            !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(session.status) &&
            startedAt > 0 &&
            (!endedAt || endedAt < startedAt) &&
            !session.endTime &&
            // The caller sees the active-call panel; only the other participant
            // should receive the incoming-call banner.
            session.callInitiatorType && session.callInitiatorType !== userType &&
            session._id !== activeCall?.sessionId
          );
        })
        .sort((a, b) => {
          const aTime =
            getTimestamp(a.callStartedAt) ||
            getTimestamp(a.actualStartTime) ||
            getTimestamp(a.scheduledStartTime);

          const bTime =
            getTimestamp(b.callStartedAt) ||
            getTimestamp(b.actualStartTime) ||
            getTimestamp(b.scheduledStartTime);

          return bTime - aTime;
        });

      let found: IncomingCall | null = null;

      for (const session of candidates.slice(0, 3)) {
        const startedAt = getTimestamp(session.callStartedAt);
        const endedAt = getTimestamp(session.callEndedAt);

        if (endedAt && startedAt && endedAt >= startedAt) continue;

        found = {
          session,
          title: session.consultationType === 'VOICE' ? 'Voice call' : 'Video call',
        };
        break;
      }

      const foundCallId = found ? (found.session.activeCallId || found.session.callStartedAt || found.session._id) : '';
      if (found && foundCallId === dismissedCallId) found = null;
      setIncoming(found);
      if (found && knownIncomingRef.current !== foundCallId) {
        knownIncomingRef.current = foundCallId;

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([220, 100, 220]);
          } catch {
            // Vibration is optional.
          }
        }

        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          document.visibilityState !== 'visible'
        ) {
          try {
            const sessionId = found.session._id;
            const callTitle = found.title;

            const notification = new Notification(
              `Incoming ${callTitle.toLowerCase()}`,
              {
                body: 'Tap to open your secure MedXVerse consultation.',
                tag: `medxverse-call-${sessionId}`,
                silent: false,
              },
            );

            notification.onclick = () => {
              window.focus();

              const href =
                userType === 'PATIENT'
                  ? `/portal/call/${encodeURIComponent(sessionId)}`
                  : `/staff/call/${encodeURIComponent(sessionId)}`;

              openTelemedicineCall(
                sessionId,
                href,
                `${callTitle.replace(' call', '')} consultation`,
                router.push,
              );

              notification.close();
            };
          } catch {
            // Native notifications are optional.
          }
        }
      }

      if (!found) {
        knownIncomingRef.current = '';
      }
    } catch {
      // Polling is best-effort; the rest of the portal remains usable.
    } finally {
      pollingRef.current = false;
    }
  }, [dismissedCallId, router, userType]);

  useEffect(() => {
    void checkForIncomingCall();

    const timer = window.setInterval(() => {
      void checkForIncomingCall();
    }, 4000);

    const onFocus = () => {
      void checkForIncomingCall();
    };

    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkForIncomingCall]);

  useEffect(() => {
    if (!incoming || dismissedCallId !== (incoming.session.activeCallId || incoming.session.callStartedAt || incoming.session._id)) {
      return;
    }

    // Hide a dismissed notification for this session.
    setIncoming(null);
  }, [dismissedCallId, incoming]);

  const currentCallId = incoming ? (incoming.session.activeCallId || incoming.session.callStartedAt || incoming.session._id) : '';

  if (!incoming || dismissedCallId === currentCallId) {
    return null;
  }

  const isPatient = userType === 'PATIENT';

  const href = `${
    isPatient ? '/portal' : '/staff'
  }/call/${encodeURIComponent(incoming.session._id)}`;

  const accept = () => {
    setDismissedCallId(currentCallId);
    setIncoming(null);

    openTelemedicineCall(
      incoming.session._id,
      href,
      `${
        incoming.session.consultationType === 'VOICE' ? 'Voice' : 'Video'
      } consultation`,
      router.push,
    );
  };

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-3 top-3 z-[9999] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[#b9ded3] bg-white/95 p-3 shadow-2xl backdrop-blur-xl sm:inset-x-6 sm:top-5 sm:gap-4 sm:p-4"
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
        {incoming.session.consultationType === 'VOICE' ? (
          <PhoneCall className="h-5 w-5" />
        ) : (
          <Video className="h-5 w-5" />
        )}

        <span className="absolute -right-1 -top-1 flex h-4 w-4 animate-ping rounded-full bg-[#1b7b68]/50" />
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-[#1b7b68]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-[#174f45]">
          <BellRing className="h-4 w-4 shrink-0" />
          Incoming {incoming.title.toLowerCase()}
        </p>

        <p className="mt-0.5 text-xs text-slate-600">
          Someone is calling you. Answer or decline.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={accept}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1b7b68] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#176c5c] focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/40 sm:px-4"
          aria-label="Answer incoming call"
        >
          {incoming.session.consultationType === 'VOICE' ? (
            <Phone className="h-4 w-4" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          Answer
        </button>
        <button
          type="button"
          onClick={() => {
            const callId = incoming.session.activeCallId;
            // Declining ends this ringing attempt and converts its chat activity
            // to a red Missed call entry for both participants.
            if (callId) {
              void telemedicineService.recordCallSummary(incoming.session._id, {
                callId,
                durationSeconds: 0,
                participantCount: 0,
                missedCall: true,
              }).catch((error) => {
                console.error('Unable to decline telemedicine call:', error);
              }).finally(() => {
                setDismissedCallId(currentCallId);
                setIncoming(null);
              });
            } else {
              setDismissedCallId(currentCallId);
              setIncoming(null);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 sm:px-4"
          aria-label="Decline incoming call"
        >
          <PhoneOff className="h-4 w-4" />
          Decline
        </button>
      </div>

      <button
        type="button"
        onClick={() => setDismissedCallId(currentCallId)}
        aria-label="Dismiss incoming call notification"
        title="Dismiss notification"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
