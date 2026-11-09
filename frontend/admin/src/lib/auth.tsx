import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { api, clearToken, getToken, setToken } from './api';
import type { LoginResponse, User } from './types';

const USER_KEY = 'mfp_admin_user';

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await api<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } });
    setToken(res.accessToken);
    setTokenState(res.accessToken);
    setUser(res.user);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  const value = useMemo(() => ({ token, user, login, logout }), [token, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
