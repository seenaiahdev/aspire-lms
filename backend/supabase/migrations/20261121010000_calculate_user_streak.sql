-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: 20261121010000_calculate_user_streak.sql
-- DESCRIPTION: Database-Side Streak Calculation Stored Procedure (F-30)
-- Collapses client-side 90-day multi-table query waterfall into an atomic single RPC
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.calculate_user_streak(
  p_user_id TEXT,
  p_is_weekday BOOLEAN DEFAULT NULL,
  p_client_date DATE DEFAULT CURRENT_DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_weekday BOOLEAN := p_is_weekday;
  v_batch TEXT;
  v_reg_id TEXT;
  v_dates DATE[];
  v_today DATE := COALESCE(p_client_date, CURRENT_DATE);
  v_yesterday DATE := v_today - INTERVAL '1 day';
  v_two_days_ago DATE := v_today - INTERVAL '2 days';
  v_streak INT := 0;
  v_check_date DATE;
  v_day_of_week INT;
  v_current_attendance INT := 0;
BEGIN
  IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
    RETURN 0;
  END IF;

  -- 1. Auto-resolve is_weekday if not explicitly provided by caller
  IF v_is_weekday IS NULL THEN
    SELECT batch, registration_id INTO v_batch, v_reg_id
    FROM public.students
    WHERE id = p_user_id
    LIMIT 1;

    IF (v_batch ILIKE '%w%' OR v_reg_id ILIKE '%w%' OR v_batch ILIKE '%weekday%') THEN
      v_is_weekday := TRUE;
    ELSE
      v_is_weekday := TRUE; -- Default to true per application standard (A26W)
    END IF;
  END IF;

  -- 2. Aggregate distinct activity dates over the last 90 days across 4 activity tables
  SELECT ARRAY(
    SELECT DISTINCT act_date FROM (
      SELECT (submitted_at AT TIME ZONE 'UTC')::date AS act_date
      FROM public.practice_submissions
      WHERE student_id = p_user_id AND submitted_at >= (v_today - INTERVAL '90 days')
      UNION
      SELECT (submitted_at AT TIME ZONE 'UTC')::date AS act_date
      FROM public.assessment_attempts
      WHERE student_id = p_user_id AND submitted_at >= (v_today - INTERVAL '90 days')
      UNION
      SELECT (attempted_at AT TIME ZONE 'UTC')::date AS act_date
      FROM public.quiz_attempts
      WHERE user_id = p_user_id AND attempted_at >= (v_today - INTERVAL '90 days')
      UNION
      SELECT (updated_at AT TIME ZONE 'UTC')::date AS act_date
      FROM public.lesson_progress
      WHERE student_id = p_user_id AND completed = true AND updated_at >= (v_today - INTERVAL '90 days')
    ) sub
  ) INTO v_dates;

  -- 3. Check if streak is active (today, yesterday, or Saturday if today is Monday for weekday batches)
  IF v_today = ANY(v_dates) THEN
    v_streak := 1;
    v_check_date := v_today - INTERVAL '1 day';
  ELSIF v_yesterday = ANY(v_dates) THEN
    v_streak := 1;
    v_check_date := v_yesterday - INTERVAL '1 day';
  ELSIF v_is_weekday AND EXTRACT(DOW FROM v_today) = 1 AND v_two_days_ago = ANY(v_dates) THEN
    v_streak := 1;
    v_check_date := v_two_days_ago - INTERVAL '1 day';
  ELSE
    v_streak := 0;
    v_check_date := NULL;
  END IF;

  -- 4. Count consecutive prior days, skipping Sundays for weekday cohorts
  IF v_check_date IS NOT NULL THEN
    LOOP
      v_day_of_week := EXTRACT(DOW FROM v_check_date);
      IF v_check_date = ANY(v_dates) THEN
        v_streak := v_streak + 1;
        v_check_date := v_check_date - INTERVAL '1 day';
      ELSIF v_is_weekday AND v_day_of_week = 0 THEN
        -- Sunday is an excused rest day; skip without breaking streak
        v_check_date := v_check_date - INTERVAL '1 day';
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- 5. Atomically update student_profiles if streak changed
  SELECT attendance INTO v_current_attendance
  FROM public.student_profiles
  WHERE student_id = p_user_id
  LIMIT 1;

  IF v_current_attendance IS DISTINCT FROM v_streak THEN
    INSERT INTO public.student_profiles (student_id, attendance, updated_at)
    VALUES (p_user_id, v_streak, NOW())
    ON CONFLICT (student_id)
    DO UPDATE SET attendance = v_streak, updated_at = NOW();
  END IF;

  RETURN v_streak;
END;
$$;

-- UUID wrapper overload for strict UUID parameter signatures
CREATE OR REPLACE FUNCTION public.calculate_user_streak(
  p_user_id UUID,
  p_is_weekday BOOLEAN DEFAULT NULL
)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.calculate_user_streak(p_user_id::text, p_is_weekday, CURRENT_DATE);
$$;

REVOKE ALL ON FUNCTION public.calculate_user_streak(TEXT, BOOLEAN, DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.calculate_user_streak(TEXT, BOOLEAN, DATE) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_user_streak(UUID, BOOLEAN) FROM public;
GRANT EXECUTE ON FUNCTION public.calculate_user_streak(UUID, BOOLEAN) TO anon, authenticated, service_role;
