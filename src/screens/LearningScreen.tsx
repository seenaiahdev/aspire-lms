import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Star, Clock, BookOpen, Users, Filter, Grid3x3, List, ChevronRight,
  Trophy, Zap, MapPin, CheckCircle2, Video, Code2, ClipboardCheck, X, Sparkles, Brain, Lock, ExternalLink, ChevronDown
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export interface LearningItem {
  id: string;
  category: 'courses' | 'soft_skills' | 'aptitude' | 'portfolio' | 'resume' | 'linkedin';
  categoryLabel: string;
  title: string;
  subtitle: string;
  thumbnail: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  lessonsCount: number;
  enrolledCount: string;
  rating: number;
  progress: number;
  instructor: {
    name: string;
    avatar: string;
    role: string;
  };
  actionText: string;
  targetRoute?: string;
}

const learningItems: LearningItem[] = [
  // ════════ 1. COURSES (EXACTLY 1 COURSE) ════════
  {
    id: 'c1',
    category: 'courses',
    categoryLabel: 'Courses',
    title: 'Advanced Full-Stack React & Next.js Masterclass',
    subtitle: 'Build production-ready web apps with React 19, Server Components, and Tailwind CSS.',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80',
    level: 'Intermediate',
    duration: '24 hours',
    lessonsCount: 42,
    enrolledCount: '2.4k enrolled',
    rating: 4.9,
    progress: 78,
    instructor: {
      name: 'Sara Khan',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      role: 'Staff Frontend Architect'
    },
    actionText: 'Continue Course',
    targetRoute: 'course'
  },

  // ════════ 2. COMMUNICATION & SOFT SKILLS (EXACTLY 1 COURSE) ════════
  {
    id: 's1',
    category: 'soft_skills',
    categoryLabel: 'Communication or Soft Skills',
    title: 'Executive Workplace Communication & Speaking',
    subtitle: 'Master vocal clarity, team presentations, email etiquette, and persuasive leadership.',
    thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    level: 'Beginner',
    duration: '10 hours',
    lessonsCount: 18,
    enrolledCount: '1.5k enrolled',
    rating: 4.9,
    progress: 60,
    instructor: {
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      role: 'Corporate Communications Director'
    },
    actionText: 'Start Soft Skills Unit',
    targetRoute: 'course'
  },

  // ════════ 3. APTITUDE & REASONING (EXACTLY 1 COURSE) ════════
  {
    id: 'a1',
    category: 'aptitude',
    categoryLabel: 'Aptitude & Resounding',
    title: 'Quantitative Aptitude Masterclass for Tech Interviews',
    subtitle: 'Solve speed math, probability, permutations, profit & loss, and time-distance problems.',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
    level: 'Intermediate',
    duration: '18 hours',
    lessonsCount: 30,
    enrolledCount: '3.4k enrolled',
    rating: 4.8,
    progress: 80,
    instructor: {
      name: 'Prof. Rajesh Kumar',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      role: 'Aptitude & GATE Specialist'
    },
    actionText: 'Solve Aptitude Tests',
    targetRoute: 'course'
  },

  // ════════ 4. RESUME (EXACTLY 1 COURSE) ════════
  {
    id: 'r1',
    category: 'resume',
    categoryLabel: 'Resume',
    title: 'ATS-Optimized Tech Resume Masterclass',
    subtitle: 'Pass automated recruiter scanners with impact metrics, action verbs, and clean single-column templates.',
    thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80',
    level: 'Beginner',
    duration: '5 hours',
    lessonsCount: 9,
    enrolledCount: '4.2k enrolled',
    rating: 5.0,
    progress: 100,
    instructor: {
      name: 'Jessica Alba',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'Senior Talent Acquisition Lead'
    },
    actionText: 'Download ATS Templates',
    targetRoute: 'course'
  },

  // ════════ 5. PORTFOLIO (EXACTLY 1 COURSE) ════════
  {
    id: 'p1',
    category: 'portfolio',
    categoryLabel: 'Portfolio',
    title: 'Full-Stack Developer Portfolio Blueprint',
    subtitle: 'Design and deploy a breathtaking portfolio with interactive 3D elements, dark mode, and case studies.',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    level: 'Intermediate',
    duration: '12 hours',
    lessonsCount: 16,
    enrolledCount: '1.9k enrolled',
    rating: 4.9,
    progress: 90,
    instructor: {
      name: 'Alex Morgan',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'Senior UI/UX Engineer'
    },
    actionText: 'Build Portfolio',
    targetRoute: 'course'
  },

  // ════════ 6. LINKEDIN (EXACTLY 1 COURSE) ════════
  {
    id: 'l1',
    category: 'linkedin',
    categoryLabel: 'LinkedIn',
    title: 'LinkedIn Personal Branding & Tech Recruiter Magnet',
    subtitle: 'Optimize your headline, about summary, skills, and SEO keywords so recruiters message you directly.',
    thumbnail: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?auto=format&fit=crop&w=800&q=80',
    level: 'Beginner',
    duration: '7 hours',
    lessonsCount: 12,
    enrolledCount: '3.6k enrolled',
    rating: 4.9,
    progress: 85,
    instructor: {
      name: 'Sophia Williams',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      role: 'LinkedIn Top Voice & Recruiter'
    },
    actionText: 'Audit LinkedIn Profile',
    targetRoute: 'course'
  }
];

