import { useState, useEffect, useMemo } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Settings, ArrowLeft, ArrowRight,
  CheckCircle2, FileText, MessageCircle, Download, Bookmark,
  PenLine, List, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Video, RotateCcw,
  SkipBack, SkipForward, Maximize2, Lock, Check
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { fetchResources, markLessonComplete, fetchCompletedLessons } from '@/lib/api';
import { getLessonResolver, clearLessonResolverCache } from '@/lib/lessonLinkResolver';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/UserContext';
import { supabase } from '@/lib/supabase';

/**
 * Turns an admin-pasted video link into an embeddable URL. Supports Google Drive share links
 * (converted to /preview), YouTube (watch/youtu.be/embed), and falls back to the raw URL for a
 * direct video file or an already-embeddable link. Returns '' when there's no link.
 */
function toEmbedVideoUrl(raw?: string): string {
  const u = String(raw || '').trim();
  if (!u) return '';
  const drive = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/) || u.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return u;
}

/**
 * A "direct" media URL can play in a native <video> with our OWN controls (mp4/webm/… or a
 * Supabase-Storage public URL). Drive / YouTube links are NOT direct — they can only be shown via
 * the provider iframe (which carries the provider's controls). Host videos as direct URLs to get
 * the custom player.
 */
function isDirectMediaUrl(raw?: string): boolean {
  const u = String(raw || '').trim();
  if (!u) return false;
  if (/drive\.google\.com|youtube\.com|youtu\.be|vimeo\.com/.test(u)) return false;
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(u) || /supabase\.co\/storage\//.test(u);
}

