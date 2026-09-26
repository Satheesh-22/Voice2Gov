// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email:'', password:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' || user.role === 'department' ? '/dashboard' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:48,height:48,background:'var(--accent)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:20,fontWeight:700,color:'#fff' }}>
            V2G
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Welcome back</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Sign in to Voice2Gov</p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" required
                value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" required
                value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
            </div>
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}
              style={{ marginTop:4 }}>
              {loading ? <><Spinner size={16}/> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop:16, padding:'14px 0 0', borderTop:'1px solid var(--border)', textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>
            No account? <Link to="/register">Create one</Link>
          </div>

          <div style={{ marginTop:12, padding:10, background:'var(--bg-hover)', borderRadius:'var(--radius)', fontSize:12, color:'var(--text-muted)' }}>
            <strong style={{ color:'var(--text-muted)' }}>Demo logins:</strong><br />
            Admin: admin@voice2gov.in / Admin@123<br />
            Citizen: aravinth@example.com / Test@1234
          </div>
        </div>
      </div>
    </div>
  );
}
