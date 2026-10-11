'use client';

import { useEffect, useRef, useState } from 'react';
import { telemedicineService } from '@/services/telemedicine.service';
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
}

export default function JitsiMeetingEmbed({
  sessionId,
  displayName,
  voiceOnly = false,
  recordCallSummary = false,
  onJoined,
  onLeft,
  onClose,
}: JitsiMeetingEmbedProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const onJoinedRef = useRef(onJoined);
  const onLeftRef = useRef(onLeft);
  const onCloseRef = useRef(onClose);
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

  const saveCallSummary = () => {
    if (!recordCallSummary || summarySentRef.current || !joinedAtRef.current || !callIdRef.current) {
      return summaryPromiseRef.current || Promise.resolve();
    }

    // Set the guard synchronously so Jitsi's leave/close events cannot create
    // duplicate summaries for the same call.
    summarySentRef.current = true;
    const durationSeconds = Math.max(0, Math.floor((Date.now() - joinedAtRef.current) / 1000));
    const participantCount = Math.max(1, maxParticipantCountRef.current);
    summaryPromiseRef.current = telemedicineService
      .recordCallSummary(sessionId, {
        callId: callIdRef.current,
        durationSeconds,
        participantCount,
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
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;

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
            displayName,
          },
          configOverwrite: {
            prejoinPageEnabled: true,
            startWithAudioMuted: false,
            startWithVideoMuted: voiceOnly,
            disableVideo: voiceOnly,
            disableDeepLinking: true,
            toolbarButtons: [],
            hideConferenceSubject: true,
            disableInviteFunctions: true,
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            TOOLBAR_BUTTONS: [],
            SETTINGS_SECTIONS: [],
          },
        });

        api = meeting;
        apiRef.current = meeting;

        meeting.addEventListener('videoConferenceJoined', () => {
          if (cancelled) return;

          joinedAtRef.current = Date.now();
          callIdRef.current = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

        loadingTimeout = setTimeout(() => {
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
      void saveCallSummary();

      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }

      try {
        api?.dispose();
      } catch {
        // The meeting may already have been disposed.
      }

      if (apiRef.current === api) {
        apiRef.current = null;
      }
    };
  }, [sessionId, displayName, voiceOnly, recordCallSummary]);

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

  const controlClass =
    'flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400';

  const dangerClass =
    'flex h-11 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300';

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-[#07111f] shadow-lg"
      aria-label={voiceOnly ? "MedXVerse voice consultation" : "MedXVerse video consultation"}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0c1929] px-4 py-3 text-white sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            {voiceOnly ? <Phone className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              MedXVerse Care
            </p>
            <p className="truncate text-xs text-slate-400">
              {joined
                ? 'Connected to consultation'
                : 'Private video consultation'}
            </p>
          </div>

          <span className="hidden rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 sm:inline-flex">
            <Check className="mr-1 h-3 w-3" />
            Secure session
          </span>
        </div>

        <button
          type="button"
          onClick={() => void endCall()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Close call view"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </header>

      <div className="relative h-[min(62vh,620px)] min-h-72 bg-[#07111f]">
        <div
          ref={hostRef}
          className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full"
        />

        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#07111f] text-sm text-white">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
            <p>Preparing your MedXVerse consultation…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#07111f] px-6 text-center text-sm text-white">
            <Video className="h-8 w-8 text-rose-400" />
            <p>{error}</p>
            <p className="max-w-lg text-xs text-slate-400">
              Check your JaaS backend configuration and consultation
              access, then close this panel and try again.
            </p>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-[#0c1929] px-4 py-4 text-white">
        <button
          type="button"
          className={`${controlClass} ${audioMuted ? 'bg-rose-600 hover:bg-rose-700' : ''}`}
          onClick={() => execute('toggleAudio')}
          aria-label={
            audioMuted ? 'Unmute microphone' : 'Mute microphone'
          }
          title={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {audioMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>

        {!voiceOnly && (
          <button
            type="button"
            className={`${controlClass} ${videoMuted ? 'bg-rose-600 hover:bg-rose-700' : ''}`}
            onClick={() => execute('toggleVideo')}
            aria-label={videoMuted ? 'Turn camera on' : 'Turn camera off'}
            title={videoMuted ? 'Turn camera on' : 'Turn camera off'}
          >
            {videoMuted ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
          </button>
        )}

        <button
          type="button"
          className={controlClass}
          onClick={() => execute('toggleShareScreen')}
          aria-label="Share screen"
          title="Share screen"
        >
          <MonitorUp className="h-5 w-5" />
        </button>

        <button
          type="button"
          className={controlClass}
          onClick={() => execute('toggleChat')}
          aria-label="Toggle in-call chat"
          title="In-call chat"
        >
          <MessageCircle className="h-5 w-5" />
        </button>

        <button
          type="button"
          className={controlClass}
          onClick={() => execute('toggleTileView')}
          aria-label="Change video layout"
          title="Change video layout"
        >
          <Settings2 className="h-5 w-5" />
        </button>

        <button
          type="button"
          className={controlClass}
          onClick={() => execute('toggleFilmStrip')}
          aria-label="Toggle participants view"
          title="Participants view"
        >
          <Maximize className="h-5 w-5" />
        </button>

        <button
          type="button"
          className={dangerClass}
          onClick={endCall}
        >
          <PhoneOff className="h-4 w-4" />
          End call
        </button>
      </footer>

      <div className="border-t border-white/5 bg-[#0c1929] px-4 pb-3 text-center text-[10px] text-slate-500">
        {displayName}
        {roomName ? ` · ${roomName}` : ''}
      </div>
    </section>
  );
}