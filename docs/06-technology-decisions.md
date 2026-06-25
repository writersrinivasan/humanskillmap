# Technology Decisions & Justifications

Every major technology choice is documented here with the reasoning and trade-offs considered.

---

## 1. Next.js 15 App Router

**Chosen over:** Remix, SvelteKit, plain React + Express

**Why:**
- App Router enables per-route server components, reducing JS bundle size for data-heavy pages like profile and admin dashboard
- Route groups `(auth)`, `(portal)`, `(admin)` allow different layouts with no URL impact
- Middleware runs at the edge for fast auth checks without a cold-start backend
- Vercel deployment is first-class (same company) — zero config, instant preview URLs
- `force-dynamic` export flag per route gives fine-grained caching control

**Trade-offs:**
- App Router has a steeper learning curve (server vs. client components, async RSC)
- Some third-party libraries don't support server components yet (handled with `'use client'`)

---

## 2. Supabase (Auth + DB + Storage)

**Chosen over:** Firebase, PlanetScale + S3 + Auth0 (separate services)

**Why:**
- Single vendor for 3 critical services eliminates integration complexity and separate billing
- Built-in OTP auth (SMS via Twilio, Email) — no custom auth code
- RLS (Row Level Security) enforces data isolation at the DB layer, not application layer
- Presigned upload URLs solve the Vercel 4.5 MB body limit problem cleanly
- `@supabase/ssr` handles cookie-based session management for Next.js correctly
- pgvector extension means no separate vector database (saves ~$70/mo at 100K scale)

**Trade-offs:**
- Vendor lock-in for auth, DB, and storage
- Free tier has 500 MB DB limit (upgrade to Pro at ~$25/mo when needed)
- Supabase doesn't offer full-text search as good as Elasticsearch (acceptable for 100K scale)

---

## 3. Vercel (Hosting — M1)

**Chosen over:** Railway, Fly.io, AWS ECS, self-hosted

**Why:**
- Zero-config deployment from GitHub (`git push` = deploy)
- Edge Network CDN included
- Preview URLs for every PR
- Serverless functions auto-scale to zero (no idle cost)
- `NEXT_PUBLIC_*` env vars automatically handled

**Trade-offs:**
- Serverless functions have a 4.5 MB body limit (solved with presigned URLs for uploads)
- Python workers can't run on Vercel — planned for Supabase Edge Functions in M2
- Cold starts possible on free tier (upgrade to Pro eliminates this)

**Decision recorded:** User chose Vercel-only for M1. Will reconsider Railway/Fly.io for Python workers when M2 is built.

---

## 4. Supabase Edge Functions (M2 AI Workers)

**Chosen over:** Vercel serverless functions (Python not supported), Railway, AWS Lambda

**Why:**
- Python runtime supported (Deno + Python via subprocess, or native Deno)
- Same Supabase project = no cross-service auth needed
- DB webhooks can trigger edge functions directly
- Included in Supabase Pro plan

**Trade-offs:**
- Deno runtime has some Python library constraints
- Cold starts on edge functions can be 500ms+

---

## 5. pgvector (Vector Search)

**Chosen over:** Pinecone, Weaviate, Qdrant, Chroma

**Why:**
- Already inside Supabase PostgreSQL — no new infrastructure
- SQL JOINs for metadata filtering are instant (no client-side filtering)
- HNSW index gives <20ms ANN search at 100K scale
- ~$0 extra cost vs ~$70/mo for Pinecone Starter

**Trade-offs:**
- pgvector tops out around 1–2M vectors before dedicated vector DB is needed
- No built-in payload filtering (solved with WHERE clauses in hybrid SQL function)
- HNSW build time increases with dataset size

**Scale trigger:** Move to dedicated vector DB when corpus exceeds 2M resumes.

---

## 6. TypeScript (Strict Mode)

**Why strict mode:**
- Supabase query results are typed end-to-end via the `Database` generic type
- Eliminates `null`/`undefined` bugs at compile time
- Zod schemas at API boundaries prevent runtime type errors
- `noImplicitAny` catches missing type annotations early

---

