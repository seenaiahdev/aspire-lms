import { useState, useEffect, useMemo } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Settings, ArrowLeft, ArrowRight,
  CheckCircle2, FileText, MessageCircle, Download, Bookmark,
  PenLine, List, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Video, RotateCcw,
  SkipBack, SkipForward, Maximize2, Lock, Check
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { fetchResources } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/UserContext';
import { supabase } from '@/lib/supabase';

function SidebarModuleAccordion({ mod, course, currentLesson, navigate, isOpen, onToggle }: any) {
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
            const isLocked = (globalIdx > completedCount) && !isPreview && !isCompleted && !isCurrent;
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
  const [loading, setLoading] = useState(true);

  const courseIdToFetch = params.id || (user.enrolled_courses && user.enrolled_courses[0]) || 'crs-1786624019154-w';

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

        // 2. Fetch Syllabus (milestones_data) from DB
        const targetCategory = courseIdToFetch === 'crs-1786624019154-w'
          ? (batchCategory === 'Weekend' ? 'ml-python-weekend' : 'ml-python-full-stack')
          : courseIdToFetch;
        const { data: syllabusData, error: syllabusError } = await supabase
          .from('milestones_data')
          .select('*')
          .eq('id', targetCategory)
          .maybeSingle();

        if (syllabusError) {
          console.error("Error loading syllabus stages:", syllabusError.message);
        } else if (syllabusData) {
          setDbSyllabus(syllabusData);
        }
      } catch (err) {
        console.error("Exception loading course details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourseAndSyllabus();

    // Setup real-time updates for courses and milestones_data
    const coursesChannel = supabase
      .channel('lesson_course_details_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courses',
          filter: `id=eq.${params.id || 'PYAI2026'}`
        },
        (payload) => {
          console.log("Real-time course detail update inside Lesson Player:", payload.new);
          setDbCourse(payload.new);
        }
      )
      .subscribe();

    const targetCategory = courseIdToFetch === 'crs-1786624019154-w'
      ? (batchCategory === 'Weekend' ? 'ml-python-weekend' : 'ml-python-full-stack')
      : courseIdToFetch;
    const milestonesChannel = supabase
      .channel('lesson_milestones_details_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'milestones_data',
          filter: `id=eq.${targetCategory}`
        },
        (payload) => {
          console.log("Real-time milestones/syllabus update inside Lesson Player:", payload.new);
          setDbSyllabus(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(coursesChannel);
      supabase.removeChannel(milestonesChannel);
    };
  }, [courseIdToFetch, batchCategory]);

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
      if (saved) {
        setLessonComments(JSON.parse(saved));
      } else {
        const initial = [
          { id: 'lc_1', author: 'Saurabh K.', avatar: '', content: `Can anyone explain why the bracket count logic is used here?`, time: '4h ago' },
          { id: 'lc_2', author: 'Alex Rivera (Instructor)', avatar: '', content: `It's standard parsing logic, Saurabh. It helps match start and end blocks cleanly.`, time: '3h ago' }
        ];
        setLessonComments(initial);
        localStorage.setItem(`aspire_comments_${course.id}_${currentLesson.id}`, JSON.stringify(initial));
      }
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

          {/* Center Video Coming Soon Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3">
            <div className="px-5 py-2.5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-2.5 pointer-events-none">
              <Video className="w-4 h-4 text-purple-300" />
              <span className="text-white font-extrabold text-sm tracking-wide">Video Coming Soon</span>
            </div>
          </div>          {/* Bottom Player Controls Dock - HIDDEN for "Coming Soon" state
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

        {/* Flexible Tabs & Note Taking Area */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-4 shrink-0 min-h-[350px]">
          
          {/* Custom Tabs Bar */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
            {[
              { id: 'notes', label: 'Notes', icon: PenLine },
              { id: 'transcript', label: 'Transcript', icon: FileText },
              { id: 'resources', label: 'Resources', icon: Download },
              { id: 'discussion', label: 'Discussion', icon: MessageCircle },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all",
                  tab === t.id
                    ? "bg-purple-50 text-[#7c3aed] border border-purple-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Box */}
          <div className="flex-1 overflow-y-auto pt-3">
            {tab === 'notes' && (
              <div className="flex flex-col h-full space-y-2.5">
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
            )}

            {tab === 'transcript' && (
              <div className="h-full pr-1 overflow-y-auto">
                <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                  {lessonTranscript}
                </p>
              </div>
            )}

            {tab === 'resources' && (
              <div className="space-y-2">
                {lessonResources.length === 0 ? (
                  <div className="flex flex-col h-full justify-center items-center text-center py-4">
                    <Download className="w-8 h-8 text-slate-200 mb-2" />
                    <h4 className="text-xs font-bold text-slate-800">No resources attached</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Check back later for downloadable files.</p>
                  </div>
                ) : (
                  lessonResources.map((res: any) => (
                    <div key={res.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-100 transition-all duration-300">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#7c3aed] flex items-center justify-center border border-purple-100 shadow-2xs">
                          <Download className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-900 line-clamp-1">{res.title}</p>
                          <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{res.size} · {res.type.toUpperCase()}</p>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#7c3aed] hover:text-[#7c3aed] text-[10px] font-extrabold shadow-2xs transition-all cursor-pointer shrink-0">
                        Download
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'discussion' && (
              <div className="flex flex-col h-full space-y-4 text-left select-text pointer-events-auto">
                <div className="flex gap-3 mb-4 shrink-0">
                  <Avatar name={user.name} size="sm" />
                  <div className="flex-1 space-y-2">
                    <textarea 
                      value={lessonCommentText}
                      onChange={(e) => setLessonCommentText(e.target.value)}
                      placeholder="Ask a question or share your thoughts..." 
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 outline-none text-xs font-semibold text-slate-900 min-h-[70px] resize-none" 
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={handlePostLessonComment}
                        className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[10px] font-extrabold shadow-md transition-all cursor-pointer"
                      >
                        Post Comment
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pt-4 border-t border-slate-100">
                  {lessonComments.length === 0 ? (
                    <div className="text-center py-6">
                      <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-slate-800">No discussions yet</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Be the first to start a conversation for this lesson.</p>
                    </div>
                  ) : (
                    lessonComments.map((comment) => (
                      <div key={comment.id} className="flex gap-2.5 items-start p-2.5 rounded-2xl hover:bg-slate-50 transition-colors duration-200 border border-transparent hover:border-slate-100">
                        <Avatar name={comment.author} size="sm" className="bg-purple-100 text-purple-700" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-800">{comment.author}</span>
                            <span className="text-[9px] font-semibold text-slate-400">{comment.time}</span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-600 mt-1 leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
