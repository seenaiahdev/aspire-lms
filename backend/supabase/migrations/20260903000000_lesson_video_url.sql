-- Per-lesson video link. Admin pastes a Google Drive (or YouTube / direct mp4) share URL here; the
-- student Lesson Player embeds it. Store only the link (the video lives in Drive/YouTube, not the DB).
-- The Drive file must be shared "Anyone with the link" for embedding to work.
-- Apply manually in the Supabase SQL Editor.

ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
