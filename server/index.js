const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { auth, requireRole, JWT_SECRET } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ──────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ── AUTH ROUTES ─────────────────────────────────────────────────

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role, phone, companyName, licenseNo, serviceArea } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });
  if (!['homeowner', 'company'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,datetime('now'))`).run(id, email, hash, role, name, phone || null);

  if (role === 'company') {
    const cid = uuidv4();
    db.prepare(`INSERT INTO companies VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(
      cid, id, companyName || name, licenseNo || null, serviceArea || null, null, 'starter', 0, 0, 0
    );
  }

  const token = jwt.sign({ id, email, role, name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, email, role, name } });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

// Get current user profile
app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,email,role,name,phone,created_at FROM users WHERE id=?').get(req.user.id);
  let company = null;
  if (user.role === 'company') {
    company = db.prepare('SELECT * FROM companies WHERE user_id=?').get(user.id);
  }
  res.json({ user, company });
});

// ── JOB ROUTES ──────────────────────────────────────────────────

// Create job (homeowner)
app.post('/api/jobs', auth, requireRole('homeowner'), upload.array('files', 10), (req, res) => {
  const { title, description, services, zipCode, address, budget } = req.body;
  if (!title || !services || !zipCode) return res.status(400).json({ error: 'Missing required fields' });

  const files = (req.files || []).map(f => ({ name: f.originalname, url: `/uploads/${f.filename}`, type: f.mimetype }));
  const id = uuidv4();

  db.prepare(`INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    id, req.user.id, title, description || null, services, zipCode, address || null, 'open', JSON.stringify(files), budget || null
  );

  res.json({ id, message: 'Job created successfully' });
});

// Get homeowner's own jobs
app.get('/api/jobs/my', auth, requireRole('homeowner'), (req, res) => {
  const jobs = db.prepare(`
    SELECT j.*, 
      (SELECT COUNT(*) FROM bids WHERE job_id=j.id) as bid_count
    FROM jobs j WHERE j.homeowner_id=? ORDER BY j.created_at DESC
  `).all(req.user.id);
  res.json(jobs.map(j => ({ ...j, files: JSON.parse(j.files || '[]'), services: j.services })));
});

// Get single job with bids (homeowner sees all bids, company sees own bid)
app.get('/api/jobs/:id', auth, (req, res) => {
  const job = db.prepare(`
    SELECT j.*, u.name as homeowner_name, u.phone as homeowner_phone
    FROM jobs j JOIN users u ON u.id=j.homeowner_id
    WHERE j.id=?
  `).get(req.params.id);

  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Access control
  if (req.user.role === 'homeowner' && job.homeowner_id !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });

  job.files = JSON.parse(job.files || '[]');

  // Get bids
  let bids;
  if (req.user.role === 'homeowner' || req.user.role === 'admin') {
    bids = db.prepare(`
      SELECT b.*, c.company_name, c.rating, c.review_count, c.verified, u.name as contact_name, u.phone as contact_phone
      FROM bids b
      JOIN companies c ON c.id=b.company_id
      JOIN users u ON u.id=c.user_id
      WHERE b.job_id=? ORDER BY b.amount ASC
    `).all(req.params.id);
  } else if (req.user.role === 'company') {
    const company = db.prepare('SELECT id FROM companies WHERE user_id=?').get(req.user.id);
    bids = company ? db.prepare(`
      SELECT b.*, c.company_name, c.rating, c.verified
      FROM bids b JOIN companies c ON c.id=b.company_id
      WHERE b.job_id=? AND b.company_id=?
    `).all(req.params.id, company.id) : [];
  }

  res.json({ ...job, bids });
});

// Get ALL open jobs (for companies to browse)
app.get('/api/jobs', auth, requireRole('company', 'admin'), (req, res) => {
  const company = req.user.role === 'company'
    ? db.prepare('SELECT * FROM companies WHERE user_id=?').get(req.user.id)
    : null;

  const jobs = db.prepare(`
    SELECT j.*,
      (SELECT COUNT(*) FROM bids WHERE job_id=j.id) as bid_count,
      (SELECT COUNT(*) FROM bids WHERE job_id=j.id AND company_id=?) as already_bid
    FROM jobs j
    WHERE j.status='open'
    ORDER BY j.created_at DESC
  `).all(company?.id || null);

  res.json(jobs.map(j => ({ ...j, files: JSON.parse(j.files || '[]') })));
});

// Update job status
app.patch('/api/jobs/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const job = db.prepare('SELECT * FROM jobs WHERE id=?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'homeowner' && job.homeowner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare(`UPDATE jobs SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);
  res.json({ success: true });
});

