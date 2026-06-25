-- ============================================================
-- MILESTONE 1 SCHEMA
-- Enables: auth, resume upload/storage, manual profile editing
-- No AI tables yet — those come in migration 004 (M2)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS (mirrors auth.users, stores app-level role + state)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY,              -- same as auth.users.id
  email           TEXT UNIQUE,
  phone           TEXT UNIQUE,
  role            TEXT NOT NULL DEFAULT 'candidate'
                    CHECK (role IN ('candidate', 'admin', 'super_admin')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ,
  CONSTRAINT at_least_one_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

COMMENT ON TABLE public.users IS 'App-level user record. id = auth.users.id.';

-- ============================================================
-- PROFILES (detailed candidate profile, filled gradually)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name            TEXT,
  headline             TEXT,                    -- e.g. "Senior React Developer"
  summary              TEXT,
  avatar_url           TEXT,
  city                 TEXT,
  state                TEXT,
  country              TEXT DEFAULT 'India',
  linkedin_url         TEXT,
  github_url           TEXT,
  portfolio_url        TEXT,
  salary_exp_min       INTEGER,                 -- INR thousands/month
  salary_exp_max       INTEGER,
  notice_period_days   INTEGER,
  availability_status  TEXT NOT NULL DEFAULT 'open'
                         CHECK (availability_status IN ('open', 'not_looking', 'open_to_offers')),
  completion_pct       SMALLINT NOT NULL DEFAULT 0
                         CHECK (completion_pct BETWEEN 0 AND 100),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ============================================================
-- RESUME UPLOADS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resume_uploads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path        TEXT NOT NULL,            -- e.g. user_id/uuid.pdf
  original_filename   TEXT NOT NULL,
  file_size_bytes     INTEGER,
  mime_type           TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'uploaded', 'processing', 'processed', 'failed')),
  processing_attempts SMALLINT NOT NULL DEFAULT 0,
  error_message       TEXT,
  is_current          BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resume_uploads_user_id ON public.resume_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_uploads_status  ON public.resume_uploads(status);
CREATE INDEX IF NOT EXISTS idx_resume_uploads_current ON public.resume_uploads(user_id, is_current)
  WHERE is_current = true;

-- ============================================================
-- SKILLS (manual in M1, AI-extracted in M2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skills (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id    UUID REFERENCES public.resume_uploads(id) ON DELETE SET NULL,
  skill_name   TEXT NOT NULL,
  skill_type   TEXT CHECK (skill_type IN ('technical', 'soft', 'domain', 'tool', 'language')),
  proficiency  TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_exp    NUMERIC(3, 1),
  source       TEXT NOT NULL DEFAULT 'manual'   -- 'manual' | 'resume'
                 CHECK (source IN ('manual', 'resume')),
  is_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_user_id ON public.skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_name    ON public.skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_skills_trgm    ON public.skills USING GIN(skill_name gin_trgm_ops);

-- ============================================================
-- EXPERIENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.experiences (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id    UUID REFERENCES public.resume_uploads(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  role_title   TEXT NOT NULL,
  start_date   DATE,
  end_date     DATE,
  is_current   BOOLEAN NOT NULL DEFAULT false,
  description  TEXT,
  tech_stack   TEXT[] NOT NULL DEFAULT '{}',
  city         TEXT,
  source       TEXT NOT NULL DEFAULT 'manual'
                 CHECK (source IN ('manual', 'resume')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiences_user_id  ON public.experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_experiences_company  ON public.experiences(company_name);

-- ============================================================
-- EDUCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.educations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_id      UUID REFERENCES public.resume_uploads(id) ON DELETE SET NULL,
  institution    TEXT NOT NULL,
  degree         TEXT,
  field_of_study TEXT,
  start_year     SMALLINT,
  end_year       SMALLINT,
  grade          TEXT,
  source         TEXT NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('manual', 'resume')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_educations_user_id ON public.educations(user_id);

-- ============================================================
-- CERTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certifications (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cert_name      TEXT NOT NULL,
  issuer         TEXT,
  issued_date    DATE,
  expiry_date    DATE,
  credential_id  TEXT,
  credential_url TEXT,
  source         TEXT NOT NULL DEFAULT 'manual'
                   CHECK (source IN ('manual', 'resume')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   TEXT,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action  ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- SUPABASE STORAGE BUCKET (private)
-- Create via Dashboard OR via this SQL:
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760,   -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;
