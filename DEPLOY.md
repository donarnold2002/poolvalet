# Pool Valet — Deployment Guide

## Demo Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Homeowner | sarah@demo.com | password123 |
| Pool Company | bluewave@demo.com | password123 |
| Admin | admin@poolvalet.com | password123 |

---

## Option 1: Railway (Recommended — Free to Start)

Railway is the fastest way to get Pool Valet live on poolvalet.com.

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial Pool Valet app"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/poolvalet.git
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to **railway.app** and sign up (free)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `poolvalet` repository
4. Railway will detect Node.js automatically

### Step 3: Set Environment Variables
In Railway dashboard → your project → **Variables** tab, add:
```
JWT_SECRET=your-very-long-random-secret-string-here
NODE_ENV=production
PORT=3001
```

### Step 4: Set the Start Command
In Railway → Settings → Deploy:
- **Build Command:** `npm run setup`
- **Start Command:** `npm start`

### Step 5: Point poolvalet.com to Railway
1. In Railway → Settings → **Domains**, add `poolvalet.com`
2. Railway will show you a CNAME value (e.g. `xxx.railway.app`)
3. Log into **GoDaddy** → My Products → poolvalet.com → DNS
4. Find the **CNAME** record for `www` and update it to the Railway value
5. For the root domain (`@`), add an **A record** or follow Railway's instructions for apex domains
6. DNS changes take 10–30 minutes to propagate

---

## Option 2: DigitalOcean Droplet ($6/month)

### Step 1: Create a Droplet
1. Sign up at **digitalocean.com**
2. Create Droplet → **Ubuntu 22.04** → Basic → $6/month
3. Note the IP address (e.g. `167.99.123.45`)

### Step 2: Point GoDaddy DNS to Your Droplet
1. Log into GoDaddy → poolvalet.com → DNS
2. Edit the **A record** for `@` → set value to your Droplet IP
3. Edit the **A record** for `www` → same IP
4. Wait 10–30 min for DNS to propagate

### Step 3: Set Up the Server
SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Install Node.js and dependencies:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx certbot python3-certbot-nginx

# Clone your repo (or upload files with scp)
git clone https://github.com/YOUR_USERNAME/poolvalet.git /var/www/poolvalet
cd /var/www/poolvalet

# Install and build
npm run setup
```

### Step 4: Set up PM2 (keeps app running)
```bash
npm install -g pm2
cd /var/www/poolvalet

# Set your secret
export JWT_SECRET="your-very-long-random-secret-here"

# Start the app
pm2 start server/index.js --name poolvalet
pm2 startup
pm2 save
```

### Step 5: Set up Nginx (reverse proxy)
```bash
nano /etc/nginx/sites-available/poolvalet
```

Paste this config:
```nginx
server {
    server_name poolvalet.com www.poolvalet.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
```

Enable it:
```bash
ln -s /etc/nginx/sites-available/poolvalet /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 6: Add SSL Certificate (HTTPS — Free)
```bash
certbot --nginx -d poolvalet.com -d www.poolvalet.com
```
Follow the prompts. Your site will now be at **https://poolvalet.com** ✅

---

## Option 3: Docker (Any Cloud Provider)

If you have Docker installed on any server:
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ Yes | Long random string for token signing. Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `PORT` | No | Default: 3001 |
| `NODE_ENV` | No | Set to `production` for live site |

---

## File Upload Storage

By default, uploaded photos and videos are stored on the server's filesystem in `server/uploads/`.

**For production**, you should move to cloud storage to avoid losing files on server restarts:
- **AWS S3** (most common) — ~$0.023/GB/month
- **Cloudflare R2** — Free up to 10GB
- **DigitalOcean Spaces** — $5/month for 250GB

Ask a developer to swap the `multer` disk storage for an S3 client when you're ready to scale.

---

## Updating the App

After making code changes:
```bash
cd /var/www/poolvalet
git pull
npm run build
pm2 restart poolvalet
```

---

## Architecture Summary

```
poolvalet.com
     │
     ▼
  Nginx (reverse proxy + SSL)
     │
     ▼
  Node.js / Express (port 3001)
  ├── Serves React frontend (built static files)
  ├── REST API (/api/*)
  ├── File uploads (/uploads/*)
     │
     ▼
  SQLite database (poolvalet.db)
```

---

## Support

For technical help deploying this app, consider posting on:
- **Railway Discord** (very responsive)
- **DigitalOcean Community** (great tutorials)
- Or hire a freelancer on **Upwork** — a simple Node.js deployment takes 1–2 hours
