-- Seed Instructors
INSERT INTO public.instructors (id, name, title, avatar, rating, students, courses, bio) VALUES
('11111111-1111-1111-1111-111111111111', 'Kavitha Chowdary', 'Senior ML Engineer, ex-Google', '', 4.8, 1200, 3, '10+ years building production ML systems at scale.'),
('22222222-2222-2222-2222-222222222222', 'Srinivas Rao', 'Staff Engineer, ex-Amazon', '', 4.9, 850, 2, 'Distributed systems expert and passionate educator.'),
('33333333-3333-3333-3333-333333333333', 'Venkata Sai', 'Frontend Architect, ex-Stripe', '', 4.7, 1500, 4, 'Design systems and performance optimization specialist.')
ON CONFLICT (id) DO NOTHING;

-- Seed Courses
INSERT INTO public.courses (id, title, subtitle, category, level, instructor_id, thumbnail, banner, rating, reviews, students, duration, lessons_count, tags, description, price) VALUES
('c1', 'Python Full Stack + DSA with AI', 'Master Python, Advanced Backend Architectures, Frontend Technologies, and DSA Interview Prep', 'Web Development', 'Intermediate', '33333333-3333-3333-3333-333333333333', '/python-full-stack.png', '/python-full-stack.png', 4.8, 128, 450, '163 hours', 93, ARRAY['Python', 'Django', 'React', 'DSA'], 'Master fullstack development and DSA using Python. Build modern client-server architectures, containerize with Docker, deploy to the cloud, and solve complex algorithms.', 0.0)
ON CONFLICT (id) DO NOTHING;

-- Seed Stages
INSERT INTO public.stages (id, course_id, title, sort_order) VALUES
('s1', 'c1', 'Stage 1: Frontend & Programming Foundations', 1),
('s2', 'c1', 'Stage 2: Backend + DSA', 2)
ON CONFLICT (id) DO NOTHING;

-- Seed Modules
INSERT INTO public.modules (id, stage_id, title, duration, sort_order) VALUES
('m1_git', 's1', 'Git & GitHub Version Control', '5h', 1),
('m1_html', 's1', 'HTML5 & Web Architecture', '6h', 2),
('m1_css_fund', 's1', 'CSS3 Fundamentals & Box Model', '5h', 3),
('m1_css_adv', 's1', 'Advanced CSS Layouts & Responsive Design', '5h', 4),
('m1_bootstrap', 's1', 'Bootstrap 5 Framework', '4h', 5),
('m1_js_ess', 's1', 'JavaScript Essentials & Control Flow', '5h', 6),
('m1_js_func', 's1', 'JavaScript Functions, Objects & Arrays', '6h', 7),
('m1_dom', 's1', 'DOM Manipulation & Event Handling', '5h', 8),
('m1_es6', 's1', 'Modern ES6+ & Asynchronous JS', '5h', 9),
('m2_py_fund', 's2', 'Python Programming Fundamentals', '6h', 10),
('m2_py_adv', 's2', 'Advanced Python & Exception Handling', '5h', 11),
('m2_oop', 's2', 'Object-Oriented Programming (OOP)', '6h', 12),
('m2_sql', 's2', 'SQL & Relational Databases (MySQL)', '6h', 13)
ON CONFLICT (id) DO NOTHING;

