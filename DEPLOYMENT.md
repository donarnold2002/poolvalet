# Pool Valet — Deployment Guide
## From Your Computer to poolvalet.com

---

## What You Have

```
poolvalet/
├── server/          ← Node.js + Express + SQLite backend
│   ├── index.js     ← All API routes
│   ├── db.js        ← Database schema + demo seed data
│   └── middleware.js ← JWT auth
├── client/          ← React frontend
│   └── src/
│       ├── pages/homeowner/   ← Homeowner dashboard + job submission
│       ├── pages/company/     ← Company dashboard + bid submission
│       └── pages/admin/       ← Admin panel
├── Dockerfile
├── docker-compose.yml
└── DEPLOYMENT.md    ← This file
```

### Demo Login Accounts (password: password123)
| Role | Email |
|------|-------|
| Homeowner | sarah@demo.com |
| Pool Company | bluewave@demo.com |
| Admin | admin@poolvalet.com |

---

## OPTION A: Railway (Recommended — Easiest, Free Tier)

### Step 1 — Push to GitHub
```bash
cd poolvalet
git init
git add .
git commit -m "Initial Pool Valet app"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOURUSERNAME/poolvalet.git
git push -u origin main
```

### Step 2 — Deploy on Railway
1. Go to **railway.app** → Sign up free
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `poolvalet` repo
4. Railway auto-detects Node.js
5. Go to **Variables** tab → Add:
   - `JWT_SECRET` = any long random string (e.g. `pv-secret-2026-xK9mQn...`)
   - `NODE_ENV` = `production`
6. Go to **Settings** → **Domains** → click **"Generate Domain"**
7. You'll get a URL like `poolvalet.up.railway.app`

### Step 3 — Point poolvalet.com to Railway
1. Log in to **GoDaddy** → **My Domains** → **poolvalet.com** → **DNS**
2. Edit or add these records:

| Type  | Name | Value                        | TTL  |
|-------|------|------------------------------|------|
| CNAME | www  | poolvalet.up.railway.app     | 600  |
| CNAME | @    | poolvalet.up.railway.app     | 600  |

3. In Railway → Settings → Custom Domains → Add `poolvalet.com` and `www.poolvalet.com`
4. Wait 5–30 minutes for DNS to propagate → Done ✅

**Cost:** Free tier includes 500 hours/month. Paid plan is $5/month for always-on.

---

## OPTION B: DigitalOcean VPS ($6/month)

### Step 1 — Create a Droplet
1. Go to **digitalocean.com** → Create → Droplets
2. Choose: **Ubuntu 24.04** · **Basic** · **$6/month** (1GB RAM)
3. Add your SSH key or use password auth
4. Note the droplet's **IP address** (e.g. `143.110.X.X`)

### Step 2 — Connect GoDaddy DNS to Your VPS
In GoDaddy DNS settings for poolvalet.com:

| Type | Name | Value         | TTL  |
|------|------|---------------|------|
| A    | @    | 143.110.X.X   | 600  |
| A    | www  | 143.110.X.X   | 600  |

### Step 3 — Set Up the Server
```bash
# SSH into your droplet
ssh root@143.110.X.X

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs git

# Install PM2 (keeps app running after disconnecting)
npm install -g pm2

# Clone your repo (or upload via SFTP)
git clone https://github.com/YOURUSERNAME/poolvalet.git
cd poolvalet

# Install dependencies
cd server && npm install && cd ..
cd client && npm install && npm run build && cp -r build ../server/ && cd ..

# Set environment variables
echo "JWT_SECRET=your-super-secret-key-change-this" >> server/.env
echo "PORT=3001" >> server/.env
echo "NODE_ENV=production" >> server/.env

# Start with PM2
cd server
pm2 start index.js --name poolvalet
pm2 save
pm2 startup  # follow the command it prints to auto-start on reboot
```

### Step 4 — Set Up Nginx (Port 80/443)
```bash
apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
cat > /etc/nginx/sites-available/poolvalet << 'NGINX'
server {
    server_name poolvalet.com www.poolvalet.com;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 100M;
    }
}
NGINX

ln -s /etc/nginx/sites-available/poolvalet /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Get free SSL certificate
certbot --nginx -d poolvalet.com -d www.poolvalet.com
```

Your app is now live at **https://poolvalet.com** ✅

---

## OPTION C: Docker (Any Host)

```bash
# On any server with Docker installed:
git clone https://github.com/YOURUSERNAME/poolvalet.git
cd poolvalet

# Set your secret
echo "JWT_SECRET=your-secret-here" > .env

# Build and run
docker-compose up -d

# App runs on port 3001
```

---

## Updating the App

When you make changes:
```bash
git add . && git commit -m "Update" && git push
# Railway auto-deploys on push

# For VPS, SSH in and run:
cd poolvalet && git pull
cd client && npm run build && cp -r build ../server/ && cd ..
pm2 restart poolvalet
```

---

## Managing Your Database

The database is a single file: `server/poolvalet.db`

**Backup:**
```bash
cp server/poolvalet.db server/poolvalet.backup.$(date +%Y%m%d).db
```

**View data (on server):**
```bash
sqlite3 server/poolvalet.db
.tables
SELECT * FROM jobs;
SELECT * FROM users;
.quit
```

**Reset demo data:**
```bash
rm server/poolvalet.db
node server/index.js  # re-seeds automatically on startup
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for login tokens — **change this!** | `pv-xK9mQn8rT2...` |
| `PORT` | Port to run on | `3001` |
| `NODE_ENV` | Set to `production` on live server | `production` |

---

## Subscription / Revenue Notes

Your business model (monthly subscriptions + per-bid %) is tracked in the `companies` table via the `plan` column:
- `starter` — $99/month, 10 bids
- `pro` — $249/month, unlimited
- `pay_per_bid` — 8% per accepted job

To add payment processing (Stripe), the integration points are:
- `POST /api/auth/register` for company sign-up → trigger Stripe checkout
- Admin companies page → add Stripe customer ID column
- Monthly webhooks to update plan status

Want help setting up Stripe? That's the natural next step.

---

## Support

Need help deploying? The fastest path:
1. Push to GitHub
2. Connect Railway
3. Update GoDaddy DNS

Total time: ~20 minutes.
