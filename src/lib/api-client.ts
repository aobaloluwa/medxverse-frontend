import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

import { useAuthStore } from '@/store/useAuthStore';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://medxverse-backend.onrender.com/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const AUTH_ROUTES_THAT_MUST_NOT_REDIRECT = [
  '/auth/login',
  '/auth/register',
  '/auth/staff/login',
  '/auth/staff/invitation',
  '/portal/login',
  '/portal/register',
  '/portal/call',
  '/staff/call',
  '/portal/emergency',
  '/portal/telemedicine',
  '/medxrescue',
  '/telemedicine',
];

const isExemptRequest = (url?: string) => {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (AUTH_ROUTES_THAT_MUST_NOT_REDIRECT.some((route) => currentPath.includes(route))) {
      return true;
    }
  }
  if (!url) return false;
  return (
    AUTH_ROUTES_THAT_MUST_NOT_REDIRECT.some((route) => url.includes(route)) ||
    url.includes('/medxrescue') ||
    url.includes('/telemedicine') ||
    url.includes('/incidents') ||
    url.includes('/call')
  );
};

const handleExpiredSession = (requestUrl?: string) => {
  if (typeof window === 'undefined') return;

  // Never redirect call pages, emergency routes, or active call windows to login!
  if (isExemptRequest(requestUrl)) return;

  useAuthStore.getState().logout();

  const currentPath = `${window.location.pathname}${window.location.search}`;

  window.location.replace(
    `/auth/login?redirect=${encodeURIComponent(currentPath)}`
  );
};

// Request Interceptor: Attach the latest auth token.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = useAuthStore.getState().token || localStorage.getItem('token');

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle global API errors and expired sessions.
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url;

    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      !isExemptRequest(requestUrl)
    ) {
      handleExpiredSession(requestUrl);
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(message));
  }
);

