// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form,    setForm]    = useState({ name:'', email:'', password:'', phone:'', role:'citizen' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:48,height:48,background:'var(--accent)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:20,fontWeight:700,color:'#fff' }}>
            V2G
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Create account</h1>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Join Voice2Gov and report civic issues</p>
        </div>

        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Full name</label>
              <input className="input" type="text" placeholder="Aravinth Kumar" required
                value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" required
                value={form.email} onChange={set('email')} />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min 6 characters" required
                value={form.password} onChange={set('password')} />
            </div>
            <div className="field">
              <label className="label">Phone (optional)</label>
              <input className="input" type="tel" placeholder="9876543210"
                value={form.phone} onChange={set('phone')} />
            </div>
            <div className="field" style={{ marginBottom:18 }}>
              <label className="label">Account type</label>
              <select className="input select" value={form.role} onChange={set('role')}>
                <option value="citizen">Citizen</option>
                <option value="department">Department Staff</option>
              </select>
            </div>
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><Spinner size={16}/> Creating…</> : 'Create account'}
            </button>
          </form>
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border)', textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
