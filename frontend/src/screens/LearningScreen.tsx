import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, ChevronRight, Download, Eye, Heart, Layers, Play, Star, BookOpen, Clock, Brain, Lock, X, ChevronDown, Video, ExternalLink, Code2, ClipboardCheck, Zap, Trophy, TrendingUp, Search, Users, Filter, Grid3x3, List, MapPin, CheckCircle2, Sparkles, Terminal, FolderOpen, Loader2
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/UserContext';
import { fetchCoursesByIds } from '@/lib/api';
import { getLessonResolver, clearLessonResolverCache } from '@/lib/lessonLinkResolver';
import { fetchCompletedLessons } from '@/lib/api';
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
  const [localUnlockedLessonIds, setLocalUnlockedLessonIds] = useState<string[]>(user?.unlockedLessonIds || []);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.unlockedLessonIds) {
      setLocalUnlockedLessonIds(user.unlockedLessonIds);
    }
  }, [user?.unlockedLessonIds]);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'soft_skills' | 'aptitude' | 'portfolio' | 'resume' | 'linkedin'>('all');
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedTopicDrawer, setSelectedTopicDrawer] = useState<any | null>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(0);
  const [lockedToast, setLockedToast] = useState(false);
  const [dbCourses, setDbCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [dbSyllabi, setDbSyllabi] = useState<Record<string, any>>({});
  const [syllabusLoading, setSyllabusLoading] = useState(true);
  // Bumped by the realtime channel to force a syllabus re-fetch when admin edits content.
  const [reloadKey, setReloadKey] = useState(0);

  const dbSyllabus = useMemo(() => {
    const firstCourseId = user.enrolledCourses?.[0] || 'crs-1786624019154-w';
    return dbSyllabi[firstCourseId] || null;
  }, [dbSyllabi, user.enrolledCourses]);



  useEffect(() => {
    async function loadSyllabi() {
      if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
        setDbSyllabi({});
        setSyllabusLoading(false);
        return;
      }
      setSyllabusLoading(true);
      try {
        const syllabiMap: Record<string, any> = {};
        // Bridge Scheme A entity links (l_git_1) -> Scheme B lesson ids (lesson-…) so
        // assessments/projects nest under the correct lesson in the tree.
        const resolver = await getLessonResolver(user.enrolledCourses, user.batchCode || '');

        // The student's completed videos + coursework → drives the milestone completion ticks & progress.
        const [aaRes, qaRes, psRes, doneLessons] = await Promise.all([
          supabase.from('assessment_attempts').select('assignment_id').eq('student_id', user.id),
          supabase.from('quiz_attempts').select('quiz_id').eq('user_id', user.id),
          supabase.from('practice_submissions').select('problem_id').eq('student_id', user.id),
          fetchCompletedLessons(user.id),
        ]);
        const doneAssess = new Set((aaRes.data || []).map((r: any) => r.assignment_id));
        const doneQuiz = new Set((qaRes.data || []).map((r: any) => r.quiz_id));
        const donePractice = new Set((psRes.data || []).map((r: any) => r.problem_id));

        await Promise.all(user.enrolledCourses.map(async (courseId) => {
          const [
            { data: topics },
            { data: lessons },
            { data: assessments },
            { data: codingQuestions },
            { data: projects },
            { data: quizzes }
          ] = await Promise.all([
            supabase.from('course_topics').select('*').eq('course_id', courseId).order('id', { ascending: true }),
            supabase.from('course_lessons').select('*').eq('course_id', courseId).order('sort_order', { ascending: true }),
            supabase.from('assessments').select('id, topic_id, duration_minutes, title').eq('course_id', courseId),
            supabase.from('coding_questions').select('id, inner_topic_id, title').eq('course_id', courseId),
            supabase.from('projects').select('id, inner_topic_id, title, type').eq('course_id', courseId),
            supabase.from('quizzes').select('id, inner_topic_id, duration_minutes, title').eq('course_id', courseId)
          ]);

          if (topics && lessons) {
            const stages = topics.map(topic => {
              const subtopics = topic.subtopics || [];
              return {
                id: topic.id,
                title: topic.title,
                modules: subtopics.map((sub: any) => {
                  const moduleLessons = lessons.filter((l: any) => l.module_id === sub.id);
                  return {
                    id: sub.id,
                    title: sub.title,
                    duration: sub.durationHours || sub.duration || '5h',
                    lessons: moduleLessons.map((l: any, idx: number) => {
                      const dbPractices = codingQuestions
                        ? codingQuestions.filter((cq: any) => resolver.resolveLessonId(cq.inner_topic_id) === l.id)
                        : [];
                      const dbAssessments = assessments
                        ? assessments.filter((asmnt: any) => {
                            const parts = asmnt.topic_id ? asmnt.topic_id.split('||') : [];
                            return resolver.resolveLessonId(parts[2]) === l.id;
                          })
                        : [];
                      const dbProjects = projects
                        ? projects.filter((p: any) => resolver.resolveLessonId(p.inner_topic_id) === l.id)
                        : [];
                      const dbQuizzes = quizzes
                        ? quizzes.filter((q: any) => resolver.resolveLessonId(q.inner_topic_id) === l.id)
                        : [];

                      const practices = dbPractices.map((cq: any) => ({
                        id: cq.id, title: cq.title, duration: '20m', completed: donePractice.has(cq.id)
                      }));
                      const lessonAssessments = dbAssessments.map((asmnt: any) => ({
                        id: asmnt.id, title: asmnt.title, duration: `${asmnt.duration_minutes || 15}m`, completed: doneAssess.has(asmnt.id)
                      }));
                      const lessonProjects = dbProjects.map((p: any) => ({
                        id: p.id, title: p.title, type: p.type || 'mini', completed: donePractice.has(p.id)
                      }));
                      const lessonQuizzes = dbQuizzes.map((q: any) => ({
                        id: q.id, title: q.title, duration: `${q.duration_minutes || 30}m`, completed: doneQuiz.has(q.id)
                      }));
                      // A lesson is complete when its video is marked done AND all its coursework is done.
                      const videoCompleted = doneLessons.has(l.id);
                      const items = [...practices, ...lessonAssessments, ...lessonProjects, ...lessonQuizzes];
                      const lessonCompleted = videoCompleted && items.every((it: any) => it.completed);

                      return {
                        id: l.id,
                        title: l.title,
                        description: l.description,
                        completed: lessonCompleted,
                        videoCompleted,
                        coverTopics: resolver.getCoverTopics(l.id),
                        video: {
                          preview: idx === 0, // Unlock state is checked at render time via localUnlockedLessonIds
                          duration: '45m',
                          completed: videoCompleted
                        },
                        practices,
                        assessments: lessonAssessments,
                        projects: lessonProjects,
                        quizzes: lessonQuizzes
                      };
                    })
                  };
                })
              };
            });
            syllabiMap[courseId] = { id: courseId, stages };
          }
        }));
        setDbSyllabi(syllabiMap);
      } catch (err) {
        console.error("Exception loading syllabi from DB:", err);
      } finally {
        setSyllabusLoading(false);
      }
    }

    loadSyllabi();
  // NOTE: localUnlockedLessonIds was intentionally removed from this dependency array.
  // Including it caused an infinite re-fetch loop: loadSyllabi → real-time channel fires
  // → setLocalUnlockedLessonIds → re-triggers loadSyllabi → repeat forever.
  // The video.preview field that uses it will update on the next natural re-render.
  // reloadKey is bumped by the realtime channel to re-fetch on admin content edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.enrolledCourses, reloadKey]);

  const curriculumRoadmap = useMemo(() => {
    const activeCourse = dbCourses[0];
    if (!activeCourse || !dbSyllabus) {
      return null;
    }

    const stages = dbSyllabus.stages || [];
    const allModules = stages.flatMap((stage: any) => stage.modules || []);
    const totalModules = allModules.length;

    // Live, self-recalculating progress from the syllabus item completion flags.
    let totalItems = 0, doneItems = 0, completedModules = 0;
    for (const mod of allModules) {
      const lessons = mod.lessons || [];
      let moduleAllDone = lessons.length > 0;
      for (const l of lessons) {
        // The video lesson itself is one unit …
        totalItems += 1;
        if (l.videoCompleted) doneItems += 1;
        // … plus each coursework item.
        const items = [...(l.practices || []), ...(l.assessments || []), ...(l.quizzes || []), ...(l.projects || [])];
        totalItems += items.length;
        doneItems += items.filter((it: any) => it.completed).length;
        if (!l.completed) moduleAllDone = false;
      }
      if (moduleAllDone) completedModules += 1;
    }
    const overallPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    return {
      title: activeCourse.title,
      subtitle: activeCourse.description || 'Master this program.',
      stages: stages,
      totalModules,
      completedModules,
      overallPct
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.enrolledCourses, reloadKey]);

  // ── Realtime: when admin edits course content or live-session topics, invalidate the resolver
  //    cache and re-fetch the syllabus so MyLearning / Milestones update live. One debounced channel. ──
  useEffect(() => {
    if (!user.enrolledCourses || user.enrolledCourses.length === 0) return;
    let timer: any = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        clearLessonResolverCache();
        setReloadKey((k) => k + 1);
      }, 600);
    };
    const channel = supabase.channel('learning_content_realtime');
    // Admin content (edits are rare) — watched unfiltered.
    ['live_sessions', 'course_lessons', 'course_topics', 'assessments', 'quizzes', 'projects', 'coding_questions', 'milestones_data']
      .forEach((table) => channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump));
    // The student's OWN completions — filtered by student so one student's submission never re-fetches
    // every other student's syllabus (avoids a realtime thundering herd at scale).
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_attempts', filter: `student_id=eq.${user.id}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts', filter: `user_id=eq.${user.id}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_submissions', filter: `student_id=eq.${user.id}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress', filter: `student_id=eq.${user.id}` }, bump);
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.enrolledCourses?.join(','), user.id]);

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

      const courseSyllabus = dbSyllabi[course.id];
      const stages = courseSyllabus?.stages || [];
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
  }, [dbCourses, user.progress, user.courseProgress, user.enrolledCourses, dbSyllabi]);

  const filteredItems = useMemo(() => {
    return learningItems.filter((item) => {
      const matchesTab = activeTab === 'all' || item.category === activeTab;
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                            item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
                            item.categoryLabel.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [learningItems, activeTab, search]);

  if (coursesLoading || syllabusLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 font-sans">
        <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Loading roadmap details...</p>
      </div>
    );
  }

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
                          {curriculumRoadmap.completedModules} / {curriculumRoadmap.totalModules} Modules Completed
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-extrabold text-white">
                      <span>Overall Track Completion</span>
                      <span>{curriculumRoadmap.overallPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${curriculumRoadmap.overallPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Vertical Stage Timeline Roadmap */}
              <div className="relative pl-12 space-y-8">
                
                {curriculumRoadmap.stages?.map((stage: any, stageIdx: number) => {
                  const isLocked = false;
                  const firstUnlockedStageIdx = curriculumRoadmap.stages?.findIndex((s: any) => 
                    s.modules?.some((m: any) => m.lessons?.some((l: any) => localUnlockedLessonIds.includes(l.id)))
                  );
                  const isCurrent = (firstUnlockedStageIdx === -1) ? (stageIdx === 0) : (stageIdx === firstUnlockedStageIdx);

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
                      {(() => {
                        const isStageExpanded = expandedStages[stage.id] !== undefined 
                          ? expandedStages[stage.id] 
                          : isCurrent;

                        return (
                          <div className="p-6 rounded-[2rem] border transition-all space-y-4 bg-white border-slate-200/90 shadow-md hover:shadow-lg">
                            {/* Interactive Header Toggler */}
                            <div 
                              onClick={() => {
                                setExpandedStages(prev => ({
                                  ...prev,
                                  [stage.id]: !isStageExpanded
                                }));
                              }}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none group/stage"
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 bg-[#7c3aed] text-white">
                                  <Brain className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-50 text-[#7c3aed] border border-purple-100">
                                      STAGE 0{stageIdx + 1}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">Phase {stageIdx + 1}</span>
                                  </div>
                                  <h3 className="font-extrabold text-lg sm:text-xl mt-0.5 text-slate-900 group-hover/stage:text-[#7c3aed] transition-colors">
                                    {stage.title}
                                  </h3>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-full bg-slate-100 text-[#7c3aed] border border-purple-100 text-xs font-bold w-fit">
                                  AVAILABLE
                                </span>
                                <div className={cn("w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 transition-transform duration-300", isStageExpanded && "rotate-180")}>
                                  <ChevronDown className="w-4 h-4 text-slate-500" />
                                </div>
                              </div>
                            </div>

                            {/* Modules List inside Stage */}
                            {isStageExpanded && stage.modules && (
                              <div className="pt-2 space-y-3">
                            {stage.modules.map((mod: any, modIdx: number) => {
                              const videos = mod.lessons?.filter((l: any) => !!l.video).length || 0;
                              const practices = mod.lessons?.filter((l: any) => !!l.practice).length || 0;
                              const assessments = mod.lessons?.filter((l: any) => !!l.assessment).length || 0;
                              const coding = 0; // We merged coding into practices for now

                              const isModLocked = !mod.lessons?.some((l: any) => localUnlockedLessonIds.includes(l.id));

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
                    );
                  })()}
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
                          <img src={item.thumbnail} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95" />
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
                    const isLessonLocked = !localUnlockedLessonIds.includes(lesson.id);
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
                            {/* CLASS TOPICS & SYLLABUS COVERED */}
                            {lesson.coverTopics && lesson.coverTopics.length > 0 && (
                              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2.5">
                                  <BookOpen className="w-4 h-4 text-[#7c3aed]" />
                                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-700">
                                    Class Topics & Syllabus Covered ({lesson.coverTopics.length} Topic{lesson.coverTopics.length > 1 ? 's' : ''})
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {lesson.coverTopics.map((topic: any, tIdx: number) => (
                                    <div key={tIdx} className="flex items-start gap-2.5">
                                      <span className="w-5 h-5 rounded-md bg-purple-100 text-[#7c3aed] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                        {tIdx + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <h5 className="font-bold text-slate-800 text-xs leading-snug">{topic.title}</h5>
                                        {topic.agenda && (
                                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{topic.agenda}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

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
                                <div className="flex items-center gap-2 shrink-0">
                                  {lesson.videoCompleted && (
                                    <span className="px-2 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle2 className="w-4 h-4" /> Done
                                    </span>
                                  )}
                                  <button onClick={() => { setSelectedTopicDrawer(null); navigate('lesson', { id: user.enrolledCourses?.[0] || '', lesson: lesson.id }); }} className="px-3.5 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-md shadow-purple-500/20 flex items-center gap-1 active:scale-95 transition-all">
                                    <span>WATCH</span><ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}

                             {/* PRACTICE ITEMS */}
                             {lesson.practices && lesson.practices.map((practice: any) => (
                               <div key={practice.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm transition-all flex items-center justify-between gap-3 hover:shadow-md hover:border-purple-200">
                                 <div className="flex items-start gap-3">
                                   <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/20">
                                     <Code2 className="w-4 h-4" />
                                   </div>
                                   <div>
                                     <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border text-amber-600 bg-amber-50 border-amber-100">
                                       PRACTICAL LAB
                                     </span>
                                     <h4 className="font-bold text-sm mt-1 leading-tight text-slate-900">{practice.title}</h4>
                                     <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                                       <Clock className="w-3 h-3" /> {practice.duration}
                                     </span>
                                   </div>
                                 </div>
                                 {practice.completed ? (
                                   <span className="px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                     <CheckCircle2 className="w-4 h-4" /> Done
                                   </span>
                                 ) : (
                                 <button
                                   onClick={() => { setSelectedTopicDrawer(null); navigate('practice'); }}
                                   className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 active:scale-95"
                                 >
                                   <span>SOLVE</span>
                                   <ExternalLink className="w-3 h-3" />
                                 </button>
                                 )}
                               </div>
                             ))}

                             {/* ASSESSMENT ITEMS */}
                             {lesson.assessments && lesson.assessments.map((assessment: any) => (
                               <div key={assessment.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm transition-all flex items-center justify-between gap-3 hover:shadow-md hover:border-purple-200">
                                 <div className="flex items-start gap-3">
                                   <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-500/20">
                                     <ClipboardCheck className="w-4 h-4" />
                                   </div>
                                   <div>
                                     <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border text-primary-600 bg-primary-50 border-primary-100">
                                       ASSESSMENT
                                     </span>
                                     <h4 className="font-bold text-sm mt-1 leading-tight text-slate-900">{assessment.title}</h4>
                                     <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                                       <Clock className="w-3 h-3" /> {assessment.duration}
                                     </span>
                                   </div>
                                 </div>
                                 {assessment.completed ? (
                                   <span className="px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                     <CheckCircle2 className="w-4 h-4" /> Done
                                   </span>
                                 ) : (
                                 <button
                                   onClick={() => { setSelectedTopicDrawer(null); navigate('assignments'); }}
                                   className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/20 active:scale-95"
                                 >
                                   <span>TAKE</span>
                                   <ExternalLink className="w-3 h-3" />
                                 </button>
                                 )}
                               </div>
                             ))}

                              {/* QUIZ ITEMS */}
                              {lesson.quizzes && lesson.quizzes.map((quiz: any) => (
                                <div key={quiz.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm transition-all flex items-center justify-between gap-3 hover:shadow-md hover:border-purple-200">
                                  <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/20">
                                      <ClipboardCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border text-indigo-600 bg-indigo-50 border-indigo-100">
                                        QUIZ
                                      </span>
                                      <h4 className="font-bold text-sm mt-1 leading-tight text-slate-900">{quiz.title}</h4>
                                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" /> {quiz.duration}
                                      </span>
                                    </div>
                                  </div>
                                  {quiz.completed ? (
                                    <span className="px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                      <CheckCircle2 className="w-4 h-4" /> Done
                                    </span>
                                  ) : (
                                  <button
                                    onClick={() => { setSelectedTopicDrawer(null); navigate('quizzes'); }}
                                    className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                                  >
                                    <span>TAKE</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                  )}
                                </div>
                              ))}

                             {/* PROJECT ITEMS */}
                             {lesson.projects && lesson.projects.map((proj: any) => (
                               <div key={proj.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm transition-all flex items-center justify-between gap-3 hover:shadow-md hover:border-purple-200">
                                 <div className="flex items-start gap-3">
                                   <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20">
                                     <FolderOpen className="w-4 h-4" />
                                   </div>
                                   <div>
                                     <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border text-emerald-600 bg-emerald-50 border-emerald-100">
                                       PROJECT
                                     </span>
                                     <h4 className="font-bold text-sm mt-1 leading-tight text-slate-900">{proj.title}</h4>
                                     <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                                       <Clock className="w-3 h-3" /> Submission Required
                                     </span>
                                   </div>
                                 </div>
                                 <button 
                                   onClick={() => {
                                     setSelectedTopicDrawer(null);
                                     const pType = (proj.type || 'mini').toLowerCase();
                                     navigate('projects', { tab: pType, id: proj.id });
                                   }} 
                                   className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 active:scale-95"
                                 >
                                   <span>VIEW</span>
                                   <ExternalLink className="w-3 h-3" />
                                 </button>
                                </div>
                             ))}
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