// ── BID ROUTES ──────────────────────────────────────────────────

// Submit bid (company)
app.post('/api/bids', auth, requireRole('company'), (req, res) => {
  const { jobId, amount, description, timeline, warranty } = req.body;
  if (!jobId || !amount || !description) return res.status(400).json({ error: 'Missing required fields' });

  const company = db.prepare('SELECT * FROM companies WHERE user_id=?').get(req.user.id);
  if (!company) return res.status(400).json({ error: 'Company profile not found' });

  const job = db.prepare('SELECT id, status FROM jobs WHERE id=?').get(jobId);
  if (!job || job.status !== 'open') return res.status(400).json({ error: 'Job not available for bidding' });

  const existing = db.prepare('SELECT id FROM bids WHERE job_id=? AND company_id=?').get(jobId, company.id);
  if (existing) return res.status(409).json({ error: 'You have already submitted a bid on this job' });

  const id = uuidv4();
  db.prepare(`INSERT INTO bids VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    id, jobId, company.id, parseFloat(amount), description, timeline || null, warranty || null, 'pending'
  );

  res.json({ id, message: 'Bid submitted successfully' });
});

// Get company's own bids
app.get('/api/bids/my', auth, requireRole('company'), (req, res) => {
  const company = db.prepare('SELECT id FROM companies WHERE user_id=?').get(req.user.id);
  if (!company) return res.json([]);

  const bids = db.prepare(`
    SELECT b.*, j.title as job_title, j.services, j.zip_code, j.status as job_status,
      u.name as homeowner_name
    FROM bids b
    JOIN jobs j ON j.id=b.job_id
    JOIN users u ON u.id=j.homeowner_id
    WHERE b.company_id=? ORDER BY b.created_at DESC
  `).all(company.id);

  res.json(bids);
});

// Accept or decline a bid (homeowner)
app.patch('/api/bids/:id/status', auth, requireRole('homeowner', 'admin'), (req, res) => {
  const { status } = req.body;
  const bid = db.prepare(`
    SELECT b.*, j.homeowner_id FROM bids b JOIN jobs j ON j.id=b.job_id WHERE b.id=?
  `).get(req.params.id);

  if (!bid) return res.status(404).json({ error: 'Bid not found' });
  if (req.user.role === 'homeowner' && bid.homeowner_id !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });

  db.prepare(`UPDATE bids SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, req.params.id);

  // If accepted, decline all other bids & update job status
  if (status === 'accepted') {
    db.prepare(`UPDATE bids SET status='declined', updated_at=datetime('now') WHERE job_id=? AND id!=?`).run(bid.job_id, req.params.id);
    db.prepare(`UPDATE jobs SET status='accepted', updated_at=datetime('now') WHERE id=?`).run(bid.job_id);
  }

  res.json({ success: true });
});

// Withdraw a bid (company)
app.patch('/api/bids/:id/withdraw', auth, requireRole('company'), (req, res) => {
  const company = db.prepare('SELECT id FROM companies WHERE user_id=?').get(req.user.id);
  const bid = db.prepare('SELECT * FROM bids WHERE id=? AND company_id=?').get(req.params.id, company?.id);
  if (!bid) return res.status(404).json({ error: 'Bid not found' });
  db.prepare(`UPDATE bids SET status='withdrawn', updated_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

// ── MESSAGE ROUTES ──────────────────────────────────────────────

// Send message
app.post('/api/messages', auth, (req, res) => {
  const { jobId, recipientId, body } = req.body;
  if (!jobId || !recipientId || !body) return res.status(400).json({ error: 'Missing fields' });

  const id = uuidv4();
  db.prepare(`INSERT INTO messages VALUES (?,?,?,?,?,?,datetime('now'))`).run(
    id, jobId, req.user.id, recipientId, body, 0
  );
  res.json({ id });
});

// Get messages for a job
app.get('/api/messages/:jobId', auth, (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m JOIN users u ON u.id=m.sender_id
    WHERE m.job_id=? AND (m.sender_id=? OR m.recipient_id=?)
    ORDER BY m.created_at ASC
  `).all(req.params.jobId, req.user.id, req.user.id);

  // Mark as read
  db.prepare(`UPDATE messages SET read=1 WHERE job_id=? AND recipient_id=?`).run(req.params.jobId, req.user.id);

  res.json(messages);
});

