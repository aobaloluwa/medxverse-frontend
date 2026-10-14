
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
  callAcceptedAt?: string | Date | null;
  callInitiatorType?: 'PATIENT' | 'STAFF';
};

type IncomingCall = {
  session: TelemedicineSession;
  title: string;
  callerName: string;
};

function getPersonName(person: TelemedicineSession['patientId'] | TelemedicineSession['doctorId']): string {
  if (!person || typeof person === 'string') return '';
  const value = person as {
    firstName?: string;
    lastName?: string;
    name?: string;
    displayName?: string;
    fullName?: string;
    role?: string;
  };
  const fullName = [value.firstName, value.lastName].filter(Boolean).join(' ').trim();
  const name = fullName || value.fullName || value.displayName || value.name || '';
  if (!name.trim()) return '';
  // Staff callers are usually clinicians; use the role only when it is a doctor role.
  if (value.role && /doctor|physician/i.test(value.role) && !/^dr\.?\s/i.test(name)) {
    return `Dr. ${name}`;
  }
  return name;
}

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
  const [answerError, setAnswerError] = useState('');
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

          const hasCallAttempt = Boolean(session.activeCallId || startedAt > 0);
          const acceptedAt = getTimestamp(session.callAcceptedAt);
          const callHasEnded = endedAt > 0 && startedAt > 0 && endedAt >= startedAt;
          const acceptanceBelongsToCurrentAttempt = acceptedAt > 0 && (
            startedAt <= 0 || acceptedAt >= startedAt
          );

          return (
            session.consultationType !== 'CHAT' &&
            !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(session.status) &&
            hasCallAttempt &&
            !callHasEnded &&
            !acceptanceBelongsToCurrentAttempt &&
            // Do not depend exclusively on optional callInitiatorType/timestamp
            // fields: some API responses expose activeCallId first. The caller's
            // own tab records the session in localStorage; the recipient's tab does not.
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

        const caller = userType === 'PATIENT'
          ? getPersonName(session.doctorId)
          : getPersonName(session.patientId);
        const callerName = caller || (userType === 'PATIENT' ? 'Your doctor' : 'Your patient');

        found = {
          session,
          title: session.consultationType === 'VOICE' ? 'Voice call' : 'Video call',
          callerName,
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
                body: `${found.callerName} is calling. Tap to answer.`,
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

              const sessionForCall = sessions.find((item) => item._id === sessionId);
              void telemedicineService.acceptCall(sessionId, String(sessionForCall?.activeCallId || ''))
                .catch(() => undefined)
                .finally(() => {
                  openTelemedicineCall(
                    sessionId,
                    href,
                    `${callTitle.replace(' call', '')} consultation`,
                    router.push,
                  );
                  notification.close();
                });
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

  useEffect(() => {
    if (!incoming || incoming.session.callAcceptedAt || !incoming.session.callStartedAt) return;
    const startedAt = getTimestamp(incoming.session.callStartedAt);
    if (!startedAt) return;
    const remaining = Math.max(0, 30_000 - (Date.now() - startedAt));
    const timeout = window.setTimeout(() => {
      // Recheck before writing the missed-call record to avoid racing an answer.
      void telemedicineService.getSessions().then((result) => {
        const latest = (result.sessions || []).find((item) => item._id === incoming.session._id) as CallTrackedSession | undefined;
        if (!latest || latest.callAcceptedAt || !latest.activeCallId) return;
        const latestStart = getTimestamp(latest.callStartedAt);
        const latestEnd = getTimestamp(latest.callEndedAt);
        if (latestEnd && latestStart && latestEnd >= latestStart) return;
        return telemedicineService.recordCallSummary(latest._id, {
          callId: latest.activeCallId,
          durationSeconds: 0,
          participantCount: 0,
          missedCall: true,
        }).finally(() => {
          setDismissedCallId(latest.activeCallId || latest._id);
          setIncoming(null);
        });
      }).catch(() => undefined);
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [incoming?.session._id, incoming?.session.activeCallId, incoming?.session.callStartedAt, incoming?.session.callAcceptedAt]);

  const currentCallId = incoming ? (incoming.session.activeCallId || incoming.session.callStartedAt || incoming.session._id) : '';

  useEffect(() => {
    setAnswerError('');
  }, [currentCallId]);

  if (!incoming || dismissedCallId === currentCallId) {
    return null;
  }

  const isPatient = userType === 'PATIENT';

  const href = `${
    isPatient ? '/portal' : '/staff'
  }/call/${encodeURIComponent(incoming.session._id)}`;


  const accept = async () => {
    setAnswerError('');
    try {
      await telemedicineService.acceptCall(incoming.session._id, String(incoming.session.activeCallId || ''));
    } catch (error) {
      // Keep the banner visible rather than making the notification disappear.
      // This also makes a missing/not-yet-deployed backend endpoint diagnosable.
      console.error('Unable to register incoming MedXVerse call acceptance:', error);
      const message = error instanceof Error ? error.message : 'Unable to answer this call yet.';
      setAnswerError(
        /route not found.*call-accept|call-accept.*route not found/i.test(message)
          ? 'The deployed backend is missing the call-answer route. Deploy the updated backend source, then try again.'
          : message,
      );
      return;
    }

    setDismissedCallId(currentCallId);
    setIncoming(null);
    openTelemedicineCall(
      incoming.session._id,
      href,
      `${incoming.session.consultationType === 'VOICE' ? 'Voice' : 'Video'} consultation`,
      router.push,
    );
  };

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="pointer-events-auto fixed left-3 right-3 top-3 z-[2147483647] mx-auto flex min-h-[76px] w-auto max-w-[520px] items-center gap-2 rounded-2xl border border-[#1b7b68]/30 bg-white px-3 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.22)] sm:left-auto sm:right-5 sm:top-5 sm:gap-3 sm:px-3.5"
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68] sm:h-11 sm:w-11">
        {incoming.session.consultationType === 'VOICE' ? (
          <PhoneCall className="h-5 w-5" />
        ) : (
          <Video className="h-5 w-5" />
        )}

        <span className="absolute -right-1 -top-1 flex h-4 w-4 animate-ping rounded-full bg-[#1b7b68]/50" />
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-[#1b7b68]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-5 text-[#174f45] sm:text-[15px]">
          {incoming.callerName}
        </p>

        <p className="mt-0.5 flex items-center gap-1 text-xs leading-4 text-slate-600">
          <BellRing className="h-3.5 w-3.5 shrink-0 text-[#1b7b68]" />
          Incoming {incoming.title.toLowerCase()}
        </p>
        {answerError ? (
          <p role="alert" className="mt-1 text-xs font-semibold text-red-700">
            Could not answer: {answerError}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={accept}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#1b7b68] px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#176c5c] focus:outline-none focus:ring-2 focus:ring-[#1b7b68]/40 sm:h-10 sm:gap-1.5 sm:px-3"
          aria-label="Answer incoming call"
        >
          {incoming.session.consultationType === 'VOICE' ? (
            <Phone className="h-4 w-4" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          
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
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-red-600 px-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 sm:h-10 sm:gap-1.5 sm:px-3"
          aria-label="Decline incoming call"
        >
          <PhoneOff className="h-4 w-4" />
          
        </button>
      </div>

      <button
        type="button"
        onClick={() => setDismissedCallId(currentCallId)}
        aria-label="Dismiss incoming call notification"
        title="Dismiss notification"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:h-8 sm:w-8"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
