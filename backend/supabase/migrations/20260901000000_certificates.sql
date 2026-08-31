-- Student certificates. Store ONLY the link to the hosted certificate (PDF/image) + metadata — never the
-- file itself (low DB usage). Admin issues a row when a student earns a certificate; the student app reads it.
-- Student-keyed (TEXT student_id, no profiles FK), anon RLS, realtime — mirrors the other student tables.
-- Apply manually in the Supabase SQL Editor (anon key can't create tables).

CREATE TABLE IF NOT EXISTS public.certificates (
  id           TEXT PRIMARY KEY,
  student_id   TEXT NOT NULL,
  course_id    TEXT,
  title        TEXT,
  certificate_url TEXT,            -- the link to the hosted certificate
  verify_id    TEXT,
  issued_date  TIMESTAMPTZ DEFAULT NOW(),
  status       TEXT DEFAULT 'issued',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS certificates_student_idx ON public.certificates (student_id);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read certificates" ON public.certificates;
CREATE POLICY "anon read certificates" ON public.certificates FOR SELECT USING (true);

-- Live updates so a newly issued certificate appears without a refresh.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'certificates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates;
  END IF;
END $$;
