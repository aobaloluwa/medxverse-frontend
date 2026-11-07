'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

const LOGIN_PATH = '/auth/login';
const REGISTER_PATH = '/auth/register';

function getTokenExpiration(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(
          (character) =>
            `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`
        )
        .join('')
    );

    const payload = JSON.parse(json) as { exp?: unknown };

    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    // If the token is not a JWT (or is malformed), API 401 handling
    // remains the source of truth.
    return null;
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;

  const pathname = window.location.pathname;
  if (
    pathname === LOGIN_PATH ||
    pathname === REGISTER_PATH ||
    pathname.startsWith('/portal/login') ||
    pathname.startsWith('/portal/register') ||
    pathname.startsWith('/medxrescue/login') ||
    pathname.startsWith('/medxrescue/register')
  ) {
    return;
  }

  useAuthStore.getState().logout();

  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (pathname.startsWith('/medxrescue')) {
    window.location.replace(`/medxrescue/login?redirect=${encodeURIComponent(currentPath)}`);
  } else if (pathname.startsWith('/portal')) {
    window.location.replace(`/portal/login?redirect=${encodeURIComponent(currentPath)}`);
  } else {
    window.location.replace(`${LOGIN_PATH}?redirect=${encodeURIComponent(currentPath)}`);
  }
}

function isAuthenticationEndpoint(input: RequestInfo | URL): boolean {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/staff/login') ||
    url.includes('/auth/staff/invitation') ||
    url.includes('/medxrescue/auth/login') ||
    url.includes('/medxrescue/auth/register') ||
    url.includes('/patient-portal/auth/login')
  );
}

export default function AuthSessionGuard() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // Catch 401 responses from every native fetch() call in the frontend.
  // Several legacy services use fetch directly instead of apiClient.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      const response = await originalFetch(input, init);

      if (
        response.status === 401 &&
        !isAuthenticationEndpoint(input)
      ) {
        redirectToLogin();
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Detect JWT expiration even when the user is simply sitting on a page
  // and no API request is being made.
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !token) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const checkExpiration = () => {
      const expiresAt = getTokenExpiration(token);

      // Non-JWT tokens cannot be checked locally. The API 401 handlers
      // above will still force logout when the backend rejects them.
      if (!expiresAt) return;

      // Expire one second early to avoid sending a request with a token
      // that is about to become invalid.
      if (expiresAt - Date.now() <= 1000) {
        redirectToLogin();
        return;
      }

      timeoutId = setTimeout(
        checkExpiration,
        Math.max(250, expiresAt - Date.now() - 1000)
      );
    };

    checkExpiration();

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const expiresAt = getTokenExpiration(token);

      if (expiresAt && expiresAt - Date.now() <= 1000) {
        redirectToLogin();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [hasHydrated, isAuthenticated, token]);

  return null;
}