-- Seed Lessons
INSERT INTO public.lessons (id, module_id, title, video_duration, practice_duration, assessment_duration, sort_order) VALUES
-- Git
('l_git_1', 'm1_git', 'Git Architecture & Version Control Concepts', '1h 00m', NULL, '15m', 1),
('l_git_2', 'm1_git', 'Core Git Commands: init, add, commit, push, pull', '1h 30m', '15m', NULL, 2),
('l_git_3', 'm1_git', 'Branching Strategy & Merge Conflicts', '1h 00m', NULL, '15m', 3),
('l_git_4', 'm1_git', 'GitHub Pull Requests & Collaboration Workflows', '45m', '15m', NULL, 4),
-- HTML
('l_html_1', 'm1_html', 'Web Architecture & Client-Server Communication Model', '1h 15m', '15m', NULL, 1),
('l_html_2', 'm1_html', 'HTML5 Document Structure & Semantic Elements', '1h 15m', '15m', NULL, 2),
('l_html_3', 'm1_html', 'HTML Forms, Input Types, & Client-Side Validation', '1h 15m', NULL, '15m', 3),
('l_html_4', 'm1_html', 'HTML Tables, Media Tags & Accessibility', '1h 15m', NULL, '15m', 4),
-- CSS Fund
('l_css_1', 'm1_css_fund', 'CSS Syntax, Rules, and Element/Class/ID Selectors', '1h 15m', '30m', NULL, 1),
('l_css_2', 'm1_css_fund', 'The CSS Box Model: Margin, Padding, Border, & Content', '1h 30m', '30m', NULL, 2),
('l_css_3', 'm1_css_fund', 'CSS Colors, Typography, & Visual Backgrounds', '1h 00m', NULL, '15m', 3),
-- CSS Adv
('l_css_adv_1', 'm1_css_adv', 'Flexbox Architecture & Practical Alignments', '1h 00m', '15m', NULL, 1),
('l_css_adv_2', 'm1_css_adv', 'CSS Grid System & Multi-Column Layouts', '1h 00m', '15m', NULL, 2),
('l_css_adv_3', 'm1_css_adv', 'Positioning: Relative, Absolute, Fixed, Sticky', '1h 00m', NULL, '15m', 3),
('l_css_adv_4', 'm1_css_adv', 'Media Queries & Responsive UI Design Patterns', '1h 00m', '15m', NULL, 4),
-- Python Fundamentals
('l_py_1', 'm2_py_fund', 'Python Setup, Variables, Data Types & Control Flow', '1h 30m', '30m', NULL, 1),
('l_py_2', 'm2_py_fund', 'Functions & Variable Scope in Python', '1h 30m', '30m', NULL, 2),
('l_py_3', 'm2_py_fund', 'Built-in Data Structures: Lists, Tuples, Sets, Dicts', '1h 30m', '30m', NULL, 3)
ON CONFLICT (id) DO NOTHING;

-- Seed Practice Problems
INSERT INTO public.practice_problems (id, title, difficulty, category, attempts, success_rate, points) VALUES
('pp1', 'Two Sum', 'Easy', 'Arrays', 0, 92.0, 10),
('pp2', 'Print Hello World', 'Easy', 'Basics', 0, 100.0, 10),
('pp3', 'Reverse a String', 'Easy', 'Strings', 0, 88.0, 15),
('pp4', 'Valid Palindrome', 'Easy', 'Strings & Logic', 0, 85.0, 15),
('pp5', 'Find Maximum in Array', 'Medium', 'Arrays & Search', 0, 80.0, 20)
ON CONFLICT (id) DO NOTHING;

-- Seed Problem Configs
INSERT INTO public.problem_configs (id, description, examples, constraints, test_cases, languages) VALUES
('pp1', 
 'Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.', 
 '[{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."}]'::jsonb, 
 ARRAY['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Only one valid answer exists.'],
 '[{"input": "[2,7,11,15]|9", "expectedOutput": "[0,1]", "description": "Basic example"}]'::jsonb,
 '{"javascript": {"starterCode": "function twoSum(nums, target) {\n\n}", "solution": "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}", "testRunner": ""}}'::jsonb),
('pp2', 
 'Create a function that returns the string "Hello World".', 
 '[{"input": "No input", "output": "\\"Hello World\\"", "explanation": "Returns greeting."}]'::jsonb, 
 ARRAY['Must return exactly \"Hello World\"', 'Case sensitive'],
 '[{"input": "", "expectedOutput": "Hello World", "description": "Basic Hello World test"}]'::jsonb,
 '{"javascript": {"starterCode": "function helloWorld() {\n\n}", "solution": "function helloWorld() {\n  return \"Hello World\";\n}", "testRunner": ""}}'::jsonb)
ON CONFLICT (id) DO NOTHING;
