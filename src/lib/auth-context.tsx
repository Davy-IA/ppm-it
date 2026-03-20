'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SessionUser } from './db/auth';

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  token: string | null;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => null, logout: async () => {}, refreshUser: async () => {}, token: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('ppm_token');
    if (saved) {
      setToken(saved);
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${saved}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.user) setUser(d.user); else { localStorage.removeItem('ppm_token'); setToken(null); } })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) return d.error ?? 'Erreur de connexion';
    setUser(d.user);
    setToken(d.token);
    localStorage.setItem('ppm_token', d.token);
    return null;
  };

  const refreshUser = async () => {
    const saved = localStorage.getItem('ppm_token');
    if (!saved) return;
    const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${saved}` } });
    if (r.ok) {
      const d = await r.json();
      if (d?.user) setUser(d.user);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setToken(null);
    localStorage.removeItem('ppm_token');
  };

  return <Ctx.Provider value={{ user, loading, login, logout, refreshUser, token }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
