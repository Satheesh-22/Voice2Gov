// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

const fmtDate = d => new Date(d).toLocaleDateString('en-IN',{ day:'numeric', month:'short' });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 12px', fontSize:12 }}>
      <p style={{ color:'var(--text-muted)', marginBottom:4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight:600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate          = useNavigate();
  const [summary,  setSummary]  = useState(null);
  const [cats,     setCats]     = useState([]);
  const [pris,     setPris]     = useState([]);
  const [trend,    setTrend]    = useState([]);
  const [recent,   setRecent]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [days,     setDays]     = useState(30);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, c, p, t, r] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/by-category'),
        api.get('/dashboard/by-priority'),
        api.get(`/dashboard/trend?days=${days}`),
        api.get('/dashboard/recent?limit=5'),
      ]);
      setSummary(s.data.data);
      setCats(c.data.data.map(d => ({ name: d.category, count: d.count })));
      setPris(p.data.data.map(d => ({ name: d.priority,  count: d.count })));
      setTrend(t.data.data.map(d => ({ date: d.date.slice(5), count: d.count })));
      setRecent(r.data.data.complaints);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [days]);

  const PRI_COLORS = { Critical:'var(--red)', High:'var(--amber)', Medium:'var(--blue)', Low:'var(--green)' };

  const Metric = ({ label, val, color }) => (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-val" style={{ color }}>{val ?? 0}</div>
    </div>
  );

  return (
    <div className="page-wrap-lg">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:2 }}>
            {isAdmin ? 'Admin dashboard' : `${user?.department} dashboard`}
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Live analytics and complaint management</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="badge badge-live">● Live</span>
          <button className="btn btn-sm" onClick={fetchAll}>↻ Refresh</button>
        </div>
      </div>

      {loading ? <Spinner /> : <>
        {/* Metrics */}
        {summary && (
          <div className="metric-grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))' }}>
            <Metric label="Total"           val={summary.total}            color="var(--blue)"  />
            <Metric label="Open"            val={summary.open}             color="var(--amber)" />
            <Metric label="In progress"     val={summary.inProgress}       color="var(--blue)"  />
            <Metric label="Resolved"        val={summary.resolved}         color="var(--green)" />
            <Metric label="Critical"        val={summary.critical}         color="var(--red)"   />
            <Metric label="Avg resolve (h)" val={summary.avgResolutionHours ?? '—'} color="var(--text)" />
          </div>
        )}

        {/* Charts row */}
        <div className="two-col" style={{ marginBottom:16 }}>
          {/* Category bar chart */}
          <div className="card">
            <div className="section-title">By category</div>
            {cats.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cats} margin={{ top:4, right:4, bottom:4, left:-20 }}>
                  <XAxis dataKey="name" tick={{ fill:'var(--text-muted)', fontSize:10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill:'var(--text-muted)', fontSize:10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill:'var(--bg-hover)' }} />
                  <Bar dataKey="count" name="Complaints" fill="var(--accent)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty" style={{ padding:20 }}><div>No data</div></div>}
          </div>

          {/* Priority bar chart */}
          <div className="card">
            <div className="section-title">By priority</div>
            {pris.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pris} margin={{ top:4, right:4, bottom:4, left:-20 }}>
                  <XAxis dataKey="name" tick={{ fill:'var(--text-muted)', fontSize:11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill:'var(--bg-hover)' }} />
                  <Bar dataKey="count" name="Complaints" radius={[4,4,0,0]}
                    fill="var(--accent)"
                    // Per-bar colors via Cell isn't available without extra import — use fill per dataset
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty" style={{ padding:20 }}><div>No data</div></div>}
          </div>
        </div>

        {/* Trend chart */}
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div className="section-title" style={{ marginBottom:0 }}>Complaint trend</div>
            <div style={{ display:'flex', gap:6 }}>
              {[7, 14, 30].map(d => (
                <button key={d} className={`filter-pill ${days===d?'active':''}`}
                  onClick={() => setDays(d)}>{d}d</button>
              ))}
            </div>
          </div>
          {trend.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend} margin={{ top:4, right:4, bottom:4, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="date" tick={{ fill:'var(--text-muted)', fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" name="Complaints" stroke="var(--accent)" strokeWidth={2} dot={{ r:3, fill:'var(--accent)' }} activeDot={{ r:5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty" style={{ padding:20 }}>
              <div>No trend data for last {days} days</div>
            </div>
          )}
        </div>

        {/* Recent complaints */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div className="section-title" style={{ marginBottom:0 }}>Recent reports</div>
            <button className="btn btn-sm" onClick={() => navigate('/issues')}>View all →</button>
          </div>
          {recent.length === 0 ? (
            <div className="empty" style={{ padding:16 }}><div>No complaints yet</div></div>
          ) : (
            <div>
              {recent.map((c, i) => (
                <div key={c._id}
                  onClick={() => navigate(`/issues/${c._id}`)}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'12px 0', cursor:'pointer', gap:10,
                    borderBottom: i < recent.length-1 ? '1px solid var(--border-light)' : 'none',
                  }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                      {c.aiAnalysis?.department} · {fmtDate(c.createdAt)}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                    <StatusBadge   status={c.status} />
                    <PriorityBadge label={c.aiAnalysis?.priority?.label} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>}
    </div>
  );
}
