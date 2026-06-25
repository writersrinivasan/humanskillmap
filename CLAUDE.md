# Talent Platform — Claude Code Context

## What this is
Resume Collection & Intelligent Talent Discovery Platform.
- **User goal**: upload resume in <60 seconds (OTP login → upload → done)
- **Admin goal**: natural language search across all resumes with AI-powered ranking

## Monorepo structure
- `apps/web` — Next.js 15 App Router (Vercel)
- `apps/workers` — Python AI workers (Supabase Edge Functions, added in M2)
- `supabase/migrations` — ordered SQL migrations
- `supabase/functions` — Edge Functions (added in M2)

## Running locally
```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in Supabase keys
pnpm dev
```

## Supabase setup (run once)
1. Create project at supabase.com
2. Enable Phone Auth (Twilio) or Email OTP in Auth settings
3. Create private storage bucket named `resumes`
4. Run migrations in order: `supabase db push` or paste into SQL editor

## Key architectural decisions
- **File upload**: client uploads directly to Supabase Storage via presigned URL (bypasses Vercel's 4.5 MB limit)
- **AI processing**: async via Supabase Edge Functions (M2), not blocking the upload flow
- **Vector search**: pgvector inside Supabase PostgreSQL (no separate vector DB needed at 100K scale)
- **Auth**: OTP-only (phone SMS or email), no passwords

## Milestone status
- **M1** (current): auth + upload + storage + manual profile — NO AI yet
- **M2**: AI pipeline (parse, embed, duplicate detection)
- **M3**: admin search (hybrid vector + keyword)
- **M4**: admin dashboard + analytics
- **M5**: production hardening

## Environment variables (apps/web/.env.local)
See `apps/web/.env.example` for the full list.

## Tech stack
Next.js 15 · React 19 · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Zustand · React Hook Form · Zod · Framer Motion · Sonner