const topicDataMap: Record<string, { title: string; subtitle: string; modules: { letter: string; name: string; liveClass: string; lab: string; assessment: string }[] }> = {
  'Python Programming Basics': {
    title: 'Python Programming Basics',
    subtitle: 'Master fundamental data structures, variable declarations, loops, and OOP concepts in Python 3.',
    modules: [
      { letter: 'V', name: 'Variables & Data Types', liveClass: 'Variables Live Workshop', lab: 'Variables Practice Lab', assessment: 'Variables Topic Quiz' },
      { letter: 'F', name: 'Functions & OOP Concepts', liveClass: 'OOP Class Methods', lab: 'OOP Concepts Lab', assessment: 'OOP Assessment' },
    ]
  },
  'ML Fundamentals & Scikit-Learn': {
    title: 'ML Fundamentals & Scikit-Learn',
    subtitle: 'Build supervised and unsupervised machine learning pipelines using Scikit-Learn and Pandas.',
    modules: [
      { letter: 'S', name: 'Supervised Learning & Regression', liveClass: 'Linear Regression Class', lab: 'Regression Lab', assessment: 'ML Fundamentals Quiz' },
      { letter: 'M', name: 'Model Metrics & Hyperparameters', liveClass: 'Model Tuning Masterclass', lab: 'Hyperparameter Tuning Lab', assessment: 'Model Metrics Test' },
    ]
  },
  'Data Structures & Algorithms': {
    title: 'Data Structures & Algorithms',
    subtitle: 'Deep-dive into algorithm complexity, binary trees, dynamic programming, and interview coding challenges.',
    modules: [
      { letter: 'A', name: 'Arrays, Strings & Pointers', liveClass: 'Two-Pointer Technique', lab: 'Array Problems Lab', assessment: 'DSA Practice Quiz' },
      { letter: 'T', name: 'Trees & Graph Traversal', liveClass: 'DFS & BFS Graphs', lab: 'Graph Algorithms Lab', assessment: 'Trees Assessment' },
    ]
  }
};

