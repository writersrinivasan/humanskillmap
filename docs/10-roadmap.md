# Development Roadmap & Future Enhancements

---

## Milestone Overview

```
M1 (Done) ──▶ M2 ──▶ M3 ──▶ M4 ──▶ M5 ──▶ Future
  Auth          AI       Search   Dashboard  Hardening  Scale
  Upload        Parse    Hybrid   Analytics  GDPR       Multi-tenant
  Profile       Embed    RAG      Export     Perf       Integrations
  Admin View    Dedup    NLP      Bulk       Monitor    Mobile App
```

---

## M1 — Auth + Upload + Storage + Manual Profile ✅ COMPLETE

**Goal:** Candidate can register, upload resume, and manage profile. Admin can view all candidates.

**Delivered:**
- OTP auth (phone via SMS + email)
- Direct-to-storage resume upload (presigned URL, progress bar)
- Profile page with completion score
- Manual skill/experience/education entry
- Admin dashboard with candidate list
- RLS on all tables
- Audit logging

**Technical foundation built:**
- Next.js 15 App Router, TypeScript strict
- Supabase (Auth + PostgreSQL + Storage)
- Middleware-based auth guard
- Full Database type definitions

---

## M2 — AI Processing Pipeline

**Goal:** Automatically parse uploaded resumes into structured data. Enable vector search groundwork.

**Scope:**
- [ ] Supabase Edge Function: `process-resume`
  - Triggered by DB webhook on `resume_uploads.status = 'uploaded'`
  - Download PDF from Storage
  - PyMuPDF text extraction
  - GPT-4o-mini structured extraction (skills, experience, education, profile)
  - text-embedding-3-small embedding generation
  - Duplicate detection (cosine similarity > 0.95)
  - Write back to DB: skills, experiences, educations, resume_embeddings
  - Update `resume_uploads.status = 'processed' | 'failed'`

- [ ] Database additions:
  - Migration `004_pgvector.sql`: `CREATE EXTENSION vector` + `resume_embeddings` table + HNSW index
  - Migration `005_metadata.sql`: `candidate_metadata` table

- [ ] Retry mechanism (up to 3 attempts, exponential backoff)

- [ ] Real-time status updates via Supabase Realtime on upload page

**Dependencies:** OpenAI API key, Supabase Edge Functions enabled

**Estimated effort:** 2–3 weeks

---

## M3 — Admin Search

**Goal:** Admins can find candidates using natural language queries.

**Scope:**
- [ ] `hybrid_search()` PostgreSQL function (pgvector ANN + FTS + RRF fusion)
- [ ] `POST /api/admin/search` route
  - Embed query text (OpenAI)
  - Extract metadata filters (GPT-4o-mini)
  - Execute hybrid search SQL
  - Return ranked results with similarity scores
- [ ] Admin search UI (`/admin/search`)
  - Search input with example queries
  - Real-time results as you type (debounced, 300ms)
  - Candidate cards with skills, location, availability
  - "Why this candidate?" explanation (RAG)
  - Pagination
- [ ] Search analytics (query logs, click-through tracking)

**Dependencies:** M2 complete (embeddings must exist)

**Estimated effort:** 2–3 weeks

---

## M4 — Admin Dashboard v2

**Goal:** Power tools for recruiters to manage candidates at scale.

**Scope:**
- [ ] Advanced analytics:
  - Skills distribution chart (top 20 skills in corpus)
  - City/location heatmap
  - Experience distribution histogram
  - Upload trend over time
- [ ] Bulk operations:
  - Multi-select candidates
  - Bulk export to CSV/Excel
  - Bulk status updates
- [ ] Candidate detail view (`/admin/candidates/{user_id}`)
  - Full profile view
  - All resume versions
  - Notes/tags system (recruiter annotations)
- [ ] Shortlist / pipeline management
  - Save candidates to "shortlists"
  - Tag candidates with custom labels
  - Status tracking (reviewed, shortlisted, interviewed, rejected)
- [ ] Email export for shortlisted candidates

**Dependencies:** M3 complete (search results drive the workflow)

**Estimated effort:** 3–4 weeks

---

## M5 — Production Hardening

**Goal:** Make the platform production-ready for public launch.

**Scope:**
- [ ] Rate limiting (API routes):
  - OTP send: 3 per IP per hour
  - Search: 60 per admin per minute
  - Upload: 5 per user per day
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Error tracking (Sentry integration)
- [ ] Performance monitoring (Vercel Analytics + Supabase Insights)
- [ ] Automated database backups verification
- [ ] Load testing (k6 scripts for 1000 concurrent users)
- [ ] GDPR compliance:
  - Data export endpoint (`GET /api/me/export`)
  - Account deletion endpoint (`DELETE /api/me`)
  - Cookie consent banner
  - Privacy policy page
- [ ] Admin: custom SMTP for branded OTP emails
- [ ] Admin: configurable OTP branding (logo, sender name)
- [ ] SEO: `robots.txt`, `sitemap.xml` for public pages
- [ ] Status page (UptimeRobot)

**Estimated effort:** 2–3 weeks

---

## Future Enhancements (Post-M5)

### Near-term (3–6 months)

**Multi-language Resume Support**
- Hindi, Tamil, Telugu, Marathi resume parsing
- Language detection via `langdetect`
- Multilingual embedding model (multilingual-e5-large)

**LinkedIn Import**
- One-click import via LinkedIn OAuth
- Merge LinkedIn data with uploaded resume
- Auto-populate experience and education

**Resume Score & Feedback**
- AI-generated resume quality score (1–100)
- Specific improvement suggestions
- "Your resume is missing: ATS keywords, quantified achievements, etc."

**Advanced Duplicate Detection**
- Cross-platform matching (same person on Naukri, LinkedIn, direct upload)
- Fuzzy name matching + phone/email cross-reference

**Mobile App (React Native)**
- iOS + Android via Expo
- Camera-based resume scan (photo → PDF)
- WhatsApp-style OTP UX
- Push notifications for resume status

### Long-term (6–18 months)

**Candidate-side Job Matching**
- Show candidates jobs that match their profile
- Integrate with job boards (Naukri API, LinkedIn Jobs)
- Application tracking

**Company/Enterprise Multi-tenant**
- Multiple companies on the same platform
- Tenant isolation (separate DB schema per company)
- White-label option (custom domain, logo)

**Video Resume / AI Interview**
- 2-minute video introduction
- AI-generated transcript + embedding
- Interview question bank

**Referral System**
- Candidates refer other candidates
- Referral tracking and rewards
- Company referral programs

**Analytics API**
- Programmatic access to anonymized talent market data
- "How many React engineers are open to work in Bangalore?"
- Market intelligence for HR teams

**ATS Integration**
- Greenhouse, Workday, BambooHR webhook integration
- Push shortlisted candidates to ATS automatically
- Two-way sync of interview status

---

## Release Cadence

```
Recommended approach for a solo/small team:

M1 → M2: 2–3 week sprint
M2 → M3: 2–3 week sprint  
M3 → M4: 3–4 week sprint
M4 → M5: 2–3 week sprint

Total to production-ready: ~12–16 weeks from M1 completion

Key principle: Ship each milestone to production before starting the next.
Each milestone is independently valuable and testable.
```
