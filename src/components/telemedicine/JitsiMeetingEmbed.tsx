'use client';

import { useEffect, useRef, useState } from 'react';
import { telemedicineService } from '@/services/telemedicine.service';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Camera,
  CameraOff,
  Check,
  Maximize,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  PhoneOff,
  Settings2,
  Video,
  X,
} from 'lucide-react';

type JitsiApi = {
  addEventListener: (
    event: string,
    callback: (payload?: any) => void
  ) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  dispose: () => void;
};

type JitsiConstructor = new (
  domain: string,
  options: Record<string, any>
) => JitsiApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiConstructor;
  }
}

const apiScriptPromises: Partial<Record<string, Promise<void>>> = {};

function loadJitsiApi(domain: string): Promise<void> {
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve();
  }

  const pending = apiScriptPromises[domain];
  if (pending) {
    return pending;
  }

  apiScriptPromises[domain] = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-jitsi-domain="${domain}"]`
    );

    if (existing) {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Could not load the video-call interface.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.dataset.jitsiDomain = domain;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          'Could not load Jitsi. Check your connection or meeting server.'
        )
      );

    document.head.appendChild(script);
  }).catch((error: unknown) => {
    delete apiScriptPromises[domain];
    throw error;
  });

  return apiScriptPromises[domain];
}

interface JitsiMeetingEmbedProps {
  sessionId: string;
  displayName: string;
  voiceOnly?: boolean;
  recordCallSummary?: boolean;
  onJoined?: () => void;
  onLeft?: () => void;
  onClose: () => void;
  compact?: boolean;
}

export default function JitsiMeetingEmbed({
  sessionId,
  displayName,
  voiceOnly = false,
  recordCallSummary = false,
  onJoined,
  onLeft,
  onClose,
  compact = false,
}: JitsiMeetingEmbedProps) {
  const account = useAuthStore((state) => state.account);
  const userTypeRef = useRef(account?.userType);
  userTypeRef.current = account?.userType;
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const onJoinedRef = useRef(onJoined);
  const onLeftRef = useRef(onLeft);
  const onCloseRef = useRef(onClose);
  const displayNameRef = useRef(displayName);
  const recordCallSummaryRef = useRef(recordCallSummary);
  const joinedAtRef = useRef<number | null>(null);
  const callIdRef = useRef('');
  const summarySentRef = useRef(false);
  const remoteParticipantsRef = useRef<Set<string>>(new Set());
  const maxParticipantCountRef = useRef(1);
  const summaryPromiseRef = useRef<Promise<void> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(voiceOnly);
  const [joined, setJoined] = useState(false);
  const [roomName, setRoomName] = useState('');

  onJoinedRef.current = onJoined;
  onLeftRef.current = onLeft;
  onCloseRef.current = onClose;
  displayNameRef.current = displayName;
  recordCallSummaryRef.current = recordCallSummary;

  const saveCallSummary = () => {
    if (!recordCallSummaryRef.current || summarySentRef.current || !callIdRef.current) {
      return summaryPromiseRef.current || Promise.resolve();
    }

    // Record even a call attempt that ended before the local user finished
    // joining Jitsi. Otherwise the chat would remain stuck on "Calling…".
    // Set the guard synchronously so leave/close events cannot create duplicates.
    summarySentRef.current = true;
    const joinedAt = joinedAtRef.current;
    const durationSeconds = joinedAt
      ? Math.max(0, Math.floor((Date.now() - joinedAt) / 1000))
      : 0;
    const participantCount = maxParticipantCountRef.current >= 2
      ? maxParticipantCountRef.current
      : 0;
    summaryPromiseRef.current = telemedicineService
      .recordCallSummary(sessionId, {
        callId: callIdRef.current,
        durationSeconds,
        participantCount,
        missedCall: maxParticipantCountRef.current < 2,
      })
      .then(() => undefined)
      .catch((cause) => {
        // Do not interrupt ending the call if saving its history fails.
        console.error('Unable to save telemedicine call summary:', cause);
      });
    return summaryPromiseRef.current;
  };

  useEffect(() => {
    let cancelled = false;
    let api: JitsiApi | null = null;
    let loadingTimeout: number | undefined;
    let callStateTimer: number | undefined;
    let missedCallTimeout: number | undefined;

    async function start() {
      setLoading(true);
      setError('');
      setRoomName('');
      setJoined(false);
      joinedAtRef.current = null;
      callIdRef.current = '';
      summarySentRef.current = false;
      remoteParticipantsRef.current = new Set();
      maxParticipantCountRef.current = 1;
      summaryPromiseRef.current = null;

      try {
        // Publish the ringing state before the meeting fully loads so the other
        // participant can see a banner and a Calling… item in the chat.
        const requestedCallId = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        callIdRef.current = requestedCallId;
        try {
          const callSession = await telemedicineService.markCallStarted(sessionId, requestedCallId);
          if (callSession.activeCallId) callIdRef.current = callSession.activeCallId;

          const isCaller = Boolean(callSession.callInitiatorType && callSession.callInitiatorType === userTypeRef.current);
          if (isCaller) {
            const callStartedMs = new Date(callSession.callStartedAt || Date.now()).getTime();
            callStateTimer = window.setInterval(() => {
              void telemedicineService.getSessions().then((result) => {
                if (cancelled) return;
                const latest = (result.sessions || []).find((item) => item._id === sessionId);
                if (!latest || latest.activeCallId !== callIdRef.current) return;
                if (latest.callAcceptedAt) {
                  if (missedCallTimeout) {
                    window.clearTimeout(missedCallTimeout);
                    missedCallTimeout = undefined;
                  }
                }
                const endedAt = latest.callEndedAt ? new Date(latest.callEndedAt).getTime() : 0;
                const startedAt = latest.callStartedAt ? new Date(latest.callStartedAt).getTime() : callStartedMs;
                if (endedAt && endedAt >= startedAt) {
                  if (callStateTimer) window.clearInterval(callStateTimer);
                  callStateTimer = undefined;
                  if (!summarySentRef.current) void saveCallSummary();
                  try { apiRef.current?.executeCommand('hangup'); } catch { /* already closed */ }
                  onCloseRef.current();
                }
              }).catch(() => undefined);
            }, 2500);

            missedCallTimeout = window.setTimeout(() => {
              void telemedicineService.getSessions().then((result) => {
                if (cancelled || summarySentRef.current) return;
                const latest = (result.sessions || []).find((item) => item._id === sessionId);
                if (!latest || latest.activeCallId !== callIdRef.current || latest.callAcceptedAt) return;
                const endedAt = latest.callEndedAt ? new Date(latest.callEndedAt).getTime() : 0;
                const startedAt = latest.callStartedAt ? new Date(latest.callStartedAt).getTime() : callStartedMs;
                if (endedAt && endedAt >= startedAt) return;
                // Nobody answered within 30 seconds. Save a missed-call event and stop ringing.
                void telemedicineService.recordCallSummary(sessionId, {
                  callId: callIdRef.current,
                  durationSeconds: 0,
                  participantCount: 0,
                  missedCall: true,
                }).catch(() => undefined).finally(() => {
                  if (cancelled) return;
                  summarySentRef.current = true;
                  try { apiRef.current?.executeCommand('hangup'); } catch { /* already closed */ }
                  onCloseRef.current();
                });
              }).catch(() => undefined);
            }, Math.max(0, 30_000 - (Date.now() - callStartedMs)));
          }
        } catch (callStartError) {
          // Call activity logging is auxiliary; do not block joining the meeting.
          // The service already normalizes a duplicate sessionId record.
          console.warn('Unable to publish telemedicine call start; continuing into the meeting.', callStartError);
        }

        const credentials =
          await telemedicineService.getMeetingToken(sessionId);

        if (cancelled) return;

        if (!credentials?.jwt || !credentials.roomName) {
          throw new Error(
            'The video-call server returned incomplete meeting credentials.'
          );
        }

        const domain = credentials.domain || '8x8.vc';

        setRoomName(credentials.roomName);

        await loadJitsiApi(domain);

        const JitsiAPI = window.JitsiMeetExternalAPI;

        if (cancelled || !hostRef.current) return;

        if (!JitsiAPI) {
          throw new Error(
            'The JaaS meeting interface could not initialize.'
          );
        }

        const meeting = new JitsiAPI(domain, {
          roomName: credentials.roomName,
          jwt: credentials.jwt,
          parentNode: hostRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            // Read the latest display name without re-creating the meeting when auth hydrates.
            displayName: displayNameRef.current,
          },
          configOverwrite: {
            // Resume automatically after a page reload instead of showing Jitsi's
            // pre-join screen again. Credentials are freshly fetched for this session.
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: voiceOnly,
            disableVideo: voiceOnly,
            disableDeepLinking: true,
            toolbarButtons: [],
            hideConferenceSubject: true,
            disableInviteFunctions: true,
            backgroundColor: '#f3faf8',
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            TOOLBAR_BUTTONS: [],
            SETTINGS_SECTIONS: [],
            DEFAULT_BACKGROUND: '#f3faf8',
            DEFAULT_REMOTE_DISPLAY_NAME: 'MedXVerse participant',
          },
        });

        api = meeting;
        apiRef.current = meeting;

        meeting.addEventListener('videoConferenceJoined', () => {
          if (cancelled || joinedAtRef.current !== null) return;

          joinedAtRef.current = Date.now();
          if (!callIdRef.current) callIdRef.current = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          summarySentRef.current = false;
          maxParticipantCountRef.current = Math.max(1, remoteParticipantsRef.current.size + 1);
          setJoined(true);
          setLoading(false);
          onJoinedRef.current?.();
        });

        meeting.addEventListener('participantJoined', (event) => {
          const participantId = String(event?.id || event?.participant?.id || '');
          if (participantId) remoteParticipantsRef.current.add(participantId);
          maxParticipantCountRef.current = Math.max(
            maxParticipantCountRef.current,
            remoteParticipantsRef.current.size + (joinedAtRef.current ? 1 : 0),
          );
        });

        meeting.addEventListener('participantLeft', (event) => {
          const participantId = String(event?.id || event?.participant?.id || '');
          if (participantId) remoteParticipantsRef.current.delete(participantId);
        });

        meeting.addEventListener('videoConferenceLeft', () => {
          if (cancelled) return;

          void saveCallSummary();
          setJoined(false);
          onLeftRef.current?.();
        });

        meeting.addEventListener('readyToClose', () => {
          if (!cancelled) {
            onCloseRef.current();
          }
        });

        meeting.addEventListener('audioMuteStatusChanged', (event) => {
          if (typeof event?.muted === 'boolean') {
            setAudioMuted(event.muted);
          }
        });

        meeting.addEventListener('videoMuteStatusChanged', (event) => {
          if (typeof event?.muted === 'boolean') {
            setVideoMuted(event.muted);
          }
        });

        loadingTimeout = window.setTimeout(() => {
          if (!cancelled) {
            setLoading(false);
          }
        }, 1800);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to open the video call.'
          );
          setLoading(false);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      // Unmount/cleanup is not evidence that a participant ended the call.
      // Save summaries only from explicit hang-up / Jitsi leave / missed-call handlers.

      if (loadingTimeout) {
        window.clearTimeout(loadingTimeout);
      }
      if (callStateTimer) window.clearInterval(callStateTimer);
      if (missedCallTimeout) window.clearTimeout(missedCallTimeout);

      try {
        api?.dispose();
      } catch {
        // The meeting may already have been disposed.
      }

      if (apiRef.current === api) {
        apiRef.current = null;
      }
    };
  // Keep the same Jitsi instance when account hydration updates the name or
  // staff/patient summary preference; rejoining here can briefly show duplicate participants.
  }, [sessionId, voiceOnly]);

  const execute = (command: string) => {
    try {
      apiRef.current?.executeCommand(command);
    } catch {
      setError('That call control is not available right now.');
    }
  };

  const endCall = async () => {
    // Save the history before navigating away. The Jitsi leave event uses the
    // same guarded function, so both paths are safe.
    await saveCallSummary();
    try {
      apiRef.current?.executeCommand('hangup');
    } finally {
      onCloseRef.current();
    }
  };

  useEffect(() => {
    const handleExternalHangUp = () => { void endCall(); };
    window.addEventListener('medxverse:hangup-call', handleExternalHangUp);
    return () => window.removeEventListener('medxverse:hangup-call', handleExternalHangUp);
    // The callback intentionally uses the latest refs and active API for this mounted call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const controlClass =
    `flex items-center justify-center rounded-full border border-[#b9ded3] bg-white text-[#1b7b68] shadow-sm transition hover:bg-[#eaf6f2] focus:outline-none focus:ring-2 focus:ring-[#1b7b68] ${compact ? 'h-10 w-10' : 'h-11 w-11'}`;

  const dangerClass =
    `flex items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 ${compact ? 'h-10 min-w-0 px-3' : 'h-11 px-5'}`;

  return (
    <section
      className={`overflow-hidden border border-[#b9ded3]/70 bg-white/45 shadow-xl backdrop-blur-md ${compact ? 'rounded-2xl' : 'rounded-2xl'}`}
      aria-label={voiceOnly ? "MedXVerse voice consultation" : "MedXVerse video consultation"}
    >
      <header className={`flex items-center justify-between gap-3 border-b border-[#d6ebe5] bg-white/40 text-[#174f45] backdrop-blur-md ${compact ? 'px-4 py-3' : 'px-4 py-3 sm:px-5'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex shrink-0 items-center justify-center rounded-xl bg-[#e5f5f0] text-[#1b7b68] ${compact ? 'h-7 w-7' : 'h-9 w-9'}`}>
            {voiceOnly ? <Phone className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </div>

          <div className="min-w-0">
            <p className={`${compact ? 'text-xs' : 'text-sm'} truncate font-bold`}>
              MedXVerse Care
            </p>
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} truncate text-slate-500`}>
              {joined
                ? 'Connected to consultation'
                : 'Private video consultation'}
            </p>
          </div>

          <span className="hidden rounded-full bg-[#e5f5f0] px-2.5 py-1 text-[10px] font-semibold text-[#1b7b68] sm:inline-flex">
            <Check className="mr-1 h-3 w-3" />
            Secure session
          </span>
        </div>

        {/* <button
          type="button"
          onClick={() => void endCall()}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg text-xs font-semibold transition focus:outline-none focus:ring-2 ${compact ? 'bg-red-600 px-3 py-2 text-white hover:bg-red-700 focus:ring-red-300' : 'px-3 py-2 text-[#1b7b68] hover:bg-[#eaf6f2] hover:text-[#174f45] focus:ring-[#1b7b68]'}`}
          aria-label="Close call view"
        >
          <PhoneOff className="h-4 w-4" />
          {compact ? 'Hang up' : 'Close'}
        </button> */}
      </header>

      <div className={`relative bg-white/20 ${compact ? 'h-[190px] min-h-[190px]' : 'h-[min(68vh,720px)] min-h-72'}`}>
        <div
          ref={hostRef}
          className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full"
        />

        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 text-sm text-[#174f45] backdrop-blur-xl">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
            <p>Preparing your MedXVerse consultation…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center text-sm text-[#174f45] backdrop-blur-xl">
            <Video className="h-8 w-8 text-rose-400" />
            <p>{error}</p>
            <p className="max-w-lg text-xs text-slate-500">
              Check your JaaS backend configuration and consultation
              access, then close this panel and try again.
            </p>
          </div>
        )}
      </div>

      <footer
  className={
    compact
      ? 'grid grid-cols-4 items-center justify-items-center gap-x-2 gap-y-3 border-t border-[#d6ebe5] bg-white/40 px-4 py-4 text-[#174f45] backdrop-blur-md'
      : 'flex flex-wrap items-center justify-center gap-3 border-t border-[#d6ebe5] bg-white/40 px-4 py-4 text-[#174f45] backdrop-blur-md'
  }
