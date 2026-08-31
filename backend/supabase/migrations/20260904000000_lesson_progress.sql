-- Per-lesson completion tracking (the "Mark as Complete" button on the Lesson Player). Course progress counts
-- every video lesson AND every coursework item as a unit, so lessons need their own completion signal.
-- Student-keyed (TEXT), no FK, anon RLS, realtime. Apply manually in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL,
  lesson_id   TEXT NOT NULL,
  course_id   TEXT,
  completed   BOOLEAN DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_student_lesson_uq
  ON public.lesson_progress (student_id, lesson_id);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read lesson_progress"   ON public.lesson_progress;
DROP POLICY IF EXISTS "anon insert lesson_progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "anon update lesson_progress" ON public.lesson_progress;
CREATE POLICY "anon read lesson_progress"   ON public.lesson_progress FOR SELECT USING (true);
CREATE POLICY "anon insert lesson_progress" ON public.lesson_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update lesson_progress" ON public.lesson_progress FOR UPDATE USING (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='lesson_progress') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress;
  END IF;
END $$;
