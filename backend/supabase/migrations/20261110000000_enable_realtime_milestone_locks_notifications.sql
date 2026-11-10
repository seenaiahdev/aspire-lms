-- Enable Realtime publication and FULL replica identity on milestone_locks,
-- course_lessons, course_topics, and notifications so lesson/module unlock
-- changes and notifications propagate immediately to connected students.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'milestone_locks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.milestone_locks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_lessons'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_lessons;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_topics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_topics;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

ALTER TABLE public.milestone_locks REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
