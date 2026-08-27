-- Migration to fix the quiz_attempts table for student submissions.
-- 1. Drop the old policies first because PostgreSQL blocks altering columns referenced in active policy definitions.
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can submit their own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can record their own quiz attempts" ON public.quiz_attempts;

-- 2. Drop foreign key constraint on profiles (student profiles are stored in student_profiles and students table which uses TEXT ids)
ALTER TABLE public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;

-- 3. Change the user_id column from UUID to TEXT so it can store student IDs (e.g. 'std-w5')
ALTER TABLE public.quiz_attempts ALTER COLUMN user_id TYPE TEXT;

-- 4. Re-create new anonymous policies (allowing select, insert and update for anonymous students)
DROP POLICY IF EXISTS "anon read quiz_attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "anon insert quiz_attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "anon update quiz_attempts" ON public.quiz_attempts;

CREATE POLICY "anon read quiz_attempts" ON public.quiz_attempts FOR SELECT USING (true);
CREATE POLICY "anon insert quiz_attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update quiz_attempts" ON public.quiz_attempts FOR UPDATE USING (true);

-- 5. Enable realtime for quiz_attempts so the UI gets live updates
-- Check publication status and add table if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'quiz_attempts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_attempts;
  END IF;
END $$;