export function LearningScreen() {
  const { navigate, route } = useNav();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'soft_skills' | 'aptitude' | 'portfolio' | 'resume' | 'linkedin'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedTopicDrawer, setSelectedTopicDrawer] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(0);

  const filteredItems = learningItems.filter((item) => {
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
                          item.categoryLabel.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Clean Top Header */}
      <div className="pb-2">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          {route === 'milestones' ? 'Milestones Roadmap' : 'My Learning'}
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          {route === 'milestones' 
            ? 'Track your journey and master core engineering fundamentals.'
            : 'Explore your courses, soft skills masterclasses, aptitude tests, resume guides, and portfolio blueprints.'}
        </p>
      </div>


      {/* ════════ TAB 1: MILESTONES CURRICULUM ROADMAP ════════ */}
      {route === 'milestones' && (
        <div className="space-y-8 animate-fade-in">

          {/* 1. Top Banner */}
          <div className="p-6 sm:p-8 rounded-[2rem] bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white shadow-xl relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-4 max-w-2xl">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/20 text-xs font-black tracking-wider shadow-sm">
                    <BookOpen className="w-4 h-4" /> MILESTONE CURRICULUM ROADMAP
                  </span>
                  <h3 className="font-bold text-lg sm:text-xl text-white/95 leading-relaxed">
                    Master core engineering fundamentals, advanced AI models, and real-world project deployments.
                  </h3>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/20 text-sm font-bold shadow-sm">
                    <Trophy className="w-4 h-4 text-amber-300" />
                    <span>4 / 12 Completed</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/20 text-sm font-bold shadow-sm">
                    <Zap className="w-4 h-4 text-emerald-300" />
                    <span>Level 3 Unlocked</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-white">
                  <span>Overall Track Completion</span>
                  <span>45%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-white rounded-full w-[45%]" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Vertical Stage Timeline Roadmap */}
          <div className="relative pl-12 space-y-8 before:absolute before:left-[22px] before:top-8 before:bottom-8 before:w-1 before:bg-purple-200/60 before:rounded-full">
            
            {/* Stage 1 */}
            <div className="relative group">
              <div className="absolute -left-[40px] top-8 w-8 h-8 rounded-full bg-white border-[3px] border-[#7c3aed] shadow-[0_0_15px_rgba(124,58,237,0.3)] flex items-center justify-center z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] animate-pulse" />
              </div>

              <div className="p-6 rounded-[2rem] bg-white border border-slate-200/90 shadow-md space-y-4 hover:shadow-lg transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#7c3aed] text-white flex items-center justify-center shadow-md shrink-0">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider">
                          STAGE 01
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Phase 1 • Core Mastery</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl mt-0.5">
                        Stage 1: Python & Core Fundamentals
                      </h3>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-100 text-xs font-bold flex items-center gap-1.5 w-fit">
                    <span className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse" />
                    IN PROGRESS
                  </span>
                </div>

                {/* Subtopic Button Pill (Brand Purple) */}
                <div className="pt-2">
                  <button
                    onClick={() => setSelectedTopicDrawer('Python Programming Basics')}
                    className="w-full sm:w-[450px] p-4 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-between group/btn border border-purple-500"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-extrabold text-base leading-tight">Python Programming Basics</h4>
                        <p className="text-[11px] font-semibold text-purple-100 mt-0.5">Click to view subtopics</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover/btn:bg-white/30 transition-colors">
                      <ChevronRight className="w-4 h-4 text-white" />
                    </div>
                  </button>
                </div>
              </div>
            </div>


            {/* Stage 2 */}
            <div className="relative group">
              <div className="absolute -left-[40px] top-8 w-8 h-8 rounded-full bg-white border-[3px] border-purple-400 shadow-sm flex items-center justify-center z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              </div>

              <div className="p-6 rounded-[2rem] bg-white border border-slate-200/90 shadow-md space-y-4 hover:shadow-lg transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#7c3aed] text-white flex items-center justify-center shadow-md shrink-0">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider">
                          STAGE 02
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Phase 2 • Core Mastery</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl mt-0.5">
                        Stage 2: Machine Learning & AI Models
                      </h3>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold w-fit">
                    AVAILABLE
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedTopicDrawer('ML Fundamentals & Scikit-Learn')}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-purple-50 text-slate-900 hover:text-[#7c3aed] font-extrabold text-xs border border-slate-200 transition-all flex items-center justify-between sm:justify-start gap-4"
                  >
                    <span>ML Fundamentals & Scikit-Learn</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>


            {/* Stage 3 */}
            <div className="relative opacity-70">
              <div className="absolute -left-[40px] top-8 w-8 h-8 rounded-full bg-slate-50 border-[3px] border-slate-300 flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">STAGE 03 • Advanced</span>
                      <h3 className="font-bold text-slate-700 text-base">
                        Stage 3: Advanced AI & Cloud Deployment
                      </h3>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                    LOCKED
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ════════ TAB 2: MY LEARNING CATEGORY TABS & CARDS ════════ */}
      {route === 'learning' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* CATEGORY PILL TABS BAR */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/80">
            {[
              { id: 'all', label: 'All' },
              { id: 'courses', label: 'Courses' },
              { id: 'soft_skills', label: 'Communication or Soft Skills' },
              { id: 'aptitude', label: 'Aptitude & Resounding' },
              { id: 'resume', label: 'Resume' },
              { id: 'portfolio', label: 'Portfolio' },
              { id: 'linkedin', label: 'LinkedIn' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-2xs border shrink-0",
                    isActive
                      ? "bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white border-transparent shadow-md scale-[1.02]"
                      : "bg-white hover:bg-purple-50/50 text-slate-600 hover:text-[#7c3aed] border-slate-200 hover:border-purple-200"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* SEARCH & VIEW SWITCHER ROW */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search learning modules..." className="w-full sm:w-80" />
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                Showing {filteredItems.length} {filteredItems.length === 1 ? 'module' : 'modules'}
              </span>

              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                <button onClick={() => setView('grid')} className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', view === 'grid' ? 'bg-white shadow-xs text-[#7c3aed]' : 'text-slate-400 hover:text-slate-600')}>
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button onClick={() => setView('list')} className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', view === 'list' ? 'bg-white shadow-xs text-[#7c3aed]' : 'text-slate-400 hover:text-slate-600')}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* CARDS GRID / LIST */}
          <div className={cn("grid gap-6", view === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
            {filteredItems.map((item) => {
              const levelBg = item.level === 'Beginner' ? 'bg-[#f0fdf4] text-[#15803d] border-emerald-200/80' :
                              item.level === 'Intermediate' ? 'bg-[#fffbeb] text-[#b45309] border-amber-200/80' :
                              'bg-[#fff1f2] text-[#be123c] border-rose-200/80';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.targetRoute) navigate(item.targetRoute as any, { id: item.id });
                  }}
                  className={cn(
                    "overflow-hidden rounded-[1.8rem] bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer flex justify-between",
                    view === 'grid' ? "flex-col" : "flex-col sm:flex-row items-stretch h-auto sm:h-52"
                  )}
                >
                  {/* Thumbnail Banner */}
                  <div className={cn("relative overflow-hidden shrink-0 bg-slate-900", view === 'grid' ? "h-48 w-full" : "h-48 sm:h-full w-full sm:w-72")}>
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Category & Level Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-900 text-xs font-extrabold shadow-sm border border-slate-200/60">
                        {item.categoryLabel}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${levelBg}`}>
                        {item.level}
                      </span>
                    </div>

                    {/* Progress Bar Badge on Image */}
                    <div className="absolute bottom-3 left-3 right-3 z-10 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-white">
                        <span>Progress</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/30 overflow-hidden backdrop-blur-xs">
                        <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className={cn("p-5 space-y-4 flex-1 flex flex-col justify-between", view === 'list' && "sm:p-6")}>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mb-1.5 leading-snug line-clamp-2 group-hover:text-[#7c3aed] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-slate-500 text-xs font-medium line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Instructor Info */}
                    <div className="flex items-center gap-1 pt-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-850 truncate">Instructor: {item.instructor.name}</p>
                        <p className="text-[10px] font-semibold text-slate-500 truncate">{item.instructor.role}</p>
                      </div>
                    </div>

                    {/* Footer Meta Row */}
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-3 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />{item.duration}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" />{item.lessonsCount} lessons</span>
                      </div>

                      <span className="text-xs font-extrabold text-[#7c3aed] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        {item.actionText} →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}


      {/* ════════ DYNAMIC TOPIC CATALOG SIDE DRAWER / MODAL ════════ */}
      {selectedTopicDrawer && (() => {
        const topicInfo = topicDataMap[selectedTopicDrawer] || {
          title: selectedTopicDrawer,
          subtitle: 'Tailored learning modules and recorded sessions designed specifically for your growth path.',
          modules: [
            { letter: 'V', name: 'Variables & Data Types', liveClass: 'Live Class', lab: 'Practice Lab', assessment: 'Assessment' },
            { letter: 'F', name: 'Functions & OOP Concepts', liveClass: 'OOP Workshop', lab: 'OOP Lab', assessment: 'OOP Assessment' },
          ]
        };

        return createPortal(
          <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTopicDrawer(null); }}>
            <div className="w-full max-w-lg bg-white h-[100dvh] shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-left font-sans cursor-default">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">
                    {topicInfo.title}
                  </h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-[#3b52a4] text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                    TOPIC CATALOG
                  </span>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {topicInfo.subtitle}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedTopicDrawer(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Learning Path List */}
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
                  <span>LEARNING PATH</span>
                  <span>{topicInfo.modules.length} modules</span>
                </div>

                {topicInfo.modules.map((mod, idx) => {
                  const isExpanded = expandedModule === idx;
                  
                  return (
                  <div key={idx} className={cn("rounded-2xl border overflow-hidden shadow-sm transition-all", isExpanded ? "border-[#7c3aed]" : "border-slate-200")}>
                    <button
                      onClick={() => setExpandedModule(isExpanded ? null : idx)}
                      className={cn(
                        "w-full p-4 flex items-center justify-between gap-3 transition-colors",
                        isExpanded ? "bg-[#7c3aed] text-white" : "bg-white hover:bg-slate-50 text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center",
                          isExpanded ? "bg-white/20 text-white" : "bg-purple-50 text-[#7c3aed]"
                        )}>
                          {mod.letter}
                        </span>
                        <span className="font-extrabold text-sm">{mod.name}</span>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
                        isExpanded ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-white space-y-3 border-t border-slate-100 animate-fade-in">
                        
                        {/* Live Class */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Video className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-[#7c3aed] uppercase bg-purple-50 px-1.5 py-0.5 rounded">LIVE CLASS</span>
                              <h4 className="font-bold text-slate-900 text-xs mt-0.5">{mod.liveClass}</h4>
                            </div>
                          </div>

                          <button
                            onClick={() => { setSelectedTopicDrawer(null); navigate('live'); }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-2xs flex items-center gap-1 transition-all"
                          >
                            <span>JOIN</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Practice Lab */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Code2 className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/50">PRACTICAL LAB</span>
                              <h4 className="font-bold text-slate-900 text-xs mt-0.5">{mod.lab}</h4>
                            </div>
                          </div>

                          <button
                            onClick={() => { setSelectedTopicDrawer(null); navigate('practice'); }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1 transition-all"
                          >
                            <span>VIEW</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Assessment */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <ClipboardCheck className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-primary-500 uppercase bg-primary-50 px-1.5 py-0.5 rounded">ASSESSMENT</span>
                              <h4 className="font-bold text-slate-900 text-xs mt-0.5">{mod.assessment}</h4>
                            </div>
                          </div>

                          <button
                            onClick={() => { setSelectedTopicDrawer(null); navigate('assignments'); }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-2xs flex items-center gap-1 transition-all"
                          >
                            <span>TAKE</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                )})}
              </div>

              {/* Ask AI Tutor Floating Button */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <button className="w-full py-3 px-4 rounded-2xl bg-[#101537] hover:bg-[#1e2761] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Ask AI Tutor</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px]">PRO</span>
                </button>
              </div>

            </div>
          </div>,
          document.body
        );
      })()}

    </div>
  );
}
