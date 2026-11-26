-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261126000000_single_active_session.sql
-- DESCRIPTION: Single Active Session Enforcement (JioHotstar-style 1-login limit)
--
-- Adds active_session_id, active_session_device, and active_session_at to
-- public.students, along with SECURITY DEFINER RPCs for checking, claiming,
-- and safely clearing sessions without exposing table-level anon SELECT/UPDATE.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS active_session_id TEXT,
  ADD COLUMN IF NOT EXISTS active_session_device TEXT,
  ADD COLUMN IF NOT EXISTS active_session_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_active_session_id
  ON public.students (active_session_id)
  WHERE active_session_id IS NOT NULL;

-- 1. Check whether a student currently has an active session
CREATE OR REPLACE FUNCTION public.get_student_active_session(p_student_id TEXT)
RETURNS TABLE (
  active_session_id TEXT,
  active_session_device TEXT,
  active_session_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student_id IS NULL OR length(trim(p_student_id)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.active_session_id, s.active_session_device, s.active_session_at
  FROM public.students s
  WHERE s.id = p_student_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_active_session(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_student_active_session(TEXT) TO anon, authenticated;

-- 2. Atomically claim the single active session for a student
CREATE OR REPLACE FUNCTION public.claim_student_session(
  p_student_id TEXT,
  p_session_id TEXT,
  p_device_label TEXT DEFAULT 'Web Browser'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student_id IS NULL OR length(trim(p_student_id)) = 0
     OR p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.students
  SET active_session_id = p_session_id,
      active_session_device = COALESCE(NULLIF(trim(p_device_label), ''), 'Web Browser'),
      active_session_at = NOW()
  WHERE id = p_student_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_student_session(TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_student_session(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 3. Clear the active session on manual logout (only if it matches the caller's session)
CREATE OR REPLACE FUNCTION public.clear_student_session(
  p_student_id TEXT,
  p_session_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student_id IS NULL OR length(trim(p_student_id)) = 0
     OR p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.students
  SET active_session_id = NULL,
      active_session_device = NULL,
      active_session_at = NULL
  WHERE id = p_student_id
    AND active_session_id = p_session_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_student_session(TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.clear_student_session(TEXT, TEXT) TO anon, authenticated;
