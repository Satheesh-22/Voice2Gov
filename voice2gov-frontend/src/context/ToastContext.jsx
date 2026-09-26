// src/context/ToastContext.jsx
// Provides addToast() globally. Toast display is handled by <ToastContainer />.

import { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, complaintId, duration = 5000 }) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [{ id, type, title, message, complaintId }, ...prev].slice(0, 5));
    if (duration > 0) setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
