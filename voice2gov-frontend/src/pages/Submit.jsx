// src/pages/Submit.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import { PriorityBadge } from '../components/StatusBadge';

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ current }) {
  const labels = ['Describe', 'AI Analysis', 'Confirm'];
  return (
    <div className="steps">
      {labels.map((lbl, i) => (
        <div className="step-item" key={lbl}>
          <div className={`step-circle ${i < current ? 'done' : i === current ? 'active' : ''}`}>
            {i < current ? '✓' : i + 1}
          </div>
          <div className="step-label">{lbl}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Submit() {
  const navigate   = useNavigate();
  const [step, setStep]         = useState(0);
  const [inputType, setInput]   = useState('text');
  const [title, setTitle]       = useState('');
  const [desc,  setDesc]        = useState('');
  const [addr,  setAddr]        = useState('');
  const [files, setFiles]       = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [refId, setRefId]       = useState('');
  const [dept,  setDept]        = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recSecs,   setRecSecs]   = useState(0);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const timerRef       = useRef(null);
  const imgRef         = useRef(null);

  // ── Voice (Web Speech API) ──────────────────────────────────────────────
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setTranscript('Voice not supported in this browser. Please type your complaint.'); return; }
    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'en-IN';
    recognitionRef.current = rec;

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setTranscript(t);
      setDesc(t);
    };
    rec.onerror  = () => stopVoice();
    rec.onend    = () => stopVoice();
    rec.start();
    setRecording(true); setRecSecs(0);
    timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  // ── Step 1 → Step 2: call /api/complaints/analyze ────────────────────────
  const handleAnalyze = async () => {
    const text = desc.trim();
    const t    = title.trim();
    if (!text && !t) { setError('Please enter a title or description.'); return; }
    setError(''); setAnalyzing(true);
    try {
      const { data } = await api.post('/complaints/analyze', { text: text || t, title: t || text });
      setAiResult(data.data);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally { setAnalyzing(false); }
  };

  // ── Step 2 → Step 3: POST /api/complaints ────────────────────────────────
  const handleSubmit = async () => {
    setError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title',       title || desc.slice(0, 80));
      fd.append('description', desc || title);
      fd.append('inputType',   inputType);
      fd.append('address',     addr);
      files.forEach(f => fd.append('attachments', f));

      const { data } = await api.post('/complaints', fd);
      setRefId(data.data.complaint.referenceId);
      setDept(data.data.complaint.assignedDepartment);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const reset = () => {
    setStep(0); setInputType('text'); setTitle(''); setDesc(''); setAddr('');
    setFiles([]); setAiResult(null); setRefId(''); setDept(''); setError('');
    setTranscript(''); setRecSecs(0);
  };

  const TABS = [
    { id:'text',  icon:'⌨️',  label:'Text'  },
    { id:'voice', icon:'🎙️',  label:'Voice' },
    { id:'image', icon:'📷',  label:'Image' },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap">
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Report an issue</h1>
        <p style={{ color:'var(--text-muted)', fontSize:13 }}>
          Describe the problem. AI will categorize, score severity, and route it instantly.
        </p>
      </div>

      <Steps current={step} />

      {/* ── STEP 0: Input ───────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="card">
          {error && <div className="alert alert-error" style={{ marginBottom:14 }}>{error}</div>}

          {/* Input type selector */}
          <div className="type-pills">
            {TABS.map(t => (
              <button key={t.id} className={`type-pill ${inputType===t.id?'active':''}`}
                onClick={() => { setInput(t.id); setError(''); }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Text input ── */}
          {inputType === 'text' && (
            <>
              <div className="field">
                <label className="label">Issue title</label>
                <input className="input" placeholder="e.g. Large pothole on Main Street"
                  value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Description</label>
                <textarea className="input textarea" rows={4}
                  placeholder="Describe what you see — location details, how long it has been there, who might be affected…"
                  value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Location</label>
                <input className="input" placeholder="e.g. 14 Main St, Erode"
                  value={addr} onChange={e => setAddr(e.target.value)} />
              </div>
            </>
          )}

          {/* ── Voice input ── */}
          {inputType === 'voice' && (
            <div style={{ textAlign:'center', paddingBottom:8 }}>
              <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:4 }}>
                {recording ? `Recording… ${recSecs}s — speak clearly` : 'Press to start recording your complaint'}
              </p>
              <button className={`voice-btn ${recording ? 'recording' : ''}`}
                onPointerDown={startVoice} onPointerUp={stopVoice}>
                🎙️
              </button>
              {transcript && (
                <div style={{ background:'var(--bg-hover)', borderRadius:'var(--radius)', padding:'10px 14px', textAlign:'left', fontSize:13, lineHeight:1.6, marginTop:4 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase' }}>Transcribed:</span>
                  <br />{transcript}
                </div>
              )}
              <div className="field" style={{ textAlign:'left', marginTop:16 }}>
                <label className="label">Location</label>
                <input className="input" placeholder="e.g. 14 Main St, Erode"
                  value={addr} onChange={e => setAddr(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Image input ── */}
          {inputType === 'image' && (
            <>
              <div className="upload-zone" onClick={() => imgRef.current?.click()}>
                <span className="upload-zone-icon">📎</span>
                <p style={{ fontWeight:600, marginBottom:4 }}>Click to upload image or video</p>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>JPG, PNG, MP4, WebM — max 10 MB each</p>
                <input type="file" ref={imgRef} style={{ display:'none' }} accept="image/*,video/*"
                  multiple onChange={e => setFiles(Array.from(e.target.files))} />
              </div>
              {files.length > 0 && (
                <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
                  {files.map(f => (
                    <div key={f.name} style={{ fontSize:12, background:'var(--bg-hover)', padding:'4px 10px', borderRadius:20, color:'var(--text-muted)' }}>
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
              <div className="field" style={{ marginTop:14 }}>
                <label className="label">Describe what you see</label>
                <textarea className="input textarea" rows={3}
                  placeholder="Describe the issue shown in the image…"
                  value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Location</label>
                <input className="input" placeholder="e.g. 14 Main St, Erode"
                  value={addr} onChange={e => setAddr(e.target.value)} />
              </div>
            </>
          )}

          <button className="btn btn-primary btn-full" style={{ marginTop:6 }}
            onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? <><Spinner size={16}/> Analyzing…</> : '🤖 Analyze with AI →'}
          </button>
        </div>
      )}

      {/* ── STEP 1: AI Analysis ──────────────────────────────────────────── */}
      {step === 1 && aiResult && (
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <span style={{ fontSize:18 }}>🤖</span>
            <span style={{ fontWeight:600, fontSize:15 }}>AI analysis complete</span>
            {(aiResult.processedBy === 'ai-api') && (
              <span style={{ fontSize:10, background:'var(--accent-glow)', color:'var(--accent)', padding:'2px 8px', borderRadius:20, fontWeight:600, border:'1px solid var(--accent)' }}>
                ✦ Voice2Gov AI
              </span>
            )}
            <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)', background:'var(--bg-hover)', padding:'2px 8px', borderRadius:20 }}>
              {Math.round((aiResult.confidence||0.8)*100)}% confidence
            </span>
          </div>

          <div className="ai-block">
            {[
              { label:'Category',   val: aiResult.category },
              { label:'Department', val: aiResult.department },
              { label:'Priority',   val: <PriorityBadge label={aiResult.priority?.label} /> },
              { label:'Sentiment',  val: aiResult.sentiment },
              { label:'Urgency score', val: `${aiResult.priority?.score ?? 5}/10` },
            ].map(r => (
              <div className="ai-row" key={r.label}>
                <span className="ai-label">{r.label}</span>
                <span className="ai-val">{r.val}</span>
              </div>
            ))}
          </div>

          <div className="ai-summary">{aiResult.summary}</div>

          {aiResult.keywords?.length > 0 && (
            <div style={{ marginTop:12, display:'flex', gap:5, flexWrap:'wrap' }}>
              {aiResult.keywords.slice(0,8).map(k => (
                <span key={k} style={{ fontSize:11, background:'var(--bg-hover)', padding:'3px 9px', borderRadius:20, color:'var(--text-muted)' }}>
                  {k}
                </span>
              ))}
            </div>
          )}

          <div style={{ display:'flex', gap:10, marginTop:18 }}>
            <button className="btn" onClick={() => { setStep(0); setError(''); }}>← Edit</button>
            <button className="btn btn-primary" style={{ flex:1 }}
              onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Spinner size={16}/> Submitting…</> : 'Confirm & submit →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Success ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="card" style={{ textAlign:'center', padding:'40px 28px' }}>
          <div style={{ width:56,height:56,borderRadius:'50%',background:'var(--green-bg)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:26 }}>
            ✅
          </div>
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Complaint submitted!</h2>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:6 }}>
            Your complaint has been routed to <strong style={{ color:'var(--text)' }}>{dept}</strong>.
          </p>
          <p style={{ color:'var(--text-muted)', fontSize:12, marginBottom:24 }}>
            Reference ID: <code style={{ fontFamily:'var(--mono)', background:'var(--bg-hover)', padding:'2px 8px', borderRadius:4, color:'var(--accent)' }}>{refId}</code>
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn" onClick={() => navigate('/issues')}>View my issues</button>
            <button className="btn btn-primary" onClick={reset}>Report another</button>
          </div>
        </div>
      )}
    </div>
  );
}
