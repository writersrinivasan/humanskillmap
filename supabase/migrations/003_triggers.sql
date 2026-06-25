-- ============================================================
-- TRIGGERS — MILESTONE 1
-- ============================================================

-- ─── Auto-create public.users when auth.users is created ────
-- Handles both phone and email OTP sign-ins (first time).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    'candidate'
  )
  ON CONFLICT (id) DO UPDATE
    SET email         = COALESCE(EXCLUDED.email, public.users.email),
        phone         = COALESCE(EXCLUDED.phone, public.users.phone),
        last_login_at = NOW();

  -- Also create an empty profile row
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─── Update last_login_at on every sign-in ──────────────────
CREATE OR REPLACE FUNCTION public.handle_auth_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_sign_in ON auth.users;
CREATE TRIGGER on_auth_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_auth_sign_in();

-- ─── Mark previous resumes as not current on new upload ─────
CREATE OR REPLACE FUNCTION public.handle_new_resume_upload()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark all existing uploads for this user as not current
  UPDATE public.resume_uploads
  SET is_current = false
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_current = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_resume_upload ON public.resume_uploads;
CREATE TRIGGER on_new_resume_upload
  AFTER INSERT ON public.resume_uploads
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_resume_upload();

-- ─── Auto-update profiles.updated_at ────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Recompute profile completion percentage ─────────────────
-- Called after INSERT/UPDATE on profiles, skills, experiences, educations
CREATE OR REPLACE FUNCTION public.recompute_completion_pct(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pct  INTEGER := 0;
  v_prof public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_prof FROM public.profiles WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_prof.full_name    IS NOT NULL AND v_prof.full_name    != '' THEN v_pct := v_pct + 15; END IF;
  IF v_prof.headline     IS NOT NULL AND v_prof.headline     != '' THEN v_pct := v_pct + 10; END IF;
  IF v_prof.city         IS NOT NULL AND v_prof.city         != '' THEN v_pct := v_pct + 5;  END IF;
  IF v_prof.summary      IS NOT NULL AND v_prof.summary      != '' THEN v_pct := v_pct + 10; END IF;
  IF v_prof.linkedin_url IS NOT NULL OR v_prof.github_url IS NOT NULL
     OR v_prof.portfolio_url IS NOT NULL                           THEN v_pct := v_pct + 5;  END IF;
  IF v_prof.salary_exp_min IS NOT NULL                             THEN v_pct := v_pct + 5;  END IF;

  -- Has current resume?
  IF EXISTS (SELECT 1 FROM public.resume_uploads
             WHERE user_id = p_user_id AND is_current = true AND status != 'pending')
  THEN v_pct := v_pct + 20; END IF;

  -- Has skills?
  IF EXISTS (SELECT 1 FROM public.skills WHERE user_id = p_user_id LIMIT 1)
  THEN v_pct := v_pct + 15; END IF;

  -- Has experience?
  IF EXISTS (SELECT 1 FROM public.experiences WHERE user_id = p_user_id LIMIT 1)
  THEN v_pct := v_pct + 10; END IF;

  -- Has education?
  IF EXISTS (SELECT 1 FROM public.educations WHERE user_id = p_user_id LIMIT 1)
  THEN v_pct := v_pct + 5; END IF;

  UPDATE public.profiles
  SET completion_pct = LEAST(v_pct, 100)
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger wrapper for profiles table
CREATE OR REPLACE FUNCTION public.trg_recompute_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.recompute_completion_pct(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recompute_on_profile_change ON public.profiles;
CREATE TRIGGER recompute_on_profile_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_completion();

DROP TRIGGER IF EXISTS recompute_on_skill_change ON public.skills;
CREATE TRIGGER recompute_on_skill_change
  AFTER INSERT OR DELETE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_completion();

DROP TRIGGER IF EXISTS recompute_on_exp_change ON public.experiences;
CREATE TRIGGER recompute_on_exp_change
  AFTER INSERT OR DELETE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_completion();

DROP TRIGGER IF EXISTS recompute_on_edu_change ON public.educations;
CREATE TRIGGER recompute_on_edu_change
  AFTER INSERT OR DELETE ON public.educations
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_completion();

DROP TRIGGER IF EXISTS recompute_on_upload_change ON public.resume_uploads;
CREATE TRIGGER recompute_on_upload_change
  AFTER INSERT OR UPDATE OF status, is_current ON public.resume_uploads
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_completion();
