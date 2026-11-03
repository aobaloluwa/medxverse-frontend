import { useAuthStore } from '@/store/useAuthStore';

export const AUTH_LOGIN_PATH = '/auth/login';

export function handleUnauthorizedResponse() {
  if (typeof window === 'undefined') return;

  const currentPath = window.location.pathname;

  // Never redirect call pages, emergency routes, or public telemedicine windows to login
  if (
    currentPath.includes('/auth/login') ||
    currentPath.includes('/portal/login') ||
    currentPath.includes('/call/') ||
    currentPath.includes('/emergency') ||
    currentPath.includes('/medxrescue') ||
    currentPath.includes('/telemedicine')
  ) {
    return;
  }

  useAuthStore.getState().logout();

  const fullPath = `${window.location.pathname}${window.location.search}`;

  window.location.replace(
    `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(fullPath)}`
  );
}
