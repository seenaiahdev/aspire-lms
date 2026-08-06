import type {
  User, Course, Assignment, LiveClass, Quiz, Project,
  Notification, Badge, Certificate, LeaderboardEntry, Resource,
  CommunityPost, ScheduleItem, PracticeProblem, JobOpportunity, Instructor,
} from '@/types';

export const currentUser: User = {
  id: 'u1',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@aspirenext.edu',
  avatar: 'https://i.pravatar.cc/200?img=12',
  role: 'Student',
  program: 'B.Tech Computer Science',
  semester: 5,
  joinedDate: 'Aug 2023',
  xp: 12450,
  level: 24,
  streak: 47,
  rank: 3,
  bio: 'Full-stack developer in the making. Passionate about building products that matter. Currently exploring AI/ML and cloud architecture.',
  skills: [
    { name: 'React', level: 88 },
    { name: 'TypeScript', level: 82 },
    { name: 'Node.js', level: 75 },
    { name: 'Python', level: 70 },
    { name: 'DSA', level: 78 },
    { name: 'System Design', level: 55 },
  ],
  socials: [
    { label: 'GitHub', value: 'github.com/aarav' },
    { label: 'LinkedIn', value: 'linkedin.com/in/aarav' },
    { label: 'Portfolio', value: 'aarav.dev' },
  ],
};

const instructors: Instructor[] = [
  {
    id: 'i1', name: 'Dr. Priya Nair', title: 'Senior ML Engineer, ex-Google',
    avatar: 'https://i.pravatar.cc/200?img=45', rating: 4.9, students: 12400,
    courses: 8, bio: '10+ years building production ML systems at scale.',
  },
  {
    id: 'i2', name: 'Rohan Mehta', title: 'Staff Engineer, ex-Amazon',
    avatar: 'https://i.pravatar.cc/200?img=33', rating: 4.8, students: 8900,
    courses: 5, bio: 'Distributed systems expert and passionate educator.',
  },
  {
    id: 'i3', name: 'Sara Khan', title: 'Frontend Architect, ex-Stripe',
    avatar: 'https://i.pravatar.cc/200?img=47', rating: 4.95, students: 15600,
    courses: 6, bio: 'Design systems and performance optimization specialist.',
  },
];

