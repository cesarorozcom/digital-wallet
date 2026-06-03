import { User } from '../services/api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_ID_KEY = 'refreshTokenId';
const USER_STORAGE_KEY = 'user';

export interface StoredSession {
  accessToken: string;
  refreshTokenId: string;
  user: User;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshTokenId(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_ID_KEY);
}

export function getStoredUser(): User | null {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function persistSession(session: StoredSession): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_ID_KEY, session.refreshTokenId);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
}

export function updateStoredUser(user: User): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_ID_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

