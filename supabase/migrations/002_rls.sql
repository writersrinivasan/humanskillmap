-- ============================================================
-- ROW LEVEL SECURITY POLICIES — MILESTONE 1
-- Principle: candidates see only their own data; admins see all.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs     ENABLE ROW LEVEL SECURITY;

-- ─── Helper: is the current session an admin? ───────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
  );
$$;

-- ─── USERS ──────────────────────────────────────────────────
CREATE POLICY "users: own row" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "users: admins read all" ON public.users
  FOR SELECT USING (public.is_admin());

-- ─── PROFILES ───────────────────────────────────────────────
CREATE POLICY "profiles: own row" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "profiles: admins read all" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- ─── RESUME UPLOADS ─────────────────────────────────────────
CREATE POLICY "uploads: own rows" ON public.resume_uploads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "uploads: admins read all" ON public.resume_uploads
  FOR SELECT USING (public.is_admin());

-- ─── SKILLS ─────────────────────────────────────────────────
CREATE POLICY "skills: own rows" ON public.skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "skills: admins read all" ON public.skills
  FOR SELECT USING (public.is_admin());

-- ─── EXPERIENCES ────────────────────────────────────────────
CREATE POLICY "experiences: own rows" ON public.experiences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "experiences: admins read all" ON public.experiences
  FOR SELECT USING (public.is_admin());

-- ─── EDUCATIONS ─────────────────────────────────────────────
CREATE POLICY "educations: own rows" ON public.educations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "educations: admins read all" ON public.educations
  FOR SELECT USING (public.is_admin());

-- ─── CERTIFICATIONS ─────────────────────────────────────────
CREATE POLICY "certifications: own rows" ON public.certifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "certifications: admins read all" ON public.certifications
  FOR SELECT USING (public.is_admin());

-- ─── AUDIT LOGS (append-only for candidates) ────────────────
-- Candidates can only insert (not read own logs — privacy).
-- Admins can read all.
CREATE POLICY "audit_logs: insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "audit_logs: admins read all" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- ─── STORAGE — resumes bucket ───────────────────────────────
-- Folder structure: resumes/{user_id}/{file}
CREATE POLICY "storage: own folder upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage: own folder read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage: admins read all" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND public.is_admin()
  );

CREATE POLICY "storage: own folder delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