export const courses: Course[] = [
  {
    id: 'c1',
    title: 'Full-Stack Web Development with React',
    subtitle: 'Build production-grade applications from scratch',
    category: 'Web Development',
    level: 'Intermediate',
    instructor: instructors[2],
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1467232004584-a247de7d3faa?w=1200&q=80',
    rating: 4.9, reviews: 1240, students: 8400, duration: '42h', lessons: 96,
    progress: 68,
    tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    description: 'Master modern full-stack development by building real-world applications. Learn React 18, server-side rendering, API design, authentication, and deployment.',
    price: 0, enrolled: true, updatedAt: '2 days ago',
    modules: [
      { id: 'm1', title: 'Foundations', lessons: [
        { id: 'l1', title: 'Course Introduction', duration: '8:24', type: 'video', completed: true, preview: true },
        { id: 'l2', title: 'React 18 Core Concepts', duration: '24:15', type: 'video', completed: true, preview: false },
        { id: 'l3', title: 'JSX & Components Deep Dive', duration: '18:42', type: 'video', completed: true, preview: false },
        { id: 'l4', title: 'State Management Patterns', duration: '32:10', type: 'video', completed: true, preview: false },
      ]},
      { id: 'm2', title: 'Building the Backend', lessons: [
        { id: 'l5', title: 'REST API Design', duration: '28:30', type: 'video', completed: true, preview: false },
        { id: 'l6', title: 'Authentication & Authorization', duration: '35:20', type: 'video', completed: false, preview: false },
        { id: 'l7', title: 'Database Modeling', duration: '22:18', type: 'reading', completed: false, preview: false },
      ]},
      { id: 'm3', title: 'Advanced Patterns', lessons: [
        { id: 'l8', title: 'Performance Optimization', duration: '30:45', type: 'video', completed: false, preview: false },
        { id: 'l9', title: 'Testing Strategies', duration: '26:12', type: 'video', completed: false, preview: false },
        { id: 'l10', title: 'Capstone Project Brief', duration: '15:00', type: 'project', completed: false, preview: false },
      ]},
    ],
  },
  {
    id: 'c2',
    title: 'Machine Learning Fundamentals',
    subtitle: 'From linear regression to neural networks',
    category: 'AI & ML',
    level: 'Beginner',
    instructor: instructors[0],
    thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&q=80',
    rating: 4.8, reviews: 890, students: 5200, duration: '36h', lessons: 78,
    progress: 34,
    tags: ['Python', 'TensorFlow', 'Neural Networks'],
    description: 'Start your ML journey with intuitive explanations and hands-on projects. Build your first models and understand the math behind them.',
    price: 0, enrolled: true, updatedAt: '5 days ago',
    modules: [
      { id: 'm1', title: 'ML Basics', lessons: [
        { id: 'l1', title: 'What is Machine Learning?', duration: '12:00', type: 'video', completed: true, preview: true },
        { id: 'l2', title: 'Linear Regression', duration: '28:00', type: 'video', completed: true, preview: false },
        { id: 'l3', title: 'Classification Basics', duration: '25:30', type: 'video', completed: false, preview: false },
      ]},
    ],
  },
  {
    id: 'c3',
    title: 'System Design Mastery',
    subtitle: 'Design scalable distributed systems',
    category: 'System Design',
    level: 'Advanced',
    instructor: instructors[1],
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
    rating: 4.9, reviews: 2100, students: 11200, duration: '28h', lessons: 54,
    progress: 12,
    tags: ['Architecture', 'Scalability', 'Microservices'],
    description: 'Learn to design systems that handle millions of users. Covers caching, load balancing, databases, and real-world case studies.',
    price: 0, enrolled: true, updatedAt: '1 week ago',
    modules: [
      { id: 'm1', title: 'Core Concepts', lessons: [
        { id: 'l1', title: 'Scalability Fundamentals', duration: '20:00', type: 'video', completed: true, preview: true },
        { id: 'l2', title: 'Load Balancing', duration: '18:30', type: 'video', completed: false, preview: false },
      ]},
    ],
  },
  {
    id: 'c4',
    title: 'Data Structures & Algorithms',
    subtitle: 'Crack coding interviews with confidence',
    category: 'DSA',
    level: 'Intermediate',
    instructor: instructors[1],
    thumbnail: 'https://images.unsplash.com/photo-1516259762381-22954a1c4a31?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1516259762381-22954a1c4a31?w=1200&q=80',
    rating: 4.7, reviews: 3400, students: 18900, duration: '48h', lessons: 120,
    progress: 0,
    tags: ['Algorithms', 'Data Structures', 'Interview Prep'],
    description: 'Comprehensive DSA course with 300+ problems, pattern-based learning, and mock interview practice.',
    price: 0, enrolled: false, updatedAt: '3 days ago',
    modules: [],
  },
  {
    id: 'c5',
    title: 'Cloud Architecture on AWS',
    subtitle: 'Build and deploy cloud-native applications',
    category: 'Cloud',
    level: 'Advanced',
    instructor: instructors[1],
    thumbnail: 'https://images.unsplash.com/photo-1451187580453-466d7ca8d488?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1451187580453-466d7ca8d488?w=1200&q=80',
    rating: 4.8, reviews: 670, students: 4300, duration: '32h', lessons: 64,
    progress: 0,
    tags: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    description: 'Master AWS services, containerization, and infrastructure as code. Includes real-world deployment projects.',
    price: 0, enrolled: false, updatedAt: '1 week ago',
    modules: [],
  },
  {
    id: 'c6',
    title: 'UI/UX Design Principles',
    subtitle: 'Design products people love',
    category: 'Design',
    level: 'Beginner',
    instructor: instructors[2],
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=1200&q=80',
    rating: 4.9, reviews: 1500, students: 9800, duration: '24h', lessons: 48,
    progress: 0,
    tags: ['Figma', 'Design Systems', 'User Research'],
    description: 'Learn the principles of great design. From color theory to prototyping, build a portfolio-worthy skill set.',
    price: 0, enrolled: false, updatedAt: '4 days ago',
    modules: [],
  },
];

