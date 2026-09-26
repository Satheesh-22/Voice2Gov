// src/pages/Issues.jsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import { StatusBadge, PriorityBadge, PriorityBar } from '../components/StatusBadge';

const STATUSES  = ['All','Submitted','Acknowledged','In Progress','Resolved','Rejected'];
const PRIORITIES = ['All','Critical','High','Medium','Low'];

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

export default function Issues() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status,     setStatus]     = useState('All');
  const [priority,   setPriority]   = useState('All');
  const LIMIT = 8;

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [debouncedQ, status, priority]);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (status   !== 'All') params.set('status',   status);
      if (priority !== 'All') params.set('priority', priority);
      if (debouncedQ)          params.set('search',   debouncedQ);
      const { data } = await api.get(`/complaints?${params}`);
      setComplaints(data.data);
      setTotal(data.pagination.total);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, status, priority, debouncedQ]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:2 }}>All issues</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>{total} report{total!==1?'s':''} found</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/submit')}>＋ Report issue</button>
      </div>

      {/* Search */}
      <input className="input" placeholder="🔍  Search by title, description or location…"
        value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom:12 }} />

      {/* Status filter */}
      <div className="filter-pills" style={{ marginBottom:8 }}>
        {STATUSES.map(s => (
          <button key={s} className={`filter-pill ${status===s?'active':''}`}
            onClick={() => setStatus(s)}>{s === 'All' ? 'All statuses' : s}</button>
        ))}
      </div>

      {/* Priority filter */}
      <div className="filter-pills" style={{ marginBottom:18 }}>
        {PRIORITIES.map(p => (
          <button key={p} className={`filter-pill ${priority===p?'active':''}`}
            onClick={() => setPriority(p)}>{p === 'All' ? 'All priorities' : p}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Spinner />
      ) : complaints.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No issues found</div>
          <div className="empty-sub">Try adjusting your filters</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {complaints.map(c => (
            <div className="complaint-card" key={c._id} onClick={() => navigate(`/issues/${c._id}`)}>
              <div className="cc-header">
                <div>
                  <div className="cc-title">{c.title}</div>
                  <div className="cc-sub">{c.location?.address} · {c.aiAnalysis?.category}</div>
                </div>
                <div className="cc-badges">
                  <StatusBadge   status={c.status} />
                  <PriorityBadge label={c.aiAnalysis?.priority?.label} />
                </div>
              </div>
              <div className="cc-meta">
                <span>📋 {c.aiAnalysis?.department}</span>
                <span>📅 {fmtDate(c.createdAt)}</span>
                <span>🆔 {c.referenceId}</span>
              </div>
              <PriorityBar score={c.aiAnalysis?.priority?.score ?? 5} label={c.aiAnalysis?.priority?.label} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(p=>p-1)} disabled={page===1}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pg = totalPages <= 7 ? i+1 : (page <= 4 ? i+1 : page-3+i);
            if (pg < 1 || pg > totalPages) return null;
            return (
              <button key={pg} className={`page-btn ${page===pg?'active':''}`} onClick={() => setPage(pg)}>
                {pg}
              </button>
            );
          })}
          <button className="page-btn" onClick={() => setPage(p=>p+1)} disabled={page===totalPages}>›</button>
        </div>
      )}
    </div>
  );
}
