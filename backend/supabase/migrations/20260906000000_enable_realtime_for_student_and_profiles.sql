-- Enable Realtime publication and FULL replica identity on student_profiles and students
-- Allows live postgres_changes events whenever XP, streak, or student data is updated in Supabase.
-- Run in Supabase SQL Editor if realtime publication is not already enabled for these tables.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'student_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'students'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  END IF;
END $$;

-- Enable FULL replica identity so payload.new includes all columns on UPDATE
ALTER TABLE public.student_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
