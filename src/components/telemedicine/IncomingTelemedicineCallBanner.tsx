
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, Phone, PhoneCall, Video, X } from 'lucide-react';
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
  const [dismissedSessionId, setDismissedSessionId] = useState('');

  const pollingRef = useRef(false);
  const knownIncomingRef = useRef('');

  const userType = account?.userType;

  const checkForIncomingCall = useCallback(async () => {
    if (!userType || pollingRef.current) return;

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
            session.status === 'IN_PROGRESS' &&
            startedAt > 0 &&
            (!endedAt || endedAt < startedAt) &&
            !session.endTime &&
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

        // Ignore calls that have already ended according to their timestamps.
        if (endedAt && startedAt && endedAt >= startedAt) {
          continue;
        }

        try {
          const messages = await telemedicineService.getMessages(session._id);

          const hasSummaryForLatestCall = messages.some((message) => {
            if (
              message.messageType !== 'CALL_SUMMARY' ||
              !message.callSummary ||
              startedAt <= 0
            ) {
              return false;
            }

            return getTimestamp(message.sentAt) >= startedAt;
          });

          if (hasSummaryForLatestCall) {
            continue;
          }
        } catch {
          // Message history may temporarily be unavailable.
          // Continue using the authorized live-session information.
        }

        found = {
          session,
          title:
            session.consultationType === 'VOICE'
              ? 'Voice call'
              : 'Video call',
        };

        break;
      }

      setIncoming(found);

      if (found && knownIncomingRef.current !== found.session._id) {
        knownIncomingRef.current = found.session._id;

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
  }, [router, userType]);

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
    if (!incoming || dismissedSessionId !== incoming.session._id) {
      return;
    }

    // Hide a dismissed notification for this session.
    setIncoming(null);
  }, [dismissedSessionId, incoming]);

  if (!incoming || dismissedSessionId === incoming.session._id) {
    return null;
  }

  const isPatient = userType === 'PATIENT';

  const href = `${
    isPatient ? '/portal' : '/staff'
  }/call/${encodeURIComponent(incoming.session._id)}`;

  const accept = () => {
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
      className="fixed inset-x-3 top-3 z-260 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[#b9ded3] bg-white/95 p-3 shadow-2xl backdrop-blur-xl sm:inset-x-6 sm:top-5 sm:gap-4 sm:p-4"
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
          Your consultation is calling. Join when you&apos;re ready.
        </p>
      </div>

      <button
        type="button"
        onClick={accept}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1b7b68] px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#176c5c] sm:px-4"
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
        onClick={() => setDismissedSessionId(incoming.session._id)}
        aria-label="Dismiss incoming call notification"
        title="Dismiss"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