>
  <button
    type="button"
    className={`${controlClass} self-center ${audioMuted ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100' : ''}`}
    onClick={() => execute('toggleAudio')}
    aria-label={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
    title={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
  >
    {audioMuted ? (
      <MicOff className="h-5 w-5 shrink-0" />
    ) : (
      <Mic className="h-5 w-5 shrink-0" />
    )}
  </button>

  {!voiceOnly && (
    <button
      type="button"
      className={`${controlClass} self-center ${videoMuted ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100' : ''}`}
      onClick={() => execute('toggleVideo')}
      aria-label={videoMuted ? 'Turn camera on' : 'Turn camera off'}
      title={videoMuted ? 'Turn camera on' : 'Turn camera off'}
    >
      {videoMuted ? (
        <CameraOff className="h-5 w-5 shrink-0" />
      ) : (
        <Camera className="h-5 w-5 shrink-0" />
      )}
    </button>
  )}

  <button
    type="button"
    className={`${controlClass} self-center`}
    onClick={() => execute('toggleShareScreen')}
    aria-label="Share screen"
    title="Share screen"
  >
    <MonitorUp className="h-5 w-5 shrink-0" />
  </button>

  <button
    type="button"
    className={`${controlClass} self-center`}
    onClick={() => execute('toggleChat')}
    aria-label="Toggle in-call chat"
    title="In-call chat"
  >
    <MessageCircle className="h-5 w-5 shrink-0" />
  </button>

  <button
    type="button"
    className={`${controlClass} self-center`}
    onClick={() => execute('toggleTileView')}
    aria-label="Change video layout"
    title="Change video layout"
  >
    <Settings2 className="h-5 w-5 shrink-0" />
  </button>

  <button
    type="button"
    className={`${controlClass} self-center`}
    onClick={() => execute('toggleFilmStrip')}
    aria-label="Toggle participants view"
    title="Participants view"
  >
    <Maximize className="h-5 w-5 shrink-0" />
  </button>

  <button
    type="button"
    className={`${dangerClass} self-center ${compact ? 'col-span-2 w-full justify-self-stretch gap-1.5 px-2 text-xs' : ''}`}
    onClick={() => void endCall()}
    aria-label="End call"
    title="End call"
  >
    <PhoneOff className="h-4 w-4 shrink-0" />
    <span className="whitespace-nowrap">End call</span>
  </button>
</footer>

      <div className="border-t border-[#e1efeb] bg-white/80 px-4 pb-3 text-center text-[10px] text-slate-500">
        {displayName}
        {roomName ? ` · ${roomName}` : ''}
      </div>
    </section>
  );
}