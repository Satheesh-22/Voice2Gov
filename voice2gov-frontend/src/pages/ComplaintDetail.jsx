// src/pages/ComplaintDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { StatusBadge, PriorityBadge, PriorityBar } from '../components/StatusBadge';

const fmtDate = (d) =>
  new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

const VALID_TRANSITIONS = ['Acknowledged','In Progress','Resolved','Rejected','Escalated'];

export default function ComplaintDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user, isAdmin, isDepartment } = useAuth();

  const [complaint,  setComplaint]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [newStatus,  setNewStatus]  = useState('');
  const [note,       setNote]       = useState('');
  const [updating,   setUpdating]   = useState(false);
  const [updateMsg,  setUpdateMsg]  = useState('');
  const [rating,     setRating]     = useState(0);
  const [fbNote,     setFbNote]     = useState('');
  const [fbSent,     setFbSent]     = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/complaints/${id}`);
        setComplaint(data.data.complaint);
        setNewStatus(data.data.complaint.status);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load complaint');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleStatusUpdate = async () => {
    setUpdating(true); setUpdateMsg('');
    try {
      const { data } = await api.put(`/complaints/${id}/status`, { status: newStatus, note });
      setComplaint(data.data.complaint);
      setNote('');
      setUpdateMsg('Status updated successfully');
    } catch (err) {
      setUpdateMsg(err.response?.data?.message || 'Update failed');
    }
    setUpdating(false);
  };

  const handleFeedback = async () => {
    if (!rating) return;
    try {
      await api.post(`/complaints/${id}/feedback`, { rating, comment: fbNote });
      setFbSent(true);
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner fullPage />;
  if (error)   return (
    <div className="page-wrap">
      <div className="alert alert-error">{error}</div>
      <button className="btn" onClick={() => navigate('/issues')}>← Back</button>
    </div>
  );

  const c  = complaint;
  const ai = c.aiAnalysis || {};

  const canUpdate = isAdmin || isDepartment;
  const canFeedback = user?._id === (c.submittedBy?._id || c.submittedBy) && c.status === 'Resolved' && !c.feedback?.rating;

  return (
    <div className="page-wrap">
      {/* Back + AI chat */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, gap:8 }}>
        <button className="btn" onClick={() => navigate('/issues')}>
          ← Back to issues
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/chat?complaint=${id}`)}>
          ✦ Ask AI about this
        </button>
      </div>

      {/* Header card */}
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:14 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>{c.title}</h1>
            <p style={{ color:'var(--text-muted)', fontSize:12 }}>
              {c.location?.address} · {c.referenceId}
            </p>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <StatusBadge   status={c.status} />
            <PriorityBadge label={ai.priority?.label} />
          </div>
        </div>

        {/* Description */}
        <div style={{ background:'var(--bg-hover)', borderRadius:'var(--radius)', padding:'12px 14px', fontSize:13, lineHeight:1.7, marginBottom:14 }}>
          {c.description}
        </div>

        {/* AI analysis grid */}
        <div className="metric-grid" style={{ marginBottom:0 }}>
          {[
            { label:'Category',    val: ai.category || '—' },
            { label:'Department',  val: ai.department || '—' },
            { label:'Sentiment',   val: ai.sentiment  || '—' },
            { label:'Urgency',     val: `${ai.priority?.score ?? 5}/10` },
            { label:'Submitted by',val: c.submittedBy?.name || '—' },
            { label:'Input type',  val: c.inputType   || 'text' },
          ].map(m => (
            <div className="metric" key={m.label}>
              <div className="metric-label">{m.label}</div>
              <div style={{ fontSize:13, fontWeight:600, marginTop:4 }}>{m.val}</div>
            </div>
          ))}
        </div>

        {ai.summary && (
          <div className="ai-summary" style={{ marginTop:14 }}>{ai.summary}</div>
        )}

        {ai.keywords?.length > 0 && (
          <div style={{ marginTop:10, display:'flex', gap:5, flexWrap:'wrap' }}>
            {ai.keywords.map(k => (
              <span key={k} style={{ fontSize:11, background:'var(--bg-hover)', padding:'3px 9px', borderRadius:20, color:'var(--text-muted)' }}>{k}</span>
            ))}
          </div>
        )}
        <PriorityBar score={ai.priority?.score ?? 5} label={ai.priority?.label} />
      </div>

      {/* Status timeline */}
      <div className="card" style={{ marginBottom:14 }}>
        <div className="section-title">Progress timeline</div>
        <div className="timeline">
          {(c.statusHistory || []).map((s, i, arr) => (
            <div className="tl-item" key={i}>
              <div className="tl-spine">
                <div className={`tl-dot ${i === arr.length-1 && c.status !== 'Resolved' ? '' : ''}`} />
                {i < arr.length - 1 && <div className="tl-line" />}
              </div>
              <div className="tl-body">
                <div className="tl-title">{s.status}{s.note ? ` — ${s.note}` : ''}</div>
                <div className="tl-time">{s.updatedByName && `By ${s.updatedByName} · `}{fmtDate(s.createdAt || c.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin / dept: update status */}
      {canUpdate && (
        <div className="card" style={{ marginBottom:14 }}>
          <div className="section-title">Update status</div>
          {updateMsg && (
            <div className={`alert ${updateMsg.includes('success') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom:12 }}>
              {updateMsg}
            </div>
          )}
          <div className="field">
            <label className="label">New status</label>
            <select className="input select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              {VALID_TRANSITIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Note (optional)</label>
            <textarea className="input textarea" rows={2} placeholder="Add a note about this status change…"
              value={note} onChange={e => setNote(e.target.value)} style={{ minHeight:60 }} />
          </div>
          <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={updating}>
            {updating ? <><Spinner size={16}/> Updating…</> : 'Update status'}
          </button>
        </div>
      )}

      {/* Citizen feedback */}
      {canFeedback && !fbSent && (
        <div className="card" style={{ marginBottom:14 }}>
          <div className="section-title">Rate resolution</div>
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} style={{
                fontSize:22, background:'none', border:'none', cursor:'pointer',
                opacity: n <= rating ? 1 : 0.3, transition:'opacity 0.1s',
              }}>⭐</button>
            ))}
          </div>
          <div className="field">
            <label className="label">Comment (optional)</label>
            <textarea className="input textarea" rows={2}
              placeholder="How satisfied are you with the resolution?"
              value={fbNote} onChange={e => setFbNote(e.target.value)} style={{ minHeight:60 }} />
          </div>
          <button className="btn btn-primary" onClick={handleFeedback} disabled={!rating}>
            Submit feedback
          </button>
        </div>
      )}

      {fbSent && (
        <div className="alert alert-success">Thank you for your feedback! ✅</div>
      )}

      {/* Existing feedback */}
      {c.feedback?.rating && (
        <div className="card">
          <div className="section-title">Citizen feedback</div>
          <div style={{ fontSize:18, marginBottom:6 }}>{'⭐'.repeat(c.feedback.rating)}</div>
          {c.feedback.comment && <p style={{ fontSize:13, color:'var(--text-muted)' }}>{c.feedback.comment}</p>}
        </div>
      )}

      {/* Attachments */}
      {c.attachments?.length > 0 && (
        <div className="card" style={{ marginTop:14 }}>
          <div className="section-title">Attachments ({c.attachments.length})</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {c.attachments.map(a => (
              <a key={a.filename} href={`/uploads/${a.filename}`} target="_blank" rel="noreferrer"
                style={{ fontSize:12, background:'var(--bg-hover)', padding:'5px 12px', borderRadius:'var(--radius)', color:'var(--accent)', border:'1px solid var(--border)', textDecoration:'none' }}>
                📎 {a.originalName}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
