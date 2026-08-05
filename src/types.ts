export type ID = string;

export interface User {
  id: ID;
  name: string;
  email: string;
  avatar: string;
  role: string;
  program: string;
  semester: number;
  joinedDate: string;
  xp: number;
  level: number;
  streak: number;
  rank: number;
  bio: string;
  skills: { name: string; level: number }[];
  socials: { label: string; value: string }[];
}

export interface Course {
  id: ID;
  title: string;
  subtitle: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  instructor: Instructor;
  thumbnail: string;
  banner: string;
  rating: number;
  reviews: number;
  students: number;
  duration: string;
  lessons: number;
  modules: Module[];
  progress: number;
  tags: string[];
  description: string;
  price: number;
  enrolled: boolean;
  updatedAt: string;
}

export interface Instructor {
  id: ID;
  name: string;
  title: string;
  avatar: string;
  rating: number;
  students: number;
  courses: number;
  bio: string;
}

export interface Module {
  id: ID;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: ID;
  title: string;
  duration: string;
  type: 'video' | 'reading' | 'quiz' | 'project';
  completed: boolean;
  preview: boolean;
}

export interface Assignment {
  id: ID;
  title: string;
  course: string;
  courseId: ID;
  dueDate: string;
  status: 'pending' | 'submitted' | 'reviewed' | 'overdue';
  grade?: number;
  maxGrade: number;
  feedback?: string;
  description: string;
  attachments: number;
}

export interface LiveClass {
  id: ID;
  title: string;
  course: string;
  instructor: Instructor;
  scheduledAt: string;
  duration: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  participants: number;
  thumbnail: string;
  recordingUrl?: string;
}

export interface Quiz {
  id: ID;
  title: string;
  course: string;
  questions: number;
  duration: string;
  status: 'upcoming' | 'attempted' | 'expired';
  score?: number;
  maxScore: number;
  dueDate: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface Project {
  id: ID;
  title: string;
  course: string;
  status: 'assigned' | 'submitted' | 'feedback';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  skills: string[];
  description: string;
  mentorFeedback?: string;
  grade?: number;
  dueDate: string;
}

export interface Notification {
  id: ID;
  type: 'assignment' | 'live' | 'community' | 'placement' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
}

export interface Badge {
  id: ID;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  date?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Certificate {
  id: ID;
  title: string;
  course: string;
  issuedDate: string;
  verifyId: string;
  grade: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  trend: 'up' | 'down' | 'same';
}

export interface Resource {
  id: ID;
  title: string;
  type: 'pdf' | 'notes' | 'cheatsheet' | 'roadmap' | 'template';
  category: string;
  size: string;
  downloads: number;
  updatedAt: string;
}

export interface CommunityPost {
  id: ID;
  author: string;
  avatar: string;
  role: 'student' | 'mentor';
  content: string;
  time: string;
  likes: number;
  comments: number;
  tags: string[];
  liked: boolean;
}

export interface ScheduleItem {
  id: ID;
  title: string;
  type: 'class' | 'assignment' | 'exam' | 'event' | 'task';
  date: string;
  dateKey?: string;
  time: string;
  duration: string;
  course?: string;
  location?: string;
  completed?: boolean;
}

export interface PracticeProblem {
  id: ID;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  solved: boolean;
  attempts: number;
  successRate: number;
  points: number;
}

export interface ProblemConfig {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  examples: {
    input: string;
    output: string;
    explanation: string;
  }[];
  constraints: string[];
  testCases: {
    input: string;
    expectedOutput: string;
    description: string;
  }[];
  languages: {
    [key: string]: {
      starterCode: string;
      solution: string;
      testRunner: string;
    };
  };
}

export interface JobOpportunity {
  id: ID;
  company: string;
  role: string;
  logo: string;
  location: string;
  type: 'Full-time' | 'Internship' | 'Contract';
  salary: string;
  postedDate: string;
  match: number;
  skills: string[];
  status: 'open' | 'applied' | 'closed';
}
