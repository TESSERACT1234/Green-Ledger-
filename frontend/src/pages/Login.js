import React, { useState } from 'react';
import logo from '../assets/logo.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Leaf, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logo} alt="Tesseract Flex Fuel" style={{ width:'220px', marginBottom:'8px' }}/>
          <div className="auth-sub" style={{ marginTop:'0' }}>Accounting System · GreenLedger</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@tesseractflexfuel.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingRight: '40px' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)' }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop:'24px', padding:'16px', background:'var(--gray-50)', borderRadius:'10px', border:'1px solid var(--gray-200)' }}>
          <div style={{ fontSize:'11.5px', fontWeight:'700', color:'var(--gray-500)', marginBottom:'8px' }}>DEMO CREDENTIALS</div>
          <div style={{ fontSize:'12.5px', color:'var(--gray-600)', lineHeight:'1.8' }}>
            <div>Admin: <span style={{ fontFamily:'monospace', color:'var(--primary)' }}>admin@tesseractflexfuel.com</span></div>
            <div>Pass: <span style={{ fontFamily:'monospace', color:'var(--primary)' }}>Admin@123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}