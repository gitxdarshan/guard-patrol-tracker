
# VPS Deployment Plan (Frontend Only + Lovable Cloud Backend)

## Overview

Tumhara app ka architecture:
- **Frontend**: React SPA (static files) → VPS pe host hoga
- **Backend**: Lovable Cloud (Supabase) → as-is rahega, koi change nahi

Ye sabse easy aur recommended approach hai - database, auth, edge functions sab cloud pe secure rahenge.

---

## Deployment Steps

### Step 1: VPS Requirements
- **Minimum**: 1GB RAM, 1 vCPU (static files ke liye)
- **OS**: Ubuntu 22.04 LTS recommended
- **Software**: Nginx ya Docker

### Step 2: Environment Variables Setup
VPS pe build karte waqt ye environment variables chahiye:
```text
VITE_SUPABASE_URL=https://qpkxcfdivootgawoceeb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=qpkxcfdivootgawoceeb
```
(Ye values already Lovable Cloud se configured hain)

### Step 3: Build the App
```bash
npm install
npm run build
# Output: dist/ folder with static files
```

### Step 4: Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/guard-patrol/dist;
    index index.html;

    # SPA routing - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Step 5: SSL Setup (Recommended)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Docker Alternative (Optional)

Main ek **Dockerfile** aur **docker-compose.yml** bana dunga jo:
1. Node.js environment mein app build karega
2. Nginx se static files serve karega
3. Environment variables handle karega

### Files to Create:
1. **Dockerfile** - Multi-stage build (Node → Nginx)
2. **docker-compose.yml** - Easy deployment
3. **nginx.conf** - SPA routing configuration
4. **.dockerignore** - Exclude unnecessary files

---

## Deployment Commands

### Option A: Manual (without Docker)
```bash
# On VPS
git clone your-repo
cd your-repo
npm install
npm run build
sudo cp -r dist/* /var/www/guard-patrol/
sudo systemctl restart nginx
```

### Option B: Docker
```bash
# On VPS
git clone your-repo
cd your-repo
docker compose up -d --build
```

---

## Technical Notes

| Component | Location | Notes |
|-----------|----------|-------|
| Frontend | VPS | Static files via Nginx |
| Database | Lovable Cloud | PostgreSQL with RLS |
| Auth | Lovable Cloud | Supabase Auth |
| Edge Functions | Lovable Cloud | create-guard, delete-guard |
| File Storage | Lovable Cloud | If needed later |

### Security Considerations
- HTTPS via Let's Encrypt (free SSL)
- CORS automatically handled (Supabase allows your domain)
- API keys are "publishable" - safe to expose in frontend
- Sensitive operations protected by Edge Functions + RLS

---

## What I Will Create

1. **Dockerfile** - Optimized multi-stage build
2. **docker-compose.yml** - Production-ready config
3. **nginx.conf** - SPA routing + caching
4. **.dockerignore** - Clean builds

Approve karo, main ye files create kar dunga!
