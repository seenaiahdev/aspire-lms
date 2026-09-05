-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY: close the students-table PII leak.
--
-- Problem: the browser ships the Supabase ANON key, and `students` had a permissive
-- anon SELECT policy. Anyone could run `select * from students` and dump every
-- student's name, email and phone number.
--
-- Fix: the app only ever needs two narrow reads of `students`:
--   1. login  → the single row matching a phone number
--   2. leaderboard → id/name/avatar/batch/xp for a handful of students (NO email)
-- Expose exactly those via SECURITY DEFINER functions (which bypass RLS as the
-- definer), then REVOKE direct anon SELECT so the table can no longer be dumped.
--
-- ⚠️  TRADEOFF: revoking anon SELECT also stops Supabase Realtime `postgres_changes`
-- on `students` for the anon role. The "student's batch/enrollment updated live"
-- subscription in UserContext will then reflect on the next refetch/refresh instead
-- of instantly. That is an acceptable price for closing a PII dump; a full fix is to
-- move students to Supabase Auth (see Phase 1 item 5).
--
-- NOTE: `students` was created in the Supabase dashboard, not by a repo migration, so
-- this file only ALTERs it. Apply it to the live DB manually (per project workflow).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Login lookup: return only the single matching student row ──────────────
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

-- ── 2. Leaderboard: non-PII projection only (drops email) ─────────────────────
-- xp lives in student_profiles (student_id = students.id); LEFT JOIN so students
-- without a profile still appear with xp 0.
CREATE OR REPLACE FUNCTION public.get_leaderboard(row_limit INT DEFAULT 20)
RETURNS TABLE (id TEXT, name TEXT, avatar TEXT, batch TEXT, xp INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.avatar, s.batch, COALESCE(p.xp, 0) AS xp
  FROM public.students s
  LEFT JOIN public.student_profiles p ON p.student_id = s.id
  ORDER BY COALESCE(p.xp, 0) DESC, s.name ASC
  LIMIT GREATEST(1, LEAST(row_limit, 100));
$$;

REVOKE ALL   ON FUNCTION public.get_leaderboard(INT) FROM public;
GRANT  EXECUTE ON FUNCTION public.get_leaderboard(INT) TO anon, authenticated;

-- ── 3. Close the door: no more table-wide anon reads of students PII ──────────
-- Drop the permissive read policy (name may vary by environment — the REVOKE below
-- is the authoritative lock regardless of policy name).
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'students' AND cmd IN ('SELECT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.students', pol.policyname);
  END LOOP;
END $$;

-- PostgREST needs the table-level SELECT grant to expose reads at all; removing it
-- from anon blocks `from('students').select(...)` no matter what policies exist.
REVOKE SELECT ON public.students FROM anon;

-- Avatar updates (api.updateStudentAvatar / Settings) use UPDATE, not SELECT, so they
-- keep working. Tightening who may UPDATE which row is the Phase 1 item-5 write-authz
-- decision and is intentionally NOT changed here.
