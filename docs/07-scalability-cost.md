# Scalability Strategy & Cost Optimization

---

## 1. Current Scale (M1 — Up to 10K Users)

### Infrastructure (Free Tier)

| Service | Free Limit | Usage |
|---------|-----------|-------|
| Vercel Hobby | 100 GB bandwidth, 100K function invocations/day | Sufficient |
| Supabase Free | 500 MB DB, 1 GB storage, 50K MAU | Sufficient |
| Twilio SMS | Pay-per-use (~₹0.60/SMS) | Sufficient |

**Monthly cost at 10K users:** ~₹0–500 (mostly SMS if users log in frequently)

---

## 2. Growth Phase (M2–M3 — 10K to 100K Users)

### Upgrade triggers and costs

| Trigger | Action | New Monthly Cost |
|---------|--------|-----------------|
| DB > 500 MB | Supabase Pro ($25/mo) | +$25 |
| Storage > 1 GB | Supabase Pro ($25/mo, includes 100 GB storage) | Included |
| MAU > 50K | Supabase Pro | Included |
| Build minutes > Vercel free | Vercel Pro ($20/mo) | +$20 |
| AI processing (M2) | OpenAI API | ~$40 per 100K resumes (one-time) |

**Estimated monthly at 100K resumes:**
```
Supabase Pro:      $25
Vercel Pro:        $20
OpenAI (M2):       $10/mo (ongoing incremental)
Twilio SMS:        ₹3,000 (~5K OTP/month at ₹0.60)
─────────────────────────
Total:             ~$60 + ₹3,000 (~₹8,000/month)
```

---

## 3. At-Scale Architecture (100K+ Users)

### Database Strategy

```
Current (M1-M3):
  Supabase Free → Pro
  Single PostgreSQL instance
  pgvector HNSW index

At 100K resumes:
  Same instance, just bigger plan ($25/mo)
  pgvector handles 100K vectors easily (<20ms p95)

At 1M resumes:
  Supabase Enterprise OR
  Read replica for search queries
  Consider dedicated vector DB (Qdrant/Weaviate)
```

### Storage Strategy

```
Storage path: {user_id}/{uuid}.{ext}

At 10K resumes × 1 MB avg = 10 GB storage
At 100K resumes × 1 MB avg = 100 GB storage
At 1M resumes × 1 MB avg = 1 TB storage

Supabase Pro: $25/mo includes 100 GB
Each additional GB: $0.021/GB/month

Cost at 1M resumes: ~$25 + (1000-100) × $0.021 = ~$44/mo
```

### Serverless Function Scaling

Vercel serverless functions auto-scale horizontally. No configuration needed. The presigned-URL upload pattern means file bytes never go through Vercel functions, so the main bandwidth concern is API responses (tiny).

### Connection Pooling

```
At 100K MAU, concurrent DB connections become a concern.
Solution: pgBouncer (built into Supabase connection string)

Use: postgresql://...@db.xxx.supabase.co:6543/postgres (port 6543 = pgBouncer)
Not: ...@db.xxx.supabase.co:5432/postgres (direct — limited connections)
```

---

## 4. Cost Optimization Patterns

### 4.1 Presigned Upload URLs
**Pattern:** Client uploads directly to Supabase Storage via presigned URL.

```
Without presigned URLs:
  Browser → Vercel function (4.5 MB limit, bandwidth cost) → Supabase Storage

With presigned URLs:
  Browser → Supabase Storage (direct, no Vercel bandwidth cost)
  Vercel only handles metadata JSON (~1 KB)
```

**Savings:** ~$0.00009 per upload (Vercel bandwidth) × 100K uploads = ~$9. Small but adds up.

### 4.2 AI Model Tiers
```
Extraction:  GPT-4o-mini ($0.15/1M tokens in, $0.60/1M out)
             NOT GPT-4o ($2.50/$10.00)
             Savings: ~94% per resume

Embedding:   text-embedding-3-small ($0.02/1M tokens)
             NOT text-embedding-ada-002 ($0.10/1M tokens)
             Savings: 80%
```

