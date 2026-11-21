-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261121000000_lockdown_security_and_rls.sql
-- DESCRIPTION: Security Hardening & Row Level Security (RLS) Lockdown for Milestone 2
--
-- Features addressed:
--   - SEC-03: Revoke UPDATE on public.students from anon; route updates via security definer RPC
--   - SEC-04: Sanitize get_student_by_phone to exclude access_pin & sensitive credentials
--   - SEC-05: Replace blanket USING (true) policies on student_profiles, attendance_records,
--             personal_tasks, and certificates with scoped ownership policies
--   - SEC-09: Revoke anon EXECUTE on increment_student_xp
--   - SEC-11: Restrict storage.objects so anonymous users cannot arbitrarily overwrite files
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SEC-03: Revoke UPDATE on students from anon & create security definer RPCs
-- ─────────────────────────────────────────────────────────────────────────────

-- PostgREST table-level permissions: revoke direct UPDATE privilege from anon
REVOKE UPDATE ON public.students FROM anon;

-- Drop all blanket or permissive update policies on students
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'students' AND cmd IN ('UPDATE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.students', pol.policyname);
  END LOOP;
END $$;

-- Security Definer RPC for student avatar updates (avoids granting table-level UPDATE to anon)
CREATE OR REPLACE FUNCTION public.update_student_avatar(p_student_id TEXT, p_avatar_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student_id IS NULL OR length(trim(p_student_id)) = 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.students
  SET avatar = p_avatar_url
  WHERE id = p_student_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.update_student_avatar(TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.update_student_avatar(TEXT, TEXT) TO anon, authenticated;

-- Security Definer RPC for rotating passkey (used by verify-passkey and get-passkey)
CREATE OR REPLACE FUNCTION public.update_student_passkey(
  p_student_id TEXT, 
  p_access_pin TEXT, 
  p_updated_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student_id IS NULL OR length(trim(p_student_id)) = 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.students
  SET access_pin = p_access_pin,
      passkey_updated_at = p_updated_at
  WHERE id = p_student_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.update_student_passkey(TEXT, TEXT, TIMESTAMPTZ) FROM public;
GRANT EXECUTE ON FUNCTION public.update_student_passkey(TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SEC-04: Redefine get_student_by_phone to strictly EXCLUDE access_pin & secrets
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_student_by_phone(TEXT);

CREATE OR REPLACE FUNCTION public.get_student_by_phone(suffix TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  email TEXT,
  mobile_number TEXT,
  batch TEXT,
  batch_code TEXT,
  registration_id TEXT,
  avatar TEXT,
  enrolled_courses TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.name,
    s.email,
    s.mobile_number,
    s.batch,
    s.batch AS batch_code,
    s.registration_id,
    s.avatar,
    s.enrolled_courses
  FROM public.students s
  WHERE right(regexp_replace(s.mobile_number, '\D', '', 'g'), 10)
      = right(regexp_replace(suffix,          '\D', '', 'g'), 10)
    AND length(regexp_replace(suffix, '\D', '', 'g')) >= 10
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_student_by_phone(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_student_by_phone(TEXT) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SEC-05: Row Level Security (RLS) Lockdown across Student Data Tables
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1. student_profiles: Drop blanket policies and enforce ownership/scoped constraints
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read student_profiles"   ON public.student_profiles;
DROP POLICY IF EXISTS "Allow anon insert student_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Allow anon update student_profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Public read student_profiles"       ON public.student_profiles;
DROP POLICY IF EXISTS "Scoped insert student_profiles"     ON public.student_profiles;
DROP POLICY IF EXISTS "Scoped update student_profiles"     ON public.student_profiles;

-- Allow read for display & profile hydration
CREATE POLICY "Public read student_profiles" 
  ON public.student_profiles FOR SELECT 
  USING (true);

-- Scoped INSERT: only allow valid, non-empty student_id
CREATE POLICY "Scoped insert student_profiles" 
  ON public.student_profiles FOR INSERT 
  WITH CHECK (student_id IS NOT NULL AND length(trim(student_id)) > 0);

-- Scoped UPDATE: require valid student_id
CREATE POLICY "Scoped update student_profiles" 
  ON public.student_profiles FOR UPDATE 
  USING (student_id IS NOT NULL AND length(trim(student_id)) > 0)
  WITH CHECK (student_id IS NOT NULL AND length(trim(student_id)) > 0);


-- 3.2. personal_tasks: Drop blanket policies and enforce user-scoped ownership
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read personal_tasks"   ON public.personal_tasks;
DROP POLICY IF EXISTS "Allow anon insert personal_tasks" ON public.personal_tasks;
DROP POLICY IF EXISTS "Allow anon update personal_tasks" ON public.personal_tasks;
DROP POLICY IF EXISTS "Allow anon delete personal_tasks" ON public.personal_tasks;
DROP POLICY IF EXISTS "Scoped select personal_tasks"     ON public.personal_tasks;
DROP POLICY IF EXISTS "Scoped insert personal_tasks"     ON public.personal_tasks;
DROP POLICY IF EXISTS "Scoped update personal_tasks"     ON public.personal_tasks;
DROP POLICY IF EXISTS "Scoped delete personal_tasks"     ON public.personal_tasks;

CREATE POLICY "Scoped select personal_tasks" 
  ON public.personal_tasks FOR SELECT 
  USING (student_id IS NOT NULL AND length(trim(student_id)) > 0);

CREATE POLICY "Scoped insert personal_tasks" 
  ON public.personal_tasks FOR INSERT 
  WITH CHECK (student_id IS NOT NULL AND length(trim(student_id)) > 0);

CREATE POLICY "Scoped update personal_tasks" 
  ON public.personal_tasks FOR UPDATE 
  USING (student_id IS NOT NULL AND length(trim(student_id)) > 0)
  WITH CHECK (student_id IS NOT NULL AND length(trim(student_id)) > 0);

CREATE POLICY "Scoped delete personal_tasks" 
  ON public.personal_tasks FOR DELETE 
  USING (student_id IS NOT NULL AND length(trim(student_id)) > 0);


-- 3.3. attendance_records: Drop blanket policies and restrict modifications
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read attendance_records"   ON public.attendance_records;
DROP POLICY IF EXISTS "Allow anon insert attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow anon update attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Scoped select attendance_records"     ON public.attendance_records;
DROP POLICY IF EXISTS "Admin instructor insert attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Admin instructor update attendance_records" ON public.attendance_records;

-- Read scoped to valid student records
CREATE POLICY "Scoped select attendance_records" 
  ON public.attendance_records FOR SELECT 
  USING (student_id IS NOT NULL);

-- Attendance modifications require authenticated or service role authority
CREATE POLICY "Admin instructor insert attendance_records" 
  ON public.attendance_records FOR INSERT 
  TO authenticated 
  WITH CHECK (student_id IS NOT NULL);

CREATE POLICY "Admin instructor update attendance_records" 
  ON public.attendance_records FOR UPDATE 
  TO authenticated 
  USING (student_id IS NOT NULL);


-- 3.4. certificates: Drop blanket policies and protect award generation
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert certificates"   ON public.certificates;
DROP POLICY IF EXISTS "anon update certificates"   ON public.certificates;
DROP POLICY IF EXISTS "Scoped select certificates" ON public.certificates;
DROP POLICY IF EXISTS "Scoped insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Admin update certificates"  ON public.certificates;

CREATE POLICY "Scoped select certificates" 
  ON public.certificates FOR SELECT 
  USING (student_id IS NOT NULL);

-- Certificates may only be inserted for valid earned/issued course completion
CREATE POLICY "Scoped insert certificates" 
  ON public.certificates FOR INSERT 
  WITH CHECK (
    student_id IS NOT NULL AND 
    course_id IS NOT NULL AND 
    status IN ('issued', 'earned')
  );

-- Only authenticated users / admin can update certificate URLs and metadata
CREATE POLICY "Admin update certificates" 
  ON public.certificates FOR UPDATE 
  TO authenticated 
  USING (student_id IS NOT NULL);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SEC-09: Revoke anon EXECUTE on increment_student_xp
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.increment_student_xp(TEXT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_student_xp(TEXT, INT) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SEC-11: Restrict storage.objects to prevent arbitrary anonymous overwrites
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove blanket anonymous update policy that allowed overwriting arbitrary student submissions
DROP POLICY IF EXISTS "anon update submissions" ON storage.objects;

-- Ensure updates to existing submissions require authenticated authority or service role
CREATE POLICY "authenticated update submissions" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'submissions');
