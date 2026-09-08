-- Migration: create course_reviews table
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  author TEXT NOT NULL,
  rating NUMERIC(2, 1) DEFAULT 5.0,
  comment TEXT,
  date TEXT DEFAULT 'Recently',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all users
CREATE POLICY "Allow public read access on course_reviews"
  ON public.course_reviews
  FOR SELECT
  USING (true);

-- Allow insert on course_reviews
CREATE POLICY "Allow insert on course_reviews"
  ON public.course_reviews
  FOR INSERT
  WITH CHECK (true);
