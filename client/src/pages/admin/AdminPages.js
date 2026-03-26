import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

function timeAgo(d) { const s=(Date.now()-new Date(d+'Z'))/1000; if(s<60)return 'just now'; if(s<3600)return `${Math.floor(s/60)}m ago`; if(s<86400)return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; }
function fmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n); }
function StatusBadge({s}) { return <span className={`badge badge-${s}`}>{s?.replace('_',' ')}</span>; }
function Stars({n}) { return <span>{[1,2,3,4,5].map(i=><span key={i} style={{color:i<=n?'var(--sun)':'var(--light)'}}>★</span>)}</span>; }

export function AdminDashboard() {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetch('/api/admin/stats'), apiFetch('/api/admin/jobs')])
      .then(([s,j]) => { setStats(s); setJobs(j.slice(0,8)); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="topbar">
        <div><div className="topbar-title">Admin Dashboard</div><div className="topbar-sub">Platform overview — all activity at a glance</div></div>
      </div>
      <div className="page">
        <div className="stats-grid">
          {[
            { icon:'👥', num:stats.totalUsers,    label:'Total Users',       cls:'blue'  },
            { icon:'🏡', num:stats.homeowners,    label:'Homeowners',        cls:'sun'   },
            { icon:'🔧', num:stats.companies,     label:'Pool Companies',    cls:'aqua'  },
            { icon:'📋', num:stats.totalJobs,     label:'Total Jobs',        cls:'green' },
            { icon:'🔓', num:stats.openJobs,      label:'Open Jobs',         cls:'blue'  },
            { icon:'✅', num:stats.acceptedJobs,  label:'Accepted Jobs',     cls:'green' },
            { icon:'💼', num:stats.totalBids,     label:'Total Bids',        cls:'aqua'  },
            { icon:'💬', num:stats.totalMessages, label:'Messages Sent',     cls:'sun'   },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`}>
              <div className="stat-card-icon">{s.icon}</div>
              <div className="stat-card-num">{s.num}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Recent Job Requests</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Job</th><th>Homeowner</th><th>Service</th><th>ZIP</th><th>Bids</th><th>Status</th><th>Posted</th></tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td style={{fontWeight:600}}>{j.title.substring(0,38)}{j.title.length>38?'…':''}</td>
                    <td>{j.homeowner_name}</td>
                    <td style={{fontSize:'0.82rem',color:'var(--gray)'}}>{j.services}</td>
                    <td>{j.zip_code}</td>
                    <td><span className="badge badge-open">{j.bid_count}</span></td>
                    <td><StatusBadge s={j.status} /></td>
                    <td style={{color:'var(--gray)',fontSize:'0.82rem'}}>{timeAgo(j.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const { apiFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { apiFetch('/api/admin/users').then(setUsers).finally(() => setLoading(false)); }, []);

  const filtered = users.filter(u => {
    const m = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const r = roleFilter === 'all' || u.role === roleFilter;
    return m && r;
  });

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="topbar">
        <div><div className="topbar-title">Users</div><div className="topbar-sub">{users.length} registered users</div></div>
      </div>
      <div className="page">
        <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
          <input className="form-input" style={{maxWidth:280}} placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="form-select" style={{maxWidth:180}} value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="homeowner">Homeowners</option>
            <option value="company">Pool Companies</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,var(--aqua),var(--water))',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'0.75rem',flexShrink:0}}>
                          {u.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <span style={{fontWeight:600}}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{color:'var(--gray)'}}>{u.email}</td>
                    <td style={{color:'var(--gray)'}}>{u.phone||'—'}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td style={{color:'var(--gray)',fontSize:'0.82rem'}}>{timeAgo(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length===0 && <div className="empty-state"><div className="empty-state-icon">👥</div><h3>No users found</h3></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminJobs() {
  const { apiFetch } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);

  useEffect(() => { apiFetch('/api/admin/jobs').then(setJobs).finally(()=>setLoading(false)); }, []);

  const openDetail = async (job) => {
    setSelected(job); setJobDetail(null);
    apiFetch(`/api/jobs/${job.id}`).then(setJobDetail).catch(()=>{});
  };

  const filtered = jobs.filter(j => {
    const m = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.homeowner_name.toLowerCase().includes(search.toLowerCase()) || j.zip_code.includes(search);
    const s = statusFilter==='all' || j.status===statusFilter;
    return m && s;
  });

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="topbar">
        <div><div className="topbar-title">All Jobs</div><div className="topbar-sub">{jobs.length} total job requests</div></div>
      </div>
      <div className="page">
        <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
          <input className="form-input" style={{maxWidth:280}} placeholder="Search jobs…" value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="form-select" style={{maxWidth:180}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            {['all','open','accepted','completed','cancelled'].map(s=><option key={s} value={s}>{s==='all'?'All Statuses':s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div style={{display:'grid',gridTemplateColumns:selected?'1fr 400px':'1fr',gap:'1.5rem',alignItems:'start'}}>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Job</th><th>Homeowner</th><th>Service</th><th>ZIP</th><th>Bids</th><th>Status</th><th>Posted</th></tr></thead>
                <tbody>
                  {filtered.map(j => (
                    <tr key={j.id} onClick={()=>openDetail(j)} style={{cursor:'pointer',background:selected?.id===j.id?'rgba(46,196,232,0.05)':''}}>
                      <td style={{fontWeight:600}}>{j.title.substring(0,32)}{j.title.length>32?'…':''}</td>
                      <td>{j.homeowner_name}</td>
                      <td style={{fontSize:'0.8rem',color:'var(--gray)'}}>{j.services.substring(0,22)}</td>
                      <td>{j.zip_code}</td>
                      <td><span className="badge badge-open">{j.bid_count}</span></td>
                      <td><StatusBadge s={j.status} /></td>
                      <td style={{color:'var(--gray)',fontSize:'0.8rem'}}>{timeAgo(j.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length===0&&<div className="empty-state"><div className="empty-state-icon">📋</div><h3>No jobs found</h3></div>}
            </div>
          </div>
          {selected && (
            <div className="card" style={{position:'sticky',top:80}}>
              <div className="flex-between mb-3">
                <div className="card-title">Job Detail</div>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setSelected(null);setJobDetail(null);}}>✕</button>
              </div>
              {!jobDetail
                ? <div style={{textAlign:'center',padding:'2rem'}}><div className="spinner"></div></div>
                : <>
                    <div style={{fontWeight:700,fontSize:'1rem',marginBottom:8}}>{jobDetail.title}</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:'1rem'}}>
                      <StatusBadge s={jobDetail.status} />
                      <span className="badge badge-company">📍 {jobDetail.zip_code}</span>
                    </div>
                    {jobDetail.description&&<p style={{fontSize:'0.85rem',color:'var(--gray)',lineHeight:1.65,marginBottom:'1rem'}}>{jobDetail.description}</p>}
                    <div style={{fontSize:'0.8rem',color:'var(--gray)',marginBottom:'1rem',display:'flex',flexDirection:'column',gap:4}}>
                      {jobDetail.budget&&<span>💰 Budget: {jobDetail.budget}</span>}
                      <span>🔧 {jobDetail.services}</span>
                      <span>📎 {jobDetail.files?.length||0} file(s)</span>
                      <span>🕐 {timeAgo(jobDetail.created_at)}</span>
                    </div>
                    <hr className="divider"/>
                    <div style={{fontWeight:600,fontSize:'0.85rem',marginBottom:'0.75rem'}}>Bids ({jobDetail.bids?.length||0})</div>
                    {jobDetail.bids?.length===0
                      ? <p style={{fontSize:'0.82rem',color:'var(--gray)'}}>No bids yet.</p>
                      : jobDetail.bids.map(b=>(
                          <div key={b.id} style={{background:'var(--off)',borderRadius:10,padding:'0.75rem',marginBottom:'0.5rem'}}>
                            <div className="flex-between">
                              <span style={{fontWeight:600,fontSize:'0.88rem'}}>{b.company_name}</span>
                              <span style={{fontWeight:700,color:'var(--water)'}}>{fmt(b.amount)}</span>
                            </div>
                            <div style={{display:'flex',gap:8,marginTop:4}}><StatusBadge s={b.status}/></div>
                            <p style={{fontSize:'0.8rem',color:'var(--gray)',marginTop:6,lineHeight:1.5}}>{b.description.substring(0,100)}{b.description.length>100?'…':''}</p>
                          </div>
                        ))
                    }
                  </>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminCompanies() {
  const { apiFetch } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [verifying, setVerifying] = useState('');

  const load = () => apiFetch('/api/admin/companies').then(setCompanies).finally(()=>setLoading(false));
  useEffect(() => { load(); }, []);

  const verify = async (id) => {
    setVerifying(id);
    try { await apiFetch(`/api/admin/companies/${id}/verify`,{method:'PATCH'}); load(); }
    finally { setVerifying(''); }
  };

  const filtered = companies.filter(c => {
    const m = !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const p = planFilter==='all' || c.plan===planFilter;
    return m && p;
  });

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="topbar-title">Pool Companies</div>
          <div className="topbar-sub">{companies.length} partner companies · {companies.filter(c=>!c.verified).length} pending verification</div>
        </div>
      </div>
      <div className="page">
        <div style={{display:'flex',gap:'1rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
          <input className="form-input" style={{maxWidth:280}} placeholder="Search companies…" value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="form-select" style={{maxWidth:200}} value={planFilter} onChange={e=>setPlanFilter(e.target.value)}>
            <option value="all">All Plans</option>
            <option value="starter">Starter ($99/mo)</option>
            <option value="pro">Pro ($249/mo)</option>
            <option value="pay_per_bid">Pay Per Bid (8%)</option>
          </select>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {filtered.map(c => (
            <div key={c.id} className="card" style={{borderLeft:`3px solid ${c.verified?'var(--success)':'var(--warn)'}`}}>
              <div className="flex-between mb-2" style={{flexWrap:'wrap',gap:'0.75rem'}}>
                <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                  <div style={{width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,var(--aqua),var(--water))',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'1.2rem',flexShrink:0}}>
                    {c.company_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'1rem',color:'var(--ocean)'}}>{c.company_name}</div>
                    <div style={{fontSize:'0.78rem',color:'var(--gray)',marginTop:2}}>{c.contact_name} · {c.email}{c.phone&&` · ${c.phone}`}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  {c.verified
                    ? <span className="badge badge-verified">✓ Verified</span>
                    : <button className="btn btn-primary btn-sm" disabled={verifying===c.id} onClick={()=>verify(c.id)}>
                        {verifying===c.id?<span className="spinner"></span>:'✓ Verify Now'}
                      </button>
                  }
                  <span className={`badge ${c.plan==='pro'?'badge-accepted':c.plan==='pay_per_bid'?'badge-company':'badge-pending'}`}>
                    {c.plan.replace('_',' ')}
                  </span>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'0.75rem',marginTop:'0.75rem'}}>
                {[
                  {label:'Rating', value: c.rating ? <>{c.rating} <Stars n={Math.round(c.rating)}/></> : 'No reviews yet'},
                  {label:'Reviews', value: c.review_count},
                  {label:'License', value: c.license_no||'—'},
                  {label:'Service Area', value: c.service_area?.split(',').slice(0,3).join(', ')+(c.service_area?.split(',').length>3?'…':'')||'—'},
                ].map(item => (
                  <div key={item.label} style={{background:'var(--off)',borderRadius:8,padding:'0.6rem 0.75rem'}}>
                    <div style={{fontSize:'0.68rem',color:'var(--gray)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:'0.88rem',fontWeight:600,color:'var(--ocean)'}}>{item.value}</div>
                  </div>
                ))}
              </div>
              {c.description&&<p style={{fontSize:'0.83rem',color:'var(--gray)',marginTop:'0.75rem',lineHeight:1.6}}>{c.description}</p>}
            </div>
          ))}
          {filtered.length===0&&<div className="empty-state"><div className="empty-state-icon">🏢</div><h3>No companies found</h3><p>Try adjusting your search or filters.</p></div>}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