export const assignments: Assignment[] = [
  { id: 'a1', title: 'Build a REST API with Authentication', course: 'Full-Stack Web Dev', courseId: 'c1', dueDate: 'Tomorrow, 11:59 PM', status: 'pending', maxGrade: 100, description: 'Create a complete REST API with JWT authentication, rate limiting, and input validation. Include documentation.', attachments: 3 },
  { id: 'a2', title: 'Neural Network from Scratch', course: 'ML Fundamentals', courseId: 'c2', dueDate: 'Aug 8, 11:59 PM', status: 'pending', maxGrade: 100, description: 'Implement a neural network using only NumPy. Train it on the MNIST dataset and achieve 95%+ accuracy.', attachments: 2 },
  { id: 'a3', title: 'Design a URL Shortener', course: 'System Design', courseId: 'c3', dueDate: 'Aug 12, 11:59 PM', status: 'pending', maxGrade: 100, description: 'Design a URL shortening service that handles 100M URLs with 99.99% uptime. Submit architecture diagram and trade-off analysis.', attachments: 1 },
  { id: 'a4', title: 'React Component Library', course: 'Full-Stack Web Dev', courseId: 'c1', dueDate: 'Submitted Aug 1', status: 'reviewed', grade: 92, maxGrade: 100, feedback: 'Excellent work on accessibility and documentation. Consider adding more edge case tests.', description: 'Build a reusable component library with 10+ components.', attachments: 5 },
  { id: 'a5', title: 'Database Schema Design', course: 'Full-Stack Web Dev', courseId: 'c1', dueDate: 'Jul 28', status: 'overdue', maxGrade: 100, description: 'Design a normalized database schema for an e-commerce platform.', attachments: 0 },
  { id: 'a6', title: 'Linear Regression Implementation', course: 'ML Fundamentals', courseId: 'c2', dueDate: 'Submitted Jul 30', status: 'submitted', maxGrade: 100, description: 'Implement linear regression with gradient descent.', attachments: 2 },
];

