# TalentVault — Resume Collection & Intelligent Talent Discovery Platform

A production-ready platform where candidates upload resumes in under 60 seconds, and admins find the right people with natural language AI-powered search.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Milestone Status](#milestone-status)
- [Documentation Index](#documentation-index)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd PRofileCollectionWebApp
pnpm install

# 2. Set up env vars
cp apps/web/.env.example apps/web/.env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Run Supabase migrations (requires Supabase CLI or paste into SQL editor)
supabase db push

# 4. Start dev server
pnpm dev
```

App runs at `http://localhost:3000`.

---

## Project Structure

```
PRofileCollectionWebApp/
├── apps/
│   ├── web/                        # Next.js 15 App Router (Vercel)
│   │   ├── app/
│   │   │   ├── (auth)/             # Login & OTP verify pages
│   │   │   │   ├── login/
│   │   │   │   └── verify-otp/
│   │   │   ├── (portal)/           # Candidate-facing pages
│   │   │   │   ├── upload/
│   │   │   │   └── profile/
│   │   │   │       └── edit/
│   │   │   ├── (admin)/            # Admin-only pages
│   │   │   │   └── admin/
│   │   │   │       ├── dashboard/
│   │   │   │       └── candidates/
│   │   │   ├── api/                # Route Handlers
│   │   │   │   ├── auth/
│   │   │   │   │   ├── send-otp/
│   │   │   │   │   ├── verify-otp/
│   │   │   │   │   └── logout/
│   │   │   │   ├── resume/
│   │   │   │   │   ├── upload/
│   │   │   │   │   │   └── complete/
│   │   │   │   │   ├── status/[id]/
│   │   │   │   │   └── download/[id]/
│   │   │   │   ├── profile/
│   │   │   │   │   └── skills/
│   │   │   │   │       └── [id]/
│   │   │   │   └── admin/
│   │   │   │       └── candidates/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx            # Root redirect logic
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives
│   │   │   ├── auth/               # OTPInput, AuthForm
│   │   │   ├── resume/             # UploadDropzone, UploadProgress, ProcessingStatus
│   │   │   ├── profile/            # ProfileHeader, SkillsEditor, ExperienceList, etc.
│   │   │   └── admin/              # CandidateTable
│   │   ├── hooks/
│   │   │   └── useUpload.ts        # Upload state machine
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts       # Browser client
│   │   │   │   └── server.ts       # Server + service-role clients
│   │   │   ├── validations/        # Zod schemas
│   │   │   └── utils.ts
│   │   ├── stores/
│   │   │   └── authStore.ts        # Zustand auth state
│   │   ├── types/
│   │   │   └── database.ts         # Full Supabase type definitions
│   │   └── middleware.ts           # Auth guards + session refresh
│   └── workers/                    # Python AI workers (added in M2)
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql          # Tables + storage bucket
│   │   ├── 002_rls.sql             # Row Level Security policies
│   │   └── 003_triggers.sql        # Auto-triggers + completion scoring
│   └── functions/                  # Edge Functions (added in M2)
├── docs/                           # Full architecture & design docs
├── CLAUDE.md                       # AI assistant context
├── package.json                    # Monorepo root
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Milestone Status

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M1** | Auth (OTP) + Resume Upload + Storage + Manual Profile + Admin View | ✅ Complete |
| **M2** | AI Pipeline: PDF parse → embed → duplicate detection (Supabase Edge Functions) | ⏳ Planned |
| **M3** | Admin Search: hybrid pgvector + FTS + metadata filters + RRF ranking | ⏳ Planned |
| **M4** | Admin Dashboard v2: analytics, bulk actions, export | ⏳ Planned |
| **M5** | Production Hardening: rate limiting, monitoring, GDPR, performance | ⏳ Planned |

---

## Documentation Index

| # | Topic | File |
|---|-------|------|
| 1–3 | System Architecture (HLD + LLD) | [docs/01-system-architecture.md](docs/01-system-architecture.md) |
| 4–5 | Database: ER Diagram + Schema + RLS + Triggers | [docs/02-database.md](docs/02-database.md) |
| 6–8 | API Reference (all endpoints) | [docs/03-api-reference.md](docs/03-api-reference.md) |
| 9–11 | AI Pipeline: LangGraph + CrewAI (M2) | [docs/04-ai-pipeline.md](docs/04-ai-pipeline.md) |
| 12–14 | Search Architecture: RAG + pgvector + Hybrid (M3) | [docs/05-search-architecture.md](docs/05-search-architecture.md) |
| 15 | Technology Decisions & Justifications | [docs/06-technology-decisions.md](docs/06-technology-decisions.md) |
| 16–17 | Scalability Strategy + Cost Optimization | [docs/07-scalability-cost.md](docs/07-scalability-cost.md) |
| 18 | Security Architecture | [docs/08-security.md](docs/08-security.md) |
| 19 | UI Wireframes (ASCII) | [docs/09-ui-wireframes.md](docs/09-ui-wireframes.md) |
| 20 | Development Roadmap | [docs/10-roadmap.md](docs/10-roadmap.md) |
| 21 | Deployment Guide (Vercel + Supabase) | [docs/11-deployment.md](docs/11-deployment.md) |
| 22 | Testing Strategy | [docs/12-testing.md](docs/12-testing.md) |
| 23 | Future Enhancements | [docs/10-roadmap.md#future-enhancements](docs/10-roadmap.md) |

---

## Environment Variables

```bash
# apps/web/.env.local

# Supabase (from your project dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Never expose to client

# App URL (for absolute links in emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment

See [docs/11-deployment.md](docs/11-deployment.md) for the full step-by-step guide.

**Short version:**
1. Push to GitHub
2. Import repo in Vercel, set environment variables
3. Create Supabase project, run migrations, configure Phone Auth (Twilio) + Email OTP
4. Vercel auto-deploys on every push to `main`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS · shadcn/ui · Framer Motion |
| Forms | React Hook Form · Zod |
| State | Zustand |
| Backend | Next.js Route Handlers (Vercel Serverless) |
| Database | Supabase PostgreSQL + pgvector (M2) |
| Auth | Supabase Auth (OTP: SMS via Twilio / Email) |
| Storage | Supabase Storage (private bucket, presigned URLs) |
| AI (M2+) | Python · LangGraph · CrewAI · OpenAI Embeddings |
| Monorepo | pnpm workspaces · Turborepo |
