# Deployment Guide — Vercel + Supabase

---

## Prerequisites

- GitHub account (for Vercel auto-deploy)
- Supabase account (supabase.com)
- Vercel account (vercel.com)
- Twilio account (for SMS OTP) — optional, email OTP works without it

---

## Step 1: Supabase Project Setup

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose region closest to your users (recommended: **Singapore** for India)
3. Note down: Project URL and API keys (Settings → API)

### 1.2 Get API Keys

From Supabase Dashboard → Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL   = https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Never commit** `.env.local` to git. The `.gitignore` excludes it.

### 1.3 Enable Auth Providers

Dashboard → Authentication → Providers:

**Phone (SMS via Twilio):**
1. Enable Phone provider
2. Enter Twilio Account SID, Auth Token, and Phone Number
3. Test with your own number

**Email OTP:**
- Enabled by default. Works without Twilio for testing.

### 1.4 Run Database Migrations

**Option A: Supabase CLI (recommended)**
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

**Option B: SQL Editor (manual)**
1. Supabase Dashboard → SQL Editor
2. Paste and run each migration file in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_triggers.sql`

### 1.5 Create Storage Bucket

The migration `001_schema.sql` creates the storage bucket automatically. Verify:
- Dashboard → Storage → Buckets
- Should see `resumes` bucket (private)

### 1.6 Set Up Admin User

After your first login via the app, grant yourself admin role:

```sql
-- Run in Supabase SQL Editor
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

---

## Step 2: Vercel Deployment

### 2.1 Push to GitHub

```bash
cd /path/to/PRofileCollectionWebApp
git init
git add .
git commit -m "Initial commit — M1 complete"
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

### 2.2 Import in Vercel

1. [vercel.com](https://vercel.com) → Add New Project
2. Import your GitHub repository
3. Vercel auto-detects Next.js — no config needed

### 2.3 Set Environment Variables

In Vercel → Project → Settings → Environment Variables, add:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | All |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production |

> For local dev, these go in `apps/web/.env.local` (never committed to git).

### 2.4 Configure Root Directory

In Vercel project settings:
- **Root Directory:** `apps/web`
- **Framework:** Next.js (auto-detected)
- **Build Command:** `next build` (auto-detected)

### 2.5 Deploy

Click **Deploy**. Vercel builds and deploys. Every push to `main` auto-deploys.

---

## Step 3: Configure Supabase for Production Domain

### 3.1 Add Allowed Redirect URLs

Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://your-domain.vercel.app
Additional Redirect URLs:
  https://your-domain.vercel.app/**
  http://localhost:3000/**  ← for local dev
```

### 3.2 CORS Origins (if needed)

Supabase allows all origins by default for anon key. No changes needed for M1.

---

## Step 4: Verify the Deployment

### 4.1 Manual Test Checklist

```
□ Open https://your-domain.vercel.app
□ Get redirected to /login
□ Send OTP via phone → receive SMS
□ Enter OTP → get redirected to /upload
□ Upload a PDF → see progress bar → success screen → redirect to /profile
□ View profile page (empty, completion: 20%)
□ Edit profile → save → see updated profile
□ Add a skill → appears in skill chips
□ Sign out → redirected to /login
□ Sign in as admin email → access /admin/dashboard
□ See candidate list with recent upload
□ Download resume → file downloads
```

### 4.2 Verify Admin Access

```bash
# In Supabase SQL Editor, check your user row
SELECT id, email, role FROM public.users WHERE email = 'your-email@example.com';
# Should show role = 'admin'
```

---

## Step 5: Custom Domain (Optional)

1. Vercel → Project → Settings → Domains → Add Domain
2. Add your custom domain (e.g., `talentvault.in`)
3. Configure DNS records as instructed by Vercel
4. Update `NEXT_PUBLIC_APP_URL` to `https://talentvault.in`
5. Update Supabase Auth → URL Configuration → Site URL

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Set up env vars
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Supabase keys

# 3. Start dev server
pnpm dev
# OR just the web app:
cd apps/web && npx next dev --turbopack

# 4. Access at http://localhost:3000
```

### Useful Dev Commands

```bash
# Type check
cd apps/web && npx tsc --noEmit

# Build (catch any SSR errors)
cd apps/web && npx next build

# Check for lint errors
cd apps/web && npx next lint
```

---

## Environment Breakdown

| Environment | URL | Supabase Project | Branch |
|-------------|-----|-----------------|--------|
| Local | localhost:3000 | Dev project (separate) | any |
| Preview | *.vercel.app | Dev project (or same) | PR branches |
| Production | custom domain | Production project | main |

> **Recommendation:** Create two Supabase projects — one for development/staging, one for production. This prevents accidental data changes during testing.

---

## Rollback

If a deployment breaks:
1. Vercel Dashboard → Deployments → select previous deployment → Redeploy

---

## Supabase CLI Cheat Sheet

```bash
# Install
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push new migrations
supabase db push

# Pull remote schema to local files
supabase db pull

# Start local Supabase (for testing without remote)
supabase start

# Stop local Supabase
supabase stop
```

---

## Post-Launch Monitoring

```
Vercel:    vercel.com → Project → Analytics → Functions tab
Supabase:  supabase.com → Project → Database → Performance
Errors:    Vercel → Logs → Filter by errors
Uptime:    Add uptimerobot.com (free) for alerting
```
