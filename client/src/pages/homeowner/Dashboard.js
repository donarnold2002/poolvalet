// ══ HOMEOWNER DASHBOARD ══════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function fmt(amt) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amt); }
function timeAgo(d) {
  const s = (Date.now() - new Date(d + 'Z')) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
function Stars({ n }) {
  return <span className="stars">{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= n ? 'var(--sun)' : 'var(--light)' }}>★</span>)}</span>;
}
function StatusBadge({ s }) {
  return <span className={`badge badge-${s}`}>{s.replace('_',' ')}</span>;
}

export function HomeownerDashboard() {
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/jobs/my').then(setJobs).catch(console.error).finally(() => setLoading(false));
  }, []);

  const open     = jobs.filter(j => j.status === 'open');
  const accepted = jobs.filter(j => j.status === 'accepted');
  const total_bids = jobs.reduce((a, j) => a + (j.bid_count || 0), 0);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Welcome back, {user?.name?.split(' ')[0]} 👋</div>
          <div className="topbar-sub">Here's what's happening with your pool requests</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/homeowner/submit')}>+ Request Quotes</button>
      </div>
      <div className="page">
        <div className="stats-grid">
          <div className="stat-card blue"><div className="stat-card-icon">📋</div><div className="stat-card-num">{jobs.length}</div><div className="stat-card-label">Total Requests</div></div>
          <div className="stat-card aqua"><div className="stat-card-icon">🔓</div><div className="stat-card-num">{open.length}</div><div className="stat-card-label">Open Requests</div></div>
          <div className="stat-card sun"><div className="stat-card-icon">💼</div><div className="stat-card-num">{total_bids}</div><div className="stat-card-label">Bids Received</div></div>
          <div className="stat-card green"><div className="stat-card-icon">✅</div><div className="stat-card-num">{accepted.length}</div><div className="stat-card-label">Jobs Accepted</div></div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Quote Requests</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/homeowner/jobs')}>View All</button>
          </div>
          {jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏊</div>
              <h3>No requests yet</h3>
              <p>Upload photos of your pool and get quotes from local professionals.</p>
              <button className="btn btn-primary" onClick={() => navigate('/homeowner/submit')}>Get Started</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {jobs.slice(0, 5).map(job => (
                <div key={job.id} className="job-card" onClick={() => navigate(`/homeowner/jobs/${job.id}`)}>
                  <div className="flex-between">
                    <div className="job-card-title">{job.title}</div>
                    <StatusBadge s={job.status} />
                  </div>
                  <div className="job-card-meta">
                    <span>📍 {job.zip_code}</span>
                    <span>🔧 {job.services}</span>
                    <span>💼 {job.bid_count} bid{job.bid_count !== 1 ? 's' : ''}</span>
                    <span>🕐 {timeAgo(job.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══ HOMEOWNER JOBS LIST ═══════════════════════════════════════════
export function HomeownerJobs() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    apiFetch('/api/jobs/my').then(setJobs).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="topbar">
        <div><div className="topbar-title">My Quote Requests</div><div className="topbar-sub">{jobs.length} total requests</div></div>
        <button className="btn btn-primary" onClick={() => navigate('/homeowner/submit')}>+ New Request</button>
      </div>
      <div className="page">
        <div className="tabs">
          {['all','open','accepted','completed'].map(s => (
            <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== 'all' && <span style={{ marginLeft: 6, color: 'var(--gray)', fontSize: '0.75rem' }}>({jobs.filter(j => j.status === s).length})</span>}
            </button>
          ))}
        </div>
        {filtered.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No {filter !== 'all' ? filter : ''} requests</h3><p>Submit a new quote request to get started.</p><button className="btn btn-primary" onClick={() => navigate('/homeowner/submit')}>Request Quotes</button></div>
          : <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              {filtered.map(job => (
                <div key={job.id} className="job-card" onClick={() => navigate(`/homeowner/jobs/${job.id}`)}>
                  <div className="flex-between mb-2">
                    <div className="job-card-title">{job.title}</div>
                    <StatusBadge s={job.status} />
                  </div>
                  <div className="job-card-meta">
                    <span>📍 {job.zip_code}</span>
                    <span>🔧 {job.services}</span>
                    {job.budget && <span>💰 {job.budget}</span>}
                    <span>💼 {job.bid_count} bid{job.bid_count !== 1 ? 's' : ''}</span>
                    <span>🕐 {timeAgo(job.created_at)}</span>
                  </div>
                  {job.description && <p className="job-card-desc">{job.description.substring(0,140)}{job.description.length > 140 ? '…' : ''}</p>}
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ══ HOMEOWNER JOB DETAIL ══════════════════════════════════════════
export function HomeownerJobDetail() {
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();
  const id = window.location.pathname.split('/').pop();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msgBody, setMsgBody] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeBidId, setActiveBidId] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [reviewed, setReviewed] = useState(false);

  const load = () => apiFetch(`/api/jobs/${id}`).then(setJob).catch(console.error).finally(() => setLoading(false));
  const loadMsgs = (bid) => {
    if (!bid) return;
    const companyUserId = bid.contact_name ? bid : null;
    // For simplicity, load messages for the job
    apiFetch(`/api/messages/${id}`).then(setMessages).catch(console.error);
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (activeBidId && job) { loadMsgs(job.bids?.find(b => b.id === activeBidId)); } }, [activeBidId]);

  const acceptBid = async (bidId) => {
    if (!window.confirm('Accept this bid? All other bids will be declined.')) return;
    setActionLoading(bidId);
    try {
      await apiFetch(`/api/bids/${bidId}/status`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:'accepted' }) });
      await load();
    } finally { setActionLoading(''); }
  };

  const declineBid = async (bidId) => {
    setActionLoading(bidId);
    try {
      await apiFetch(`/api/bids/${bidId}/status`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:'declined' }) });
      await load();
    } finally { setActionLoading(''); }
  };

  const sendMsg = async (recipientId) => {
    if (!msgBody.trim()) return;
    await apiFetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ jobId:id, recipientId, body:msgBody }) });
    setMsgBody('');
    loadMsgs(null);
  };

  const submitReview = async (companyId) => {
    await apiFetch('/api/reviews', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ jobId:id, companyId, ...review }) });
    setReviewed(true);
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!job) return <div className="page"><p>Job not found.</p></div>;

  const acceptedBid = job.bids?.find(b => b.status === 'accepted');

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }} onClick={() => navigate('/homeowner/jobs')}>← Back</button>
          <div className="topbar-title">{job.title}</div>
          <div className="topbar-sub">Posted {timeAgo(job.created_at)} · {job.bids?.length || 0} bids received</div>
        </div>
        <StatusBadge s={job.status} />
      </div>
      <div className="page">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'1.5rem', alignItems:'start' }}>
          <div>
            {/* Job Info */}
            <div className="card mb-3">
              <div className="card-title mb-2">Job Details</div>
              <div className="job-card-meta">
                <span>📍 {job.zip_code}</span>
                {job.address && <span>🏠 {job.address}</span>}
                <span>🔧 {job.services}</span>
                {job.budget && <span>💰 Budget: {job.budget}</span>}
              </div>
              {job.description && <p style={{ fontSize:'0.9rem', lineHeight:1.7, color:'var(--gray)', marginTop:'0.75rem' }}>{job.description}</p>}
              {job.files?.length > 0 && (
                <div style={{ marginTop:'1rem' }}>
                  <div className="form-label" style={{ marginBottom:8 }}>Uploaded Files</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                    {job.files.map((f,i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer"
                        style={{ background:'var(--off)', border:'1px solid var(--light)', borderRadius:8, padding:'0.4rem 0.75rem', fontSize:'0.78rem', color:'var(--water)' }}>
                        {f.type?.startsWith('video') ? '🎬' : '📷'} {f.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bids */}
            <div className="card">
              <div className="card-title mb-3">Bids Received ({job.bids?.length || 0})</div>
              {!job.bids?.length
                ? <div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Awaiting bids</h3><p>Local pool companies are reviewing your request. Check back soon.</p></div>
                : <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                    {job.bids.map(bid => (
                      <div key={bid.id} className={`bid-card ${bid.status}`}>
                        <div className="flex-between mb-2">
                          <div>
                            <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--ocean)' }}>{bid.company_name}</div>
                            <div style={{ fontSize:'0.78rem', color:'var(--gray)', marginTop:2, display:'flex', alignItems:'center', gap:8 }}>
                              {bid.verified ? <span className="badge badge-verified">✓ Verified</span> : null}
                              <Stars n={Math.round(bid.rating)} /> {bid.rating} ({bid.review_count} reviews)
                            </div>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:700, color:'var(--water)' }}>{fmt(bid.amount)}</div>
                            <StatusBadge s={bid.status} />
                          </div>
                        </div>
                        <p style={{ fontSize:'0.88rem', lineHeight:1.65, color:'var(--gray)', marginBottom:'0.75rem' }}>{bid.description}</p>
                        {bid.timeline && <div style={{ fontSize:'0.8rem', color:'var(--gray)' }}>⏱ Timeline: {bid.timeline}</div>}
                        {bid.warranty  && <div style={{ fontSize:'0.8rem', color:'var(--gray)', marginTop:4 }}>🛡️ Warranty: {bid.warranty}</div>}

                        {bid.status === 'pending' && job.status === 'open' && (
                          <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
                            <button className="btn btn-success btn-sm" disabled={!!actionLoading} onClick={() => acceptBid(bid.id)}>
                              {actionLoading === bid.id ? <span className="spinner"></span> : '✓ Accept Bid'}
                            </button>
                            <button className="btn btn-ghost btn-sm" disabled={!!actionLoading} onClick={() => declineBid(bid.id)}>Decline</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setActiveBidId(bid.id === activeBidId ? null : bid.id); loadMsgs(bid); }}>💬 Message</button>
                          </div>
                        )}

                        {bid.status === 'accepted' && job.status === 'accepted' && !reviewed && (
                          <div style={{ marginTop:'1rem', background:'var(--off)', borderRadius:10, padding:'1rem' }}>
                            <div style={{ fontWeight:600, fontSize:'0.88rem', marginBottom:8 }}>Leave a Review</div>
                            <div style={{ display:'flex', gap:4, marginBottom:8 }}>
                              {[1,2,3,4,5].map(n => (
                                <span key={n} style={{ fontSize:'1.5rem', cursor:'pointer', color: n <= review.rating ? 'var(--sun)' : 'var(--light)' }}
                                  onClick={() => setReview(r => ({ ...r, rating: n }))}>★</span>
                              ))}
                            </div>
                            <textarea className="form-textarea" rows={2} placeholder="Tell others about your experience…"
                              value={review.comment} onChange={e => setReview(r => ({ ...r, comment: e.target.value }))} />
                            <button className="btn btn-primary btn-sm mt-1" onClick={() => submitReview(bid.company_id)}>Submit Review</button>
                          </div>
                        )}
                        {reviewed && bid.status === 'accepted' && <p className="text-success text-sm mt-1">✓ Review submitted. Thank you!</p>}

                        {/* Message thread */}
                        {activeBidId === bid.id && (
                          <div style={{ marginTop:'1rem', borderTop:'1px solid var(--light)', paddingTop:'1rem' }}>
                            <div className="message-thread" style={{ marginBottom:'0.75rem' }}>
                              {messages.length === 0
                                ? <p style={{ fontSize:'0.82rem', color:'var(--gray)', textAlign:'center' }}>No messages yet.</p>
                                : messages.map(m => (
                                    <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: m.sender_id === user.id ? 'flex-end' : 'flex-start' }}>
                                      <div className={`message-bubble ${m.sender_id === user.id ? 'mine' : 'theirs'}`}>{m.body}</div>
                                      <div className="message-meta">{m.sender_name} · {timeAgo(m.created_at)}</div>
                                    </div>
                                  ))
                              }
                            </div>
                            <div style={{ display:'flex', gap:'0.5rem' }}>
                              <input className="form-input" style={{ fontSize:'0.85rem' }} value={msgBody}
                                onChange={e => setMsgBody(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMsg(bid.contact_id || '')}
                                placeholder="Type a message…" />
                              <button className="btn btn-primary btn-sm" onClick={() => sendMsg(bid.contact_id || '')}>Send</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* Sidebar summary */}
          <div>
            {acceptedBid && (
              <div className="card mb-3" style={{ borderColor:'var(--success)' }}>
                <div className="card-title" style={{ color:'var(--success)' }}>✅ Accepted</div>
                <p style={{ fontSize:'0.88rem', color:'var(--gray)', marginTop:8 }}>You accepted the bid from <strong>{acceptedBid.company_name}</strong> for <strong>{fmt(acceptedBid.amount)}</strong>.</p>
                <div style={{ marginTop:'1rem' }}>
                  <div style={{ fontWeight:600, fontSize:'0.82rem', marginBottom:4 }}>Contact:</div>
                  <div style={{ fontSize:'0.85rem', color:'var(--gray)' }}>{acceptedBid.contact_name}</div>
                  {acceptedBid.contact_phone && <div style={{ fontSize:'0.85rem', color:'var(--water)' }}>📞 {acceptedBid.contact_phone}</div>}
                </div>
              </div>
            )}
            <div className="card">
              <div className="card-title mb-2">Bid Summary</div>
              {job.bids?.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  <div className="flex-between text-sm"><span className="text-gray">Lowest bid</span><strong>{fmt(Math.min(...job.bids.map(b => b.amount)))}</strong></div>
                  <div className="flex-between text-sm"><span className="text-gray">Highest bid</span><strong>{fmt(Math.max(...job.bids.map(b => b.amount)))}</strong></div>
                  <div className="flex-between text-sm"><span className="text-gray">Average bid</span><strong>{fmt(job.bids.reduce((a,b) => a+b.amount,0)/job.bids.length)}</strong></div>
                  <div className="flex-between text-sm"><span className="text-gray">Total bids</span><strong>{job.bids.length}</strong></div>
                </div>
              ) : <p className="text-sm text-gray">No bids received yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══ SUBMIT JOB ════════════════════════════════════════════════════
export function SubmitJob() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title:'', description:'', services:[], zipCode:'', address:'', budget:'' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);

  const services = ['Routine Service','Repairs','New Pool Build','Renovation','Chemical Treatment','Equipment Upgrade'];

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleService = s => setForm(f => ({
    ...f, services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s]
  }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.services.length) { setError('Please select at least one service.'); return; }
    setLoading(true); setError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, Array.isArray(v) ? v.join(',') : v));
    files.forEach(f => fd.append('files', f));
    try {
      const r = await fetch('/api/jobs', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      navigate('/homeowner/jobs');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom:8 }} onClick={() => navigate('/homeowner')}>← Back</button>
          <div className="topbar-title">Request Pool Quotes</div>
          <div className="topbar-sub">Upload photos and tell us what you need — get bids from local pros within 24 hours</div>
        </div>
      </div>
      <div className="page" style={{ maxWidth:700 }}>
        <div className="card">
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Request Title *</label>
              <input className="form-input" value={form.title} onChange={set('title')} placeholder="e.g. Weekly Pool Maintenance Needed" required />
            </div>
            <div className="form-group">
              <label className="form-label">Services Needed *</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.5rem' }}>
                {services.map(s => (
                  <div key={s} onClick={() => toggleService(s)}
                    style={{ border:`1.5px solid ${form.services.includes(s) ? 'var(--aqua)' : 'var(--light)'}`,
                      background: form.services.includes(s) ? 'rgba(46,196,232,0.08)' : 'var(--off)',
                      borderRadius:10, padding:'0.65rem 0.75rem', cursor:'pointer', fontSize:'0.83rem',
                      fontWeight:500, color: form.services.includes(s) ? 'var(--water)' : 'var(--ocean)',
                      transition:'all 0.2s' }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Zip Code *</label>
                <input className="form-input" value={form.zipCode} onChange={set('zipCode')} placeholder="33139" required />
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Budget</label>
                <input className="form-input" value={form.budget} onChange={set('budget')} placeholder="e.g. $500-1,000" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Property Address (optional)</label>
              <input className="form-input" value={form.address} onChange={set('address')} placeholder="123 Ocean Dr, Miami Beach, FL" />
            </div>
            <div className="form-group">
              <label className="form-label">Upload Pool Photos & Video</label>
              <div className={`dropzone ${over ? 'over' : ''}`}
                onDragOver={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={e => { e.preventDefault(); setOver(false); setFiles(prev => [...prev, ...e.dataTransfer.files]); }}
                onClick={() => document.getElementById('file-upload').click()}>
                <input id="file-upload" type="file" multiple accept="image/*,video/*" style={{ display:'none' }}
                  onChange={e => setFiles(prev => [...prev, ...e.target.files])} />
                <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📸</div>
                <p>Drag & drop or click to upload</p>
                <p style={{ fontSize:'0.75rem', marginTop:4 }}>JPG, PNG, HEIC, MP4, MOV · Max 10 files</p>
              </div>
              {files.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginTop:'0.5rem' }}>
                  {Array.from(files).map((f,i) => (
                    <div key={i} style={{ background:'rgba(46,196,232,0.1)', border:'1px solid rgba(46,196,232,0.25)', borderRadius:100, padding:'0.25rem 0.75rem', fontSize:'0.75rem', color:'var(--water)', display:'flex', alignItems:'center', gap:4 }}>
                      {f.type.startsWith('video') ? '🎬' : '📷'} {f.name.length>20?f.name.slice(0,18)+'…':f.name}
                      <span style={{ cursor:'pointer', opacity:0.6 }} onClick={() => setFiles(prev => Array.from(prev).filter((_,j)=>j!==i))}>✕</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={4} value={form.description} onChange={set('description')}
                placeholder="Describe your pool, any issues you've noticed, or what you'd like built…" />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><span className="spinner"></span> Submitting…</> : '📬 Submit Quote Request — Free'}
            </button>
            <p style={{ textAlign:'center', fontSize:'0.78rem', color:'var(--gray)', marginTop:'0.75rem' }}>🔒 Your info is never sold. Local pros contact you — not the other way around.</p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default HomeownerDashboard;
