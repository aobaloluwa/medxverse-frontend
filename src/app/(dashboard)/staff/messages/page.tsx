'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  ArrowDown,
  Check,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  UserPlus,
  Users,
  X,
  Video,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { communicationService } from '@/services/communication.service';
import ChatAttachmentViewer from '@/components/chat/ChatAttachmentViewer';

import {
  communicationSocketManager,
  type CommunicationSocketEvent,
} from '@/services/communication.socket';
import {
  Conversation,
  Department,
  Message,
  StaffSearchResult,
} from '@/types/communication';



function idOf(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') return value;

  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as any)._id);
  }

  return String(value);
}

function conversationLabel(
  conversation: Conversation,
  currentUserId = '',
): string {
  if (conversation.title) return conversation.title;

  if (conversation.type === 'DIRECT') {
    const other = (conversation.participants || []).find((participant) => {
      const userId = idOf(participant.userId);
      return userId && userId !== currentUserId;
    });

    if (other?.displayName) return other.displayName;

    if (other?.staff) {
      const name = `${other.staff.firstName || ''} ${other.staff.lastName || ''}`.trim();

      if (name) return name;
    }

    const user =
      typeof other?.userId === 'object' ? other.userId : undefined;

    if (user?.email) return user.email;
  }

  if (conversation.type === 'PATIENT_CARE') {
    const patient =
      typeof conversation.patientId === 'object'
        ? conversation.patientId
        : undefined;

    if (patient) {
      return (
        `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
        'Patient care team'
      );
    }

    return 'Patient care team';
  }

  if (conversation.type === 'DEPARTMENT') {
    return typeof conversation.departmentId === 'object'
      ? conversation.departmentId.name || 'Department'
      : 'Department channel';
  }

  return 'Direct conversation';
}

function formatTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function avatarLetters(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'C'
  );
}

export default function StaffMessagesPage() {
  const { account, token } = useAuthStore();

  const currentUserId = account?.userId || account?.id || account?._id || '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [draft, setDraft] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [search, setSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffResults, setStaffResults] = useState<StaffSearchResult[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatMode, setNewChatMode] = useState<
    'DIRECT' | 'GROUP' | 'PATIENT' | 'DEPARTMENT'
  >('DIRECT');
  const [searchingStaff, setSearchingStaff] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<
    'connecting' | 'connected' | 'offline'
  >('offline');

  const socketConnectedRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const previousMessageIdsRef = useRef<Set<string>>(new Set());
  const [newMessageCount, setNewMessageCount] = useState(0);

  const filteredConversations = useMemo(() => {
    // Sort by the most recent conversation activity before applying search.
    // API responses are not guaranteed to arrive in newest-first order.
    const newestFirst = [...conversations].sort((a, b) => {
      const activityTime = (item: Conversation) => {
        const raw = item.lastMessageAt || (item as any).lastMessage?.sentAt || (item as any).lastMessage?.createdAt;
        // Do not fall back to conversation creation/update time: those are not chat activity.
        const time = raw ? new Date(raw).getTime() : 0;
        return Number.isFinite(time) ? time : 0;
      };
      return activityTime(b) - activityTime(a);
    });
    const query = search.trim().toLowerCase();

    if (!query) return newestFirst;

    return newestFirst.filter((conversation) => {
      const label = conversationLabel(
        conversation,
        currentUserId,
      ).toLowerCase();

      const preview = (
        conversation.lastMessagePreview || ''
      ).toLowerCase();

      return label.includes(query) || preview.includes(query);
    });
  }, [conversations, search, currentUserId]);

  const loadInbox = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoadingInbox(true);

    try {
      const result = await communicationService.getInbox();
      const inboxItems = result.items || [];

      // Resolve the actual newest message for every conversation before rendering
      // the list. The inbox response may not include lastMessageAt for older chats,
      // so sorting only the initial response can put an active chat too far down.
      const hydratedItems = await Promise.all(inboxItems.map(async (item) => {
        try {
          const response = await communicationService.getMessages(item._id, 1, 50);
          const messages = Array.isArray(response?.items) ? response.items : [];
          const latestMessage = [...messages].sort((a, b) => {
            const timestamp = (message: typeof a) => {
              const raw = message.createdAt || (message as any).sentAt;
              const value = raw ? new Date(raw).getTime() : 0;
              return Number.isFinite(value) ? value : 0;
            };
            return timestamp(b) - timestamp(a);
          })[0];
          if (!latestMessage) return item;
          const rawTimestamp = latestMessage.createdAt || (latestMessage as any).sentAt;
          return {
            ...item,
            lastMessageAt: rawTimestamp || item.lastMessageAt,
            lastMessagePreview: item.lastMessagePreview || latestMessage.body || '',
          };
        } catch {
          // Keep the inbox usable if one conversation's history cannot be fetched.
          return item;
        }
      }));

      setConversations(hydratedItems);

      // Keep the conversation pane empty until the user chooses a chat.
      // Deep links with ?conversation=... are still opened by the URL effect below.

      setError(null);
    } catch (err: any) {
      setError(
        err?.message || 'Unable to load your conversations.',
      );
    } finally {
      if (showSpinner) setLoadingInbox(false);
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);

    try {
      const [conversation, messageResult] = await Promise.all([
        communicationService.getConversation(conversationId),
        communicationService.getMessages(conversationId),
      ]);

      setSelectedConversation(conversation);
      setMessages(messageResult.items || []);

      await communicationService
        .markRead(conversationId)
        .catch(() => undefined);

      setConversations((current) =>
        current.map((item) =>
          item._id === conversationId
            ? { ...item, unreadCount: 0 }
            : item,
        ),
      );

      setError(null);
    } catch (err: any) {
      setError(
        err?.message || 'Unable to open this conversation.',
      );
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox(true);
  }, [loadInbox]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const conversationId = new URLSearchParams(
      window.location.search,
    ).get('conversation');

    if (conversationId) {
      setSelectedId(conversationId);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    void loadConversation(selectedId);
  }, [loadConversation, selectedId]);

  useEffect(() => {
    setNewMessageCount(0);
    wasAtBottomRef.current = true;
    previousMessageIdsRef.current = new Set();
  }, [selectedId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    if (!wasAtBottomRef.current) return;
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });
  }, [messages]);

  useEffect(() => {
    const previousIds = previousMessageIdsRef.current;
    if (previousIds.size > 0 && !wasAtBottomRef.current) {
      const incomingCount = messages.filter((message) =>
        !previousIds.has(String(message._id)) &&
        !String(message._id).startsWith('local-') &&
        String(message.senderUserId) !== String(currentUserId)
      ).length;
      if (incomingCount > 0) setNewMessageCount((count) => count + incomingCount);
    }
    previousMessageIdsRef.current = new Set(messages.map((message) => String(message._id)));
  }, [messages, currentUserId]);

  /*
   * REAL-TIME WEBSOCKET
   *
   * The socket lifecycle is owned by communicationSocketManager.
   * This page only subscribes to events. React remounts therefore do
   * not create/close the underlying WebSocket connection.
   */
  useEffect(() => {
    if (!token || account?.userType !== 'STAFF') {
      socketConnectedRef.current = false;
      setSocketState('offline');
      return;
    }

    const unsubscribe = communicationSocketManager.subscribe(
      (event: CommunicationSocketEvent) => {
        socketConnectedRef.current =
          event.state === 'connected';
        setSocketState(event.state);

        if (
          event.type === 'conversation.created' &&
          event.payload
        ) {
          const conversation =
            event.payload as Conversation;

          if (!conversation._id) {
            return;
          }

          setConversations((current) => {
            const existingIndex = current.findIndex(
              (item) => item._id === conversation._id,
            );

            if (existingIndex === -1) {
              return [conversation, ...current];
            }

            const next = [...current];
            next[existingIndex] = {
              ...next[existingIndex],
              ...conversation,
            };

            return next;
          });

          return;
        }

        if (
          event.type !== 'message.created' ||
          !event.payload
        ) {
          return;
        }

        const incoming = event.payload as Message;
        const conversationId = String(
          event.conversationId ||
            incoming.conversationId ||
            '',
        );

        if (!conversationId) return;

        const isOpen =
          selectedIdRef.current === conversationId;

        setConversations((current) => {
          const existing = current.find(
            (item) => item._id === conversationId,
          );

          if (!existing) {
            void loadInbox(false);
            return current;
          }

          return current.map((item) =>
            item._id === conversationId
              ? {
                  ...item,
                  lastMessageAt:
                    incoming.createdAt ||
                    new Date().toISOString(),
                  lastMessagePreview:
                    incoming.body || '[message]',
                  unreadCount: isOpen
                    ? 0
                    : (item.unreadCount || 0) + 1,
                }
              : item,
          );
        });

        if (isOpen) {
          setMessages((current) =>
            current.some(
              (message) =>
                message._id === incoming._id,
            )
              ? current
              : [...current, incoming],
          );

          void communicationService
            .markRead(conversationId)
            .catch(() => undefined);
        }
      },
    );

    communicationSocketManager.connect(token);
    socketConnectedRef.current = communicationSocketManager.isConnected();
    setSocketState(
      socketConnectedRef.current ? 'connected' : 'connecting',
    );

    return unsubscribe;
  }, [account?.userType, token, loadInbox]);

  /*
   * HTTP safety-net polling
   *
   * Keep this running even when the WebSocket reports connected. A socket can
   * successfully open while an event is missed or not broadcast to this user.
   * The socket gives immediate updates; polling keeps the inbox reliable.
   */
  useEffect(() => {
    if (!token || account?.userType !== 'STAFF') return;

    const poll = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadInbox(false);

      const conversationId = selectedIdRef.current;
      if (!conversationId) return;

      void communicationService
        .getMessages(conversationId)
        .then((result) => {
          if (selectedIdRef.current !== conversationId) return;

          setMessages((current) => {
            const pending = current.filter(
              (message) => message.conversationId === conversationId && String(message._id).startsWith('local-'),
            );
            const merged = [...(result.items || [])];

            for (const item of pending) {
              if (!merged.some((message) => message._id === item._id)) {
                merged.push(item);
              }
            }

            return merged;
          });
        })
        .catch(() => undefined);
    }, 10000);

    return () => window.clearInterval(poll);
  }, [account?.userType, loadInbox, token]);

  useEffect(() => {
    if (!showNewChat) return;

    if (newChatMode === 'DEPARTMENT') {
      void communicationService
        .getDepartments()
        .then(setDepartmentOptions)
        .catch(() => setDepartmentOptions([]));
    }
  }, [newChatMode, showNewChat]);

  const searchForStaff = async (value: string) => {
    setStaffSearch(value);

    if (value.trim().length < 2) {
      setStaffResults([]);
      return;
    }

    setSearchingStaff(true);

    try {
      setStaffResults(
        await communicationService.searchStaff(value),
      );
    } catch {
      setStaffResults([]);
    } finally {
      setSearchingStaff(false);
    }
  };

  const openCreatedConversation = (
    conversation: Conversation,
  ) => {
    setConversations((current) => [
      conversation,
      ...current.filter(
        (item) => item._id !== conversation._id,
      ),
    ]);

    setSelectedId(conversation._id);
    setShowNewChat(false);
    setStaffSearch('');
    setStaffResults([]);
    setSelectedMembers([]);
    setGroupTitle('');
    setSelectedPatientId('');
    setSelectedDepartmentId('');
  };

  const startDirectChat = async (
    staff: StaffSearchResult,
  ) => {
    if (!staff.id) return;

    setCreatingChat(true);
    setError(null);

    try {
      const conversation =
        await communicationService.createDirectConversation(
          staff.id,
        );

      openCreatedConversation(conversation);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to start the conversation.',
      );
    } finally {
      setCreatingChat(false);
    }
  };

  const createSelectedConversation = async () => {
    setCreatingChat(true);
    setError(null);

    try {
      if (newChatMode === 'GROUP') {
        if (
          !groupTitle.trim() ||
          selectedMembers.length === 0
        ) {
          throw new Error(
            'Enter a group name and select at least one staff member.',
          );
        }

        const conversation =
          await communicationService.createGroupConversation(
            groupTitle,
            selectedMembers,
          );

        openCreatedConversation(conversation);
      } else if (newChatMode === 'PATIENT') {
        if (
          !selectedPatientId ||
          selectedMembers.length === 0
        ) {
          throw new Error(
            'Select a patient and at least one care-team member.',
          );
        }

        const patient = patientOptions.find(
          (item) =>
            idOf(
              item.patient?._id ||
                item.patient?.id,
            ) === selectedPatientId,
        )?.patient;

        const title = patient
          ? `${patient.firstName || ''} ${
              patient.lastName || ''
            } Care Team`.trim()
          : undefined;

        const conversation =
          await communicationService.createPatientCareConversation(
            selectedPatientId,
            selectedMembers,
            title,
          );

        openCreatedConversation(conversation);
      } else if (newChatMode === 'DEPARTMENT') {
        if (!selectedDepartmentId) {
          throw new Error('Select a department.');
        }

        const conversation =
          await communicationService.createDepartmentConversation(
            selectedDepartmentId,
          );

        openCreatedConversation(conversation);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to create the conversation.',
      );
    } finally {
      setCreatingChat(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    const fileToSend = attachmentFile;

    if (
      (!body && !fileToSend) ||
      !selectedId ||
      sending ||
      sendingRef.current
    ) {
      return;
    }

    if (fileToSend && fileToSend.size > 10 * 1024 * 1024) {
      setError('Attachments must be 10 MB or smaller.');
      return;
    }

    sendingRef.current = true;

    const conversationId = selectedId;

    const optimisticId = `local-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const optimisticMessage: Message = {
      _id: optimisticId,
      conversationId,
      senderType: 'STAFF',
      senderUserId: currentUserId,
      body,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
      readBy: currentUserId
        ? [
            {
              userId: currentUserId,
              readAt: new Date().toISOString(),
            },
          ]
        : [],
    };

    setError(null);
    setDraft('');
    setAttachmentFile(null);

    setMessages((current) => [
      ...current,
      optimisticMessage,
    ]);

    setConversations((current) =>
      current.map((item) =>
        item._id === conversationId
          ? {
              ...item,
              lastMessageAt:
                optimisticMessage.createdAt,
              lastMessagePreview: body,
            }
          : item,
      ),
    );

    setSending(true);

    try {
      let uploadedAttachment: { url: string; name: string; mimeType: string; size: number } | undefined;
      if (fileToSend) {
        setUploadingAttachment(true);
        uploadedAttachment = await communicationService.uploadAttachment(conversationId, fileToSend);
      }

      const message =
        await communicationService.sendMessage(
          conversationId,
          body || (uploadedAttachment ? uploadedAttachment.name : ''),
          uploadedAttachment ? [uploadedAttachment] : [],
        );

      setMessages((current) =>
        current.map((item) =>
          item._id === optimisticId
            ? message
            : item,
        ),
      );

      setConversations((current) =>
        current.map((item) =>
          item._id === conversationId
            ? {
                ...item,
                lastMessageAt:
                  message.createdAt ||
                  optimisticMessage.createdAt,
                lastMessagePreview:
                  message.body || body,
              }
            : item,
        ),
      );
    } catch (err: any) {
      setMessages((current) =>
        current.filter(
          (item) => item._id !== optimisticId,
        ),
      );

      setConversations((current) =>
        current.map((item) =>
          item._id === conversationId
            ? {
                ...item,
                lastMessagePreview:
                  'Message failed to send',
              }
            : item,
        ),
      );

      setDraft(body);
      if (fileToSend) setAttachmentFile(fileToSend);

      setError(
        err?.message ||
          'Unable to send your message.',
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
      setUploadingAttachment(false);
    }
  };

  const onComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="relative h-[calc(100dvh-6rem)] max-h-none min-h-[500px] md:h-[calc(100vh-6rem)] overflow-hidden overscroll-none rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="grid h-full grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)_240px]">
        <aside
          className={`${
            selectedId
              ? 'hidden md:flex'
              : 'flex'
          } min-h-0 flex-col border-r border-slate-100 bg-white`}
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">
                  Communication centre
                </p>

                <h1 className="mt-1 text-lg font-bold text-slate-800">
                  Messages
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/staff/messages/consultations"
                  className="flex h-9 items-center gap-2 rounded-xl border border-[#cce8e2] bg-[#f0faf7] px-3 text-[10px] font-bold text-[#176c5c] transition hover:bg-[#e3f5ef]"
                  title="Open patient consultations"
                >
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Patient care</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowNewChat(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b7b68] text-white shadow-sm transition hover:bg-[#176c5c]"
                  aria-label="New conversation"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search conversations"
                className="h-10 w-full rounded-xl border border-slate-100 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68] focus:bg-white"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-none">
            {loadingInbox ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />
              </div>
            ) : filteredConversations.length ? (
              filteredConversations.map(
                (conversation) => {
                  const label = conversationLabel(
                    conversation,
                    currentUserId,
                  );

                  const active =
                    selectedId ===
                    conversation._id;

                  return (
                    <button
                      key={conversation._id}
                      type="button"
                      onClick={() =>
                        setSelectedId(
                          conversation._id,
                        )
                      }
                      className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                        active
                          ? 'bg-[#e8f5f3]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          active
                            ? 'bg-[#1b7b68] text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {avatarLetters(label)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-bold text-slate-800">
                            {label}
                          </p>

                          <span className="shrink-0 text-[9px] text-slate-400">
                            {formatTime(
                              conversation.lastMessageAt,
                            )}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[10px] text-slate-400">
                          {conversation.lastMessagePreview ||
                            'No messages yet'}
                        </p>
                      </div>

                      {!!conversation.unreadCount && (
                        <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b7b68] px-1.5 text-[9px] font-bold text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                },
              )
            ) : (
              <div className="p-5 text-center">
                <MessageCircle className="mx-auto h-7 w-7 text-slate-200" />

                <p className="mt-3 text-xs font-semibold text-slate-600">
                  No conversations yet
                </p>

                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  Start a secure conversation with
                  another member of your hospital.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowNewChat(true)
                  }
                  className="mt-4 rounded-xl bg-[#1b7b68] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
                >
                  Start chat
                </button>
              </div>
            )}
          </div>
        </aside>

        <section
          className={`${
            selectedId
              ? 'flex'
              : 'hidden md:flex'
          } min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]`}
        >
          {selectedConversation ? (
            <>
              <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId(null)
                    }
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 md:hidden"
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">
                    {avatarLetters(
                      conversationLabel(
                        selectedConversation,
                        currentUserId,
                      ),
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-slate-800">
                      {conversationLabel(
                        selectedConversation,
                        currentUserId,
                      )}
                    </h2>

                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-slate-400">
                      {selectedConversation.type.replace(
                        '_',
                        ' ',
                      )}{' '}
                      ·{' '}
                      {socketState === 'connected'
                        ? 'Real-time connected'
                        : 'Syncing via secure API'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
                  aria-label="Conversation options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </header>

              {error && (
                <div className="mx-4 mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div
                ref={messagesContainerRef}
                onScroll={(event) => {
                  const el = event.currentTarget;
                  wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                  if (wasAtBottomRef.current) setNewMessageCount(0);
                }}
                className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5"
              >
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1b7b68]" />
                  </div>
                ) : messages.length ? (
                  <div className="mx-auto max-w-3xl space-y-3">
                    {messages.map((message) => {
                      const mine =
                        message.senderUserId ===
                        currentUserId;

                      return (
                        <div
                          key={message._id}
                          className={`flex ${
                            mine
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[92%] rounded-2xl px-3 py-2.5 shadow-sm sm:max-w-[82%] sm:px-4 ${
                              mine
                                ? 'rounded-br-md bg-[#1b7b68] text-white'
                                : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                            }`}
                          >
                            {message.body && (
                              <p className="whitespace-pre-wrap text-sm leading-5">
                                {message.body}
                              </p>
                            )}
                            {(message.attachments || []).map((attachment, index) => (
                              <ChatAttachmentViewer
                                key={`${message._id}-attachment-${index}`}
                                url={attachment.url}
                                name={attachment.name}
                                mimeType={attachment.mimeType}
                                size={attachment.size}
                                mine={mine}
                              />
                            ))}

                            <div
                              className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                                mine
                                  ? 'text-white/60'
                                  : 'text-slate-400'
                              }`}
                            >
                              {formatTime(
                                message.createdAt,
                              )}

                              {mine && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                      <MessageCircle className="h-6 w-6" />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-700">
                      Start the conversation
                    </h3>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                      Messages sent here are scoped
                      to your hospital and delivered
                      to the participants in this
                      conversation.
                    </p>
                  </div>
                )}
                {newMessageCount > 0 && (
                  <div className="sticky bottom-2 z-20 flex justify-center pointer-events-none">
                    <button type="button" onClick={() => { const el = messagesContainerRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); setNewMessageCount(0); }} className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#b8ddd2] bg-white px-4 py-2 text-xs font-bold text-[#176b5b] shadow-lg transition hover:bg-[#eff9f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1b7b68]">
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b7b68] px-1 text-[10px] text-white">{newMessageCount}</span>
                      {newMessageCount === 1 ? '1 new message' : `${newMessageCount} new messages`}
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
                <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#1b7b68] focus-within:bg-white">
                  <textarea
                    value={draft}
                    onChange={(e) =>
                      setDraft(e.target.value)
                    }
                    onKeyDown={onComposerKeyDown}
                    rows={2}
                    placeholder="Write a secure hospital message..."
                    className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />

                  {attachmentFile && (
                    <div className="flex items-center justify-between gap-2 px-2 pb-2 text-xs text-slate-600">
                      <span className="truncate">{attachmentFile.name}</span>
                      <button type="button" onClick={() => setAttachmentFile(null)} className="font-semibold text-rose-600">Remove</button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100">
                        <Paperclip className="h-3.5 w-3.5" />
                        Attach
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            if (file && file.size > 10 * 1024 * 1024) {
                              setError('Attachments must be 10 MB or smaller.');
                              setAttachmentFile(null);
                            } else {
                              setError(null);
                              setAttachmentFile(file);
                            }
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                      {uploadingAttachment && <span className="text-xs text-slate-500">Uploading…</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={
                        (!draft.trim() && !attachmentFile) || sending
                      }
                      className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                <MessageCircle className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-800">
                Your hospital conversations
              </h2>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                Select a conversation from the left,
                or start a new secure conversation
                with a staff member.
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowNewChat(true)
                }
                className="mt-5 flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                New conversation
              </button>
            </div>
          )}
        </section>

        <aside className="hidden min-w-0 max-w-60 border-l border-slate-100 bg-white p-4 lg:block">
          {selectedConversation ? (
            <div className="space-y-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Conversation
                </p>

                <h3 className="mt-1 text-sm font-bold text-slate-800">
                  {conversationLabel(
                    selectedConversation,
                    currentUserId,
                  )}
                </h3>

                <p className="mt-1 text-[10px] text-slate-400">
                  {selectedConversation.priority ||
                    'NORMAL'}{' '}
                  priority
                </p>
              </div>

              {typeof selectedConversation.patientId ===
                'object' &&
                selectedConversation.patientId && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">
                      Patient context
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {
                        selectedConversation
                          .patientId.firstName
                      }{' '}
                      {
                        selectedConversation
                          .patientId.lastName
                      }
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      MRN:{' '}
                      {selectedConversation
                        .patientId.mrn || '—'}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded-lg bg-white p-2">
                        <p className="text-slate-400">
                          Gender
                        </p>

                        <p className="mt-0.5 font-semibold text-slate-700">
                          {selectedConversation
                            .patientId.gender ||
                            '—'}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-2">
                        <p className="text-slate-400">
                          Phone
                        </p>

                        <p className="mt-0.5 font-semibold text-slate-700">
                          {selectedConversation
                            .patientId.phone ||
                            '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Participants
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {selectedConversation
                    .participants?.length || 0}{' '}
                  participant
                  {selectedConversation
                    .participants?.length === 1
                    ? ''
                    : 's'}
                </p>
              </div>
            </div>
          ) : (
            <div className="pt-3 text-center">
              <Users className="mx-auto h-6 w-6 text-slate-200" />

              <p className="mt-2 text-xs font-semibold text-slate-500">
                Conversation context
              </p>

              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                Patient and participant details
                appear here when a conversation is
                selected.
              </p>
            </div>
          )}
        </aside>
      </div>

      {showNewChat && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">
                  New conversation
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-800">
                  Start a hospital conversation
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNewChat(false)
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ['DIRECT', 'Direct'],
                  ['GROUP', 'Group'],
                  ['DEPARTMENT', 'Department'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setNewChatMode(value);
                    setError(null);
                  }}
                  className={`rounded-lg px-2 py-2 text-[9px] font-bold uppercase tracking-wider ${
                    newChatMode === value
                      ? 'bg-white text-[#1b7b68] shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {newChatMode === 'DIRECT' && (
              <>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    autoFocus
                    value={staffSearch}
                    onChange={(e) =>
                      void searchForStaff(
                        e.target.value,
                      )
                    }
                    placeholder="Search staff by name, ID, role, or email"
                    className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#1b7b68]"
                  />
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto">
                  {searchingStaff ? (
                    <div className="flex justify-center p-6">
                      <Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />
                    </div>
                  ) : staffResults.length ? (
                    staffResults.map((staff) => {
                      const name =
                        `${staff.staff?.firstName || ''} ${staff.staff?.lastName || ''}`.trim() ||
                        staff.email;

                      return (
                        <button
                          key={staff.id}
                          type="button"
                          disabled={creatingChat}
                          onClick={() =>
                            void startDirectChat(
                              staff,
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-[#e8f5f3]"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">
                            {avatarLetters(name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-800">
                              {name}
                            </p>

                            <p className="truncate text-[10px] text-slate-400">
                              {staff.role ||
                                staff.staff
                                  ?.jobTitle ||
                                staff.email}
                            </p>
                          </div>

                          <UserPlus className="h-4 w-4 text-slate-300" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-[11px] leading-5 text-slate-400">
                      Enter at least two characters
                      to search staff in your hospital.
                    </div>
                  )}
                </div>
              </>
            )}

            {newChatMode === 'GROUP' && (
              <div className="mt-4 space-y-3">
                <input
                  value={groupTitle}
                  onChange={(e) =>
                    setGroupTitle(e.target.value)
                  }
                  placeholder="Group name"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#1b7b68]"
                />

                <input
                  value={staffSearch}
                  onChange={(e) =>
                    void searchForStaff(
                      e.target.value,
                    )
                  }
                  placeholder="Search staff to add"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#1b7b68]"
                />

                <div className="max-h-44 overflow-y-auto">
                  {staffResults.map((staff) => {
                    const name =
                      `${staff.staff?.firstName || ''} ${staff.staff?.lastName || ''}`.trim() ||
                      staff.email;

                    const selected =
                      selectedMembers.includes(
                        staff.id,
                      );

                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() =>
                          setSelectedMembers(
                            (current) =>
                              selected
                                ? current.filter(
                                    (id) =>
                                      id !==
                                      staff.id,
                                  )
                                : [
                                    ...current,
                                    staff.id,
                                  ],
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${
                          selected
                            ? 'bg-[#e8f5f3]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                          {avatarLetters(name)}
                        </div>

                        <span className="flex-1 text-xs font-semibold text-slate-700">
                          {name}
                        </span>

                        {selected && (
                          <Check className="h-4 w-4 text-[#1b7b68]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={creatingChat}
                  onClick={() =>
                    void createSelectedConversation()
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                >
                  {creatingChat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Create group
                </button>
              </div>
            )}

            {newChatMode === 'DEPARTMENT' && (
              <div className="mt-4 space-y-3">
                <select
                  value={selectedDepartmentId}
                  onChange={(e) =>
                    setSelectedDepartmentId(
                      e.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1b7b68]"
                >
                  <option value="">
                    Select department
                  </option>

                  {departmentOptions.map(
                    (department) => (
                      <option
                        key={department._id}
                        value={department._id}
                      >
                        {department.name} ·{' '}
                        {department.code}
                      </option>
                    ),
                  )}
                </select>

                <p className="rounded-xl bg-slate-50 p-3 text-[10px] leading-4 text-slate-500">
                  Department channels are
                  hospital-scoped. The backend checks
                  your department membership when
                  required.
                </p>

                <button
                  type="button"
                  disabled={creatingChat}
                  onClick={() =>
                    void createSelectedConversation()
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                >
                  {creatingChat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  Open department channel
                </button>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}