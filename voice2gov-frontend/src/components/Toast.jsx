// src/components/Toast.jsx
// Renders a stack of slide-in toast notifications (top-right corner).
// Used by ToastContext.

import { useNavigate } from 'react-router-dom';

const TYPE_STYLE = {
  new_complaint: { border: 'var(--blue)',  icon: '📋' },
  status_update: { border: 'var(--amber)', icon: '🔄' },
  resolved:      { border: 'var(--green)', icon: '✅' },
  escalated:     { border: 'var(--red)',   icon: '🚨' },
  assigned:      { border: '#a78bfa',      icon: '👤' },
  info:          { border: 'var(--blue)',  icon: '🔔' },
  error:         { border: 'var(--red)',   icon: '❌' },
  success:       { border: 'var(--green)', icon: '✅' },
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('toast-style')) {
  const style = document.createElement('style');
  style.id = 'toast-style';
  style.textContent = `
    @keyframes toastIn  { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes toastOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(110%)} }
    .toast-item { animation: toastIn 0.3s cubic-bezier(.21,1.02,.73,1) forwards; }
    .toast-item.removing { animation: toastOut 0.25s ease-in forwards; }
  `;
  document.head.appendChild(style);
}

function Toast({ toast, onRemove }) {
  const navigate = useNavigate();
  const { border, icon } = TYPE_STYLE[toast.type] || TYPE_STYLE.info;

  const handleClick = () => {
    if (toast.complaintId) {
      navigate(`/issues/${toast.complaintId}`);
      onRemove(toast.id);
    }
  };

  return (
    <div
      className="toast-item"
      onClick={toast.complaintId ? handleClick : undefined}
      style={{
        display:        'flex',
        alignItems:     'flex-start',
        gap:            10,
        background:     'var(--bg-card)',
        border:         `1px solid var(--border)`,
        borderLeft:     `3px solid ${border}`,
        borderRadius:   'var(--radius-lg)',
        padding:        '12px 14px',
        maxWidth:       320,
        boxShadow:      'var(--shadow-lg)',
        cursor:         toast.complaintId ? 'pointer' : 'default',
        position:       'relative',
        userSelect:     'none',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, color: 'var(--text)' }}>
          {toast.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {toast.message}
        </div>
        {toast.complaintId && (
          <div style={{ fontSize: 11, color: border, marginTop: 4, fontWeight: 500 }}>
            Tap to view →
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-dim)', fontSize: 16, lineHeight: 1,
          padding: '0 2px', flexShrink: 0,
        }}
        aria-label="Dismiss"
      >×</button>
    </div>
  );
}

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position:    'fixed',
      top:         68,
      right:       16,
      zIndex:      9999,
      display:     'flex',
      flexDirection: 'column',
      gap:         8,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <Toast toast={t} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}
