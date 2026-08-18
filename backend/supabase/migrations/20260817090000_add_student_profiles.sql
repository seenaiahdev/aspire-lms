-- Create the unified student_profiles table (owned by User LMS)
CREATE TABLE IF NOT EXISTS public.student_profiles (
  student_id TEXT PRIMARY KEY,
  bio TEXT DEFAULT '',
  program TEXT DEFAULT 'Engineering Degree',
  college TEXT DEFAULT '',
  start_year INTEGER,
  end_year INTEGER,
  skills JSONB DEFAULT '[]'::jsonb,
  socials JSONB DEFAULT '[
    {"label": "GitHub", "value": "Not connected"},
    {"label": "LinkedIn", "value": "Not connected"},
    {"label": "Portfolio", "value": "Not connected"}
  ]'::jsonb,
  -- Notification preferences
  notif_assignments BOOLEAN DEFAULT true,
  notif_live BOOLEAN DEFAULT true,
  notif_placement BOOLEAN DEFAULT true,
  notif_weekly BOOLEAN DEFAULT true,
  -- Connected accounts
  connected_github BOOLEAN DEFAULT false,
  connected_linkedin BOOLEAN DEFAULT false,
  connected_portfolio BOOLEAN DEFAULT false,
  -- Dynamic Learning Stats
  progress INTEGER DEFAULT 0,
  attendance INTEGER DEFAULT 0,
  gpa NUMERIC(3,2) DEFAULT 0.00,
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anon read access (for fetching profile on login)
CREATE POLICY "Allow anon read student_profiles"
  ON public.student_profiles FOR SELECT
  USING (true);

-- Allow anon insert (for first-time profile creation)
CREATE POLICY "Allow anon insert student_profiles"
  ON public.student_profiles FOR INSERT
  WITH CHECK (true);

-- Allow anon update (for saving profile/settings changes)
CREATE POLICY "Allow anon update student_profiles"
  ON public.student_profiles FOR UPDATE
  USING (true);
