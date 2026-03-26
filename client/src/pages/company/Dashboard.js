import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function fmt(amt) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(amt); }
function timeAgo(d) { const s=(Date.now()-new Date(d+'Z'))/1000; if(s<60)return 'just now'; if(s<3600)return `${Math.floor(s/60)}m ago`; if(s<86400)return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; }
function Stars({n}) { return <span>{[1,2,3,4,5].map(i=><span key={i} style={{color:i<=n?'var(--sun)':'var(--light)'}}>★</span>)}</span>; }
function StatusBadge({s}) { return <span className={`badge badge-${s}`}>{s.replace('_',' ')}</span>; }

// ══ COMPANY DASHBOARD ══════════════════════════════════════════
export function CompanyDashboard() {
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();
  const [bids, setBids] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/bids/my'),
      apiFetch('/api/jobs'),
      apiFetch('/api/auth/me')
    ]).then(([b,j,me]) => { setBids(b); setJobs(j); setCompany(me.company); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const pending  = bids.filter(b => b.status==='pending');
  const accepted = bids.filter(b => b.status==='accepted');
  const openJobs = jobs.filter(j => !j.already_bid);

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Welcome, {company?.company_name || user?.name} 👋</div>
          <div className="topbar-sub">{company?.verified ? '✅ Verified Partner' : '⏳ Pending Verification'} · {company?.plan} plan</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/company/browse')}>Browse Open Jobs</button>
      </div>
      <div className="page">
        <div className="stats-grid">
          <div className="stat-card blue"><div className="stat-card-icon">🔍</div><div className="stat-card-num">{openJobs.length}</div><div className="stat-card-label">Open Jobs Available</div></div>
          <div className="stat-card sun"><div className="stat-card-icon">📤</div><div className="stat-card-num">{bids.length}</div><div className="stat-card-label">Total Bids Submitted</div></div>
          <div className="stat-card aqua"><div className="stat-card-icon">⏳</div><div className="stat-card-num">{pending.length}</div><div className="stat-card-label">Pending Bids</div></div>
          <div className="stat-card green"><div className="stat-card-icon">🏆</div><div className="stat-card-num">{accepted.length}</div><div className="stat-card-label">Jobs Won</div></div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Bids</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/company/bids')}>View All</button>
            </div>
            {bids.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">📤</div><h3>No bids yet</h3><p>Browse open jobs and submit your first bid.</p></div>
              : bids.slice(0,5).map(bid => (
                <div key={bid.id} style={{ padding:'0.75rem 0', borderBottom:'1px solid var(--light)' }}>
                  <div className="flex-between">
                    <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{bid.job_title}</div>
                    <StatusBadge s={bid.status} />
                  </div>
                  <div style={{ fontSize:'0.78rem', color:'var(--gray)', marginTop:4, display:'flex', gap:12 }}>
                    <span>{fmt(bid.amount)}</span>
                    <span>{timeAgo(bid.created_at)}</span>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">New Job Leads</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/company/browse')}>Browse All</button>
            </div>
            {openJobs.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">🔍</div><h3>All caught up!</h3><p>You've bid on all available jobs. Check back soon.</p></div>
              : openJobs.slice(0,4).map(job => (
                <div key={job.id} className="job-card" style={{ marginBottom:'0.75rem' }} onClick={() => navigate(`/company/jobs/${job.id}`)}>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:4 }}>{job.title}</div>
                  <div style={{ fontSize:'0.78rem', color:'var(--gray)', display:'flex', gap:10, flexWrap:'wrap' }}>
                    <span>📍 {job.zip_code}</span>
                    <span>🔧 {job.services}</span>
                    {job.budget && <span>💰 {job.budget}</span>}
                    <span>💼 {job.bid_count} bids</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ══ BROWSE JOBS ═════════════════════════════════════════════════
export function BrowseJobs() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');

  useEffect(() => { apiFetch('/api/jobs').then(setJobs).finally(() => setLoading(false)); }, []);

  const allServices = ['all','Routine Service','Repairs','New Pool Build','Renovation','Chemical Treatment','Equipment Upgrade'];

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.zip_code.includes(search) || j.description?.toLowerCase().includes(search.toLowerCase());
    const matchService = serviceFilter === 'all' || j.services.includes(serviceFilter);
    return matchSearch && matchService;
  });

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="topbar">
        <div><div className="topbar-title">Browse Open Jobs</div><div className="topbar-sub">{filtered.length} jobs available in your area</div></div>
      </div>
      <div className="page">
        <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
          <input className="form-input" style={{ maxWidth:300 }} placeholder="Search by title, zip, or keyword…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" style={{ maxWidth:220 }} value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
            {allServices.map(s => <option key={s} value={s}>{s === 'all' ? 'All Services' : s}</option>)}
          </select>
        </div>

        {filtered.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">🔍</div><h3>No matching jobs</h3><p>Try adjusting your search or filters.</p></div>
          : <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {filtered.map(job => (
                <div key={job.id} className="job-card" onClick={() => navigate(`/company/jobs/${job.id}`)}>
                  <div className="flex-between mb-2">
                    <div className="job-card-title">{job.title}</div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      {job.already_bid ? <span className="badge badge-pending">Bid Submitted</span> : <span className="badge badge-open">Open</span>}
                    </div>
                  </div>
                  <div className="job-card-meta">
                    <span>📍 {job.zip_code}</span>
                    <span>🔧 {job.services}</span>
                    {job.budget && <span>💰 {job.budget}</span>}
                    <span>💼 {job.bid_count} bid{job.bid_count!==1?'s':''} so far</span>
                    <span>🕐 {timeAgo(job.created_at)}</span>
                  </div>
                  {job.description && <p className="job-card-desc">{job.description.substring(0,160)}{job.description.length>160?'…':''}</p>}
                  <div className="job-card-footer">
                    <div style={{ fontSize:'0.78rem', color:'var(--gray)' }}>{job.files?.length || 0} photo{(job.files?.length||0)!==1?'s':''} uploaded</div>
                    {!job.already_bid && <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/company/jobs/${job.id}`); }}>View & Bid →</button>}
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ══ COMPANY JOB DETAIL (BID SUBMISSION) ═════════════════════════
export function CompanyJobDetail() {
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();
  const id = window.location.pathname.split('/').pop();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState({ amount:'', description:'', timeline:'', warranty:'' });
  const [submitting, setSubmitting] = useState(false);
  const [bidDone, setBidDone] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [msgBody, setMsgBody] = useState('');

  const load = () => apiFetch(`/api/jobs/${id}`).then(data => { setJob(data); if(data.bids?.length) setBidDone(true); }).finally(() => setLoading(false));

  useEffect(() => { load(); apiFetch(`/api/messages/${id}`).then(setMessages).catch(()=>{}); }, [id]);

  const submitBid = async (e) => {
    e.preventDefault();
    if (!bid.amount || !bid.description) { setError('Amount and description are required.'); return; }
    setSubmitting(true); setError('');
    try {
      await apiFetch('/api/bids', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ jobId:id, ...bid }) });
      setBidDone(true); load();
    } catch(err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const sendMsg = async () => {
    if (!msgBody.trim() || !job) return;
    await apiFetch('/api/messages', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ jobId:id, recipientId:job.homeowner_id, body:msgBody }) });
    setMsgBody('');
    apiFetch(`/api/messages/${id}`).then(setMessages).catch(()=>{});
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!job) return <div className="page"><p>Job not found.</p></div>;

  const myBid = job.bids?.[0];

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom:8 }} onClick={() => navigate('/company/browse')}>← Back to Jobs</button>
          <div className="topbar-title">{job.title}</div>
          <div className="topbar-sub">Posted {timeAgo(job.created_at)} · {job.zip_code}</div>
        </div>
        {myBid && <StatusBadge s={myBid.status} />}
      </div>
      <div className="page">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'1.5rem', alignItems:'start' }}>
          <div>
            {/* Job info */}
            <div className="card mb-3">
              <div className="card-title mb-2">Job Details</div>
              <div className="job-card-meta">
                <span>📍 {job.zip_code}</span>
                <span>🔧 {job.services}</span>
                {job.budget && <span>💰 Budget: {job.budget}</span>}
              </div>
              {job.description && <p style={{ fontSize:'0.9rem', lineHeight:1.7, color:'var(--gray)', margin:'0.75rem 0' }}>{job.description}</p>}
              {job.files?.length > 0 && (
                <div>
                  <div className="form-label" style={{ marginBottom:8 }}>Uploaded Files ({job.files.length})</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                    {job.files.map((f,i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer"
                        style={{ background:'var(--off)', border:'1px solid var(--light)', borderRadius:8, padding:'0.4rem 0.75rem', fontSize:'0.78rem', color:'var(--water)' }}>
                        {f.type?.startsWith('video')?'🎬':'📷'} {f.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bid form or existing bid */}
            <div className="card mb-3">
              {bidDone && myBid ? (
                <div>
                  <div className="card-title mb-2">Your Bid <StatusBadge s={myBid.status} /></div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'2rem', fontWeight:700, color:'var(--water)', marginBottom:'0.5rem' }}>{fmt(myBid.amount)}</div>
                  <p style={{ fontSize:'0.88rem', lineHeight:1.65, color:'var(--gray)' }}>{myBid.description}</p>
                  {myBid.timeline && <p style={{ fontSize:'0.82rem', color:'var(--gray)', marginTop:8 }}>⏱ {myBid.timeline}</p>}
                  {myBid.warranty && <p style={{ fontSize:'0.82rem', color:'var(--gray)', marginTop:4 }}>🛡️ {myBid.warranty}</p>}
                  {myBid.status === 'accepted' && (
                    <div style={{ marginTop:'1rem', background:'rgba(61,220,132,0.08)', border:'1px solid rgba(61,220,132,0.3)', borderRadius:10, padding:'1rem' }}>
                      <div style={{ fontWeight:700, color:'var(--success)', marginBottom:4 }}>🎉 Bid Accepted!</div>
                      <p style={{ fontSize:'0.85rem', color:'var(--gray)' }}>The homeowner accepted your bid. Reach out to confirm the schedule.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="card-title mb-3">Submit Your Bid</div>
                  <form onSubmit={submitBid}>
                    <div className="form-group">
                      <label className="form-label">Your Bid Amount ($) *</label>
                      <input className="form-input" type="number" min="1" value={bid.amount}
                        onChange={e => setBid(b=>({...b,amount:e.target.value}))} placeholder="1200" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bid Description *</label>
                      <textarea className="form-textarea" rows={4} value={bid.description}
                        onChange={e => setBid(b=>({...b,description:e.target.value}))}
                        placeholder="Describe exactly what your bid includes — parts, labor, chemicals, visits, etc." required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Timeline</label>
                        <input className="form-input" value={bid.timeline}
                          onChange={e => setBid(b=>({...b,timeline:e.target.value}))} placeholder="e.g. 3-5 business days" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Warranty</label>
                        <input className="form-input" value={bid.warranty}
                          onChange={e => setBid(b=>({...b,warranty:e.target.value}))} placeholder="e.g. 90-day labor warranty" />
                      </div>
                    </div>
                    {error && <p className="form-error">{error}</p>}
                    <button className="btn btn-primary btn-full" disabled={submitting}>
                      {submitting ? <><span className="spinner"></span> Submitting…</> : '📤 Submit Bid'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="card">
              <div className="card-title mb-3">💬 Message Homeowner</div>
              <div className="message-thread" style={{ marginBottom:'0.75rem' }}>
                {messages.length === 0
                  ? <p style={{ fontSize:'0.82rem', color:'var(--gray)', textAlign:'center' }}>No messages yet. Say hello!</p>
                  : messages.map(m => (
                      <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: m.sender_id===user.id?'flex-end':'flex-start' }}>
                        <div className={`message-bubble ${m.sender_id===user.id?'mine':'theirs'}`}>{m.body}</div>
                        <div className="message-meta">{m.sender_name} · {timeAgo(m.created_at)}</div>
                      </div>
                    ))
                }
              </div>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <input className="form-input" style={{ fontSize:'0.85rem' }} value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && sendMsg()}
                  placeholder="Type a message to the homeowner…" />
                <button className="btn btn-primary btn-sm" onClick={sendMsg}>Send</button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="card" style={{ position:'sticky', top:80 }}>
            <div className="card-title mb-3">Job Summary</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <div className="flex-between text-sm"><span className="text-gray">Status</span><StatusBadge s={job.status} /></div>
              <div className="flex-between text-sm"><span className="text-gray">Location</span><strong>{job.zip_code}</strong></div>
              <div className="flex-between text-sm"><span className="text-gray">Service Type</span><strong style={{ textAlign:'right', maxWidth:160 }}>{job.services}</strong></div>
              {job.budget && <div className="flex-between text-sm"><span className="text-gray">Budget</span><strong>{job.budget}</strong></div>}
              <div className="flex-between text-sm"><span className="text-gray">Photos</span><strong>{job.files?.length || 0} files</strong></div>
              <div className="flex-between text-sm"><span className="text-gray">Posted</span><strong>{timeAgo(job.created_at)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══ MY BIDS ══════════════════════════════════════════════════════
export function MyBids() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => apiFetch('/api/bids/my').then(setBids).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const withdraw = async (id) => {
    if (!window.confirm('Withdraw this bid?')) return;
    await apiFetch(`/api/bids/${id}/withdraw`, { method:'PATCH' });
    load();
  };

  const filtered = filter === 'all' ? bids : bids.filter(b => b.status === filter);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="topbar">
        <div><div className="topbar-title">My Bids</div><div className="topbar-sub">{bids.length} total bids submitted</div></div>
      </div>
      <div className="page">
        <div className="tabs">
          {['all','pending','accepted','declined','withdrawn'].map(s => (
            <button key={s} className={`tab ${filter===s?'active':''}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
              {s!=='all' && <span style={{ marginLeft:6, color:'var(--gray)', fontSize:'0.75rem' }}>({bids.filter(b=>b.status===s).length})</span>}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">📤</div><h3>No bids here</h3><p>Browse open jobs and submit bids to win new business.</p><button className="btn btn-primary" onClick={() => navigate('/company/browse')}>Browse Jobs</button></div>
          : <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {filtered.map(bid => (
                <div key={bid.id} className={`card bid-card ${bid.status}`} style={{ cursor:'default' }}>
                  <div className="flex-between mb-2">
                    <div>
                      <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--ocean)', cursor:'pointer', textDecoration:'underline' }}
                        onClick={() => navigate(`/company/jobs/${bid.job_id}`)}>
                        {bid.job_title}
                      </div>
                      <div style={{ fontSize:'0.78rem', color:'var(--gray)', marginTop:2 }}>Homeowner: {bid.homeowner_name} · 📍 {bid.zip_code}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', fontWeight:700, color:'var(--water)' }}>{fmt(bid.amount)}</div>
                      <StatusBadge s={bid.status} />
                    </div>
                  </div>
                  <p style={{ fontSize:'0.87rem', lineHeight:1.65, color:'var(--gray)', marginBottom:'0.5rem' }}>{bid.description.substring(0,180)}{bid.description.length>180?'…':''}</p>
                  <div style={{ fontSize:'0.78rem', color:'var(--gray)', display:'flex', gap:16 }}>
                    {bid.timeline && <span>⏱ {bid.timeline}</span>}
                    <span>🕐 {timeAgo(bid.created_at)}</span>
                    <span>🔧 {bid.services}</span>
                  </div>
                  {bid.status === 'pending' && (
                    <button className="btn btn-ghost btn-sm mt-2" onClick={() => withdraw(bid.id)}>Withdraw Bid</button>
                  )}
                  {bid.status === 'accepted' && (
                    <div style={{ marginTop:'0.75rem', background:'rgba(61,220,132,0.08)', border:'1px solid rgba(61,220,132,0.3)', borderRadius:8, padding:'0.75rem', fontSize:'0.85rem', color:'var(--success)', fontWeight:600 }}>
                      🎉 Your bid was accepted! Contact the homeowner to confirm the schedule.
                    </div>
                  )}
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

export default CompanyDashboard;
