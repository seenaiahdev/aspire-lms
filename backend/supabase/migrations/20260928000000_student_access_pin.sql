-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Add encrypted access_pin and passkey_updated_at to students table
-- Description: Supports Admin-Generated Alphanumeric Passkey verification &
--              single-use auto-rotation on every successful login.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add columns for encrypted passkey and timestamp
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS access_pin TEXT,
ADD COLUMN IF NOT EXISTS passkey_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Index passkey_updated_at for fast query filtering
CREATE INDEX IF NOT EXISTS idx_students_passkey_updated_at ON public.students(passkey_updated_at);

-- 3. Refresh get_student_by_phone to guarantee new columns are returned in the schema
CREATE OR REPLACE FUNCTION public.get_student_by_phone(suffix TEXT)
RETURNS SETOF public.students
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.students
  WHERE right(regexp_replace(mobile_number, '\D', '', 'g'), 10)
      = right(regexp_replace(suffix,        '\D', '', 'g'), 10)
    AND length(regexp_replace(suffix, '\D', '', 'g')) >= 10
  LIMIT 1;
$$;

REVOKE ALL   ON FUNCTION public.get_student_by_phone(TEXT) FROM public;
GRANT  EXECUTE ON FUNCTION public.get_student_by_phone(TEXT) TO anon, authenticated;