// Unread message count
app.get('/api/messages/unread/count', auth, (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM messages WHERE recipient_id=? AND read=0').get(req.user.id);
  res.json({ count });
});

// ── REVIEW ROUTES ────────────────────────────────────────────────

app.post('/api/reviews', auth, requireRole('homeowner'), (req, res) => {
  const { jobId, companyId, rating, comment } = req.body;
  const existing = db.prepare('SELECT id FROM reviews WHERE job_id=? AND homeowner_id=?').get(jobId, req.user.id);
  if (existing) return res.status(409).json({ error: 'Already reviewed' });

  const id = uuidv4();
  db.prepare(`INSERT INTO reviews VALUES (?,?,?,?,?,?,datetime('now'))`).run(id, jobId, companyId, req.user.id, rating, comment || null);

  // Update company rating
  const { avg, cnt } = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE company_id=?').get(companyId);
  db.prepare('UPDATE companies SET rating=?, review_count=? WHERE id=?').run(Math.round(avg * 10) / 10, cnt, companyId);

  res.json({ success: true });
});

// ── ADMIN ROUTES ─────────────────────────────────────────────────

// All users
app.get('/api/admin/users', auth, requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id,email,role,name,phone,created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// All jobs with full info
app.get('/api/admin/jobs', auth, requireRole('admin'), (req, res) => {
  const jobs = db.prepare(`
    SELECT j.*, u.name as homeowner_name,
      (SELECT COUNT(*) FROM bids WHERE job_id=j.id) as bid_count
    FROM jobs j JOIN users u ON u.id=j.homeowner_id
    ORDER BY j.created_at DESC
  `).all();
  res.json(jobs.map(j => ({ ...j, files: JSON.parse(j.files || '[]') })));
});

// All companies
app.get('/api/admin/companies', auth, requireRole('admin'), (req, res) => {
  const companies = db.prepare(`
    SELECT c.*, u.email, u.name as contact_name, u.phone
    FROM companies c JOIN users u ON u.id=c.user_id
    ORDER BY c.created_at DESC
  `).all();
  res.json(companies);
});

// Verify company
app.patch('/api/admin/companies/:id/verify', auth, requireRole('admin'), (req, res) => {
  db.prepare('UPDATE companies SET verified=1 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Dashboard stats
app.get('/api/admin/stats', auth, requireRole('admin'), (req, res) => {
  const stats = {
    totalUsers:     db.prepare("SELECT COUNT(*) as c FROM users WHERE role!='admin'").get().c,
    homeowners:     db.prepare("SELECT COUNT(*) as c FROM users WHERE role='homeowner'").get().c,
    companies:      db.prepare("SELECT COUNT(*) as c FROM users WHERE role='company'").get().c,
    totalJobs:      db.prepare('SELECT COUNT(*) as c FROM jobs').get().c,
    openJobs:       db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status='open'").get().c,
    acceptedJobs:   db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status='accepted'").get().c,
    totalBids:      db.prepare('SELECT COUNT(*) as c FROM bids').get().c,
    pendingBids:    db.prepare("SELECT COUNT(*) as c FROM bids WHERE status='pending'").get().c,
    totalMessages:  db.prepare('SELECT COUNT(*) as c FROM messages').get().c,
  };
  res.json(stats);
});

// Serve React frontend in production
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => console.log(`🏊 Pool Valet server running on port ${PORT}`));
