-- Enable UUID generator extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a table for public profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  role TEXT DEFAULT 'Student',
  program TEXT DEFAULT 'Engineering Degree',
  semester INT DEFAULT 1,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  streak INT DEFAULT 0,
  rank INT DEFAULT 100,
  bio TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  socials JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Alter table to enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create instructors table
CREATE TABLE public.instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  avatar TEXT,
  rating NUMERIC DEFAULT 0.0,
  students INT DEFAULT 0,
  courses INT DEFAULT 0,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Instructors are viewable by everyone" ON public.instructors FOR SELECT USING (true);

-- Create courses table
CREATE TABLE public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT,
  level TEXT, -- 'Beginner' | 'Intermediate' | 'Advanced'
  instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL,
  thumbnail TEXT,
  banner TEXT,
  rating NUMERIC DEFAULT 0.0,
  reviews INT DEFAULT 0,
  students INT DEFAULT 0,
  duration TEXT,
  lessons_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  price NUMERIC DEFAULT 0.0,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courses are viewable by everyone" ON public.courses FOR SELECT USING (true);

-- Create course enrollments
CREATE TABLE public.course_enrollments (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves in a course" ON public.course_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create stages table
CREATE TABLE public.stages (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL
);

ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stages are viewable by everyone" ON public.stages FOR SELECT USING (true);

-- Create modules table
CREATE TABLE public.modules (
  id TEXT PRIMARY KEY,
  stage_id TEXT REFERENCES public.stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT,
  sort_order INT NOT NULL
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules are viewable by everyone" ON public.modules FOR SELECT USING (true);

-- Create lessons table
CREATE TABLE public.lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_duration TEXT,
  practice_duration TEXT,
  assessment_duration TEXT,
  sort_order INT NOT NULL
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons are viewable by everyone" ON public.lessons FOR SELECT USING (true);

-- Create user lesson progress
CREATE TABLE public.user_lesson_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  video_completed BOOLEAN DEFAULT FALSE,
  practice_completed BOOLEAN DEFAULT FALSE,
  assessment_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);

ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own lesson progress" ON public.user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own lesson progress" ON public.user_lesson_progress FOR ALL USING (auth.uid() = user_id);

-- Create practice problems table
CREATE TABLE public.practice_problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- 'Easy' | 'Medium' | 'Hard'
  category TEXT NOT NULL,
  attempts INT DEFAULT 0,
  success_rate NUMERIC DEFAULT 0.0,
  points INT DEFAULT 0
);

ALTER TABLE public.practice_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Practice problems are viewable by everyone" ON public.practice_problems FOR SELECT USING (true);

-- Create problem configs table (contains solutions and test cases)
CREATE TABLE public.problem_configs (
  id TEXT REFERENCES public.practice_problems(id) ON DELETE CASCADE PRIMARY KEY,
  description TEXT NOT NULL,
  examples JSONB DEFAULT '[]'::jsonb,
  constraints TEXT[] DEFAULT '{}',
  test_cases JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.problem_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Problem configs are viewable by everyone" ON public.problem_configs FOR SELECT USING (true);

-- Create practice submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id TEXT REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  code TEXT,
  status TEXT NOT NULL, -- 'solved' | 'failed'
  sandbox_url TEXT,
  storage_url TEXT,
  project_name TEXT,
  file_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own submissions" ON public.submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create assignments table
CREATE TABLE public.assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  max_grade INT NOT NULL DEFAULT 100
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assignments are viewable by everyone" ON public.assignments FOR SELECT USING (true);

-- Create assignment submissions
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' | 'submitted' | 'reviewed' | 'overdue'
  grade INT,
  feedback TEXT,
  attachments INT DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own assignment submissions" ON public.assignment_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit their own assignments" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create live classes table
CREATE TABLE public.live_classes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.instructors(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration TEXT NOT NULL,
  status TEXT DEFAULT 'upcoming', -- 'upcoming' | 'ongoing' | 'completed'
  participants INT DEFAULT 0,
  thumbnail TEXT,
  recording_url TEXT
);

ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live classes are viewable by everyone" ON public.live_classes FOR SELECT USING (true);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions_count INT NOT NULL,
  duration TEXT NOT NULL,
  max_score INT NOT NULL DEFAULT 100,
  due_date TIMESTAMPTZ NOT NULL,
  difficulty TEXT NOT NULL
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quizzes are viewable by everyone" ON public.quizzes FOR SELECT USING (true);

-- Create quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INT NOT NULL,
  status TEXT DEFAULT 'attempted',
  attempted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own quiz attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit their own quiz attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create projects table
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  project_type TEXT, -- 'mini' | 'major' | 'capstone'
  difficulty TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects are viewable by everyone" ON public.projects FOR SELECT USING (true);

-- Create project submissions
CREATE TABLE public.project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'submitted',
  mentor_feedback TEXT,
  grade INT,
  submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own project submissions" ON public.project_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit their own projects" ON public.project_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create resources table
CREATE TABLE public.resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  size TEXT,
  downloads INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources are viewable by everyone" ON public.resources FOR SELECT USING (true);

-- Create community posts table
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community posts are viewable by everyone" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create community posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own community posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- Create post likes table
CREATE TABLE public.post_likes (
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can toggle like on posts" ON public.post_likes FOR ALL USING (auth.uid() = user_id);

-- Create schedule items table
CREATE TABLE public.schedule_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  duration TEXT NOT NULL,
  course TEXT,
  location TEXT,
  completed BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own schedule items" ON public.schedule_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own schedule items" ON public.schedule_items FOR ALL USING (auth.uid() = user_id);

-- Trigger to automatically create a profile record when a new user registers in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New Student'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'Student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
