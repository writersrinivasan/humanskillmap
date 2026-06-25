# System Architecture (HLD + LLD)

## 1. High-Level Design (HLD)

```
                        ┌─────────────────────────────────────────────────────┐
                        │                   INTERNET                          │
                        └───────────────────────┬─────────────────────────────┘
                                                │
                        ┌───────────────────────▼─────────────────────────────┐
                        │               VERCEL EDGE NETWORK                   │
                        │         (CDN + Middleware + Serverless Fns)          │
                        └──────────┬──────────────────────────┬───────────────┘
                                   │                          │
              ┌────────────────────▼───────┐   ┌─────────────▼───────────────┐
              │    Next.js App (SSR/SSG)   │   │   Next.js Route Handlers    │
              │   React 19 · Tailwind CSS  │   │   (REST API — serverless)   │
              │   shadcn/ui · Framer Motion│   │   /api/auth/*               │
              │                            │   │   /api/resume/*             │
              │  Route groups:             │   │   /api/profile/*            │
              │  (auth)  → /login          │   │   /api/admin/*              │
              │  (portal)→ /upload         │   └────────────┬────────────────┘
              │           /profile         │                │
              │  (admin) → /admin/*        │                │ supabase-js (server)
              └────────────────────────────┘                │
                                                            │
              ┌─────────────────────────────────────────────▼───────────────────┐
              │                      SUPABASE                                   │
              │  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
              │  │  Auth Service  │  │  PostgreSQL DB    │  │  Storage        │ │
              │  │  OTP (SMS/     │  │  - users          │  │  Bucket:resumes │ │
              │  │   Email)       │  │  - profiles       │  │  (private)      │ │
              │  │  JWT sessions  │  │  - resume_uploads │  │  Presigned URLs │ │
              │  └────────────────┘  │  - skills         │  └─────────────────┘ │
              │                      │  - experiences    │                       │
              │  ┌────────────────┐  │  - educations     │  ┌─────────────────┐ │
              │  │  Edge Functions│  │  - certifications │  │  pgvector (M2)  │ │
              │  │  (M2+)         │  │  - audit_logs     │  │  embeddings     │ │
              │  │  AI Pipeline   │  │  RLS on all tables│  │  HNSW index     │ │
              │  │  PDF Parse     │  └──────────────────┘  └─────────────────┘ │
              │  │  Embeddings    │                                              │
              │  └────────────────┘                                              │
              └──────────────────────────────────────────────────────────────────┘
                                                            │ (M2+)
              ┌─────────────────────────────────────────────▼───────────────────┐
              │              EXTERNAL AI SERVICES (M2+)                         │
              │   OpenAI API (embeddings + LLM)   ·   Twilio (SMS OTP)          │
              └──────────────────────────────────────────────────────────────────┘
```

---

## 2. Request Flow by Feature

### 2.1 Candidate Upload Flow (critical path — must be < 60 seconds)

```
Browser                  Vercel                    Supabase
  │                        │                          │
  │── POST /api/resume/upload ──▶│                   │
  │   { filename, size, type }   │                   │
  │                        │── INSERT resume_uploads ─▶│
  │                        │   status='pending'        │
  │                        │── createSignedUploadUrl ──▶│
  │                        │◀── { signedUrl, token } ──│
  │◀── { uploadId, signedUrl } ──│                   │
  │                        │                          │
  │── PUT {signedUrl} (XHR) ────────────────────────▶│
  │   (file bytes, up to 10MB)                        │  ← direct to Supabase Storage
  │   progress events: 0→100%                         │     bypasses Vercel 4.5MB limit
  │                    │                              │
  │── POST /api/resume/upload/complete ─▶│            │
  │   { uploadId }              │── UPDATE status='uploaded' ─▶│
  │◀── { success } ─────────────│                   │
  │                        │                          │
  │  redirect → /profile   │                          │
```

**Why XHR instead of fetch**: XHR exposes `upload.onprogress` events needed for the progress bar. `fetch()` doesn't support upload progress.

**Why presigned URL**: Vercel serverless functions have a 4.5 MB request body limit. Presigned URLs let the client upload directly to Supabase Storage (up to 10 MB), bypassing Vercel entirely.

---

### 2.2 OTP Auth Flow

```
Browser                     /api/auth/send-otp        Supabase Auth
  │                                │                       │
  │── POST { type:'phone',         │                       │
  │          value:'9876543210' } ─▶│                      │
  │                                │── signInWithOtp ──────▶│
  │                                │   (phone: +919876543210)│── SMS via Twilio ──▶ User
  │◀── { ok: true } ───────────────│                       │
  │                                │                       │
  │  redirect → /verify-otp?type=phone&value=9876543210    │
  │                                │                       │
  │── POST { type, value, token } ─▶│                      │
  │   (6-digit OTP)                │── verifyOtp ──────────▶│
  │                                │◀── { session } ────────│
  │                                │── UPSERT public.users  │
  │                                │── INSERT audit_log     │
  │◀── { ok, redirectTo } ─────────│                       │
  │                                │                       │
  │  redirect → /upload (or 'next' param)                  │
```

