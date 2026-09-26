// src/context/SocketContext.jsx
// Manages Socket.io connection lifecycle and notification state.
// Connects when user is logged in, disconnects on logout.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../api/axios';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Map notification type → icon
const TYPE_ICON = {
  new_complaint: '📋',
  status_update: '🔄',
  resolved:      '✅',
  escalated:     '🚨',
  assigned:      '👤',
};

export const SocketProvider = ({ children }) => {
  const { user }     = useAuth();
  const { addToast } = useToast();
  const socketRef    = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [connected,     setConnected]     = useState(false);

  // ── Fetch persisted notifications from REST API ──────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?limit=30');
      setNotifications(data.data);
      const { data: uc } = await api.get('/notifications/unread-count');
      setUnreadCount(uc.data.count);
    } catch { /* user not logged in yet or endpoint unreachable */ }
  }, []);

  // ── Connect / disconnect when auth state changes ─────────────────────────
  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('v2g_token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth:            { token },
      transports:      ['websocket', 'polling'],
      reconnection:    true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      fetchNotifications();    // load historical notifications on connect
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      console.warn('[Socket] connect_error:', err.message);
      setConnected(false);
    });

    // ── Main event: incoming notification ──────────────────────────────────
    socket.on('notification:new', (notif) => {
      // Prepend to list
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      setUnreadCount((n) => n + 1);

      // Show slide-in toast
      addToast({
        type:        notif.type,
        title:       `${TYPE_ICON[notif.type] || '🔔'} ${notif.title}`,
        message:     notif.message,
        complaintId: notif.complaintId,
        duration:    6000,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchNotifications, addToast]);

  // ── Mark one notification as read (REST + local state) ───────────────────
  const markRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((n) => Math.max(n - 1, 0));
    } catch { /* ignore */ }
  }, []);

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  return (
    <SocketContext.Provider value={{
      socket:        socketRef.current,
      connected,
      notifications,
      unreadCount,
      markRead,
      markAllRead,
      clearAll,
      fetchNotifications,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
