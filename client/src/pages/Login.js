import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'homeowner') navigate('/homeowner');
      else if (user.role === 'company') navigate('/company');
      else navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏊</div>
          <h1>Pool<span>Valet</span></h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={form.email}
              onChange={set('email')} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={form.password}
              onChange={set('password')} placeholder="••••••••" required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Sign In'}
          </button>
        </form>

        <hr className="divider" />
        <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray)' }}>
          <p style={{ marginBottom: '0.75rem' }}>Demo accounts (password: <code>password123</code>):</p>
          <div style={{ display: 'grid', gap: '0.3rem' }}>
            <code style={{ fontSize: '0.75rem' }}>sarah@demo.com · homeowner</code>
            <code style={{ fontSize: '0.75rem' }}>bluewave@demo.com · pool company</code>
            <code style={{ fontSize: '0.75rem' }}>admin@poolvalet.com · admin</code>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray)', marginTop: '1.25rem' }}>
          No account? <Link to="/register" style={{ color: 'var(--aqua)', fontWeight: 600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', companyName: '', licenseNo: '', serviceArea: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await register({ ...form, role });
      if (user.role === 'homeowner') navigate('/homeowner');
      else navigate('/company');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🏊</div>
          <h1>Pool<span>Valet</span></h1>
          <p>Create your account</p>
        </div>

        {step === 1 && (
          <div>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--gray)', marginBottom: '1.5rem' }}>I am a…</p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {[
                { value: 'homeowner', icon: '🏡', title: 'Homeowner', desc: 'Get quotes on pool service, repairs, and new builds' },
                { value: 'company',   icon: '🔧', title: 'Pool Company', desc: 'Browse jobs and submit bids to win new business' },
              ].map(opt => (
                <div key={opt.value}
                  onClick={() => { setRole(opt.value); setStep(2); }}
                  style={{
                    border: '1.5px solid var(--light)', borderRadius: 12, padding: '1.25rem',
                    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '1rem', alignItems: 'center'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--aqua)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--light)'}
                >
                  <span style={{ fontSize: '2rem' }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--ocean)' }}>{opt.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginTop: '0.2rem' }}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray)', marginTop: '1.5rem' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--aqua)', fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
              </div>
            </div>
            {role === 'company' && (
              <>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="form-input" value={form.companyName} onChange={set('companyName')} placeholder="Blue Wave Pools" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">License Number</label>
                    <input className="form-input" value={form.licenseNo} onChange={set('licenseNo')} placeholder="LIC-XXXXX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Zip Codes</label>
                    <input className="form-input" value={form.serviceArea} onChange={set('serviceArea')} placeholder="33101,33139" />
                  </div>
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" required />
            </div>
            {error && <p className="form-error">{error}</p>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                {loading ? <span className="spinner"></span> : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