### 4.3 Incremental Processing
```
Only process NEW resume uploads.
If user uploads a replacement:
  - old embedding stays (mark is_current=false)
  - only new resume is processed
  - no re-processing of unchanged candidates
```

### 4.4 Edge Caching
```
Admin dashboard stats (counts) → cache for 60 seconds
  Cache-Control: s-maxage=60, stale-while-revalidate=30

Search results → no cache (real-time data)

Static assets → Vercel CDN (automatic, infinite TTL with content hash)
```

### 4.5 Database Query Optimization
```sql
-- WRONG: Full table scan
SELECT * FROM resume_uploads WHERE user_id = $1;

-- RIGHT: Use index (idx_resume_uploads_user_current)
SELECT * FROM resume_uploads
WHERE user_id = $1 AND is_current = true
LIMIT 1;

-- WRONG: N+1 in admin dashboard
for (upload of uploads) {
  fetch user(upload.user_id)  -- 50 separate queries!
}

-- RIGHT: JOIN in single query
SELECT uploads.*, users.email, profiles.full_name
FROM resume_uploads uploads
JOIN users ON users.id = uploads.user_id
JOIN profiles ON profiles.user_id = uploads.user_id
WHERE uploads.is_current = true
```

### 4.6 Supabase Storage vs CDN
```
Resume files: private (Supabase Storage, 5-min signed URLs)
Avatar images: if added, use public bucket with CDN headers

Signed URL flow:
  GET /api/resume/download/{id}
  → server generates 5-min signed URL
  → 302 redirect to Supabase CDN URL
  → browser fetches directly from CDN

This avoids Vercel bandwidth cost for file downloads.
```

---

## 5. Scalability Limits and Upgrade Path

### pgvector HNSW Limits

| Scale | Strategy | Cost |
|-------|----------|------|
| < 100K vectors | Default HNSW (m=16, ef=64) | Included in DB |
| 100K – 1M vectors | HNSW (m=32, ef=128), read replica | +$25/mo read replica |
| 1M – 10M vectors | Dedicated vector DB (Qdrant Cloud) | ~$150/mo |
| > 10M vectors | Qdrant Enterprise or Weaviate Cloud | Custom pricing |

### Database Size Limits

| Profile count | DB size estimate | Plan needed |
|--------------|-----------------|------------|
| 10K | ~50 MB | Free |
| 100K | ~500 MB | Pro ($25/mo) |
| 500K | ~2.5 GB | Pro (more space add-ons) |
| 1M+ | ~5 GB | Enterprise |

### Supabase Free → Pro Checklist
- [ ] DB approaching 500 MB
- [ ] MAU approaching 50K
- [ ] Storage approaching 1 GB
- [ ] Need daily backups (Pro includes 7-day PITR)
- [ ] Need custom SMTP (for branded email OTPs)

---

## 6. Performance Targets

| Operation | Target | Current Implementation |
|-----------|--------|----------------------|
| OTP send | < 2s | Supabase Auth + Twilio |
| OTP verify | < 1s | Supabase Auth |
| Upload URL generation | < 500ms | Supabase Storage API |
| File upload (1 MB PDF) | < 5s on 4G | Direct to Supabase CDN |
| Profile page load | < 800ms | Server component, parallel DB queries |
| Admin dashboard | < 1.5s | Server component, indexed queries |
| Search (M3) | < 1s total | pgvector ANN + FTS + RRF |

---

## 7. Monitoring (M5)

```
Free tier tools:
  Vercel: built-in function logs and analytics
  Supabase: built-in query performance insights
  Uptime: UptimeRobot (free, 5-min checks)

When to add paid monitoring:
  At 10K+ MAU: add Sentry ($26/mo) for error tracking
  At 50K+ MAU: add Datadog or Grafana Cloud for metrics
```
