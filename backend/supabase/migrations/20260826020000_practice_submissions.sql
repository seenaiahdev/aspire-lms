-- Practice / coding-lab (and project) submissions.
-- Low DB consumption: the actual files go to the `submissions` Storage bucket; the DB keeps
-- only a tiny row per (student, problem) with the file URL + metadata. Student-keyed, no
-- profiles FK / triggers (mirrors assessment_attempts / the working student tables).

CREATE TABLE IF NOT EXISTS public.practice_submissions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  storage_url TEXT,
  project_name TEXT,
  file_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  language TEXT,
  status TEXT DEFAULT 'solved',
  attempt_count INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- One stored submission per student per problem (latest work; attempt_count tracks re-solves).
CREATE UNIQUE INDEX IF NOT EXISTS practice_submissions_student_problem_uq
  ON public.practice_submissions (student_id, problem_id);

ALTER TABLE public.practice_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read practice_submissions"   ON public.practice_submissions;
DROP POLICY IF EXISTS "anon insert practice_submissions" ON public.practice_submissions;
DROP POLICY IF EXISTS "anon update practice_submissions" ON public.practice_submissions;

CREATE POLICY "anon read practice_submissions"   ON public.practice_submissions FOR SELECT USING (true);
CREATE POLICY "anon insert practice_submissions" ON public.practice_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update practice_submissions" ON public.practice_submissions FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.practice_submissions;

-- ── Storage bucket for the actual submitted files (cheap object storage) ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon upload submissions"  ON storage.objects;
DROP POLICY IF EXISTS "anon update submissions"  ON storage.objects;
DROP POLICY IF EXISTS "public read submissions"  ON storage.objects;

CREATE POLICY "anon upload submissions" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'submissions');
CREATE POLICY "anon update submissions" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id = 'submissions');
CREATE POLICY "public read submissions" ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions');
