-- Store the student's actual chosen answers alongside the score, so the Review views can show
-- what was really selected instead of fabricating them.
-- `answers` is a JSON array where index = question index, value = selected option index
-- (matches the in-memory `userAnswers` / `answers` shape used by the Assessments & Quizzes screens).
--
-- Additive + IF NOT EXISTS so this is safe to re-run. Apply manually to the hosted Supabase
-- (same as the other migrations in this project).

ALTER TABLE public.assessment_attempts ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quiz_attempts       ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]'::jsonb;
