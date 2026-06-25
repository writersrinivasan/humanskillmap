# Database Design: ER Diagram, Schema, RLS & Triggers

## 1. ER Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       auth.users (Supabase managed)          │
│  id (uuid) PK  ·  email  ·  phone  ·  last_sign_in_at       │
└───────────────────────────────┬──────────────────────────────┘
                                │ id (trigger auto-creates)
                    ┌───────────▼─────────────┐
                    │      public.users         │
                    │  id (uuid) PK            │
                    │  email                   │
                    │  phone                   │
                    │  role (enum)             │
                    │  is_active               │
                    │  last_login_at           │
                    │  created_at              │
                    └────────────┬─────────────┘
                                 │ user_id (FK)
          ┌──────────────────────┼──────────────────────────────┐
          │                      │                              │
          ▼                      ▼                              ▼
┌─────────────────┐   ┌──────────────────────┐   ┌─────────────────────────┐
│    profiles     │   │   resume_uploads      │   │   audit_logs            │
│  id (uuid) PK  │   │  id (uuid) PK         │   │  id (uuid) PK           │
│  user_id (FK)  │   │  user_id (FK)         │   │  user_id (FK, nullable) │
│  full_name     │   │  storage_path         │   │  action                 │
│  headline      │   │  original_filename    │   │  resource_type          │
│  summary       │   │  file_size_bytes      │   │  resource_id            │
│  avatar_url    │   │  mime_type            │   │  ip_address             │
│  city/state/   │   │  status (enum)        │   │  user_agent             │
│  country       │   │  processing_attempts  │   │  metadata (jsonb)       │
│  linkedin_url  │   │  error_message        │   │  created_at             │
│  github_url    │   │  is_current           │   └─────────────────────────┘
│  portfolio_url │   │  created_at           │
│  salary_exp_   │   │  processed_at         │
│  min/max       │   └──────────────────────┘
│  notice_period │
│  availability  │               user_id (FK)
│  completion_pct│      ┌────────────┬────────────┐
│  updated_at    │      │            │            │
└─────────────────┘      ▼            ▼            ▼
                  ┌──────────┐ ┌──────────┐ ┌──────────────┐
                  │  skills  │ │experiences│ │  educations  │
                  │ id PK    │ │ id PK     │ │ id PK        │
                  │ user_id  │ │ user_id   │ │ user_id      │
                  │ upload_id│ │ upload_id │ │ upload_id    │
                  │ skill_   │ │ company_  │ │ institution  │
                  │  name    │ │  name     │ │ degree       │
                  │ skill_   │ │ role_title│ │ field_of_    │
                  │  type    │ │ start_date│ │  study       │
                  │ profic-  │ │ end_date  │ │ start_year   │
                  │  iency   │ │ is_current│ │ end_year     │
                  │ years_exp│ │ description│ │ grade        │
                  │ source   │ │ tech_stack│ │ source       │
                  │ is_verif-│ │ city      │ │ created_at   │
                  │  ied     │ │ source    │ └──────────────┘
                  │ created_at│ │ created_at│
                  └──────────┘ └──────────┘

                  ┌──────────────────────────┐
                  │      certifications       │
                  │  id PK · user_id FK      │
                  │  cert_name · issuer      │
                  │  issued_date · expiry    │
                  │  credential_id/url       │
                  │  source · created_at     │
                  └──────────────────────────┘
```

---

## 2. Table Schemas

### `public.users`
Mirrors `auth.users` with application-level role and status. Auto-created by trigger.

```sql
CREATE TABLE public.users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  phone           text,
  role            text NOT NULL DEFAULT 'candidate'
                  CHECK (role IN ('candidate','admin','super_admin')),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_login_at   timestamptz
);
```

### `public.profiles`
One-to-one with users. Contains all candidate-visible profile data.

```sql
CREATE TABLE public.profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  full_name           text,
  headline            text,                          -- e.g. "Senior React Engineer"
  summary             text,
  avatar_url          text,
  city                text,
  state               text,
  country             text DEFAULT 'India',
  linkedin_url        text,
  github_url          text,
  portfolio_url       text,
  salary_exp_min      integer,                       -- INR per year
  salary_exp_max      integer,
  notice_period_days  integer,
  availability_status text NOT NULL DEFAULT 'open'
                      CHECK (availability_status IN ('open','not_looking','open_to_offers')),
  completion_pct      integer NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

