// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Spinner from '../components/Spinner';

const CAT_COLORS = {
  Infrastructure:'var(--accent)',  'Water Supply':'var(--blue)',
  Electricity:'var(--amber)',      Sanitation:'#a78bfa',
  Noise:'#fb923c',                 Safety:'var(--red)',
  General:'var(--text-dim)',
};

export default function Home() {
  const { user, isAdmin, isDepartment } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isAdmin || isDepartment) {
          const [s, c] = await Promise.all([
            api.get('/dashboard/summary'),
            api.get('/dashboard/by-category'),
          ]);
          setSummary(s.data.data);
          setCats(c.data.data);
        } else {
          // Citizens: pull from their complaints
          const { data } = await api.get('/complaints?limit=100');
          const list = data.data;
          const open = list.filter(c => c.status === 'Submitted' || c.status === 'Acknowledged').length;
          const prog = list.filter(c => c.status === 'In Progress').length;
          const res  = list.filter(c => c.status === 'Resolved').length;
          setSummary({ total: data.pagination.total, open, inProgress: prog, resolved: res });
          // build cat counts from list
          const catMap = {};
          list.forEach(c => { const k = c.aiAnalysis?.category || 'General'; catMap[k] = (catMap[k]||0)+1; });
          setCats(Object.entries(catMap).map(([category,count])=>({category,count})));
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [isAdmin, isDepartment]);

  const maxCat = Math.max(...cats.map(c=>c.count), 1);

  return (
    <div className="page-wrap">
      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,rgba(29,158,117,0.12) 0%,rgba(88,166,255,0.08) 100%)', borderRadius:'var(--radius-lg)', padding:'36px 28px', marginBottom:24, border:'1px solid var(--border)' }}>
        <div style={{ marginBottom:4, fontSize:12, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--accent)' }}>
          ✦ AI-Powered Civic Platform
        </div>
        <h1 style={{ fontSize:28, fontWeight:700, lineHeight:1.25, marginBottom:8 }}>
          Your city,<br />
          <span style={{ color:'var(--accent)' }}>heard loud</span> and clear.
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:20, maxWidth:460 }}>
          Report civic issues in seconds. AI instantly categorizes, scores severity, and routes your report to the right department.
        </p>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/submit')}>
            ＋ Report an issue
          </button>
          <button className="btn btn-lg" onClick={() => navigate('/issues')}>
            View issues →
          </button>
        </div>
      </div>

      {/* Metrics */}
      {loading ? <Spinner /> : summary && (
        <div className="metric-grid">
          {[
            { label:'Total reports',   val: summary.total,       color:'var(--blue)'  },
            { label:'Open issues',     val: summary.open,        color:'var(--amber)' },
            { label:'In progress',     val: summary.inProgress,  color:'var(--blue)'  },
            { label:'Resolved',        val: summary.resolved,    color:'var(--green)' },
            ...(isAdmin ? [{ label:'Critical', val: summary.critical, color:'var(--red)' }] : []),
          ].map(m => (
            <div className="metric" key={m.label}>
              <div className="metric-label">{m.label}</div>
              <div className="metric-val" style={{ color: m.color }}>{m.val ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Category chart */}
      {cats.length > 0 && (
        <div className="card">
          <div className="section-title">Complaints by category</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {cats.sort((a,b)=>b.count-a.count).map(c => (
              <div key={c.category}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                  <span style={{ color:'var(--text-muted)' }}>{c.category}</span>
                  <span style={{ fontWeight:600 }}>{c.count}</span>
                </div>
                <div className="progress-bar" style={{ height:6 }}>
                  <div className="progress-fill" style={{ width:`${(c.count/maxCat)*100}%`, background: CAT_COLORS[c.category] || 'var(--accent)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Welcome for first-time */}
      {!loading && summary?.total === 0 && (
        <div className="empty" style={{ marginTop:16 }}>
          <div className="empty-icon">📋</div>
          <div className="empty-title">No complaints yet</div>
          <div className="empty-sub" style={{ marginTop:10 }}>
            <button className="btn btn-primary" onClick={() => navigate('/submit')}>Report your first issue</button>
          </div>
        </div>
      )}
    </div>
  );
}