export const liveClasses: LiveClass[] = [
  { id: 'lc1', title: 'Advanced React Patterns Workshop', course: 'Full-Stack Web Dev', instructor: instructors[2], scheduledAt: 'Today, 4:00 PM', duration: '90 min', status: 'ongoing', participants: 142, thumbnail: 'https://images.unsplash.com/photo-1596462822660-8d5f5d5f5d5f?w=800&q=80' },
  { id: 'lc2', title: 'Neural Networks Q&A Session', course: 'ML Fundamentals', instructor: instructors[0], scheduledAt: 'Tomorrow, 2:00 PM', duration: '60 min', status: 'upcoming', participants: 89, thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80' },
  { id: 'lc3', title: 'System Design: Twitter Case Study', course: 'System Design', instructor: instructors[1], scheduledAt: 'Aug 6, 6:00 PM', duration: '120 min', status: 'upcoming', participants: 210, thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80' },
  { id: 'lc4', title: 'Intro to Cloud Architecture', course: 'Cloud Architecture', instructor: instructors[1], scheduledAt: 'Jul 30', duration: '90 min', status: 'completed', participants: 178, thumbnail: 'https://images.unsplash.com/photo-1451187580453-466d7ca8d488?w=800&q=80', recordingUrl: '#' },
];

export const quizzes: Quiz[] = [
  { id: 'q1', title: 'React Hooks Deep Dive', course: 'Full-Stack Web Dev', questions: 20, duration: '30 min', status: 'upcoming', maxScore: 100, dueDate: 'Aug 5', difficulty: 'Medium' },
  { id: 'q2', title: 'ML Basics Assessment', course: 'ML Fundamentals', questions: 15, duration: '25 min', status: 'attempted', score: 88, maxScore: 100, dueDate: 'Jul 28', difficulty: 'Easy' },
  { id: 'q3', title: 'Scalability Concepts', course: 'System Design', questions: 25, duration: '40 min', status: 'upcoming', maxScore: 100, dueDate: 'Aug 10', difficulty: 'Hard' },
  { id: 'q4', title: 'API Design Quiz', course: 'Full-Stack Web Dev', questions: 18, duration: '25 min', status: 'attempted', score: 94, maxScore: 100, dueDate: 'Jul 20', difficulty: 'Medium' },
];

export const projects: Project[] = [
  { id: 'p1', title: 'Login & Signup Welcome Page', course: 'Full-Stack Web Dev', status: 'assigned', difficulty: 'Beginner', skills: ['HTML', 'CSS', 'JavaScript'], description: 'Build a simple login and signup page that validates input and shows a welcome message after submit.', dueDate: 'Aug 20' },
  { id: 'p2', title: 'Image Classification App', course: 'ML Fundamentals', status: 'submitted', difficulty: 'Intermediate', skills: ['Python', 'TensorFlow', 'CNN'], description: 'Train a CNN to classify images and deploy as a web app.', dueDate: 'Aug 1' },
  { id: 'p3', title: 'Chat System Design', course: 'System Design', status: 'feedback', difficulty: 'Advanced', skills: ['Architecture', 'WebSocket', 'Redis'], description: 'Design and document a real-time chat system.', mentorFeedback: 'Great architecture diagram! Consider adding more detail on message ordering and delivery guarantees.', grade: 89, dueDate: 'Jul 25' },
  { id: 'p4', title: 'Personal Portfolio Page', course: 'Full-Stack Web Dev', status: 'assigned', difficulty: 'Beginner', skills: ['HTML', 'CSS', 'JavaScript'], description: 'Create a responsive personal portfolio page showcasing projects, skills, and contact info.', dueDate: 'Aug 30' },
];

export const notifications: Notification[] = [];

export const badges: Badge[] = [
  { id: 'b1', name: 'Fast Learner', description: 'Complete 5 lessons in a day', icon: 'Zap', earned: true, date: 'Jul 15', rarity: 'rare' },
  { id: 'b2', name: 'Streak Master', description: 'Maintain a 30-day streak', icon: 'Flame', earned: true, date: 'Jul 30', rarity: 'epic' },
  { id: 'b3', name: 'Quiz Champion', description: 'Score 90+ on 10 quizzes', icon: 'Trophy', earned: true, date: 'Jul 22', rarity: 'epic' },
  { id: 'b4', name: 'Helping Hand', description: 'Answer 50 community doubts', icon: 'HeartHandshake', earned: true, date: 'Jul 18', rarity: 'rare' },
  { id: 'b5', name: 'Code Wizard', description: 'Solve 100 coding problems', icon: 'Code2', earned: false, rarity: 'legendary' },
  { id: 'b6', name: 'Early Bird', description: 'Study before 7 AM for a week', icon: 'Sunrise', earned: false, rarity: 'common' },
  { id: 'b7', name: 'Team Player', description: 'Complete 5 group projects', icon: 'Users', earned: true, date: 'Jul 10', rarity: 'common' },
  { id: 'b8', name: 'Perfectionist', description: 'Score 100 on 5 assignments', icon: 'Sparkles', earned: false, rarity: 'legendary' },
];

export const certificates: Certificate[] = [
  { id: 'cert1', title: 'JavaScript Essentials', course: 'JavaScript Mastery', issuedDate: 'Jun 2024', verifyId: 'ASP-JS-2024-0892', grade: 'A+' },
  { id: 'cert2', title: 'CSS & Responsive Design', course: 'Modern CSS Patterns', issuedDate: 'May 2024', verifyId: 'ASP-CSS-2024-0451', grade: 'A' },
  { id: 'cert3', title: 'Git & Version Control', course: 'DevOps Fundamentals', issuedDate: 'Apr 2024', verifyId: 'ASP-GIT-2024-0233', grade: 'A+' },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Ishita Verma', avatar: 'https://i.pravatar.cc/200?img=20', xp: 18200, level: 32, streak: 89, trend: 'same' },
  { rank: 2, name: 'Karan Patel', avatar: 'https://i.pravatar.cc/200?img=15', xp: 15600, level: 28, streak: 62, trend: 'up' },
  { rank: 3, name: 'Aarav Sharma', avatar: 'https://i.pravatar.cc/200?img=12', xp: 12450, level: 24, streak: 47, trend: 'up' },
  { rank: 4, name: 'Neha Gupta', avatar: 'https://i.pravatar.cc/200?img=31', xp: 11800, level: 23, streak: 35, trend: 'down' },
  { rank: 5, name: 'Arjun Reddy', avatar: 'https://i.pravatar.cc/200?img=11', xp: 10200, level: 21, streak: 28, trend: 'up' },
  { rank: 6, name: 'Sneha Iyer', avatar: 'https://i.pravatar.cc/200?img=24', xp: 9800, level: 20, streak: 41, trend: 'same' },
  { rank: 7, name: 'Vikram Singh', avatar: 'https://i.pravatar.cc/200?img=13', xp: 8900, level: 19, streak: 15, trend: 'down' },
];

export const resources: Resource[] = [
  { id: 'r1', title: 'React Cheat Sheet 2024', type: 'cheatsheet', category: 'Web Dev', size: '2.4 MB', downloads: 3400, updatedAt: '2 days ago' },
  { id: 'r2', title: 'System Design Roadmap', type: 'roadmap', category: 'System Design', size: '1.8 MB', downloads: 5600, updatedAt: '1 week ago' },
  { id: 'r3', title: 'ML Math Notes', type: 'notes', category: 'AI & ML', size: '5.2 MB', downloads: 2100, updatedAt: '3 days ago' },
  { id: 'r4', title: 'DSA Pattern Guide', type: 'pdf', category: 'DSA', size: '8.7 MB', downloads: 8900, updatedAt: '5 days ago' },
  { id: 'r5', title: 'Project Proposal Template', type: 'template', category: 'General', size: '340 KB', downloads: 1200, updatedAt: '1 day ago' },
  { id: 'r6', title: 'AWS Services Quick Reference', type: 'cheatsheet', category: 'Cloud', size: '3.1 MB', downloads: 4500, updatedAt: '1 week ago' },
];

export const communityPosts: CommunityPost[] = [
  { id: 'cp1', author: 'Dr. Priya Nair', avatar: 'https://i.pravatar.cc/200?img=45', role: 'mentor', content: 'Reminder: The ML project submissions are due next Friday. Make sure to include your model evaluation metrics and not just accuracy. Reach out if you need help!', time: '1h ago', likes: 124, comments: 18, tags: ['ML', 'Deadline'], liked: false },
  { id: 'cp2', author: 'Karan Patel', avatar: 'https://i.pravatar.cc/200?img=15', role: 'student', content: 'Finally solved the "Design a Rate Limiter" problem after 3 days! The token bucket algorithm makes so much sense now. Anyone else working on system design problems?', time: '3h ago', likes: 67, comments: 12, tags: ['SystemDesign', 'Wins'], liked: true },
  { id: 'cp3', author: 'Ishita Verma', avatar: 'https://i.pravatar.cc/200?img=20', role: 'student', content: 'Has anyone tried the new coding challenge? I am stuck on the dynamic programming approach for the coin change variant. Any hints without spoiling the solution?', time: '5h ago', likes: 34, comments: 8, tags: ['DSA', 'Help'], liked: false },
  { id: 'cp4', author: 'Rohan Mehta', avatar: 'https://i.pravatar.cc/200?img=33', role: 'mentor', content: 'Great discussion in today\'s system design live class! For those who asked, here is the link to the Twitter architecture case study we discussed. Study the caching layer carefully.', time: '8h ago', likes: 201, comments: 25, tags: ['SystemDesign', 'Resources'], liked: true },
];

export const scheduleItems: ScheduleItem[] = [
  { id: 's1', title: 'Advanced React Patterns', type: 'class', date: 'Today', time: '4:00 PM', duration: '90 min', course: 'Full-Stack Web Dev', location: 'Online' },
  { id: 's2', title: 'REST API Assignment Due', type: 'assignment', date: 'Tomorrow', time: '11:59 PM', duration: '', course: 'Full-Stack Web Dev' },
  { id: 's3', title: 'Neural Networks Q&A', type: 'class', date: 'Tomorrow', time: '2:00 PM', duration: '60 min', course: 'ML Fundamentals', location: 'Online' },
  { id: 's4', title: 'React Hooks Quiz', type: 'exam', date: 'Aug 5', time: '10:00 AM', duration: '30 min', course: 'Full-Stack Web Dev' },
  { id: 's5', title: 'Hackathon 2024', type: 'event', date: 'Aug 8', time: '9:00 AM', duration: '48 hours', location: 'Main Campus' },
];

export const practiceProblems: PracticeProblem[] = [
  { id: 'pp1', title: 'Two Sum', difficulty: 'Easy', category: 'Arrays & Math', solved: false, attempts: 0, successRate: 89, points: 10 },
  { id: 'pp2', title: 'Hello World', difficulty: 'Easy', category: 'Basics', solved: false, attempts: 0, successRate: 98, points: 5 },
  { id: 'pp3', title: 'Reverse a String', difficulty: 'Easy', category: 'Strings', solved: false, attempts: 0, successRate: 95, points: 10 },
];

export const jobOpportunities: JobOpportunity[] = [
  { id: 'j1', company: 'TechCorp Solutions', role: 'Frontend Engineer (React)', logo: 'https://api.dicebear.com/7.x/initials/svg?seed=TC&backgroundColor=10b981', location: 'Bangalore, India', type: 'Full-time', salary: '12-18 LPA', postedDate: '2 days ago', match: 92, skills: ['React', 'TypeScript', 'Tailwind'], status: 'open' },
  { id: 'j2', company: 'DataFlow Systems', role: 'ML Engineer Intern', logo: 'https://api.dicebear.com/7.x/initials/svg?seed=DF&backgroundColor=0ea5e9', location: 'Remote', type: 'Internship', salary: '40k/month', postedDate: '5 days ago', match: 85, skills: ['Python', 'TensorFlow', 'Scikit-Learn'], status: 'applied' },
  { id: 'j3', company: 'CloudSys Networks', role: 'Backend Developer (Node.js)', logo: 'https://api.dicebear.com/7.x/initials/svg?seed=CS&backgroundColor=f59e0b', location: 'Hyderabad, India', type: 'Full-time', salary: '10-15 LPA', postedDate: '1 week ago', match: 78, skills: ['Node.js', 'AWS', 'PostgreSQL'], status: 'open' },
  { id: 'j4', company: 'StartupX Labs', role: 'Full-Stack Engineer', logo: 'https://api.dicebear.com/7.x/initials/svg?seed=SX&backgroundColor=8b5cf6', location: 'Remote', type: 'Full-time', salary: '14-20 LPA', postedDate: '1 week ago', match: 88, skills: ['React', 'Node.js', 'PostgreSQL'], status: 'applied' },
  { id: 'j5', company: 'AI NextGen', role: 'AI / Data Scientist', logo: 'https://api.dicebear.com/7.x/initials/svg?seed=AN&backgroundColor=ec4899', location: 'Bangalore, India', type: 'Full-time', salary: '18-24 LPA', postedDate: '2 weeks ago', match: 95, skills: ['Python', 'PyTorch', 'NLP'], status: 'closed' },
  { id: 'j6', company: 'CyberEdge Labs', role: 'DevOps Engineer', logo: 'https://api.dicebear.com/7.x/initials/svg?seed=CE&backgroundColor=6366f1', location: 'Pune, India', type: 'Full-time', salary: '11-16 LPA', postedDate: '3 weeks ago', match: 82, skills: ['Docker', 'Kubernetes', 'CI/CD'], status: 'closed' },
];

export const announcements = [
  { id: 'an1', title: 'New ML Course Launch', message: 'Advanced Deep Learning course is now available. Enroll now for early access!', time: '2h ago', priority: 'high' as const },
  { id: 'an2', title: 'Hackathon 2024 Registration Open', message: 'Register for the annual 48-hour hackathon. Prize pool: 2 Lakhs.', time: '1d ago', priority: 'medium' as const },
  { id: 'an3', title: 'Library Maintenance', message: 'The resource library will be under maintenance on Aug 5, 2-4 AM IST.', time: '2d ago', priority: 'low' as const },
];

export const weeklyActivity = [
  { day: 'Mon', hours: 3.5, lessons: 4 },
  { day: 'Tue', hours: 4.2, lessons: 6 },
  { day: 'Wed', hours: 2.8, lessons: 3 },
  { day: 'Thu', hours: 5.1, lessons: 7 },
  { day: 'Fri', hours: 3.9, lessons: 5 },
  { day: 'Sat', hours: 6.2, lessons: 8 },
  { day: 'Sun', hours: 4.5, lessons: 5 },
];

export const attendanceData = {
  present: 92,
  absent: 5,
  late: 3,
  total: 100,
  monthly: [
    { month: 'Feb', rate: 95 },
    { month: 'Mar', rate: 88 },
    { month: 'Apr', rate: 91 },
    { month: 'May', rate: 94 },
    { month: 'Jun', rate: 89 },
    { month: 'Jul', rate: 92 },
  ],
};

export const recentActivity = [
  { id: 'ra1', action: 'Completed lesson', target: 'State Management Patterns', course: 'Full-Stack Web Dev', time: '2h ago', icon: 'CheckCircle' },
  { id: 'ra2', action: 'Submitted assignment', target: 'React Component Library', course: 'Full-Stack Web Dev', time: '5h ago', icon: 'Upload' },
  { id: 'ra3', action: 'Earned badge', target: 'Streak Master', course: '', time: '1d ago', icon: 'Award' },
  { id: 'ra4', action: 'Scored', target: '88/100 on ML Basics Quiz', course: 'ML Fundamentals', time: '2d ago', icon: 'TrendingUp' },
  { id: 'ra5', action: 'Joined live class', target: 'Intro to Cloud Architecture', course: 'Cloud Architecture', time: '3d ago', icon: 'Radio' },
];

export const mentorMessages = [
  { id: 'mm1', from: 'Dr. Priya Nair', avatar: 'https://i.pravatar.cc/200?img=45', message: 'Great progress on the ML course! Your neural network implementation looks solid. Let me know if you need help with the next module.', time: '3h ago', unread: true },
  { id: 'mm2', from: 'Rohan Mehta', avatar: 'https://i.pravatar.cc/200?img=33', message: 'Your system design submission was excellent. Consider exploring the caching chapter next.', time: '1d ago', unread: false },
];
