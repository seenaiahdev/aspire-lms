-- ════════════════════════════════════════════════════════════════════════════
-- VERIFIED PRODUCTION PERFORMANCE & DATABASE COST OPTIMIZATION
-- Matches 100% of live tables and columns in Aspire LMS Supabase Database
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Course Curriculum & Syllabus Foreign Key Indexes ──────────────────────
-- Eliminates sequential table scans during course navigation & progress checks

CREATE INDEX IF NOT EXISTS idx_assessments_course_id 
  ON public.assessments (course_id);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_id 
  ON public.quizzes (course_id);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id 
  ON public.course_lessons (course_id);

CREATE INDEX IF NOT EXISTS idx_course_topics_course_id 
  ON public.course_topics (course_id);

CREATE INDEX IF NOT EXISTS idx_projects_course_id 
  ON public.projects (course_id);

CREATE INDEX IF NOT EXISTS idx_coding_questions_course_id 
  ON public.coding_questions (course_id);

CREATE INDEX IF NOT EXISTS idx_courses_target_batch 
  ON public.courses (target_batch);

-- ── 2. Student Submissions & Activity History Indexes ────────────────────────
-- Accelerates gradebook, streak calculation, and progress updates

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id 
  ON public.quiz_attempts (user_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_student_id 
  ON public.assessment_attempts (student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_submissions_student_id 
  ON public.practice_submissions (student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id 
  ON public.lesson_progress (student_id);

CREATE INDEX IF NOT EXISTS idx_notifications_student_id 
  ON public.notifications (student_id, created_at DESC);

-- ── 3. Live Classes, Recordings & Batches Chronological Indexes ──────────────

CREATE INDEX IF NOT EXISTS idx_live_sessions_date 
  ON public.live_sessions (date DESC);

CREATE INDEX IF NOT EXISTS idx_recordings_created 
  ON public.recordings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_batches_code 
  ON public.batches (code);

-- ── 4. SARGable Functional Index for Phone Login ────────────────────────────
-- Enables B-Tree index scan instead of sequential regex scans on every login
CREATE INDEX IF NOT EXISTS idx_students_phone_normalized 
  ON public.students (right(regexp_replace(mobile_number, '\D', '', 'g'), 10));

-- ── 5. Atomic Student XP Increment Stored Procedure ──────────────────────────
-- Eliminates client-side read-modify-write lost updates under concurrency.
-- Self-healing: creates student_profile row if first time, else increments.
CREATE OR REPLACE FUNCTION public.increment_student_xp(p_student_id TEXT, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_xp INT;
BEGIN
  IF p_student_id IS NULL OR p_student_id = '' OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.student_profiles (student_id, xp, updated_at)
  VALUES (p_student_id, p_amount, NOW())
  ON CONFLICT (student_id)
  DO UPDATE SET 
    xp = COALESCE(public.student_profiles.xp, 0) + p_amount,
    updated_at = NOW()
  RETURNING xp INTO v_new_xp;

  RETURN COALESCE(v_new_xp, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_student_xp(TEXT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_student_xp(TEXT, INT) TO anon, authenticated;
