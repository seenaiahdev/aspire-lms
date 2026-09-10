-- Migration: Rollback XP on Deletion or Rejection across all coursework (practice submissions, assessment attempts, quiz attempts)

-- 1. Atomic Decrement Function
CREATE OR REPLACE FUNCTION public.decrement_student_xp(
  p_student_id TEXT,
  p_amount INT
)
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

  UPDATE public.student_profiles
  SET xp = GREATEST(0, COALESCE(public.student_profiles.xp, 0) - p_amount),
      updated_at = NOW()
  WHERE student_id = p_student_id
  RETURNING xp INTO v_new_xp;

  RETURN COALESCE(v_new_xp, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_student_xp(TEXT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.decrement_student_xp(TEXT, INT) TO anon, authenticated, service_role;

-- 2. Trigger Function: Practice Submissions XP Rollback (Coding Lab & Projects)
CREATE OR REPLACE FUNCTION public.trg_fn_practice_submission_xp_rollback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handled on DELETE of a solved submission:
  IF (TG_OP = 'DELETE') THEN
    IF OLD.student_id IS NOT NULL AND (OLD.status IS NULL OR OLD.status = 'solved') THEN
      PERFORM public.decrement_student_xp(OLD.student_id, 25);
    END IF;
    RETURN OLD;
  END IF;

  -- Handled on UPDATE (e.g. status changed from solved to rejected):
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.status = 'solved' AND NEW.status = 'rejected' THEN
      PERFORM public.decrement_student_xp(OLD.student_id, 25);
    ELSIF OLD.status = 'rejected' AND NEW.status = 'solved' THEN
      PERFORM public.increment_student_xp(NEW.student_id, 25);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_practice_submission_xp_rollback ON public.practice_submissions;
CREATE TRIGGER trg_practice_submission_xp_rollback
AFTER DELETE OR UPDATE ON public.practice_submissions
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_practice_submission_xp_rollback();

-- 3. Trigger Function: Assessment Attempts XP Rollback (Daily & Weekly Assessments)
CREATE OR REPLACE FUNCTION public.trg_fn_assessment_attempt_xp_rollback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pts INT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.student_id IS NOT NULL AND OLD.score >= 70 THEN
      v_pts := GREATEST(0, ROUND((OLD.score / 100.0) * 25));
      IF v_pts > 0 THEN
        PERFORM public.decrement_student_xp(OLD.student_id, v_pts);
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessment_attempt_xp_rollback ON public.assessment_attempts;
CREATE TRIGGER trg_assessment_attempt_xp_rollback
AFTER DELETE ON public.assessment_attempts
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_assessment_attempt_xp_rollback();

-- 4. Trigger Function: Quiz Attempts XP Rollback (Quizzes)
CREATE OR REPLACE FUNCTION public.trg_fn_quiz_attempt_xp_rollback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.user_id IS NOT NULL AND OLD.score >= 70 THEN
      PERFORM public.decrement_student_xp(OLD.user_id, 10);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_quiz_attempt_xp_rollback ON public.quiz_attempts;
CREATE TRIGGER trg_quiz_attempt_xp_rollback
AFTER DELETE ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_quiz_attempt_xp_rollback();
