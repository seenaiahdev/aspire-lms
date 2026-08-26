-- Allow the student app (anon key) to create notifications.
-- The notifications table already permits anon SELECT/UPDATE/DELETE (used by the
-- student app to read, mark-as-read, and delete), but had no INSERT policy, so
-- client-side unlock notifications were rejected by RLS. This adds a permissive
-- INSERT policy consistent with the existing student_profiles / daily_schedules
-- / live_sessions policies in this project.
--
-- Real notifications columns: id, student_id, title, content, read, created_at.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert notifications" ON public.notifications;

CREATE POLICY "Allow anon insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
