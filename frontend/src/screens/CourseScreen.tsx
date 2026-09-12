import { useState, useEffect, useMemo } from 'react';
import {
  Play, Star, Clock, BookOpen, Users, ChevronRight, CheckCircle2,
  Lock, FileText, Code2, ClipboardCheck, FolderGit2, MessageCircle,
  Download, Share2, Heart, Award, ChevronUp, ChevronDown, Check
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { fetchResources, fetchBatchStudentCount, fetchCompletedLessons } from '@/lib/api';
import { usePreload } from '@/lib/PreloadContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { DifficultyBadge } from '@/components/ui/StatusChip';
import { AccordionItem } from '@/components/ui/Accordion';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/UserContext';
import { supabase } from '@/lib/supabase';
import { clearLessonResolverCache } from '@/lib/lessonLinkResolver';

const lessonIcons: Record<string, any> = {
  video: Play, reading: FileText, quiz: ClipboardCheck, project: FolderGit2,
};

function ModuleAccordion({ 
  mod, 
  course, 
  navigate, 
  isOpen, 
  onToggle, 
  completedLessonIds 
}: { 
  mod: any, 
  course: any, 
  navigate: any, 
  isOpen: boolean, 
  onToggle: () => void,
  completedLessonIds?: Set<string>
}) {
  const { user } = useUser();
  const allLessons = course.stages ? course.stages.flatMap((s: any) => s.modules.flatMap((m: any) => m.lessons)) : [];
  const completedCount = Math.round((allLessons.length * (course.progress || 0)) / 100);

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-2 sm:p-3 shadow-2xs">
      <button 
        onClick={onToggle}
        className={cn(
          "w-full flex justify-between items-center px-3 py-3.5 text-left cursor-pointer rounded-xl transition-all duration-300 group",
          isOpen ? "bg-purple-50/50 shadow-inner" : "hover:bg-slate-50"
        )}
      >
        <h4 className={cn("font-extrabold text-[15px] transition-colors", isOpen ? "text-[#7c3aed]" : "text-slate-800 group-hover:text-[#7c3aed]")}>{mod.title}</h4>
        <div className="flex items-center gap-3">
          {mod.duration && <span className={cn("text-[11px] font-extrabold px-2.5 py-1 rounded-md transition-colors", isOpen ? "bg-white text-purple-600 shadow-sm" : "bg-slate-100 text-slate-500")}>{mod.duration}</span>}
          {isOpen ? <ChevronUp className="w-4 h-4 text-[#7c3aed]" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-[#7c3aed]" />}
        </div>
      </button>
      {isOpen && (
        <div className="space-y-2 pt-3 mt-1 pb-1 animate-fade-in pl-1">
          {mod.lessons.map((lesson: any, idx: number) => {
            const Icon = Play;
            const isPreview = lesson.video?.preview || lesson.preview;
            const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id);
            const hasRealCompletions = Boolean(completedLessonIds && completedLessonIds.size > 0);
            const isCompleted = Boolean(
              completedLessonIds?.has(lesson.id) ||
              completedLessonIds?.has(String(lesson.id || '').trim()) ||
              lesson.completed ||
              lesson.videoCompleted ||
              (!hasRealCompletions && globalIdx < completedCount && globalIdx !== -1)
            );
            const isLessonLocked = !user?.unlockedLessonIds?.includes(lesson.id);
            
            return (
              <button
                key={lesson.id}
                onClick={(e) => {
                  if (isLessonLocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  navigate('lesson', { id: course.id, lesson: lesson.id });
                }}
                className={cn(
                  "w-full flex items-center gap-3.5 p-3 rounded-xl border border-transparent transition-all duration-200 group/lesson text-left relative overflow-hidden",
                  isLessonLocked
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-white hover:shadow-md hover:border-purple-100/50 hover:-translate-y-0.5 cursor-pointer z-10"
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                  isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-[#7c3aed] border border-purple-100',
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  ) : isPreview ? (
                    <Play className="w-4 h-4 text-[#7c3aed]" />
                  ) : (
                    <Icon className="w-4 h-4 text-[#7c3aed]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold', isCompleted ? 'text-slate-500' : 'text-slate-900 group-hover/lesson:text-[#7c3aed] transition-colors')}>{lesson.title}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{lesson.video?.duration || lesson.duration} · Video Lesson</p>
                </div>
                {isLessonLocked && <Lock className="w-4 h-4 text-slate-300 ml-auto" />}
                {isPreview && !isCompleted && <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white text-[10px] font-black uppercase tracking-wider shadow-sm ml-auto">Preview</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CourseScreen() {
  const { navigate, params } = useNav();
  const { user } = useUser();
  const preload = usePreload();
  const [tab, setTab] = useState('modules');
  // Stages and modules both start CLOSED — the student expands what they want to see.
  const [openStageIndex, setOpenStageIndex] = useState<number | null>(null);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const [dbCourse, setDbCourse] = useState<any>(null);
  const [dbSyllabus, setDbSyllabus] = useState<any>(null);
  const [courseDataLists, setCourseDataLists] = useState<{ topics: any[], lessons: any[] }>({ topics: [], lessons: [] });
  const [loading, setLoading] = useState(true);
  // Bumped by the realtime channel to re-fetch this course's syllabus on admin edits.
  const [reloadKey, setReloadKey] = useState(0);

  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(() => preload.completedLessons || new Set());

  // Keep in sync with preload context
  useEffect(() => {
    if (preload.completedLessons && preload.completedLessons.size > 0) {
      setCompletedLessonIds(preload.completedLessons);
    }
  }, [preload.completedLessons]);

  // Load completed lessons directly from database for the logged-in student
  useEffect(() => {
    if (!user?.id || user.id === 'guest') return;
    let alive = true;
    fetchCompletedLessons(user.id).then((s) => {
      if (alive && s) {
        setCompletedLessonIds(s);
      }
    });
    return () => { alive = false; };
  }, [user?.id, reloadKey]);

  const batchCategory = user.batchCategory || 'Weekday';
  const courseIdToFetch = params.id || (user.enrolledCourses && user.enrolledCourses[0]) || 'crs-1786624019154-w';

  const [courseResources, setCourseResources] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [batchStudentCount, setBatchStudentCount] = useState<number>(1);

  // Real-time batch-wise student count for the logged-in user's batch
  useEffect(() => {
    const batchCode = user.batchCode || 'A26W1';
    let isMounted = true;

    async function loadBatchStudents() {
      try {
        const count = await fetchBatchStudentCount(batchCode);
        if (isMounted && typeof count === 'number') {
          setBatchStudentCount(count);
        }
      } catch (err) {
        console.warn("Failed to load batch student count:", err);
      }
    }

    loadBatchStudents();

    // Subscribe to real-time additions/removals of students in the user's batch
    const channel = supabase
      .channel(`realtime-course-batch-students-${batchCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students', filter: `batch=eq.${batchCode}` },
        () => {
          loadBatchStudents();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user.batchCode]);

  useEffect(() => {
    async function loadResources() {
      const resources = await fetchResources(courseIdToFetch);
      setCourseResources(resources);
    }
    if (courseIdToFetch) {
      loadResources();
    }
  }, [courseIdToFetch]);

  useEffect(() => {
    const { topics } = courseDataLists;
    const lessons = courseDataLists.lessons || [];
    // Render stages as soon as the admin creates them — a stage with no modules/lessons yet should
    // still show (its content fills in as the admin adds it), not collapse the whole syllabus to "0 stages".
    if (topics && topics.length > 0) {
      const stages = topics.map(topic => {
        const subtopics = topic.subtopics || [];
        return {
          id: topic.id,
          title: topic.title,
          modules: subtopics.map((sub: any) => {
            const rawModuleLessons = lessons.filter((l: any) => l.module_id === sub.id);
            const seenTitles = new Set<string>();
            const moduleLessons = rawModuleLessons.filter((l: any) => {
              const norm = String(l.title || '').toLowerCase().trim();
              if (seenTitles.has(norm)) return false;
              seenTitles.add(norm);
              return true;
            });
            return {
              id: sub.id,
              title: sub.title,
              duration: sub.durationHours || sub.duration || '5h',
              lessons: moduleLessons.map((l: any) => ({
                id: l.id,
                title: l.title,
                description: l.description,
                completed: Boolean(completedLessonIds.has(l.id) || completedLessonIds.has(String(l.id || '').trim()))
              }))
            };
          })
        };
      });
      setDbSyllabus({ id: courseIdToFetch, stages });
    }
  }, [courseDataLists, courseIdToFetch, completedLessonIds]);

  useEffect(() => {
    async function fetchCourseAndSyllabus() {
      setLoading(true);
      try {
        // 1. Fetch Course details from DB
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseIdToFetch)
          .maybeSingle();

        if (courseError) {
          console.error("Error loading course details:", courseError.message);
        } else if (courseData) {
          setDbCourse(courseData);
        }

        if (!courseData) return;

        // 2. Fetch Syllabus stages & lessons from DB
        const [
          { data: topics },
          { data: lessons },
          { data: instructorCoursesData }
        ] = await Promise.all([
          supabase.from('course_topics').select('*').eq('course_id', courseData.id).order('id', { ascending: true }),
          // Syllabus list only needs light columns (id/module_id/title/description/sort_order). Heavy
          // per-lesson content (video_url, body, etc.) is loaded by LessonScreen when a lesson is opened,
          // so pulling `*` here just bloats the course page. The full lesson list is kept (progress math
          // needs the count), but each row is now tiny.
          supabase.from('course_lessons').select('id, module_id, title, description, sort_order').eq('course_id', courseData.id).order('sort_order', { ascending: true }),
          supabase.from('courses').select('id, instructor, enrolled_count, rating').eq('instructor', courseData.instructor)
        ]);

        if (topics && lessons) {
          setCourseDataLists({ topics, lessons });
        } else {
          setDbSyllabus(null);
        }

        // 3. Fetch instructor stats
        if (instructorCoursesData) {
          setAllCourses(instructorCoursesData);
        }
      } catch (err) {
        console.error("Exception loading course details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourseAndSyllabus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIdToFetch, reloadKey]);

  // Realtime: reflect admin edits to this course's structure/content without a manual reload.
  useEffect(() => {
    if (!courseIdToFetch) return;
    let timer: any = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        clearLessonResolverCache();
        setReloadKey((k) => k + 1);
      }, 600);
    };
    const tables = ['course_topics', 'course_lessons', 'courses', 'live_sessions', 'lesson_progress'];
    const channel = supabase.channel(`course_detail_realtime_${courseIdToFetch}`);
    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump);
    });
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [courseIdToFetch]);

  const course = useMemo(() => {
    // If not loaded yet from Supabase, return a loading placeholder
    if (!dbCourse) {
      return {
        id: courseIdToFetch,
        title: 'Loading...',
        category: '',
        level: '',
        instructor: {
          name: 'Loading...',
          avatar: '',
          role: '',
          title: '',
          rating: 0,
          students: 0,
          courses: 0,
          bio: ''
        },
        rating: 0,
        reviews: 0,
        students: 0,
        duration: '',
        lessons: 0,
        stages: [],
        progress: user.progress || 0,
        description: '',
        subtitle: '',
        tags: []
      };
    }

    const stages = dbSyllabus?.stages || [];
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
    if (dbCourse.id === 'crs-1786624019154-w') {
      durationStr = '163 hours';
    } else if (totalHours > 0) {
      durationStr = `${totalHours} hours`;
    }

    const instructorName = dbCourse.instructor || 'Lead Trainer';
    const instructorCourses = allCourses.filter(c => c.instructor === instructorName);
    const coursesCount = instructorCourses.length || 1;
    const ratedCourses = instructorCourses.filter(c => c.rating > 0);
    const avgRating = ratedCourses.length > 0 
      ? parseFloat((ratedCourses.reduce((acc, c) => acc + Number(c.rating), 0) / ratedCourses.length).toFixed(1)) 
      : 5.0;

    // Trainer role/bio come from the DB when available; otherwise a clean fallback.
    const role = dbCourse.instructor_role
      ? dbCourse.instructor_role.replace(/instructor/gi, 'Trainer')
      : 'Course Trainer';
    const bio = dbCourse.instructor_bio
      ? dbCourse.instructor_bio.replace(/instructor/gi, 'trainer')
      : `${instructorName} leads this program as Master Trainer.`;

    return {
      id: dbCourse.id,
      title: dbCourse.title,
      category: dbCourse.category || 'Web Development',
      level: dbCourse.level || 'Intermediate',
      instructor: {
        name: instructorName,
        avatar: '',
        role: role,
        title: role,
        rating: avgRating,
        students: batchStudentCount,
        courses: coursesCount,
        bio: bio
      },
      rating: dbCourse.id === 'crs-1786624019154-w' ? (dbCourse.rating || 5.0) : (dbCourse.rating || 0),
      reviews: dbCourse.reviews_count || 0,
      students: batchStudentCount,
      duration: durationStr,
      lessons: lessonsCount,
      stages: stages,
      progress: (user.courseProgress && user.courseProgress[dbCourse.id] !== undefined)
        ? user.courseProgress[dbCourse.id]
        : (user.enrolledCourses && user.enrolledCourses[0] === dbCourse.id)
        ? (user.progress || 0)
        : 0,
      description: dbCourse.description || '',
      subtitle: dbCourse.description || '',
      tags: dbCourse.tags || ['Python Programming', 'Advanced OOP', 'Flask/Django', 'DSA & Algorithms', 'AI Integration']
    };
  }, [dbCourse, dbSyllabus, user.progress, user.courseProgress, user.enrolledCourses, allCourses, params.id, batchStudentCount]);

  const completedInThisCourse = useMemo(() => {
    if (!course.stages) return 0;
    const thisCourseLessonIds = new Set(
      course.stages.flatMap((s: any) => s.modules.flatMap((m: any) => m.lessons.map((l: any) => l.id)))
    );
    let count = 0;
    completedLessonIds.forEach((id) => {
      if (thisCourseLessonIds.has(id) || thisCourseLessonIds.has(String(id || '').trim())) count++;
    });
    return count;
  }, [course.stages, completedLessonIds]);

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (course.id) {
      const saved = localStorage.getItem(`aspire_comments_${course.id}`);
      setComments(saved ? JSON.parse(saved) : []);
    }
  }, [course.id]);

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: `c_${Date.now()}`,
      author: user.name,
      avatar: user.avatar || '',
      content: commentText,
      time: 'Just now'
    };
    const updated = [newComment, ...comments];
    setComments(updated);
    localStorage.setItem(`aspire_comments_${course.id}`, JSON.stringify(updated));
    setCommentText('');
  };

  if (loading && !dbCourse) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5.5rem)] bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-slate-600 font-extrabold text-sm">Loading course details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'My Learning', onClick: () => navigate('learning') },
          { label: course.title },
        ]}
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white shadow-xl border border-purple-400/30">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 blur-3xl translate-x-1/3 -translate-y-1/3" />
        
        <div className="relative z-10 p-5 sm:p-8 lg:p-10 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 border border-white/20 text-xs font-black tracking-wider shadow-sm">
              {course.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-black shadow-sm">
              {course.level}
            </span>
          </div>

          <h1 className="font-extrabold text-xl sm:text-3xl lg:text-4xl text-white leading-snug max-w-3xl">
            {course.title}
          </h1>
          <p className="text-purple-100 text-xs sm:text-base max-w-2xl font-medium leading-relaxed">
            {course.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-purple-100 pt-2 border-t border-white/20">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{course.students >= 1000 ? `${(course.students / 1000).toFixed(1)}k` : course.students} {course.students === 1 ? 'student' : 'students'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{course.duration}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>{course.lessons} lessons</span>
            </span>
          </div>
        </div>
      </div>

      {/* Custom Purple Underline Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px overflow-x-auto scrollbar-hide">
        {[
          { id: 'modules', label: 'Modules' },
          { id: 'overview', label: 'Overview' },
          { id: 'resources', label: 'Resources' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-5 py-3 font-extrabold text-sm border-b-2 transition-all shrink-0 cursor-pointer",
              tab === t.id
                ? "border-[#7c3aed] text-[#7c3aed] bg-purple-50/50 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Modules */}
          {tab === 'modules' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-0">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Course Content</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1">{course.stages?.length || 0} stages · {course.lessons} lessons · {course.duration}</p>
                    </div>
                    <ProgressRing value={course.progress} size={60} strokeWidth={6} color="stroke-[#7c3aed]" trackColor="stroke-slate-100" />
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    {course.stages?.map((stage: any, i: number) => {
                      const stageLessons = stage.modules.flatMap((m: any) => m.lessons);
                      const stageCompletedCount = stageLessons.filter((l: any) => 
                        completedLessonIds.has(l.id) || completedLessonIds.has(String(l.id || '').trim()) || l.completed
                      ).length;
                      return (
                      <AccordionItem
                        key={stage.id}
                        title={stage.title}
                        isOpen={openStageIndex === i}
                        onToggle={() => setOpenStageIndex(openStageIndex === i ? null : i)}
                        rightSlot={
                          stageCompletedCount > 0 ? (
                            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              {stageCompletedCount}/{stageLessons.length} completed
                            </span>
                          ) : (
                            <span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                              {stageLessons.length} lessons
                            </span>
                          )
                        }
                      >
                        <div className="space-y-4 pt-2">
                          {stage.modules.map((mod: any) => (
                            <ModuleAccordion 
                              key={mod.id} 
                              mod={mod} 
                              course={course} 
                              navigate={navigate} 
                              isOpen={openModuleId === mod.id}
                              onToggle={() => setOpenModuleId(openModuleId === mod.id ? null : mod.id)}
                              completedLessonIds={completedLessonIds}
                            />
                          ))}
                        </div>
                      </AccordionItem>
                    )})}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'overview' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-4">
                <h3 className="font-extrabold text-slate-900 text-lg">About This Course</h3>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{course.description}</p>
                <h4 className="font-extrabold text-slate-900 pt-2">What you'll learn</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.tags.map((tag: string) => (
                    <div key={tag} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-[#7c3aed] shrink-0" />
                      {tag}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'resources' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8">
                <div className="space-y-3">
                  {courseResources.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-800">No resources available</h4>
                      <p className="text-xs text-slate-500 mt-1">Check back later for downloadable content.</p>
                    </div>
                  ) : (
                    courseResources.map((res: any) => (
                      <div key={res.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-purple-50/20 hover:border-purple-100 transition-all duration-300">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7c3aed] flex items-center justify-center border border-purple-100 shadow-2xs">
                            <Download className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{res.title}</p>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">{res.size} · {res.type.toUpperCase()}</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#7c3aed] hover:text-[#7c3aed] text-xs font-extrabold shadow-2xs transition-all cursor-pointer">
                          Download
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-6">
          {/* Trainer */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <h3 className="font-extrabold text-slate-900 text-lg">Trainer</h3>
            </CardHeader>
            <CardBody className="p-6 pt-2 space-y-4">
              <div className="flex items-center gap-3.5">
                <Avatar src={course.instructor.avatar} name={course.instructor.name} size="lg" className="border-2 border-purple-100" />
                <div>
                  <p className="font-extrabold text-slate-900 text-base">{course.instructor.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{course.instructor.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="flex items-center justify-center gap-1 text-sm font-black text-slate-900"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{course.instructor.rating}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Rating</p>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {course.instructor.students >= 1000 
                      ? `${(course.instructor.students / 1000).toFixed(1)}k` 
                      : course.instructor.students}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Students</p>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{course.instructor.courses}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Courses</p>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">{course.instructor.bio}</p>
            </CardBody>
          </Card>

          {/* Progress Card */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden sticky top-24">
            <CardBody className="p-6 text-center space-y-4">
              <div className="relative inline-block">
                <ProgressRing value={course.progress} size={110} strokeWidth={8} showLabel={false} color="stroke-[#7c3aed]" trackColor="stroke-slate-100" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900">{course.progress}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Done</span>
                </div>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-base mb-1">{course.progress}% Completed</p>
                <p className="text-xs font-semibold text-slate-500">
                  {completedInThisCourse > 0 
                    ? `${completedInThisCourse} of ${course.lessons} lessons`
                    : `${Math.round(course.lessons * course.progress / 100)} of ${course.lessons} lessons`
                  }
                </p>
              </div>

              <button
                onClick={() => {
                  const allCourseLessons = course.stages?.flatMap((s: any) => s.modules).flatMap((m: any) => m.lessons) || [];
                  const nextIncomplete = allCourseLessons.find((l: any) => 
                    !completedLessonIds.has(l.id) && !completedLessonIds.has(String(l.id || '').trim())
                  );
                  navigate('lesson', { 
                    id: course.id, 
                    lesson: nextIncomplete?.id || allCourseLessons[0]?.id 
                  });
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{course.progress > 0 ? 'Continue Learning' : 'Start Course'}</span>
              </button>

              <div className="pt-2">
                <button 
                  onClick={() => navigate('certificates')}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 border border-purple-100 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" /> Certificate
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

    </div>
  );
}
