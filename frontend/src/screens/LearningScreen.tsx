import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, ChevronRight, Download, Eye, Heart, Layers, Play, Star, BookOpen, Clock, Brain, Lock, X, ChevronDown, Video, ExternalLink, Code2, ClipboardCheck, Zap, Trophy, TrendingUp, Search, Users, Filter, Grid3x3, List, MapPin, CheckCircle2, Sparkles, Terminal 
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/UserContext';
import { fetchCoursesByIds } from '@/lib/api';
import { supabase } from '@/lib/supabase';

import { learningSteps } from '@/lib/tourSteps';

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
export function LearningScreen() {
  const { navigate, route } = useNav();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'soft_skills' | 'aptitude' | 'portfolio' | 'resume' | 'linkedin'>('all');
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedTopicDrawer, setSelectedTopicDrawer] = useState<any | null>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(0);
  const [lockedToast, setLockedToast] = useState(false);
  const [dbCourses, setDbCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [allMilestones, setAllMilestones] = useState<any[]>([]);
  const [syllabusLoading, setSyllabusLoading] = useState(true);

  const dbSyllabus = useMemo(() => {
    const batchCategory = user.batchCategory || 'Weekday';
    const targetCategory = batchCategory === 'Weekend' ? 'ml-python-weekend' : 'ml-python-full-stack';
    return allMilestones.find(m => m.id === targetCategory) || null;
  }, [allMilestones, user.batchCategory]);

  useEffect(() => {
    async function loadSyllabus() {
      if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
        setAllMilestones([]);
        setSyllabusLoading(false);
        return;
      }
      setSyllabusLoading(true);
      try {
        const { data, error } = await supabase
          .from('milestones_data')
          .select('*');

        if (error) {
          console.error("Error fetching milestones:", error.message);
        } else if (data) {
          setAllMilestones(data);
        }
      } catch (err) {
        console.error("Exception loading milestones:", err);
      } finally {
        setSyllabusLoading(false);
      }
    }

    loadSyllabus();

    const milestonesChannel = supabase
      .channel('milestones_road_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestones_data'
        },
        () => {
          console.log("Real-time milestones update inside Milestones Roadmap, reloading...");
          loadSyllabus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(milestonesChannel);
    };
  }, [user.enrolledCourses]);

  const curriculumRoadmap = useMemo(() => {
    const activeCourse = dbCourses[0];
    if (!activeCourse || !dbSyllabus) {
      return null;
    }

    const stages = dbSyllabus.stages || [];
    const totalModules = stages.reduce((acc: number, stage: any) => 
      acc + (stage.modules?.length || 0)
    , 0);

    return {
      title: activeCourse.title,
      subtitle: activeCourse.description || 'Master this program.',
      stages: stages,
      totalModules: totalModules
    };
  }, [dbCourses, dbSyllabus]);

  useEffect(() => {
    async function loadEnrolledCourses() {
      if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
        setDbCourses([]);
        setCoursesLoading(false);
        return;
      }
      setCoursesLoading(true);
      try {
        const data = await fetchCoursesByIds(user.enrolledCourses);
        setDbCourses(data);
      } catch (err) {
        console.error("Failed to load enrolled courses:", err);
      } finally {
        setCoursesLoading(false);
      }
    }

    loadEnrolledCourses();

    // Set up a real-time listener for the courses table changes
    if (user.enrolledCourses && user.enrolledCourses.length > 0) {
      const channel = supabase
        .channel('courses_realtime_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, and DELETE
            schema: 'public',
            table: 'courses'
          },
          (payload) => {
            console.log("Real-time course updates detected. Reloading courses...", payload);
            loadEnrolledCourses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user.enrolledCourses]);

  const learningItems = useMemo(() => {
    // 1. Dynamic Courses from DB
    return dbCourses.map(course => {
      // Map category dynamically based on DB values to support different tabs
      const rawCat = (course.category || '').toLowerCase();
      let category: 'courses' | 'soft_skills' | 'aptitude' | 'portfolio' | 'resume' | 'linkedin' = 'courses';
      let categoryLabel = 'Courses';
      
      if (rawCat.includes('soft') || rawCat.includes('communication')) {
        category = 'soft_skills';
        categoryLabel = 'Communication & Soft Skills';
      } else if (rawCat.includes('aptitude') || rawCat.includes('reasoning')) {
        category = 'aptitude';
        categoryLabel = 'Aptitude & Reasoning';
      } else if (rawCat.includes('resume')) {
        category = 'resume';
        categoryLabel = 'Resume';
      } else if (rawCat.includes('portfolio') || rawCat.includes('capstone')) {
        category = 'portfolio';
        categoryLabel = 'Portfolio';
      } else if (rawCat.includes('linkedin') || rawCat.includes('networking')) {
        category = 'linkedin';
        categoryLabel = 'LinkedIn';
      }

      const batchCategory = user.batchCategory || 'Weekday';
      const targetCategory = course.id === 'crs-1786624019154-w'
        ? (batchCategory === 'Weekend' ? 'ml-python-weekend' : 'ml-python-full-stack')
        : course.id;

      const courseMilestone = allMilestones.find(m => m.id === targetCategory);
      const stages = courseMilestone?.stages || [];
      const lessonsCount = stages.reduce((acc: number, stage: any) => 
        acc + (stage.modules?.reduce((mAcc: number, m: any) => mAcc + (m.lessons?.length || 0), 0) || 0)
      , 0);

      const totalHours = stages.reduce((acc: number, stage: any) => 
        acc + (stage.modules?.reduce((mAcc: number, m: any) => {
          const h = parseInt(m.duration || '0');
          return mAcc + (isNaN(h) ? 0 : h);
        }, 0) || 0)
      , 0);

      let durationStr = '0 hours';
      if (course.id === 'crs-1786624019154-w') {
        durationStr = '163 hours';
      } else if (totalHours > 0) {
        durationStr = `${totalHours} hours`;
      }

      return {
        id: course.id,
        category,
        categoryLabel,
        title: course.title,
        subtitle: course.description || 'Master this program.',
        thumbnail: course.thumbnail || '/python-full-stack.png',
        level: (course.level || 'Intermediate') as 'Beginner' | 'Intermediate' | 'Advanced',
        duration: durationStr,
        lessonsCount: lessonsCount,
        enrolledCount: `${course.enrolled_count || 0} enrolled`,
        rating: course.rating || 5.0,
        progress: (user.courseProgress && user.courseProgress[course.id] !== undefined)
          ? user.courseProgress[course.id]
          : (user.enrolledCourses && user.enrolledCourses[0] === course.id)
          ? (user.progress || 0)
          : 0,
        instructor: {
          name: course.instructor || 'Lead Instructor',
          avatar: '',
          role: 'LMS Specialist'
        },
        actionText: 'Go to Course',
        targetRoute: 'course'
      };
    });
  }, [dbCourses, user.progress, user.courseProgress, user.enrolledCourses, allMilestones, user.batchCategory]);

  const filteredItems = useMemo(() => {
    return learningItems.filter((item) => {
      const matchesTab = activeTab === 'all' || item.category === activeTab;
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                            item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
                            item.categoryLabel.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [learningItems, activeTab, search]);

  return (
    <div className="space-y-6 font-sans pb-12">

      
      {/* Clean Top Header */}
      <div id="tour-learning-header" className="pb-2">
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

          {!curriculumRoadmap ? (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4 max-w-lg mx-auto my-8">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center border border-purple-100 shadow-sm">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">No Roadmap Available</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto">
                  You are not currently enrolled in any curriculum track. Please contact your administrator to get enrolled in a program.
                </p>
              </div>
            </div>
          ) : (
            <>
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
                      <h3 className="font-extrabold text-xl sm:text-2xl text-white/95 leading-snug">
                        {curriculumRoadmap.title}
                      </h3>
                      <p className="text-white/80 text-sm sm:text-base font-medium">
                        {curriculumRoadmap.subtitle}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/20 text-sm font-bold shadow-sm">
                        <Trophy className="w-4 h-4 text-amber-300" />
                        <span>
                          0 / {curriculumRoadmap.totalModules} Modules Completed
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-extrabold text-white">
                      <span>Overall Track Completion</span>
                      <span>0%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-white rounded-full w-[0%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Vertical Stage Timeline Roadmap */}
              <div className="relative pl-12 space-y-8">
                
                {curriculumRoadmap.stages?.map((stage: any, stageIdx: number) => {
                  const isLocked = stageIdx > 0;
                  const isCurrent = stageIdx === 0;

                  return (
                    <div key={stage.id} className={cn("relative group", isLocked && "opacity-70")}>
                      {/* Timeline Dot */}
                      <div className={cn(
                        "absolute -left-[40px] top-8 w-8 h-8 rounded-full border-[3px] flex items-center justify-center z-10",
                        isCurrent ? "bg-white border-[#7c3aed] shadow-[0_0_15px_rgba(124,58,237,0.3)]" : 
                        isLocked ? "bg-slate-50 border-slate-300" : "bg-white border-purple-400 shadow-sm"
                      )}>
                        <div className={cn(
                          "rounded-full",
                          isCurrent ? "w-2.5 h-2.5 bg-[#7c3aed] animate-pulse" : 
                          isLocked ? "w-2.5 h-2.5 bg-slate-300" : "w-2.5 h-2.5 bg-purple-400"
                        )} />
                      </div>

                      {/* Line segment connecting to next stage/node */}
                      <div className="absolute left-[-26px] top-[64px] h-full w-1 bg-purple-200/60 rounded-full z-0" />

                      {/* Stage Card */}
                      <div className={cn(
                        "p-6 rounded-[2rem] border transition-all space-y-4",
                        isLocked ? "bg-slate-50 border-slate-200/80" : "bg-white border-slate-200/90 shadow-md hover:shadow-lg"
                      )}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0",
                              isLocked ? "bg-slate-200 text-slate-500 shadow-none" : "bg-[#7c3aed] text-white"
                            )}>
                              {isLocked ? <Lock className="w-6 h-6" /> : <Brain className="w-6 h-6" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                  isLocked ? "bg-slate-200 text-slate-500" : "bg-purple-50 text-[#7c3aed] border border-purple-100"
                                )}>
                                  STAGE 0{stageIdx + 1}
                                </span>
                                {!isLocked && <span className="text-xs font-semibold text-slate-500">Phase {stageIdx + 1}</span>}
                              </div>
                              <h3 className={cn(
                                "font-extrabold text-lg sm:text-xl mt-0.5",
                                isLocked ? "text-slate-700" : "text-slate-900"
                              )}>
                                {stage.title}
                              </h3>
                            </div>
                          </div>

                          {isCurrent && (
                            <span className="px-3 py-1 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-100 text-xs font-bold flex items-center gap-1.5 w-fit">
                              <span className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse" />
                              IN PROGRESS
                            </span>
                          )}
                          {isLocked && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                              LOCKED
                            </span>
                          )}
                          {!isCurrent && !isLocked && (
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-[#7c3aed] border border-purple-100 text-xs font-bold w-fit">
                              AVAILABLE
                            </span>
                          )}
                        </div>

                        {/* Modules List inside Stage */}
                        {!isLocked && stage.modules && (
                          <div className="pt-2 space-y-3">
                            {stage.modules.map((mod: any, modIdx: number) => {
                              const videos = mod.lessons?.filter((l: any) => !!l.video).length || 0;
                              const practices = mod.lessons?.filter((l: any) => !!l.practice).length || 0;
                              const assessments = mod.lessons?.filter((l: any) => !!l.assessment).length || 0;
                              const coding = 0; // We merged coding into practices for now

                              // A module is locked if any previous module has incomplete lessons
                              const isModLocked = modIdx > 0 && stage.modules.slice(0, modIdx).some((prevMod: any) => prevMod.lessons?.some((l: any) => !l.completed));

                              return (
                                <button
                                  key={mod.id}
                                  disabled={isModLocked}
                                  onClick={() => { 
                                    if(!isModLocked) {
                                      setSelectedTopicDrawer(mod); 
                                      if (mod.lessons?.[0]) setActiveAccordion(mod.lessons[0].id);
                                    }
                                  }}
                                  className={cn(
                                    "w-full sm:w-[500px] p-4 rounded-2xl border shadow-sm flex items-center justify-between transition-all group/btn",
                                    isModLocked 
                                      ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                                      : "bg-white hover:bg-slate-50 text-slate-900 hover:shadow-md active:scale-95 border-slate-200"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                                      isModLocked ? "bg-slate-200 border-slate-300" : "bg-purple-50 border-purple-100"
                                    )}>
                                      <Layers className={cn("w-5 h-5", isModLocked ? "text-slate-400" : "text-[#7c3aed]")} />
                                    </div>
                                    <div className="text-left">
                                      <h4 className={cn("font-extrabold text-sm leading-tight transition-colors", isModLocked ? "text-slate-500" : "text-slate-900 group-hover/btn:text-[#7c3aed]")}>
                                        {mod.title}
                                      </h4>
                                      <div className={cn("flex items-center gap-2 mt-1 flex-wrap", isModLocked && "opacity-60")}>
                                        {videos > 0 && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1"><Video className="w-3 h-3"/> {videos} Video{videos > 1 ? 's' : ''}</span>}
                                        {coding > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50 flex items-center gap-1"><Code2 className="w-3 h-3"/> {coding} Coding</span>}
                                        {practices > 0 && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/50 flex items-center gap-1"><Terminal className="w-3 h-3"/> {practices} Practice{practices > 1 ? 's' : ''}</span>}
                                        {assessments > 0 && <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100/50 flex items-center gap-1"><ClipboardCheck className="w-3 h-3"/> {assessments} Quiz</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                    isModLocked ? "bg-slate-200" : "bg-slate-100 group-hover/btn:bg-purple-100"
                                  )}>
                                    {isModLocked ? (
                                      <Lock className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover/btn:text-[#7c3aed]" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Final Celebration Node */}
                <div className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[40px] top-8 w-8 h-8 rounded-full border-[3px] bg-amber-50 border-amber-300 flex items-center justify-center z-10 shadow-sm">
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>

                  {/* Stage Card */}
                  <div className="p-6 rounded-[2rem] border bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-white shadow-lg space-y-4 opacity-50 grayscale transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30 text-white shadow-xs">
                              COURSE COMPLETION
                            </span>
                          </div>
                          <h3 className="font-extrabold text-lg sm:text-xl mt-0.5 text-white">
                            {curriculumRoadmap.title} Certification
                          </h3>
                          <p className="text-sm font-medium text-white/90 mt-1">
                            Complete all modules and assignments to unlock your verified certificate.
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-black/10 border border-white/20 text-white text-xs font-bold w-fit shadow-xs">
                        LOCKED
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      )}

      {/* ════════ TAB 2: MY LEARNING CATEGORY TABS & CARDS ════════ */}
      {route === 'learning' && (
        <div className="space-y-6 animate-fade-in">
          
          {learningItems.length === 0 ? (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4 max-w-lg mx-auto my-8">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center border border-purple-100 shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">No Enrolled Courses</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto">
                  You are not currently enrolled in any courses or programs. Please contact your administrator to get enrolled in a batch.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* CATEGORY PILL TABS BAR */}
              {learningItems.length > 1 && (
                <div id="tour-learning-filters" className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200/80">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'courses', label: 'Courses' },
                    { id: 'soft_skills', label: 'Communication & Soft Skills' },
                    { id: 'aptitude', label: 'Aptitude & Reasoning' },
                    { id: 'resume', label: 'Resume' },
                    { id: 'portfolio', label: 'Portfolio' },
                    { id: 'linkedin', label: 'LinkedIn' },
                  ].filter(tab => {
                    if (tab.id === 'all') return true;
                    return learningItems.some(item => item.category === tab.id);
                  }).map((tab) => {
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
              )}

              {/* SEARCH & VIEW SWITCHER ROW */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div id="tour-learning-search" className="w-full sm:w-80">
                  <SearchInput value={search} onChange={setSearch} placeholder="Search learning modules..." className="w-full" />
                </div>
                
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
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                  <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No matching modules</h4>
                  <p className="text-xs text-slate-500 mt-1">Try checking your search spelling or filters.</p>
                </div>
              ) : (
                <div className={cn("grid gap-6", view === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
                  {filteredItems.map((item, index) => {
                    const levelBg = item.level === 'Beginner' ? 'bg-[#f0fdf4] text-[#15803d] border-emerald-200/80' :
                                    item.level === 'Intermediate' ? 'bg-[#fffbeb] text-[#b45309] border-amber-200/80' :
                                    'bg-[#fff1f2] text-[#be123c] border-rose-200/80';

                    const isLocked = false; // All unlocked

                    return (
                      <div
                        key={item.id}
                        id={index === 0 ? 'tour-learning-course-0' : undefined}
                        onClick={() => {
                          if (isLocked) {
                            setLockedToast(true);
                            setTimeout(() => setLockedToast(false), 3000);
                            return;
                          }
                          if (item.targetRoute) navigate(item.targetRoute as any, { id: item.id });
                        }}
                        className={cn(
                          "relative overflow-hidden rounded-[1.8rem] bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 group flex justify-between",
                          view === 'grid' ? "flex-col" : "flex-col sm:flex-row items-stretch h-auto sm:h-52",
                          isLocked ? "cursor-not-allowed opacity-90 grayscale-[15%]" : "cursor-pointer"
                        )}
                      >
                        {/* Thumbnail Banner */}
                        <div className={cn("relative overflow-hidden shrink-0 bg-slate-900", view === 'grid' ? "h-48 w-full" : "h-48 sm:h-full w-full sm:w-72")}>
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          
                          {/* Category Badges */}
                          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                            <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-900 text-xs font-extrabold shadow-sm border border-slate-200/60">
                              {item.categoryLabel}
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

                            <span className={cn("text-xs font-extrabold transition-transform flex items-center gap-1", isLocked ? "text-slate-400" : "text-[#7c3aed] group-hover:translate-x-0.5")}>
                              {isLocked ? <><Lock className="w-3.5 h-3.5 mb-0.5"/> Coming Soon</> : <>{item.actionText} →</>}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}


      {/* ════════ DYNAMIC TOPIC CATALOG SIDE DRAWER / MODAL ════════ */}
      {selectedTopicDrawer && (() => {
        const mod = selectedTopicDrawer;

        return createPortal(
          <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTopicDrawer(null); }}>
            <div className="w-full max-w-lg bg-white h-[100dvh] shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-left font-sans cursor-default">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">
                    {mod.title}
                  </h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-[#3b52a4] text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                    MODULE DETAILS
                  </span>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Complete all lessons, practices, and assessments in this module to proceed to the next stage of your curriculum.
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
                  <span>{mod.lessons?.length || 0} items</span>
                </div>

                <div className="space-y-3">
                  {mod.lessons?.map((lesson: any, idx: number) => {
                    const isLessonLocked = idx > 0 && mod.lessons.slice(0, idx).some((l: any) => !l.completed);
                    const isExpanded = activeAccordion === lesson.id;

                    return (
                      <div key={lesson.id} className={cn("rounded-2xl border transition-all overflow-hidden bg-white", 
                        isLessonLocked ? "border-slate-100 opacity-75" : 
                        isExpanded ? "border-purple-200 shadow-md ring-4 ring-purple-50/50" : "border-slate-200 shadow-sm hover:border-purple-200 hover:shadow-md"
                      )}>
                        <button
                          onClick={() => { if(!isLessonLocked) setActiveAccordion(isExpanded ? null : lesson.id); }}
                          disabled={isLessonLocked}
                          className={cn("w-full p-4 flex items-center justify-between text-left transition-colors", isExpanded && !isLessonLocked ? "bg-purple-50/30" : "hover:bg-slate-50")}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", isLessonLocked ? "bg-slate-200 text-slate-400" : isExpanded ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/20" : "bg-purple-100 text-[#7c3aed]")}>
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className={cn("font-bold text-sm leading-tight pr-4 transition-colors", isLessonLocked ? "text-slate-500" : isExpanded ? "text-[#7c3aed]" : "text-slate-900")}>
                                {lesson.title}
                              </h4>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {isLessonLocked ? (
                              <Lock className="w-4 h-4 text-slate-400" />
                            ) : (
                              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-colors", isExpanded ? "bg-purple-100" : "bg-slate-100")}>
                                <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded ? "text-[#7c3aed] rotate-180" : "text-slate-500")} />
                              </div>
                            )}
                          </div>
                        </button>

                        {isExpanded && !isLessonLocked && (
                          <div className="p-3 pt-4 space-y-3 bg-slate-50 border-t border-purple-100/50">
                            {/* VIDEO ITEM */}
                            {lesson.video && (
                              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20">
                                    <Video className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-extrabold uppercase text-[#7c3aed] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                      VIDEO LESSON
                                    </span>
                                    <h4 className="font-bold text-slate-900 text-sm mt-1 leading-tight">{lesson.title}</h4>
                                    <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" /> {lesson.video.duration}
                                    </span>
                                  </div>
                                </div>
                                <button onClick={() => { setSelectedTopicDrawer(null); navigate('lesson'); }} className="px-3.5 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-md shadow-purple-500/20 flex items-center gap-1 active:scale-95 transition-all">
                                  <span>WATCH</span><ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* PRACTICE ITEM */}
                            {lesson.practice && (
                              <div className={cn("p-3 rounded-xl bg-white border border-slate-200 shadow-sm transition-all flex items-center justify-between gap-3", !lesson.video?.completed ? "opacity-60" : "hover:shadow-md hover:border-purple-200")}>
                                <div className="flex items-start gap-3">
                                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", !lesson.video?.completed ? "bg-slate-200 text-slate-400" : "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/20")}>
                                    {!lesson.video?.completed ? <Lock className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <span className={cn("text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border", !lesson.video?.completed ? "text-slate-500 bg-slate-100 border-slate-200" : "text-amber-600 bg-amber-50 border-amber-100")}>
                                      PRACTICAL LAB
                                    </span>
                                    <h4 className={cn("font-bold text-sm mt-1 leading-tight", !lesson.video?.completed ? "text-slate-500" : "text-slate-900")}>{lesson.title} Practice</h4>
                                    <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" /> {lesson.practice.duration}
                                    </span>
                                  </div>
                                </div>
                                <button 
                                  disabled={!lesson.video?.completed}
                                  onClick={() => { setSelectedTopicDrawer(null); navigate('practice'); }} 
                                  className={cn("px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all", !lesson.video?.completed ? "bg-slate-100 text-slate-400 shadow-none" : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 active:scale-95")}
                                >
                                  <span>{!lesson.video?.completed ? 'LOCKED' : 'SOLVE'}</span>
                                  {!lesson.video?.completed ? <Lock className="w-3 h-3"/> : <ExternalLink className="w-3 h-3" />}
                                </button>
                              </div>
                            )}

                            {/* ASSESSMENT ITEM */}
                            {lesson.assessment && (
                              <div className={cn("p-3 rounded-xl bg-white border border-slate-200 shadow-sm transition-all flex items-center justify-between gap-3", !(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice)) ? "opacity-60" : "hover:shadow-md hover:border-purple-200")}>
                                <div className="flex items-start gap-3">
                                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", !(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice)) ? "bg-slate-200 text-slate-400" : "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-500/20")}>
                                    {!(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice)) ? <Lock className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <span className={cn("text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border", !(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice)) ? "text-slate-500 bg-slate-100 border-slate-200" : "text-primary-600 bg-primary-50 border-primary-100")}>
                                      ASSESSMENT
                                    </span>
                                    <h4 className={cn("font-bold text-sm mt-1 leading-tight", !(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice)) ? "text-slate-500" : "text-slate-900")}>{lesson.title} Quiz</h4>
                                    <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" /> {lesson.assessment.duration}
                                    </span>
                                  </div>
                                </div>
                                <button 
                                  disabled={!(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice))}
                                  onClick={() => { setSelectedTopicDrawer(null); navigate('assignments'); }} 
                                  className={cn("px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all", !(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice)) ? "bg-slate-100 text-slate-400 shadow-none" : "bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/20 active:scale-95")}
                                >
                                  <span>{!(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice)) ? 'LOCKED' : 'TAKE'}</span>
                                  {!(lesson.practice?.completed || (lesson.video?.completed && !lesson.practice)) ? <Lock className="w-3 h-3"/> : <ExternalLink className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>


            </div>
          </div>,
          document.body
        );
      })()}

      {/* ════════ CUSTOM TOAST NOTIFICATION ════════ */}
      {lockedToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up pointer-events-none">
          <div className="flex items-center gap-4 px-5 py-3.5 bg-[#090b14]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 shrink-0 shadow-inner">
              <Lock className="w-5 h-5 text-purple-300" />
            </div>
            <div className="pr-2">
              <h4 className="font-black text-sm text-slate-50 tracking-wide uppercase">Coming Soon</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">This module is currently locked.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
