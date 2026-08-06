import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Star, Clock, BookOpen, Users, Filter, Grid3x3, List, ChevronRight,
  Trophy, Zap, MapPin, CheckCircle2, Video, Code2, ClipboardCheck, X, Sparkles, Brain, Lock, ExternalLink, ChevronDown
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { courses } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DifficultyBadge } from '@/components/ui/StatusChip';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

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
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedTopicDrawer, setSelectedTopicDrawer] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(0);

  const filtered = courses.filter((c) => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Clean Top Header */}
      <div className="pb-2">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          {route === 'milestones' ? 'Milestones Roadmap' : 'Course Catalog'}
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          {route === 'milestones' 
            ? 'Track your journey and master core engineering fundamentals.'
            : 'Explore your enrolled courses, lessons, and practice labs.'}
        </p>
      </div>


      {/* ════════ TAB 1: MILESTONES CURRICULUM ROADMAP ════════ */}
      {route === 'milestones' && (
        <div className="space-y-8 animate-fade-in">

          {/* 1. Top Banner */}
          <div className="p-6 sm:p-8 rounded-[2rem] bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] text-white shadow-lg relative overflow-hidden">
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
          <div className="relative pl-12 space-y-8 before:absolute before:left-[22px] before:top-8 before:bottom-8 before:w-1 before:bg-indigo-200/60 before:rounded-full">
            
            {/* Stage 1 */}
            <div className="relative group">
              <div className="absolute -left-[40px] top-8 w-8 h-8 rounded-full bg-white border-[3px] border-[#3b52a4] shadow-[0_0_15px_rgba(59,82,164,0.3)] flex items-center justify-center z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3b52a4] animate-pulse" />
              </div>

              <div className="p-6 rounded-[2rem] bg-white border border-slate-200/90 shadow-md space-y-4 hover:shadow-lg transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#3b52a4] text-white flex items-center justify-center shadow-md shrink-0">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-[#3b52a4] border border-indigo-100 text-[10px] font-black uppercase tracking-wider">
                          STAGE 01
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Phase 1 • Core Mastery</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl mt-0.5">
                        Stage 1: Python & Core Fundamentals
                      </h3>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-[#3b52a4] border border-indigo-100 text-xs font-bold flex items-center gap-1.5 w-fit">
                    <span className="w-2 h-2 rounded-full bg-[#3b52a4] animate-pulse" />
                    IN PROGRESS
                  </span>
                </div>

                {/* Subtopic Button Pill (Royal Cobalt Light Mode) */}
                <div className="pt-2">
                  <button
                    onClick={() => setSelectedTopicDrawer('Python Programming Basics')}
                    className="w-full sm:w-[450px] p-4 rounded-2xl bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-between group/btn border border-blue-400"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-extrabold text-base leading-tight">Python Programming Basics</h4>
                        <p className="text-[11px] font-semibold text-blue-100 mt-0.5">Click to view subtopics</p>
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
              <div className="absolute -left-[40px] top-8 w-8 h-8 rounded-full bg-white border-[3px] border-indigo-400 shadow-sm flex items-center justify-center z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              </div>

              <div className="p-6 rounded-[2rem] bg-white border border-slate-200/90 shadow-md space-y-4 hover:shadow-lg transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md shrink-0">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-[#3b52a4] border border-indigo-100 text-[10px] font-black uppercase tracking-wider">
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
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-indigo-50 text-[#101537] hover:text-[#3b52a4] font-extrabold text-xs border border-slate-200 transition-all flex items-center justify-between sm:justify-start gap-4"
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


      {/* ════════ TAB 2: COURSE CATALOG GRID/LIST ════════ */}
      {route === 'learning' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search courses..." className="w-full sm:w-72" />
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <button onClick={() => setView('grid')} className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', view === 'grid' ? 'bg-white shadow-sm text-[#3b52a4]' : 'text-slate-400 hover:text-slate-600')}>
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')} className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', view === 'list' ? 'bg-white shadow-sm text-[#3b52a4]' : 'text-slate-400 hover:text-slate-600')}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={cn("grid gap-5", view === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
            {filtered.map((course) => {
              const levelBg = course.level === 'Beginner' ? 'bg-[#f0fdf4] text-[#15803d] border-emerald-200/80' :
                              course.level === 'Intermediate' ? 'bg-[#fffbeb] text-[#b45309] border-amber-200/80' :
                              'bg-[#fff1f2] text-[#be123c] border-rose-200/80';

              return (
                <div
                  key={course.id}
                  onClick={() => navigate('course', { id: course.id })}
                  className={cn(
                    "overflow-hidden rounded-[1.8rem] bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer flex justify-between",
                    view === 'grid' ? "flex-col" : "flex-col sm:flex-row items-stretch h-auto sm:h-44"
                  )}
                >
                  <div className={cn("relative overflow-hidden shrink-0", view === 'grid' ? "h-44 w-full" : "h-44 sm:h-full w-full sm:w-64")}>
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    
                    {/* Top Left Badges (Category + Enrolled) */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                      <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-900 text-xs font-extrabold shadow-sm border border-slate-200/60">
                        {course.category}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#101537] text-white text-xs font-extrabold shadow-sm">
                        Enrolled
                      </span>
                    </div>

                    {/* Bottom Left Level Badge */}
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm border ${levelBg}`}>
                        {course.level}
                      </span>
                    </div>

                    {/* Bottom Right Rating */}
                    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-black shadow-sm">
                      <Star className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                      <span>{course.rating || '4.9'}</span>
                    </div>
                  </div>

                  {/* Card Content (Title, Subtitle, Meta Footer) */}
                  <div className={cn("p-5 space-y-3 flex-1 flex flex-col justify-between", view === 'list' && "sm:p-6")}>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg lg:text-xl mb-1.5 leading-snug line-clamp-1 group-hover:text-[#3b52a4] transition-colors">
                        {course.title}
                      </h3>
                      <p className={cn("text-slate-500 font-medium", view === 'grid' ? "text-xs sm:text-sm line-clamp-1" : "text-sm line-clamp-2")}>
                        {course.subtitle}
                      </p>
                    </div>

                    {/* Footer Meta Row matching Screenshot */}
                    <div className="flex items-center gap-5 text-xs font-semibold text-slate-500 pt-4 border-t border-slate-100 mt-auto">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        {course.lessonsCount} lessons
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        {course.enrolledCount}
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
                  <div key={idx} className={cn("rounded-2xl border overflow-hidden shadow-sm transition-all", isExpanded ? "border-[#2563eb]" : "border-slate-200")}>
                    <button
                      onClick={() => setExpandedModule(isExpanded ? null : idx)}
                      className={cn(
                        "w-full p-4 flex items-center justify-between gap-3 transition-colors",
                        isExpanded ? "bg-[#2563eb] text-white" : "bg-white hover:bg-slate-50 text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center",
                          isExpanded ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600"
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
                            <div className="w-9 h-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Video className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-[#2563eb] uppercase bg-blue-50 px-1.5 py-0.5 rounded">LIVE CLASS</span>
                              <h4 className="font-bold text-slate-900 text-xs mt-0.5">{mod.liveClass}</h4>
                            </div>
                          </div>

                          <button
                            onClick={() => { setSelectedTopicDrawer(null); navigate('live'); }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold text-xs shadow-2xs flex items-center gap-1 transition-all"
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
