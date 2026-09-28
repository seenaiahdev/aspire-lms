-- Migration: Schema and RLS policies for attendance_records
-- Verified against live Supabase: id, batch_code, date, student_id, status, remarks, created_at, updated_at

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  batch_code TEXT,
  date TEXT,
  student_id TEXT,
  status TEXT DEFAULT 'present',
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated read access (used by student LMS to display attendance)
DROP POLICY IF EXISTS "Allow anon read attendance_records" ON public.attendance_records;
CREATE POLICY "Allow anon read attendance_records"
  ON public.attendance_records FOR SELECT
  USING (true);

-- Allow insert/update (used by mentors/instructors and automated verifications)
DROP POLICY IF EXISTS "Allow anon insert attendance_records" ON public.attendance_records;
CREATE POLICY "Allow anon insert attendance_records"
  ON public.attendance_records FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update attendance_records" ON public.attendance_records;
CREATE POLICY "Allow anon update attendance_records"
  ON public.attendance_records FOR UPDATE
  USING (true);

-- Performance indexes for fast student & batch attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_batch_code ON public.attendance_records(batch_code);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);
