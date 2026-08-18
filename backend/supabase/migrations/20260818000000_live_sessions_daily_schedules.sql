-- 1. Create daily_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.daily_schedules (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  batch_code TEXT NOT NULL,
  title TEXT NOT NULL,
  subtopic TEXT,
  topic TEXT,
  time TEXT,
  description TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for daily_schedules
ALTER TABLE public.daily_schedules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon read daily_schedules" ON public.daily_schedules;
DROP POLICY IF EXISTS "Allow anon insert daily_schedules" ON public.daily_schedules;
DROP POLICY IF EXISTS "Allow anon update daily_schedules" ON public.daily_schedules;
DROP POLICY IF EXISTS "Allow anon delete daily_schedules" ON public.daily_schedules;

-- Create policies for testing
CREATE POLICY "Allow anon read daily_schedules" ON public.daily_schedules FOR SELECT USING (true);
CREATE POLICY "Allow anon insert daily_schedules" ON public.daily_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update daily_schedules" ON public.daily_schedules FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete daily_schedules" ON public.daily_schedules FOR DELETE USING (true);


-- 2. Restructure live_sessions table
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id TEXT PRIMARY KEY,
  session_title TEXT NOT NULL,
  technology TEXT,
  instructor TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TEXT,
  duration TEXT DEFAULT '1h 30m',
  status TEXT DEFAULT 'upcoming',
  meeting_link TEXT,
  target_batch TEXT, -- legacy column
  batch_code TEXT,   -- new column for specific batches
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure batch_code and duration columns exist
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS batch_code TEXT;
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '1h 30m';

-- Enable RLS for live_sessions
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon read live_sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Allow anon insert live_sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Allow anon update live_sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Allow anon delete live_sessions" ON public.live_sessions;

-- Create policies for testing
CREATE POLICY "Allow anon read live_sessions" ON public.live_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anon insert live_sessions" ON public.live_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update live_sessions" ON public.live_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete live_sessions" ON public.live_sessions FOR DELETE USING (true);


-- 3. Clear existing test data from previous runs to avoid conflicts
DELETE FROM public.live_sessions WHERE id IN ('ls-oop-live', 'ls-oop-upcoming');
DELETE FROM public.daily_schedules WHERE id IN ('ds-oop-1', 'ds-oop-2');


-- 4. Seed Live Now and Upcoming Classes (Targeting student's batch: A26W1)
INSERT INTO public.live_sessions (id, session_title, technology, instructor, date, time, duration, status, batch_code) VALUES
('ls-oop-live', 'Object Oriented Programming (OOP) - Live Now', 'Python', 'Sara Devi', CURRENT_DATE, '10:00:00', '1h 30m', 'ongoing', 'A26W1'),
('ls-oop-upcoming', 'Advanced Inheritance & Polymorphism', 'Python', 'Sara Devi', CURRENT_DATE, '14:30:00', '1h 30m', 'upcoming', 'A26W1');


-- 5. Seed Daily Tasks and Topics for Today
INSERT INTO public.daily_schedules (id, date, batch_code, title, subtopic, topic, time, description, status) VALUES
('ds-oop-1', CURRENT_DATE, 'A26W1', 'Python OOP: Classes & Instances', 'Attributes, methods, self keyword', 'Object Oriented Programming', '45 mins', 'Learn to construct blueprint classes, define constructors, and instantiate objects.', 'completed'),
('ds-oop-2', CURRENT_DATE, 'A26W1', 'Python OOP: Inheritance & Super()', 'Single/multiple inheritance, super() call', 'Object Oriented Programming', '60 mins', 'Understand class hierarchies, method overriding, and invoking parent constructors.', 'in_progress');
