const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'poolvalet.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('homeowner','company','admin')),
    name        TEXT NOT NULL,
    phone       TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companies (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id),
    company_name TEXT NOT NULL,
    license_no   TEXT,
    service_area TEXT,
    description  TEXT,
    plan         TEXT DEFAULT 'starter' CHECK(plan IN ('starter','pro','pay_per_bid')),
    verified     INTEGER DEFAULT 0,
    rating       REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id           TEXT PRIMARY KEY,
    homeowner_id TEXT NOT NULL REFERENCES users(id),
    title        TEXT NOT NULL,
    description  TEXT,
    services     TEXT NOT NULL,
    zip_code     TEXT NOT NULL,
    address      TEXT,
    status       TEXT DEFAULT 'open' CHECK(status IN ('open','in_review','accepted','completed','cancelled')),
    files        TEXT DEFAULT '[]',
    budget       TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bids (
    id           TEXT PRIMARY KEY,
    job_id       TEXT NOT NULL REFERENCES jobs(id),
    company_id   TEXT NOT NULL REFERENCES companies(id),
    amount       REAL NOT NULL,
    description  TEXT NOT NULL,
    timeline     TEXT,
    warranty     TEXT,
    status       TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','withdrawn')),
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    job_id       TEXT NOT NULL REFERENCES jobs(id),
    sender_id    TEXT NOT NULL REFERENCES users(id),
    recipient_id TEXT NOT NULL REFERENCES users(id),
    body         TEXT NOT NULL,
    read         INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id           TEXT PRIMARY KEY,
    job_id       TEXT NOT NULL REFERENCES jobs(id),
    company_id   TEXT NOT NULL REFERENCES companies(id),
    homeowner_id TEXT NOT NULL REFERENCES users(id),
    rating       INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );
`);

// ── SEED DEMO DATA ───────────────────────────────────────────────
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function seed() {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (existing.cnt > 0) return;

  const hash = bcrypt.hashSync('password123', 10);

  // Admin
  const adminId = uuidv4();
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,datetime('now'))`).run(adminId, 'admin@poolvalet.com', hash, 'admin', 'Admin User', '555-0000');

  // Homeowners
  const h1 = uuidv4(), h2 = uuidv4();
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,datetime('now'))`).run(h1, 'sarah@demo.com', hash, 'homeowner', 'Sarah Johnson', '555-1001');
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,datetime('now'))`).run(h2, 'mike@demo.com', hash, 'homeowner', 'Mike Rivera', '555-1002');

  // Pool Companies
  const cu1 = uuidv4(), cu2 = uuidv4(), cu3 = uuidv4();
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,datetime('now'))`).run(cu1, 'bluewave@demo.com', hash, 'company', 'Jason T.', '555-2001');
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,datetime('now'))`).run(cu2, 'sunpool@demo.com', hash, 'company', 'Maria S.', '555-2002');
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,?,datetime('now'))`).run(cu3, 'crystalclear@demo.com', hash, 'company', 'Dave K.', '555-2003');

  const c1 = uuidv4(), c2 = uuidv4(), c3 = uuidv4();
  db.prepare(`INSERT INTO companies VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(c1, cu1, 'Blue Wave Pools', 'LIC-10045', '33101,33102,33103,33139', 'Full-service pool company serving Miami since 2008.', 'pro', 1, 4.8, 127);
  db.prepare(`INSERT INTO companies VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(c2, cu2, 'Sunshine Pool Services', 'LIC-20891', '33101,33102,33140', 'Specializing in repairs and weekly maintenance.', 'starter', 1, 4.6, 84);
  db.prepare(`INSERT INTO companies VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(c3, cu3, 'Crystal Clear Pools', 'LIC-33712', '33139,33140,33141', 'New pool construction and full renovations.', 'pro', 1, 4.9, 56);

  // Jobs
  const j1 = uuidv4(), j2 = uuidv4(), j3 = uuidv4();
  db.prepare(`INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    j1, h1, 'Weekly Pool Maintenance Needed', 'Need weekly cleaning and chemical balancing for my 15x30 inground pool. Pool was built in 2018.', 'Routine Service', '33139', '123 Ocean Dr, Miami Beach', 'open', '[]', '$100-150/month'
  );
  db.prepare(`INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    j2, h1, 'Pump Making Loud Noise + Losing Prime', 'Variable speed pump started making grinding noise last week. Pool is also losing water level slowly — possible leak.', 'Repairs', '33139', '123 Ocean Dr, Miami Beach', 'open', '[]', 'Under $1,500'
  );
  db.prepare(`INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    j3, h2, 'New Pool Construction — Backyard Project', 'Looking to build a new 20x40 inground pool with spa, LED lighting, and sun shelf. Yard is flat with good access.', 'New Pool Build', '33140', '456 Palm Ave, Miami', 'open', '[]', '$60,000-80,000'
  );

  // Bids
  const b1 = uuidv4(), b2 = uuidv4(), b3 = uuidv4(), b4 = uuidv4();
  db.prepare(`INSERT INTO bids VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    b1, j1, c1, 120, 'Weekly service including brushing, vacuuming, skimming, and full chemical balance. We use only premium chemicals.', '1 week to start', '30-day satisfaction guarantee', 'pending'
  );
  db.prepare(`INSERT INTO bids VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    b2, j1, c2, 95, 'Weekly maintenance package. Includes all chemicals and equipment checks. Flexible scheduling available.', '2 days to start', 'Standard warranty', 'pending'
  );
  db.prepare(`INSERT INTO bids VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    b3, j2, c1, 850, 'Diagnose and replace pump motor if needed. Pressure test all lines for leak detection. Full repair with parts and labor included.', '3-5 days', '90-day parts & labor warranty', 'pending'
  );
  db.prepare(`INSERT INTO bids VALUES (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
    b4, j3, c3, 72500, 'Full gunite pool 20x40 with attached spa, Pentair automation, full LED package, sun shelf, and travertine decking. Permits included.', '12-14 weeks', '1-year workmanship warranty', 'pending'
  );

  // Messages
  const m1 = uuidv4();
  db.prepare(`INSERT INTO messages VALUES (?,?,?,?,?,?,datetime('now'))`).run(
    m1, j1, cu1, h1, 'Hi Sarah! I just submitted a bid on your maintenance request. Happy to answer any questions about our service.', 0
  );

  console.log('✅ Demo data seeded successfully');
}

seed();

module.exports = db;