---

### 2.3 AI Processing Flow (M2 — not yet built)

```
Supabase Storage          Edge Function              External APIs
  │  (resume uploaded)         │                          │
  │── file-upload webhook ─────▶│                        │
  │                             │── download PDF ─────────▶│
  │                             │── PyMuPDF: extract text  │
  │                             │── LangGraph: parse       │
  │                             │   structured data        │
  │                             │── OpenAI: embed text ────▶│
  │                             │◀── float[1536] ───────────│
  │                             │── pgvector: INSERT        │
  │                             │   embedding               │
  │                             │── UPDATE status=          │
  │                             │   'processed'             │
```

---

## 3. Low-Level Design (LLD)

### 3.1 Middleware Auth Guard (`apps/web/middleware.ts`)

```
Request comes in
       │
       ▼
Create Supabase server client (reads cookies)
       │
       ▼
supabase.auth.getUser()  ← refreshes session if expiring
       │
       ├── PUBLIC_ROUTES (/login, /verify-otp) + user is logged in?
       │         └── redirect → /upload
       │
       ├── PROTECTED route + no user?
       │         └── redirect → /login?next={pathname}
       │
       ├── ADMIN route (/admin/*) + user logged in?
       │         ├── query public.users.role
       │         ├── role NOT in [admin, super_admin]?
       │         │       └── redirect → /profile
       │         └── OK, pass through
       │
       └── All other cases → NextResponse.next()
```

### 3.2 Upload State Machine (`apps/web/hooks/useUpload.ts`)

```
Phase transitions:

idle ──[upload(file)]──▶ requesting ──[signedUrl received]──▶ uploading
                                                                    │
                                              ┌─────────────────────┘
                                              │  XHR PUT to Supabase Storage
                                              │  progress: 15% → 85%
                                              ▼
                                         confirming ──[PATCH complete API]──▶ done
                                              │
                                              └──[any error]──▶ error
```

### 3.3 Profile Completion Score (DB Trigger)

Computed in `recompute_completion_pct()` trigger, fires on changes to `profiles`, `skills`, `experiences`, `educations`, `resume_uploads`:

| Field | Points |
|-------|--------|
| full_name | 15 |
| headline | 10 |
| city | 5 |
| summary | 10 |
| social links (any) | 5 |
| salary expectation | 5 |
| resume uploaded | 20 |
| skills (any) | 15 |
| experience (any) | 10 |
| education (any) | 5 |
| **Total** | **100** |

### 3.4 Component Tree

```
app/
├── (auth)/login/page.tsx
│   └── <AuthForm>
│       ├── <Tabs> Phone / Email
│       └── [submit] → /verify-otp?type&value
│
├── (auth)/verify-otp/page.tsx
│   └── <Suspense>
│       └── <VerifyOTPContent>
│           └── <OTPInput> (6 boxes, auto-advance, paste support)
│
├── (portal)/upload/page.tsx [useUpload hook]
│   ├── <UploadDropzone>  (react-dropzone, drag-and-drop)
│   ├── <UploadProgress>  (XHR progress bar)
│   └── success screen → redirect /profile after 2s
│
├── (portal)/profile/page.tsx  [server component, force-dynamic]
│   ├── <ProfileHeader>
│   │   └── <CompletionRing>  (SVG arc, Framer Motion)
│   ├── <ProcessingStatus>    (upload status badge)
│   ├── <SkillsEditor>        (client component, inline add/delete)
│   ├── <ExperienceList>      (timeline layout)
│   └── <EducationList>       (grid layout)
│
└── (admin)/admin/dashboard/page.tsx
    ├── Stat cards (4 counts)
    └── <CandidateTable>      (users joined via resume_uploads)
```

---

## 4. Data Flow Summary

```
User Action          → Route Handler         → Supabase Operation
─────────────────────────────────────────────────────────────────
Send OTP             → /api/auth/send-otp    → auth.signInWithOtp()
Verify OTP           → /api/auth/verify-otp  → auth.verifyOtp() + users UPSERT
Request upload URL   → /api/resume/upload    → resume_uploads INSERT + storage.createSignedUploadUrl()
Upload file          → Supabase Storage direct (XHR, no Vercel)
Confirm upload       → /api/resume/upload/complete → resume_uploads UPDATE status='uploaded'
Check status         → /api/resume/status/[id] → resume_uploads SELECT
Download resume      → /api/resume/download/[id] → storage.createSignedUrl() (5 min)
Get profile          → /api/profile (GET)    → profiles + skills + experiences + educations SELECT
Update profile       → /api/profile (PATCH)  → profiles UPDATE
Add skill            → /api/profile/skills   → skills INSERT
Delete skill         → /api/profile/skills/[id] → skills DELETE
Admin: list uploads  → /api/admin/candidates → resume_uploads JOIN users JOIN profiles SELECT
```
