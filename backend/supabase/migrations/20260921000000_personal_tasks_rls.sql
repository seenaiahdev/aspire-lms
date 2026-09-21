-- Migration: Enable Row Level Security and allow anon read/insert/update/delete for personal_tasks
-- This fixes the error: "new row violates row-level security policy for table personal_tasks"
-- Apply in the Supabase SQL Editor.

ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read personal_tasks" ON public.personal_tasks;
DROP POLICY IF EXISTS "Allow anon insert personal_tasks" ON public.personal_tasks;
DROP POLICY IF EXISTS "Allow anon update personal_tasks" ON public.personal_tasks;
DROP POLICY IF EXISTS "Allow anon delete personal_tasks" ON public.personal_tasks;

CREATE POLICY "Allow anon read personal_tasks"
  ON public.personal_tasks FOR SELECT
  USING (true);

CREATE POLICY "Allow anon insert personal_tasks"
  ON public.personal_tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon update personal_tasks"
  ON public.personal_tasks FOR UPDATE
  USING (true);

CREATE POLICY "Allow anon delete personal_tasks"
  ON public.personal_tasks FOR DELETE
  USING (true);
