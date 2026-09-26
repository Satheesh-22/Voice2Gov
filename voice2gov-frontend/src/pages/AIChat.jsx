// src/pages/AIChat.jsx
// Voice2Gov AI assistant — chat UI with complaint context support

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/Spinner';

// ── Markdown-lite renderer (bold, code, line-breaks) ────────────────────────
function Markdown({ text }) {
  const html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:var(--bg);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Suggested prompts ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'How do I report a pothole near my house?',
  'What information should I include when reporting a water leak?',
  'How long does it take to resolve an electricity complaint?',
  'I submitted a complaint 5 days ago — what should I do?',
  'What is the difference between Critical and High priority?',
  'Can I report an issue in Tamil?',
];

const COMPLAINT_SUGGESTIONS = [
  'What is the current status of my complaint?',
  'How long will this take to resolve?',
  'Which department is handling my issue?',
  'What can I do to speed up the resolution?',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isErr  = msg.role === 'error';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 14,
      gap: 10,
      alignItems: 'flex-end',
    }}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: isErr ? 'var(--red-bg)' : 'var(--accent-glow)',
          border: `1px solid ${isErr ? 'var(--red)' : 'var(--accent)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, marginBottom: 2,
        }}>
          {isErr ? '⚠️' : '🤖'}
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--accent)' : isErr ? 'var(--red-bg)' : 'var(--bg-card)',
        border: isUser ? 'none' : `1px solid ${isErr ? 'var(--red)' : 'var(--border)'}`,
        color: isUser ? '#fff' : isErr ? 'var(--red)' : 'var(--text)',
        fontSize: 13,
        lineHeight: 1.65,
        boxShadow: 'var(--shadow)',
      }}>
        {isUser ? msg.content : <Markdown text={msg.content} />}
        <div style={{
          fontSize: 10, marginTop: 5,
          color: isUser ? 'rgba(255,255,255,0.6)' : 'var(--text-dim)',
          textAlign: isUser ? 'right' : 'left',
        }}>
          {msg.time}
        </div>
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, fontWeight: 700,
          color: '#fff', marginBottom: 2,
        }}>
          U
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: 'var(--accent-glow)', border: '1px solid var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>🤖</div>
      <div style={{
        padding: '12px 16px', borderRadius: '14px 14px 14px 4px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 150, 300].map((d) => (
          <div key={d} style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
            animation: `bounce 1s ease-in-out ${d}ms infinite`,
          }} />
        ))}
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AIChat() {
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const complaintId      = searchParams.get('complaint');

  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [aiEnabled,   setAiEnabled]   = useState(null);   // null = checking
  const [complaint,   setComplaint]   = useState(null);
  const [sessionId]                   = useState(() => `chat-${Date.now()}`);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);

  const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // ── On mount: check AI status + load complaint context ────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/ai/status');
        setAiEnabled(data.data.aiEnabled);
      } catch { setAiEnabled(false); }

      if (complaintId) {
        try {
          const { data } = await api.get(`/complaints/${complaintId}`);
          setComplaint(data.data.complaint);
        } catch { /* ignore */ }
      }
    })();
  }, [complaintId]);

  // ── Initial welcome message once status is known ──────────────────────────
  useEffect(() => {
    if (aiEnabled === null) return;
    const powered = aiEnabled ? 'Voice2Gov AI' : 'the built-in assistant';
    const welcome = complaint
      ? `Hello! I'm your Voice2Gov assistant powered by ${powered}.\n\nI can see your complaint **"${complaint.title}"** (${complaint.referenceId}) — currently **${complaint.status}** and routed to **${complaint.assignedDepartment}**.\n\nHow can I help you today?`
      : `Hello! I'm your Voice2Gov assistant powered by ${powered}.\n\nI can help you:\n- **Report an issue** — guide you on what details to include\n- **Track complaints** — explain status and timelines\n- **Understand categories** — Infrastructure, Water, Electricity, and more\n\nWhat would you like to know?`;

    setMessages([{ role: 'assistant', content: welcome, time: now() }]);
  }, [aiEnabled, complaint]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll to bottom on new message ─────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Build API messages array (exclude welcome + error bubbles) ────────────
  const buildAPIMessages = useCallback((msgs) =>
    msgs
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(1)   // skip the welcome assistant message
      .map((m) => ({ role: m.role, content: m.content })),
  []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (text = input.trim()) => {
    if (!text || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: text, time: now() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setLoading(true);

    try {
      const apiMessages = buildAPIMessages(updatedMsgs);

      const { data } = await api.post('/ai/chat', {
        messages: apiMessages,
        ...(complaintId ? { complaintId } : {}),
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.data.reply, time: now() },
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: errMsg, time: now() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetChat = () => {
    setMessages([]);
    setAiEnabled((v) => { setTimeout(() => setAiEnabled(v), 10); return null; });
  };

  const suggestions = complaint ? COMPLAINT_SUGGESTIONS : SUGGESTIONS;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-glow)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              Voice2Gov AI Assistant
              {aiEnabled === null && <Spinner size={12} />}
              {aiEnabled === true && (
                <span style={{ fontSize: 10, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '1px 7px', borderRadius: 10, fontWeight: 600, border: '1px solid var(--accent)' }}>
                  ✦ Voice2Gov AI
                </span>
              )}
              {aiEnabled === false && (
                <span style={{ fontSize: 10, background: 'var(--bg-hover)', color: 'var(--text-muted)', padding: '1px 7px', borderRadius: 10 }}>
                  Built-in
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {complaint
                ? `Context: ${complaint.referenceId} — ${complaint.title.slice(0, 40)}`
                : 'Civic grievance assistant — here to help'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {complaint && (
            <button className="btn btn-sm" onClick={() => navigate(`/issues/${complaintId}`)}>
              View complaint →
            </button>
          )}
          <button className="btn btn-sm" onClick={resetChat}>New chat</button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        display: 'flex', flexDirection: 'column',
        maxWidth: 760, width: '100%', margin: '0 auto',
        alignSelf: 'stretch',
      }}>
        {/* Complaint context card */}
        {complaint && (
          <div style={{
            background: 'var(--accent-glow)', border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-lg)', padding: '10px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
          }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <div>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Complaint context loaded</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                {complaint.referenceId} · {complaint.aiAnalysis?.category} · {complaint.status}
              </span>
            </div>
          </div>
        )}

        {/* Chat bubbles */}
        {messages.map((m, i) => <Message key={`${sessionId}-${i}`} msg={m} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />

        {/* Suggestions (show only at start) */}
        {messages.length <= 1 && !loading && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 8 }}>
              Suggested questions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestions.map((s) => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  padding: '6px 12px', borderRadius: 20,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                  transition: 'all 0.12s', textAlign: 'left',
                }}
                  onMouseEnter={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div style={{
        background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
        padding: '14px 20px',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            className="input textarea"
            rows={1}
            placeholder="Type your question… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKey}
            disabled={loading || aiEnabled === null}
            style={{
              flex: 1, resize: 'none', minHeight: 40, maxHeight: 120,
              overflowY: 'auto', lineHeight: 1.5,
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || aiEnabled === null}
            style={{ height: 40, padding: '0 16px', flexShrink: 0 }}
          >
            {loading ? <Spinner size={16} /> : '↑ Send'}
          </button>
        </div>
        <div style={{ maxWidth: 760, margin: '6px auto 0', fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          {aiEnabled
            ? 'Powered by Voice2Gov AI'
            : 'Configure AI_API_KEY and provider settings in backend .env to enable external AI'}
        </div>
      </div>
    </div>
  );
}
