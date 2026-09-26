// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider }   from './context/AuthContext';
import { ToastProvider }  from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import './index.css';

// Provider order matters:
//   AuthProvider   → knows who is logged in
//   ToastProvider  → provides addToast() to SocketProvider
//   SocketProvider → uses both auth token and addToast

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
