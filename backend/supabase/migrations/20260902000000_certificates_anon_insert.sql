-- Allow the student app (anon key) to auto-issue a certificate when a course reaches 100% completion.
-- The certificates table already permits anon SELECT (read); this adds anon INSERT + UPDATE so the app can
-- upsert an "earned" row (metadata only). The admin later attaches the real certificate_url (PDF link).
-- Apply manually in the Supabase SQL Editor.

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "anon update certificates" ON public.certificates;

CREATE POLICY "anon insert certificates" ON public.certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update certificates" ON public.certificates FOR UPDATE USING (true);
