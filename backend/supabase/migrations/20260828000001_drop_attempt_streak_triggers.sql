-- Remove the broken gamification trigger(s) on the student attempt tables.
-- These INSERT triggers try to update `students.streak`, but the live `students` table has no
-- `streak` column, so every student insert into quiz_attempts / assessment_attempts was rejected
-- with: column "streak" of relation "students" does not exist.
--
-- XP and streak are handled entirely in the app (api.ts: incrementUserXP -> student_profiles.xp,
-- recalculateUserStreak -> student_profiles.attendance), so these DB triggers are redundant.
-- Apply manually in the Supabase SQL Editor (anon key can't drop triggers).

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tgrelid::regclass AS tbl, tgname
    FROM pg_trigger
    WHERE tgrelid IN ('public.quiz_attempts'::regclass, 'public.assessment_attempts'::regclass)
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER %I ON %s', r.tgname, r.tbl);
    RAISE NOTICE 'Dropped trigger % on %', r.tgname, r.tbl;
  END LOOP;
END $$;
