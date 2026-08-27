-- Student-keyed assessment attempt storage.
-- Replaces the broken `assignment_submissions` table (which has a FK to the admin `profiles`
-- table and mismatched columns) with a clean table following the working `personal_tasks` /
-- `reward_claims` pattern: TEXT id, `student_id` (no profiles FK), anon RLS, no triggers.
--
-- One row per (student, assessment) = the FIRST attempt (kept for review); `attempt_count`
-- tracks total tries so retries do not create new rows (keeps DB writes low).

CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  assignment_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'submitted',
  attempt_count INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- One stored attempt per student per assessment.
CREATE UNIQUE INDEX IF NOT EXISTS assessment_attempts_student_assignment_uq
  ON public.assessment_attempts (student_id, assignment_id);

ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read assessment_attempts" ON public.assessment_attempts;
DROP POLICY IF EXISTS "anon insert assessment_attempts" ON public.assessment_attempts;
DROP POLICY IF EXISTS "anon update assessment_attempts" ON public.assessment_attempts;

CREATE POLICY "anon read assessment_attempts"   ON public.assessment_attempts FOR SELECT USING (true);
CREATE POLICY "anon insert assessment_attempts" ON public.assessment_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update assessment_attempts" ON public.assessment_attempts FOR UPDATE USING (true);

-- Enable realtime so the Practice Hub refreshes live on new attempts.
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_attempts;