## 7. Tailwind CSS + shadcn/ui

**Chosen over:** MUI, Chakra UI, Ant Design

**Why:**
- Zero runtime CSS-in-JS overhead
- shadcn/ui components are copy-pasted into the codebase (no version lock-in)
- Radix UI primitives provide accessible components out of the box
- CSS variables for theming make dark mode trivial to add later
- Bundle size is smaller (only used utilities are included)

**Trade-offs:**
- More initial setup than component libraries
- No built-in data tables, date pickers (added as needed via Radix + custom)

---

## 8. React Hook Form + Zod

**Why:**
- React Hook Form is uncontrolled by default (no re-renders on every keystroke)
- Zod schemas serve dual purpose: client validation + API route validation (DRY)
- `@hookform/resolvers` connects both libraries cleanly

---

## 9. Framer Motion

**Used for:**
- Tab transitions in the auth form (phone ↔ email slide animation)
- Profile completion ring SVG arc animation
- Staggered card entrance animations

**Why not CSS animations:**
- JavaScript-controlled animations for interactive state-based transitions (can't do with pure CSS)
- `AnimatePresence` handles component unmount animations that CSS cannot

---

## 10. Zustand (Auth Store)

**Chosen over:** Redux, Jotai, Context API

**Why:**
- 4x less boilerplate than Redux
- No Provider wrapping needed
- Works outside React (useful for accessing state in hooks and event handlers)
- Tiny bundle size (~1KB)

**Trade-offs:**
- No built-in devtools (can add with `zustand/middleware`)

---

## 11. OTP-Only Auth (No Passwords)

**Why:**
- Indian job seekers are mobile-first — phone OTP is the dominant pattern (similar to Naukri, LinkedIn India)
- Eliminates password resets, brute-force attacks, credential stuffing
- Lower barrier to entry for candidates who forget passwords
- Supabase OTP is production-ready with Twilio integration

**Trade-offs:**
- Requires phone number or email (SMS costs ~$0.0075/message via Twilio)
- OTP delivery failures (no SMS signal) need fallback to email OTP

---

## 12. XHR for File Upload (not `fetch`)

**Why:**
- `fetch()` API does not expose upload progress events
- `XMLHttpRequest.upload.onprogress` provides byte-level progress for the progress bar
- This is the only modern way to get upload progress percentage

---

## 13. pnpm Workspaces + Turborepo

**Chosen over:** npm workspaces, Yarn workspaces, Nx

**Why:**
- pnpm uses hard links for node_modules — disk space savings for shared dependencies
- Turborepo caches build outputs: subsequent builds are 2–10x faster
- Single `pnpm dev` at root starts all apps simultaneously
- Easy to add `apps/workers` Python package in M2 without restructuring

---

## 14. URL-based OTP State Passing

**Pattern:** `/verify-otp?type=phone&value=9876543210`

**Why:**
- No server-side session storage needed between send-OTP and verify-OTP pages
- Survives page refresh (user can reload the OTP page)
- Easy to debug (visible in URL)
- No risk of state being lost on navigation

**Security note:** Phone number is visible in URL. This is acceptable because:
1. Phone is already known to the user
2. Not a secret — the OTP token is the secret
3. History can be cleared if needed

---

## Summary Table

| Technology | Category | Reason in One Line |
|-----------|----------|--------------------|
| Next.js 15 | Framework | App Router + Vercel native, edge middleware |
| Supabase | Backend | Auth + DB + Storage in one, RLS, pgvector |
| Vercel | Hosting | Zero-config deploy, CDN, serverless |
| pgvector | Vector Search | No extra infra cost, native SQL joins |
| TypeScript strict | Language | End-to-end type safety with Supabase |
| Tailwind + shadcn | UI | Zero runtime, accessible Radix primitives |
| React Hook Form + Zod | Forms | Uncontrolled forms, shared validation schemas |
| Zustand | State | Minimal boilerplate, works outside React |
| OTP auth | Auth | Mobile-first India, no password complexity |
| XHR upload | Upload | Only way to get upload progress events |
| pnpm + Turborepo | Monorepo | Fast installs, cached builds |
