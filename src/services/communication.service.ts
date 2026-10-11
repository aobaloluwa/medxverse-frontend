import { apiClient } from '@/lib/api-client';

import {
  CommunicationPatient,
  Conversation,
  Department,
  InboxResponse,
  Message,
  MessagesResponse,
  PresenceStatus,
  StaffSearchResult,
  Ticket,
} from '@/types/communication';

export const communicationService = {
  getInbox: async (
    page = 1,
    limit = 30
  ): Promise<InboxResponse> => {
    const response = await apiClient.get('/communication/inbox', {
      params: { page, limit },
    });

    return response.data;
  },

  setPresence: async (status: PresenceStatus) => {
    const response = await apiClient.patch('/communication/presence', {
      status,
    });

    return response.data;
  },

  getMyPatients: async (search = ''): Promise<any[]> => {
    const response = await apiClient.get('/communication/my-patients', {
      params: search.trim() ? { q: search.trim() } : undefined,
    });

    return response.data;
  },

  searchStaff: async (
    search: string
  ): Promise<StaffSearchResult[]> => {
    const response = await apiClient.get('/communication/staff/search', {
      params: {
        q: search.trim(),
        limit: 30,
      },
    });

    return response.data;
  },

  searchMessages: async (search: string): Promise<Message[]> => {
    const response = await apiClient.get('/communication/messages/search', {
      params: {
        q: search.trim(),
        limit: 50,
      },
    });

    return response.data;
  },

  createDirectConversation: async (
    targetUserId: string
  ): Promise<Conversation> => {
    const response = await apiClient.post(
      '/communication/conversations/direct',
      {
        targetUserId,
      }
    );

    return response.data;
  },

  createGroupConversation: async (
    title: string,
    memberIds: string[]
  ): Promise<Conversation> => {
    const response = await apiClient.post(
      '/communication/conversations/group',
      {
        title,
        memberIds,
      }
    );

    return response.data;
  },

  createPatientCareConversation: async (
    patientId: string,
    memberIds: string[],
    title?: string
  ): Promise<Conversation> => {
    const response = await apiClient.post(
      '/communication/conversations/patient',
      {
        patientId,
        memberIds,
        ...(title?.trim() ? { title: title.trim() } : {}),
      }
    );

    return response.data;
  },

  getConversation: async (
    conversationId: string
  ): Promise<Conversation> => {
    const response = await apiClient.get(
      `/communication/conversations/${encodeURIComponent(
        conversationId
      )}`
    );

    return response.data;
  },

  getMessages: async (
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<MessagesResponse> => {
    const response = await apiClient.get(
      `/communication/conversations/${encodeURIComponent(
        conversationId
      )}/messages`,
      {
        params: {
          page,
          limit,
        },
      }
    );

    return response.data;
  },

  uploadAttachment: async (conversationId: string, file: File): Promise<{
    url: string; name: string; mimeType: string; size: number; publicId?: string;
  }> => {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post(
      `/communication/conversations/${encodeURIComponent(conversationId)}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  sendMessage: async (
    conversationId: string,
    body: string,
    attachments: Array<{ url: string; name: string; mimeType: string; size?: number }> = [],
  ): Promise<Message> => {
    const response = await apiClient.post(
      `/communication/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        body,
        type: attachments.length ? (attachments[0].mimeType.startsWith('image/') ? 'IMAGE' : 'FILE') : 'TEXT',
        attachments,
      }
    );

    return response.data;
  },

  markRead: async (conversationId: string) => {
    const response = await apiClient.post(
      `/communication/conversations/${encodeURIComponent(
        conversationId
      )}/read`
    );

    return response.data;
  },

  getDepartments: async (): Promise<Department[]> => {
    const response = await apiClient.get('/communication/departments');

    return response.data;
  },

  createDepartmentConversation: async (
    departmentId: string,
    title?: string
  ): Promise<Conversation> => {
    const response = await apiClient.post(
      '/communication/conversations/department',
      {
        departmentId,
        ...(title?.trim() ? { title: title.trim() } : {}),
      }
    );

    return response.data;
  },

  joinDepartmentConversation: async (
    conversationId: string
  ): Promise<Conversation> => {
    const response = await apiClient.post(
      `/communication/conversations/${encodeURIComponent(
        conversationId
      )}/join`
    );

    return response.data;
  },

  getTickets: async (
    filters?: Record<string, string>
  ): Promise<Ticket[]> => {
    const response = await apiClient.get('/communication/tickets', {
      params: filters,
    });

    return response.data;
  },

  createTicket: async (
    input: Record<string, unknown>
  ): Promise<Ticket> => {
    const response = await apiClient.post(
      '/communication/tickets',
      input
    );

    return response.data;
  },

  updateTicket: async (
    ticketId: string,
    input: Record<string, unknown>
  ): Promise<Ticket> => {
    const response = await apiClient.patch(
      `/communication/tickets/${encodeURIComponent(ticketId)}`,
      input
    );

    return response.data;
  },

  getPatientFromMyPatientItem: (
    item: any
  ): CommunicationPatient | undefined => {
    return item?.patient;
  },
};

export function getCommunicationWebSocketUrl(
  token: string
): string {
  const configuredApiUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    'https://medxverse-backend.onrender.com/api/v1'
  ).trim();

  // NEXT_PUBLIC_API_URL is the REST API base,
  // normally ending in /api/v1.
  // WebSockets are mounted at the server root,
  // so remove only that API suffix.
  const apiUrl = configuredApiUrl.replace(/\/+$/, '');

  const serverOrigin = apiUrl
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/^https:/i, 'wss:')
    .replace(/^http:/i, 'ws:');

  return `${serverOrigin}/ws/communication?token=${encodeURIComponent(
    token.trim()
  )}`;
}