### `public.resume_uploads`
Tracks each file upload attempt. Only one row per user has `is_current = true`.

```sql
CREATE TABLE public.resume_uploads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path        text NOT NULL,                 -- e.g. "{user_id}/{uuid}.pdf"
  original_filename   text NOT NULL,
  file_size_bytes     bigint,
  mime_type           text,
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','uploaded','processing','processed','failed')),
  processing_attempts integer NOT NULL DEFAULT 0,
  error_message       text,
  is_current          boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  processed_at        timestamptz
);
```

### `public.skills`

```sql
CREATE TABLE public.skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id   uuid REFERENCES public.resume_uploads(id) ON DELETE SET NULL,
  skill_name  text NOT NULL,
  skill_type  text CHECK (skill_type IN ('technical','soft','domain','tool','language')),
  proficiency text CHECK (proficiency IN ('beginner','intermediate','advanced','expert')),
  years_exp   numeric(4,1),
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','resume')),
  is_verified boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### `public.experiences`

```sql
CREATE TABLE public.experiences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id    uuid REFERENCES public.resume_uploads(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  role_title   text NOT NULL,
  start_date   date,
  end_date     date,
  is_current   boolean NOT NULL DEFAULT false,
  description  text,
  tech_stack   text[] DEFAULT '{}',
  city         text,
  source       text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','resume')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

### `public.educations`

```sql
CREATE TABLE public.educations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id      uuid REFERENCES public.resume_uploads(id) ON DELETE SET NULL,
  institution    text NOT NULL,
  degree         text,
  field_of_study text,
  start_year     integer,
  end_year       integer,
  grade          text,
  source         text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','resume')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

### `public.certifications`

```sql
CREATE TABLE public.certifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cert_name      text NOT NULL,
  issuer         text,
  issued_date    date,
  expiry_date    date,
  credential_id  text,
  credential_url text,
  source         text NOT NULL DEFAULT 'manual',
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

### `public.audit_logs`
Append-only. Never updated or deleted.

```sql
CREATE TABLE public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action        text NOT NULL,              -- 'login', 'resume_upload', 'resume_download', etc.
  resource_type text,
  resource_id   uuid,
  ip_address    inet,
  user_agent    text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### Storage Bucket
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes', 'resumes', false,
  10485760,   -- 10 MB
  ARRAY['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);
```

---

## 3. Enum Types (implemented as CHECK constraints)

| Column | Values |
|--------|--------|
| `users.role` | `candidate`, `admin`, `super_admin` |
| `resume_uploads.status` | `pending`, `uploaded`, `processing`, `processed`, `failed` |
| `profiles.availability_status` | `open`, `not_looking`, `open_to_offers` |
| `skills.skill_type` | `technical`, `soft`, `domain`, `tool`, `language` |
| `skills.proficiency` | `beginner`, `intermediate`, `advanced`, `expert` |
| `*.source` | `manual`, `resume` |

---

## 4. Row Level Security (RLS)

All tables have RLS enabled. The `is_admin()` helper is used across all policies.

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('admin','super_admin')
  FROM public.users
  WHERE id = auth.uid()
$$;
```

### Policy Matrix

| Table | Own Row | Admin Read All | Admin Write |
|-------|---------|---------------|-------------|
| users | SELECT own | SELECT all | — |
| profiles | ALL own | SELECT all | — |
| resume_uploads | ALL own | SELECT all | — |
| skills | ALL own | SELECT all | — |
| experiences | ALL own | SELECT all | — |
| educations | ALL own | SELECT all | — |
| certifications | ALL own | SELECT all | — |
| audit_logs | SELECT own | SELECT all | — |

### Storage Policies
- **Upload**: `auth.uid()::text = (storage.foldername(name))[1]`
- **Read**: same as upload (own folder) OR `is_admin()`
- **Delete**: own folder only

---

## 5. Triggers

### `handle_new_auth_user` — fired on `auth.users` INSERT
```sql
-- Creates public.users row + empty profiles row
INSERT INTO public.users (id, email, phone) VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'phone');
INSERT INTO public.profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
```

### `handle_auth_sign_in` — fired on `auth.users` UPDATE (last_sign_in_at change)
```sql
UPDATE public.users SET last_login_at = NOW() WHERE id = NEW.id;
```

### `handle_new_resume_upload` — fired on `resume_uploads` INSERT
```sql
-- Marks all previous uploads for this user as not current
UPDATE public.resume_uploads SET is_current = false
WHERE user_id = NEW.user_id AND id != NEW.id;
UPDATE public.resume_uploads SET is_current = true WHERE id = NEW.id;
```

### `set_updated_at` — fired on `profiles` UPDATE
```sql
NEW.updated_at = NOW();
```

### `trg_recompute_completion` — fired on changes to profiles, skills, experiences, educations, resume_uploads
Calls `recompute_completion_pct(user_id)` which computes a score 0–100:

```sql
CREATE OR REPLACE FUNCTION recompute_completion_pct(p_user_id uuid) RETURNS void AS $$
DECLARE
  score integer := 0;
  p     profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM profiles WHERE user_id = p_user_id;
  IF p.full_name IS NOT NULL    THEN score := score + 15; END IF;
  IF p.headline IS NOT NULL     THEN score := score + 10; END IF;
  IF p.city IS NOT NULL         THEN score := score + 5;  END IF;
  IF p.summary IS NOT NULL      THEN score := score + 10; END IF;
  IF (p.linkedin_url IS NOT NULL OR p.github_url IS NOT NULL) THEN score := score + 5; END IF;
  IF p.salary_exp_min IS NOT NULL THEN score := score + 5; END IF;
  IF EXISTS (SELECT 1 FROM resume_uploads WHERE user_id = p_user_id AND is_current = true)
    THEN score := score + 20; END IF;
  IF EXISTS (SELECT 1 FROM skills WHERE user_id = p_user_id)
    THEN score := score + 15; END IF;
  IF EXISTS (SELECT 1 FROM experiences WHERE user_id = p_user_id)
    THEN score := score + 10; END IF;
  IF EXISTS (SELECT 1 FROM educations WHERE user_id = p_user_id)
    THEN score := score + 5; END IF;
  UPDATE profiles SET completion_pct = score WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Indexes

```sql
-- Auth & lookups
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_resume_uploads_user_current ON public.resume_uploads(user_id, is_current);
CREATE INDEX idx_resume_uploads_status ON public.resume_uploads(status);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Full-text search (M3 — add when enabling search)
CREATE INDEX idx_profiles_fts ON public.profiles
  USING GIN (to_tsvector('english', coalesce(full_name,'') || ' ' || coalesce(headline,'') || ' ' || coalesce(summary,'')));
CREATE INDEX idx_skills_name ON public.skills USING GIN (to_tsvector('english', skill_name));

-- Vector search (M2 — add after enabling pgvector)
-- CREATE INDEX idx_resume_embeddings_hnsw ON resume_embeddings
--   USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
```

---

## 7. Migration Files

| File | Purpose |
|------|---------|
| `supabase/migrations/001_schema.sql` | All table DDL + storage bucket |
| `supabase/migrations/002_rls.sql` | RLS enable + all policies + is_admin() function |
| `supabase/migrations/003_triggers.sql` | All trigger functions + trigger bindings |
