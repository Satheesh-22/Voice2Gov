// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,      setUser]      = useState(null);
  const [token,     setToken]     = useState(null);
  const [isLoading, setIsLoading] = useState(true);   // true until localStorage is read

  // ── Hydrate from localStorage on first mount ─────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('v2g_token');
    const storedUser  = localStorage.getItem('v2g_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('v2g_token');
        localStorage.removeItem('v2g_user');
      }
    }
    setIsLoading(false);
  }, []);

  // ── Persist helpers ───────────────────────────────────────────────────────
  const persist = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('v2g_token', jwtToken);
    localStorage.setItem('v2g_user',  JSON.stringify(userData));
  };

  const clear = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('v2g_token');
    localStorage.removeItem('v2g_user');
  };

  // ── Auth actions ──────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.data.user, data.data.token);
    return data.data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    persist(data.data.user, data.data.token);
    return data.data.user;
  }, []);

  const logout = useCallback(() => { clear(); }, []);

  // Refresh profile from server (e.g. after role change)
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      const updated  = data.data.user;
      setUser(updated);
      localStorage.setItem('v2g_user', JSON.stringify(updated));
    } catch { /* ignore — 401 interceptor will clear */ }
  }, []);

  const isAdmin      = user?.role === 'admin';
  const isDepartment = user?.role === 'department';
  const isCitizen    = user?.role === 'citizen';

  return (
    <AuthContext.Provider value={{
      user, token, isLoading,
      isAdmin, isDepartment, isCitizen,
      login, register, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
