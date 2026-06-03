import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  authService,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '../services/api';
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  persistSession,
  updateStoredUser,
} from '../utils/tokenStorage';

interface AuthContextValue {
  isAuthenticated: boolean;
  isInitializing: boolean;
  isAuthLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setUser(storedUser);
    } else if (!storedUser) {
      clearSession();
    }

    setIsInitializing(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user && getAccessToken()),
      isInitializing,
      isAuthLoading,
      user,
      async login(email: string, password: string) {
        setIsAuthLoading(true);

        try {
          const response = await authService.login(email, password);
          persistSession(response);
          setUser(response.user);
        } finally {
          setIsAuthLoading(false);
        }
      },
      async register(payload: RegisterPayload) {
        setIsAuthLoading(true);

        try {
          const response = await authService.register(payload);
          persistSession(response);
          setUser(response.user);
        } finally {
          setIsAuthLoading(false);
        }
      },
      async logout() {
        setIsAuthLoading(true);

        try {
          await authService.logout();
        } finally {
          clearSession();
          setUser(null);
          setIsAuthLoading(false);
        }
      },
      async refreshCurrentUser() {
        setIsAuthLoading(true);

        try {
          const currentUser = await authService.getCurrentUser();
          updateStoredUser(currentUser);
          setUser(currentUser);
        } finally {
          setIsAuthLoading(false);
        }
      },
      async updateProfile(payload: UpdateProfilePayload) {
        setIsAuthLoading(true);

        try {
          const updatedUser = await authService.updateProfile(payload);
          updateStoredUser(updatedUser);
          setUser(updatedUser);
        } finally {
          setIsAuthLoading(false);
        }
      },
    }),
    [isAuthLoading, isInitializing, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