function SidebarModuleAccordion({ mod, course, currentLesson, navigate, isOpen, onToggle }: any) {
  const { user } = useUser();
  const allLessons = course.stages ? course.stages.flatMap((s: any) => s.modules.flatMap((m: any) => m.lessons)) : [];
  const completedCount = Math.round((allLessons.length * (course.progress || 0)) / 100);

  return (
    <div className="space-y-1.5 border border-slate-100 p-2 rounded-xl">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between px-1 mb-1 group cursor-pointer"
      >
        <h4 className={cn("text-[11px] font-bold uppercase tracking-wider transition-colors", isOpen ? "text-[#7c3aed]" : "text-slate-700 group-hover:text-[#7c3aed]")}>{mod.title}</h4>
        <div className="flex items-center gap-2">
          {mod.duration && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{mod.duration}</span>}
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#7c3aed]" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#7c3aed]" />}
        </div>
      </button>
      {isOpen && (
        <div className="space-y-1.5 animate-fade-in pt-1">
          {mod.lessons.map((lesson: any, li: number) => {
            const isCurrent = lesson.id === currentLesson?.id;
            const isPreview = lesson.video?.preview || lesson.preview;
            const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id);
            const isCompleted = lesson.completed || (globalIdx < completedCount && globalIdx !== -1);
            const isLocked = !user?.unlockedLessonIds?.includes(lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  navigate('lesson', { id: course.id, lesson: lesson.id });
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left border',
                  isCurrent 
                    ? 'bg-purple-50 border-purple-200 text-[#7c3aed] shadow-2xs font-extrabold' 
                    : isLocked
                      ? 'bg-slate-50 opacity-60 cursor-not-allowed border-transparent text-slate-400'
                      : 'bg-white hover:bg-slate-50 border-transparent text-slate-700'
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black',
                  isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                  isCurrent ? 'bg-[#7c3aed] text-white' : 'bg-slate-100 text-slate-400',
                )}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : (isLocked ? <Lock className="w-3.5 h-3.5 opacity-50" /> : li + 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs line-clamp-1', isCurrent ? 'font-black text-[#7c3aed]' : 'font-semibold text-slate-800')}>{lesson.title}</p>
                  <p className="text-[10px] font-medium text-slate-400">{lesson.duration}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LessonScreen() {
  const { navigate, params } = useNav();
  const { user } = useUser();
  const [tab, setTab] = useState(() => {
    return localStorage.getItem('aspire_lesson_tab') || 'notes';
  });
  const handleTabChange = (t: string) => {
    setTab(t);
    localStorage.setItem('aspire_lesson_tab', t);
  };
  const [playing, setPlaying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true });
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [markingComplete, setMarkingComplete] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');
  const [quality, setQuality] = useState('1080p');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    setToastMessage(!isBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleModule = (idx: number) => {
    setExpandedModules((prev) => {
      const wasOpen = prev[idx];
      return wasOpen ? {} : { [idx]: true };
    });
  };

  const [dbCourse, setDbCourse] = useState<any>(null);
  const [dbSyllabus, setDbSyllabus] = useState<any>(null);
  const [courseDataLists, setCourseDataLists] = useState<{
    topics: any[], lessons: any[], assessments: any[], codingQuestions: any[], projects: any[], quizzes: any[], recordings: any[], resolver: any
  }>({
    topics: null as any, lessons: null as any, assessments: null as any, codingQuestions: null as any, projects: null as any, quizzes: null as any, recordings: null as any, resolver: null as any
  });
  const [loading, setLoading] = useState(true);
  // Bumped by the realtime channel to re-fetch this lesson's content on admin edits.
  const [reloadKey, setReloadKey] = useState(0);

  const courseIdToFetch = params.id || (user.enrolledCourses && user.enrolledCourses[0]) || 'crs-1786624019154-w';
  const batchCategory = user.batchCategory || 'Weekday';

  useEffect(() => {
    const { topics, lessons, assessments, codingQuestions, projects, quizzes, recordings, resolver } = courseDataLists;
    if (topics && lessons && resolver) {
      // Real class recordings keyed by normalized lesson title (course_lessons.video_url does not
      // exist in the DB — videos live in the `recordings` table; concept_name/title == lesson title).
      const normTitle = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const batchCat = (user?.batchCategory || '').toLowerCase();
      // Bridge coursework to lessons by TITLE (the id-scheme resolver can't map every Scheme-A id):
      // projects carry their lesson title in description.moduleName; assessments in topic_name's last segment.
      const projLessonTitle = (p: any) => { try { return normTitle(JSON.parse(p.description || '{}').moduleName); } catch { return ''; } };
      const assessLessonTitle = (a: any) => normTitle(String(a.topic_name || '').split('||').pop());
      const recMatchesBatch = (r: any) => {
        const tb = String(r.target_batch || '').toLowerCase();
        return !tb || tb.includes('all') || (batchCat && tb.includes(batchCat));
      };
      const recByTitle = new Map<string, any>();
      (recordings || []).forEach((r: any) => {
        if (!r.video_url) return;
        const pub = String(r.publish_status || '').toLowerCase();
        if (pub.includes('draft') || pub.includes('hidden')) return;
        [r.concept_name, r.title].forEach((t: any) => {
          const k = normTitle(t); if (!k) return;
          // Show the lesson's recording to ALL batches; prefer the student's own batch as a tiebreaker.
          const existing = recByTitle.get(k);
          if (!existing || (!recMatchesBatch(existing) && recMatchesBatch(r))) recByTitle.set(k, r);
        });
      });
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
                const lessonTitleKey = normTitle(l.title);
                const dbAssessments = assessments
                  ? assessments.filter((asmnt: any) => {
                      const parts = asmnt.topic_id ? asmnt.topic_id.split('||') : [];
                      if (resolver.resolveLessonId(parts[2]) === l.id) return true;
                      const t = assessLessonTitle(asmnt);
                      return !!t && t === lessonTitleKey;
                    })
                  : [];
                const dbProjects = projects
                  ? projects.filter((p: any) => {
                      const t = projLessonTitle(p);
                      return (!!t && t === lessonTitleKey) || resolver.resolveLessonId(p.inner_topic_id) === l.id;
                    })
                  : [];
                const dbQuizzes = quizzes
                  ? quizzes.filter((q: any) => {
                      if (resolver.resolveLessonId(q.inner_topic_id) === l.id) return true;
                      const t = normTitle(q.topic_name);
                      return !!t && t === lessonTitleKey;
                    })
                  : [];

                const rec = recByTitle.get(normTitle(l.title));
                return {
                  id: l.id,
                  title: l.title,
                  description: l.description,
                  completed: false,
                  videoUrl: rec?.video_url || l.video_url || '',
                  videoThumbnail: rec?.thumbnail || '',
                  video: {
                    preview: idx === 0 || user?.unlockedLessonIds?.includes(l.id),
                    duration: rec?.duration || '45m',
                    completed: false
                  },
                  practices: dbPractices.map((cq: any) => ({
                    id: cq.id,
                    title: cq.title,
                    duration: '20m',
                    completed: false
                  })),
                  assessments: dbAssessments.map((asmnt: any) => ({
                    id: asmnt.id,
                    title: asmnt.title,
                    duration: `${asmnt.duration_minutes || 15}m`,
                    completed: false
                  })),
                  projects: dbProjects.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    completed: false
                  })),
                  quizzes: dbQuizzes.map((q: any) => ({
                    id: q.id,
                    title: q.title,
                    duration: `${q.duration_minutes || 30}m`,
                    completed: false
                  }))
                };
              })
            };
          })
        };
      });
      setDbSyllabus({ id: courseIdToFetch, stages });
    }
  }, [courseDataLists, courseIdToFetch, user?.unlockedLessonIds]);

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
          { data: assessments },
          { data: codingQuestions },
          { data: projects },
          { data: quizzes },
          { data: recordings },
          resolver
        ] = await Promise.all([
          supabase.from('course_topics').select('*').eq('course_id', courseData.id).order('id', { ascending: true }),
          supabase.from('course_lessons').select('*').eq('course_id', courseData.id).order('sort_order', { ascending: true }),
          supabase.from('assessments').select('id, topic_id, topic_name, duration_minutes, title').eq('course_id', courseData.id),
          supabase.from('coding_questions').select('id, inner_topic_id, title').eq('course_id', courseData.id),
          supabase.from('projects').select('id, inner_topic_id, title, type, description').eq('course_id', courseData.id),
          supabase.from('quizzes').select('id, inner_topic_id, topic_name, duration_minutes, title').eq('course_id', courseData.id),
          supabase.from('recordings').select('title, concept_name, video_url, thumbnail, duration, target_batch, publish_status'),
          getLessonResolver(user?.enrolledCourses || [], user?.batchCode || '')
        ]);

        if (topics && lessons) {
          setCourseDataLists({ topics, lessons, assessments: assessments || [], codingQuestions: codingQuestions || [], projects: projects || [], quizzes: quizzes || [], recordings: recordings || [], resolver });
        } else {
          setDbSyllabus(null);
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

  // Realtime: re-fetch this lesson's content + cover topics when admin edits sessions/content.
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
    const channel = supabase.channel('lesson_content_realtime');
    // Admin content (unfiltered — rare edits).
    ['live_sessions', 'course_lessons', 'course_topics', 'assessments', 'quizzes', 'projects', 'coding_questions', 'milestones_data', 'recordings']
      .forEach((table) => channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump));
    // This student's own lesson completions only (filtered — avoids a per-student refetch storm at scale).
    if (user?.id) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress', filter: `student_id=eq.${user.id}` }, bump);
    }
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [courseIdToFetch, user?.id]);

  const course = useMemo(() => {
    // If not loaded yet from Supabase, return a loading placeholder
    if (!dbCourse) {
      return {
        id: params.id || '',
        title: 'Loading...',
        category: '',
        level: '',
        instructor: { name: 'Loading...', avatar: '', role: '' },
        rating: 0, reviews: 0, students: 0, duration: '', lessons: 0,
        stages: [],
        progress: user.progress || 0,
        description: '', subtitle: '', tags: []
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

    return {
      id: dbCourse.id,
      title: dbCourse.title,
      category: dbCourse.category || 'Web Development',
      level: dbCourse.level || 'Intermediate',
      instructor: {
        name: dbCourse.instructor || 'Lead Instructor',
        avatar: '',
        role: 'LMS Specialist'
      },
      rating: dbCourse.rating || 5.0,
      reviews: Math.floor((dbCourse.rating || 5.0) * 12),
      students: dbCourse.enrolled_count || 120,
      duration: durationStr,
      lessons: lessonsCount,
      stages: stages,
      progress: user.progress || 0,
      description: dbCourse.description || '',
      subtitle: dbCourse.description || '',
      tags: dbCourse.tags || ['Python Programming', 'Advanced OOP', 'Flask/Django', 'DSA & Algorithms', 'AI Integration']
    };
  }, [dbCourse, dbSyllabus, user.progress, courseIdToFetch]);

  const allLessons = course.stages?.flatMap((s: any) => s.modules).flatMap((m: any) => m.lessons) || [];
  const currentIdx = allLessons.findIndex((l: any) => l.id === params.lesson);
  const safeCurrentIdx = currentIdx !== -1 ? currentIdx : 0;
  const currentLesson = allLessons[safeCurrentIdx];
  const prevLesson = safeCurrentIdx > 0 ? allLessons[safeCurrentIdx - 1] : null;
  const nextLesson = safeCurrentIdx < allLessons.length - 1 ? allLessons[safeCurrentIdx + 1] : null;

  const lessonDone = !!currentLesson && completedLessonIds.has(currentLesson.id);

  // Load which lessons this student has already marked complete (re-runs on realtime reload).
  useEffect(() => {
    if (!user?.id || user.id === 'guest') return;
    let alive = true;
    fetchCompletedLessons(user.id).then((s) => { if (alive) setCompletedLessonIds(s); });
    return () => { alive = false; };
  }, [user?.id, reloadKey]);

  const handleMarkComplete = async () => {
    if (!currentLesson || !user?.id || lessonDone) return;
    setMarkingComplete(true);
    setCompletedLessonIds((prev) => new Set(prev).add(currentLesson.id)); // optimistic
    try {
      await markLessonComplete(user.id, currentLesson.id, courseIdToFetch);
    } catch { /* stays optimistic; realtime will reconcile */ }
    setMarkingComplete(false);
  };

  const currentStageIndex = course.stages?.findIndex((s: any) => 
    s.modules.some((m: any) => m.lessons.some((l: any) => l.id === currentLesson?.id))
  );
  
  const currentModule = course.stages?.flatMap((s: any) => s.modules).find((m: any) =>
    m.lessons.some((l: any) => l.id === currentLesson?.id)
  );

  useEffect(() => {
    if (currentStageIndex !== undefined && currentStageIndex !== -1) {
      setExpandedModules({ [currentStageIndex]: true });
    }
  }, [currentStageIndex]);

  useEffect(() => {
    if (currentModule) {
      setOpenModuleId(currentModule.id);
    }
  }, [currentModule?.id]);

  const [lessonNote, setLessonNote] = useState('');

  useEffect(() => {
    if (course.id && currentLesson?.id) {
      const saved = localStorage.getItem(`aspire_notes_${course.id}_${currentLesson.id}`) || '';
      setLessonNote(saved);
    }
  }, [course.id, currentLesson?.id]);

  const handleSaveNote = (text: string) => {
    setLessonNote(text);
    localStorage.setItem(`aspire_notes_${course.id}_${currentLesson.id}`, text);
  };

  const lessonTranscript = useMemo(() => {
    return `Welcome to this session on "${currentLesson?.title || 'this topic'}". In this lesson, we will cover the core architectures, fundamental structures, and practical components. Make sure to follow along and write code in your local setup. If you run into any questions, feel free to use the Discussion tab to connect with our mentors. Let's get started.`;
  }, [currentLesson?.id]);

  const [lessonResources, setLessonResources] = useState<any[]>([]);

  useEffect(() => {
    async function loadResources() {
      const resources = await fetchResources(course.id);
      setLessonResources(resources);
    }
    if (course.id && course.title !== 'Loading...') {
      loadResources();
    }
  }, [course.id]);

  const [lessonCommentText, setLessonCommentText] = useState('');
  const [lessonComments, setLessonComments] = useState<any[]>([]);

  useEffect(() => {
    if (course.id && currentLesson?.id) {
      const saved = localStorage.getItem(`aspire_comments_${course.id}_${currentLesson.id}`);
      setLessonComments(saved ? JSON.parse(saved) : []);
    }
  }, [course.id, currentLesson?.id]);

  const handlePostLessonComment = () => {
    if (!lessonCommentText.trim()) return;
    const newComment = {
      id: `lc_${Date.now()}`,
      author: user.name,
      avatar: user.avatar || '',
      content: lessonCommentText,
      time: 'Just now'
    };
    const updated = [newComment, ...lessonComments];
    setLessonComments(updated);
    localStorage.setItem(`aspire_comments_${course.id}_${currentLesson.id}`, JSON.stringify(updated));
    setLessonCommentText('');
  };

  if (loading && !dbCourse) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5.5rem)] bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-slate-600 font-extrabold text-sm">Loading lesson player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-6 overflow-hidden font-sans pb-2 relative">
      
      {/* Left Area: Sized Video Player + Notes Tabs */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto space-y-4 pr-1 pb-6">
        
        {/* Back Navigation (Outside Video) */}
        <div>
          <button 
            onClick={() => navigate('course', { id: course.id })} 
            className="text-slate-500 hover:text-slate-900 text-sm font-bold flex items-center gap-1.5 transition-colors w-fit group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Course
          </button>
        </div>

        {/* Modern High-End Video Player Container (Matches Reference UI) */}
        <div className="relative aspect-video max-h-[380px] xl:max-h-[440px] w-full rounded-[2.2rem] overflow-hidden bg-[#0a0d18] shadow-2xl border border-slate-800 shrink-0 group">
          {/* Rich Dark Background Image Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-[#101537] to-[#1e1438]" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-45 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-slate-950/70" />

          {/* Top Bar (Title + Quality Subtitle + Back & Settings Actions) */}
          <div className="absolute top-0 left-0 right-0 p-5 flex items-start justify-between z-30 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-white font-extrabold text-sm sm:text-base tracking-tight">{currentLesson?.title || 'Loading...'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button 
                onClick={handleBookmark}
                className={cn(
                  "w-8 h-8 rounded-xl backdrop-blur-md flex items-center justify-center transition-all",
                  isBookmarked ? "bg-[#7c3aed] text-white shadow-lg" : "bg-white/10 hover:bg-white/20 text-white/90 hover:text-white"
                )}
              >
                <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-white")} />
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    "w-8 h-8 rounded-xl backdrop-blur-md flex items-center justify-center transition-all",
                    showSettings ? "bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/90 hover:text-white"
                  )}
                >
                  <Settings className={cn("w-4 h-4 transition-transform duration-300", showSettings && "rotate-90")} />
                </button>

                {/* Settings Dropdown */}
                {showSettings && (
                  <div className="absolute right-0 top-10 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in text-white text-xs">
                    <div className="p-2 border-b border-white/10">
                      <p className="px-2 py-1 font-bold text-white/50 text-[10px] uppercase tracking-wider">Playback Speed</p>
                      {['0.5x', '1.0x', '1.5x', '2.0x'].map(speed => (
                        <button
                          key={speed}
                          onClick={() => { setPlaybackSpeed(speed); setShowSettings(false); }}
                          className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <span>{speed}</span>
                          {playbackSpeed === speed && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                    <div className="p-2">
                      <p className="px-2 py-1 font-bold text-white/50 text-[10px] uppercase tracking-wider">Quality</p>
                      {['1080p', '720p', '480p'].map(q => (
                        <button
                          key={q}
                          onClick={() => { setQuality(q); setShowSettings(false); }}
                          className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <span>{q}</span>
                          {quality === q && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lesson video. Direct media URL (mp4/Supabase) → native <video> with our own controls.
              Drive/YouTube → provider iframe, loaded lazily behind a thumbnail so the page is instant. */}
          {(() => {
            const rawUrl = (currentLesson as any)?.videoUrl as string | undefined;
            const thumb = (currentLesson as any)?.videoThumbnail as string | undefined;
            if (!rawUrl) {
              return (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3">
                  <div className="px-5 py-2.5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-2.5 pointer-events-none">
                    <Video className="w-4 h-4 text-purple-300" />
                    <span className="text-white font-extrabold text-sm tracking-wide">Video Coming Soon</span>
                  </div>
                </div>
              );
            }
            // Direct media (mp4 / Supabase) → our own player: shows the thumbnail as a poster and
            // plays with a SINGLE click on the native controls; preload="none" keeps first paint fast.
            if (isDirectMediaUrl(rawUrl)) {
              return (
                <video
                  key={rawUrl}
                  src={rawUrl}
                  poster={thumb || undefined}
                  controls
                  controlsList="nodownload"
                  preload="none"
                  className="absolute inset-0 w-full h-full z-10 bg-black object-contain"
                />
              );
            }
            // Drive / YouTube → the provider player embedded directly, so a single click on its play
            // button starts the video (a Drive iframe can't be auto-started, so an extra custom
            // overlay would just force a second click). Direct URLs above give the seamless player.
            return (
              <iframe
                key={rawUrl}
                src={toEmbedVideoUrl(rawUrl)}
                title={currentLesson?.title || 'Lesson video'}
                className="absolute inset-0 w-full h-full z-10 border-0"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            );
          })()}          {/* Bottom Player Controls Dock - HIDDEN for "Coming Soon" state
          <div className="absolute bottom-0 left-0 right-0 p-5 z-30 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent space-y-3">
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/90 font-mono font-bold shrink-0">00:00</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden cursor-pointer group/bar relative">
                <div className="h-full rounded-full bg-white relative" style={{ width: '0%' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border border-slate-900 cursor-pointer" />
                </div>
              </div>
              <span className="text-xs text-white/70 font-mono font-semibold shrink-0">{currentLesson?.duration || ''}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3.5">
                <button className="text-white/80 hover:text-white transition-colors p-1" title="Rewind 10s"><SkipBack className="w-4 h-4 fill-white/80" /></button>
                <button onClick={() => setPlaying(!playing)} className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
                  {playing ? <Pause className="w-4 h-4 fill-slate-950 text-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 text-slate-950 ml-0.5" />}
                </button>
                <button className="text-white/80 hover:text-white transition-colors p-1" title="Forward 10s"><SkipForward className="w-4 h-4 fill-white/80" /></button>
                <button className="text-white/80 hover:text-white transition-colors p-1 ml-1"><Volume2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">1.0x</span>
                <button className="text-white/80 hover:text-white transition-colors p-1"><Maximize2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
          */}
        </div>

        {/* Lesson Header & Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider">
                {course.stages?.[currentStageIndex >= 0 ? currentStageIndex : 0]?.title || 'Module'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-extrabold">
                Lesson {safeCurrentIdx + 1} of {allLessons.length}
              </span>
            </div>
            <h1 className="font-extrabold text-slate-900 text-lg sm:text-xl">{currentLesson?.title || 'Loading Lesson...'}</h1>
          </div>

          {/* Lesson Navigation Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {lessonDone ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl font-extrabold text-xs px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-4 h-4" /> Completed
              </span>
            ) : (
              <Button
                size="sm"
                onClick={handleMarkComplete}
                disabled={markingComplete}
                leftIcon={<Check className="w-4 h-4" />}
                className="rounded-xl font-extrabold text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Mark as Complete
              </Button>
            )}
            {!sidebarOpen && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSidebarOpen(true)}
                leftIcon={<List className="w-4 h-4 text-[#7c3aed]" />}
                className="rounded-xl font-extrabold text-xs bg-purple-50 text-[#7c3aed] border border-purple-100"
              >
                Course Playlist
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={!prevLesson}
              onClick={() => prevLesson && navigate('lesson', { id: course.id, lesson: prevLesson.id })}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="rounded-xl font-extrabold text-xs"
            >
              Prev
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (nextLesson) {
                  if (!nextLesson.completed && !nextLesson.preview) return;
                  navigate('lesson', { id: course.id, lesson: nextLesson.id });
                } else {
                  navigate('course', { id: course.id });
                }
              }}
              disabled={nextLesson && !nextLesson.completed && !nextLesson.preview}
              rightIcon={nextLesson ? <ArrowRight className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {nextLesson ? 'Next Lesson' : 'Complete Course'}
            </Button>
          </div>
        </div>

        {/* Note Taking Area */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-4 shrink-0 min-h-[300px]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3 shrink-0">
            <PenLine className="w-4 h-4 text-[#7c3aed]" />
            <span className="font-extrabold text-sm text-slate-800">Lesson Notes</span>
          </div>

          <div className="flex-1 flex flex-col space-y-2.5">
            <textarea
              value={lessonNote}
              onChange={(e) => handleSaveNote(e.target.value)}
              placeholder="Type your notes here... they are saved in real-time as you type!"
              className="w-full flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 outline-none text-xs font-semibold text-slate-800 min-h-[180px] resize-none"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-1 shrink-0">
              <span>Auto-saving note...</span>
              <span>{lessonNote.length} characters</span>
            </div>
          </div>
        </div>

      </div>

      {/* Right Area: Collapsed Fallen Vertical Bar OR Full Course Content Panel */}
      {!sidebarOpen ? (
        /* Slim Vertical Fallen Text Bar (Appears on the right side when hidden) */
        <div 
          onClick={() => setSidebarOpen(true)}
          className="w-12 h-full bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col items-center py-5 gap-6 cursor-pointer hover:border-purple-300 hover:bg-purple-50/20 transition-all shrink-0 z-20 group"
          title="Click to Open Course Content"
        >
          <button 
            type="button"
            className="w-8 h-8 rounded-xl bg-purple-50 group-hover:bg-[#7c3aed] text-[#7c3aed] group-hover:text-white flex items-center justify-center transition-colors shadow-2xs border border-purple-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-8 h-px bg-slate-200 my-1" />

          <span className="[writing-mode:vertical-lr] rotate-180 text-[11px] font-black tracking-widest uppercase text-slate-600 group-hover:text-[#7c3aed] transition-colors py-2 flex items-center gap-2">
            <List className="w-3.5 h-3.5 rotate-90 text-[#7c3aed]" />
            Course Content
          </span>
        </div>
      ) : (
        /* Full Course Content Panel */
        <div className="w-full lg:w-80 h-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col shrink-0 overflow-hidden transition-all duration-300 animate-fade-in">
          {/* Panel Header with Close Button */}
          <div className="flex items-center justify-between mb-3 shrink-0 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-[#7c3aed]" />
              <h3 className="font-extrabold text-slate-900 text-sm">Course Content</h3>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7c3aed] text-[11px] font-black border border-purple-100">
                {course.progress}%
              </span>
            </div>

            {/* Close Panel Button (Clean Icon Only Arrow) */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-500 hover:text-[#7c3aed] transition-all flex items-center justify-center border border-slate-200/80 active:scale-95 shadow-2xs"
              title="Collapse Course Content"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <ProgressBar value={course.progress} className="mb-4 shrink-0" />

          {/* Accordion Module Cards List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {course.stages?.map((stage: any, si: number) => {
              const isStageOpen = !!expandedModules[si];
              const stageLessons = stage.modules.flatMap((m: any) => m.lessons);
              return (
                <div key={stage.id} className="rounded-xl border border-slate-100 overflow-hidden shadow-2xs">
                  {/* Stage Header Card Toggle */}
                  <button
                    onClick={() => toggleModule(si)}
                    className="w-full p-3 bg-slate-50 hover:bg-purple-50/40 flex items-center justify-between transition-colors text-left"
                  >
                    <p className="text-xs font-extrabold text-slate-800 line-clamp-1">
                      {stage.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-extrabold text-slate-400">{stageLessons.length} lessons</span>
                      {isStageOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>

                  {/* Stage Modules Drawer */}
                  {isStageOpen && (
                    <div className="p-2 space-y-3 bg-white border-t border-slate-100 animate-fade-in">
                      {stage.modules.map((mod: any, mi: number) => (
                        <SidebarModuleAccordion 
                          key={mod.id} 
                          mod={mod} 
                          course={course} 
                          currentLesson={currentLesson} 
                          navigate={navigate} 
                          isOpen={openModuleId === mod.id}
                          onToggle={() => setOpenModuleId(openModuleId === mod.id ? null : mod.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className="bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-slate-800">{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
}
