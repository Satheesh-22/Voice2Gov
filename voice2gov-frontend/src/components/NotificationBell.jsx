// src/components/NotificationBell.jsx
// Bell icon in the Navbar with:
//   - Animated unread count badge
//   - Dropdown panel showing notification history
//   - Mark all read / clear all actions
//   - Click on item → navigate to complaint

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const TYPE_META = {
  new_complaint: { icon: '📋', color: 'var(--blue)'  },
  status_update: { icon: '🔄', color: 'var(--amber)' },
  resolved:      { icon: '✅', color: 'var(--green)' },
  escalated:     { icon: '🚨', color: 'var(--red)'   },
  assigned:      { icon: '👤', color: '#a78bfa'       },
};

function fmtTime(d) {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60_000)   return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff/60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff/3_600_000)}h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll, connected } = useSocket();
  const navigate    = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef    = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNotifClick = (notif) => {
    if (!notif.isRead) markRead(notif._id);
    if (notif.complaintId || notif.complaint?._id) {
      navigate(`/issues/${notif.complaintId || notif.complaint._id}`);
      setOpen(false);
    }
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position:   'relative',
          background: open ? 'var(--bg-hover)' : 'none',
          border:     '1px solid ' + (open ? 'var(--border)' : 'transparent'),
          borderRadius: 'var(--radius)',
          width: 34, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 17,
          transition: 'all 0.12s',
        }}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
      >
        🔔
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -1, right: -1,
            background: 'var(--red)', color: '#fff',
            fontSize: 9, fontWeight: 700,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid var(--bg)',
            animation: 'unreadPulse 2s ease-in-out infinite',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:    'absolute', top: 40, right: 0,
          width:       340, maxHeight: 480,
          background:  'var(--bg-card)',
          border:      '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow:   'var(--shadow-lg)',
          zIndex:      200,
          display:     'flex', flexDirection: 'column',
          overflow:    'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
              {connected && (
                <span style={{ fontSize: 10, background: 'var(--green-bg)', color: 'var(--green)', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                  ● live
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button className="btn btn-sm" onClick={markAllRead} style={{ fontSize: 11 }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="btn btn-sm" onClick={clearAll} style={{ fontSize: 11 }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🔕</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>No notifications yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>New alerts will appear here in real time</div>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] || { icon: '🔔', color: 'var(--text-muted)' };
                const isClickable = !!(n.complaintId || n.complaint?._id);
                return (
                  <div key={n._id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      display: 'flex', gap: 10, padding: '11px 14px',
                      borderBottom: '1px solid var(--border-light)',
                      background: n.isRead ? 'transparent' : 'rgba(29,158,117,0.04)',
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { if(isClickable) e.currentTarget.style.background='var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = n.isRead?'transparent':'rgba(29,158,117,0.04)'; }}
                  >
                    {/* Type icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${meta.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, marginTop: 1,
                    }}>
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: n.isRead ? 500 : 700,
                        color: n.isRead ? 'var(--text-muted)' : 'var(--text)',
                        lineHeight: 1.4, marginBottom: 2,
                      }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, display: 'flex', gap: 6 }}>
                        <span>{fmtTime(n.createdAt)}</span>
                        {n.referenceId && <span style={{ color: meta.color }}>#{n.referenceId}</span>}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--accent)', flexShrink: 0, marginTop: 5,
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Pulse animation style */}
      <style>{`
        @keyframes unreadPulse {
          0%,100%{ transform:scale(1);   }
          50%    { transform:scale(1.15); }
        }
      `}</style>
    </div>
  );
}
