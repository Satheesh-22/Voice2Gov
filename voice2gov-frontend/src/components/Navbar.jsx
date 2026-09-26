// src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import NotificationBell from './NotificationBell';

const s = {
  nav:   { background:'var(--bg-card)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:100 },
  inner: { maxWidth:960, margin:'0 auto', padding:'0 20px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  brand: { display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:'var(--text)', fontWeight:700, fontSize:15, flexShrink:0 },
  logo:  { width:28, height:28, background:'var(--accent)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700, flexShrink:0 },
  links: { display:'flex', gap:2, alignItems:'center', flex:1, justifyContent:'center' },
  right: { display:'flex', alignItems:'center', gap:8, flexShrink:0 },
  avatar:{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 },
};

export default function Navbar() {
  const { user, logout, isAdmin, isDepartment } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const p = location.pathname;

  if (['/login','/register'].includes(p)) return null;
  if (!user) return null;

  const NavLink = ({ to, children }) => (
    <Link to={to} style={{
      padding:'6px 12px', borderRadius:6, fontSize:13, fontWeight:500,
      textDecoration:'none', transition:'all 0.12s',
      background: p === to || (to !== '/' && p.startsWith(to)) ? 'var(--bg-hover)' : 'transparent',
      color: p === to || (to !== '/' && p.startsWith(to)) ? 'var(--text)' : 'var(--text-muted)',
    }}>{children}</Link>
  );

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        {/* Brand */}
        <Link to="/" style={s.brand}>
          <div style={s.logo}>V2G</div>
          <span style={{ display:'none', ['@media(min-width:480px)']:{ display:'inline' } }}>Voice2Gov</span>
        </Link>

        {/* Nav links */}
        <div style={s.links}>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/submit">Report</NavLink>
          <NavLink to="/issues">Issues</NavLink>
          <NavLink to="/chat">✦ AI Chat</NavLink>
          {(isAdmin || isDepartment) && <NavLink to="/dashboard">Dashboard</NavLink>}
        </div>

        {/* Right side: socket status + bell + user */}
        <div style={s.right}>
          {/* Live indicator */}
          <div title={connected ? 'Real-time connected' : 'Connecting…'} style={{
            width:8, height:8, borderRadius:'50%', flexShrink:0,
            background: connected ? 'var(--green)' : 'var(--text-dim)',
            boxShadow: connected ? '0 0 0 2px rgba(63,185,80,0.25)' : 'none',
            transition: 'all 0.3s',
          }} />

          {/* Notification bell */}
          <NotificationBell />

          {/* User avatar + sign out */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ ...s.avatar, title:user.name }}>{user.name?.[0]?.toUpperCase()}</div>
            <button className="btn btn-sm" onClick={() => { logout(); navigate('/login'); }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
