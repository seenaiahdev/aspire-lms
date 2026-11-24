import { useState, useEffect, useMemo, useCallback } from 'react';

import { liveClassesSteps } from '@/lib/tourSteps';
import { 
  Radio, Calendar, Play, Pause, ArrowRight, ChevronLeft, ChevronRight, Clock, Video, MessageCircle, 
  FileText, Hand, Users2, BarChart3, Download, Mic, MicOff, VideoOff, 
  Monitor, PhoneOff, Send, Volume2, Maximize2, HelpCircle, BellRing, CheckCircle2, X, Bell,
  SkipBack, SkipForward, Bookmark, CalendarX, Lock, Search, Filter, LayoutGrid, List, RotateCcw,
  CalendarDays, Sparkles, Presentation as PresentationIcon, ExternalLink
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { useUser } from '@/lib/UserContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { StatusChip } from '@/components/ui/StatusChip';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn, resolveLiveClassStatus, parseSessionStart } from '@/lib/utils';
import { fetchAllLiveSessions, fetchCoursesByIds, fetchRecordings, fetchPresentations, PresentationRecord } from '@/lib/api';
import { useUnlockResolver } from '@/lib/lessonLinkResolver';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { supabase } from '@/lib/supabase';
import { getCached, invalidateCacheByPrefix } from '@/lib/queryCache';
import { useToast } from '@/lib/ToastContext';
import { LiveClassroomSkeleton, LiveSessionCardSkeleton, RecordingCardSkeleton } from '@/components/ui/Skeleton';

export function LiveClassesScreen() {
  const { navigate, params, route } = useNav();
  const { user } = useUser();
  const toast = useToast();
  const batchCode = user.batchCode || 'A26W1';
  const { isUnlocked, isEntityUnlocked, resolver } = useUnlockResolver();
  const [tab, setTab] = useState(() => {
    const searchTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    const effectiveTab = params.tab || searchTab;
    if (route === 'recordings' || effectiveTab === 'completed' || effectiveTab === 'recordings') return 'completed';
    if (effectiveTab === 'classroom') return 'classroom';
    return effectiveTab || localStorage.getItem('aspire_live_tab') || 'upcoming';
  });

  useEffect(() => {
    const searchTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    const effectiveTab = params.tab || searchTab;
    if (route === 'recordings' || effectiveTab === 'completed' || effectiveTab === 'recordings') {
      setTab('completed');
    } else if (effectiveTab === 'classroom') {
      setTab('classroom');
    } else if (route === 'live' && (!effectiveTab || effectiveTab === 'upcoming')) {
      setTab('upcoming');
    }
  }, [route, params.tab]);
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  // Synchronous cache hydration: instant 0ms mount from in-memory or sessionStorage cache
  const recordingsKey = `recordings:${batchCode || ''}:${user.batchCategory || ''}:${(user.enrolledCourses || []).sort().join(',')}`;
  const [dbSessions, setDbSessions] = useState<any[]>(() => {
    try {
      const memLive = getCached<any[]>(`all_live_sessions:${batchCode}`);
      const memRec = getCached<any[]>(recordingsKey);
      if ((Array.isArray(memLive) && memLive.length > 0) || (Array.isArray(memRec) && memRec.length > 0)) {
        const set = new Set<string>();
        const res: any[] = [];
        (memLive || []).forEach((item) => { if (!set.has(item.id)) { set.add(item.id); res.push(item); } });
        (memRec || []).forEach((item) => { if (!set.has(item.id)) { set.add(item.id); res.push(item); } });
        return res;
      }
      const cached = sessionStorage.getItem(`aspire_live_sessions_${batchCode}`) || localStorage.getItem(`aspire_live_sessions_${batchCode}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [sessionsLoading, setSessionsLoading] = useState(() => {
    try {
      const memLive = getCached<any[]>(`all_live_sessions:${batchCode}`);
      const memRec = getCached<any[]>(recordingsKey);
      if ((Array.isArray(memLive) && memLive.length > 0) || (Array.isArray(memRec) && memRec.length > 0)) return false;
      const cached = sessionStorage.getItem(`aspire_live_sessions_${batchCode}`) || localStorage.getItem(`aspire_live_sessions_${batchCode}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });
  const [userCourses, setUserCourses] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadUserCourses() {
      try {
        const enrolled = user.enrolledCourses || [];
        if (enrolled.length === 0) {
          setUserCourses([]);
          return;
        }
        const data = await fetchCoursesByIds(enrolled);
        setUserCourses(data || []);
      } catch (err) {
        console.error("Failed to load user courses:", err);
      }
    }
    loadUserCourses();
  }, [user.enrolledCourses]);

  const primaryCourseTitle = userCourses[0]?.title || '';

  // Presentations state for Classroom tab & live session quick reference
  const [presentations, setPresentations] = useState<PresentationRecord[]>([]);
  const [presentationsLoading, setPresentationsLoading] = useState(false);
  const [classroomSearch, setClassroomSearch] = useState('');
  const [classroomStage, setClassroomStage] = useState('all');
  const [classroomVisibleCount, setClassroomVisibleCount] = useState(12);

  useEffect(() => {
    let timeoutId: any = null;
    async function loadPresentations() {
      setPresentationsLoading(true);
      try {
        const data = await fetchPresentations(user.enrolledCourses);
        setPresentations(data || []);
      } catch (err) {
        console.error('Failed to load presentations:', err);
      } finally {
        setPresentationsLoading(false);
      }
    }

    if (tab === 'classroom') {
      loadPresentations();
    } else {
      // Defer presentation loading so it never competes with initial live session display
      timeoutId = setTimeout(() => {
        loadPresentations();
      }, 1500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user.enrolledCourses, tab]);

  const isPptUnlocked = useCallback((ppt: PresentationRecord) => {
    if (!user?.unlockedLessonIds || user.unlockedLessonIds.length === 0) return false;
    if (user.unlockedLessonIds.includes(ppt.inner_topic_id)) return true;
    if (resolver && user.unlockedLessonIds.includes(resolver.resolveLessonId(ppt.inner_topic_id))) return true;
    return isEntityUnlocked(ppt) || isUnlocked(ppt.inner_topic_id);
  }, [user?.unlockedLessonIds, resolver, isEntityUnlocked, isUnlocked]);

  // Only currently unlocked presentations appear in the Classroom tab
  const unlockedPresentations = useMemo(() => {
    return presentations.filter(isPptUnlocked);
  }, [presentations, isPptUnlocked]);

  const classroomStageOptions = useMemo(() => {
    const set = new Set<string>();
    unlockedPresentations.forEach((p) => {
      if (p.stage_name) set.add(p.stage_name);
    });
    return Array.from(set);
  }, [unlockedPresentations]);

  const filteredClassroomPresentations = useMemo(() => {
    let list = unlockedPresentations;
    if (classroomStage !== 'all') {
      list = list.filter((p) => p.stage_name === classroomStage);
    }
    if (classroomSearch.trim()) {
      const q = classroomSearch.trim().toLowerCase();
      list = list.filter((p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.lesson_name && p.lesson_name.toLowerCase().includes(q)) ||
        (p.subtopic_name && p.subtopic_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [unlockedPresentations, classroomStage, classroomSearch]);

  useEffect(() => {
    setClassroomVisibleCount(12);
  }, [classroomSearch, classroomStage]);

  const hasMoreClassroom = classroomVisibleCount < filteredClassroomPresentations.length;

  const classroomSentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasMore: hasMoreClassroom,
    loading: false,
    onLoadMore: () => {
      setClassroomVisibleCount((prev) => Math.min(prev + 12, filteredClassroomPresentations.length));
    },
  });

  const paginatedClassroomPresentations = useMemo(() => {
    return filteredClassroomPresentations.slice(0, classroomVisibleCount);
  }, [filteredClassroomPresentations, classroomVisibleCount]);

  const getSessionPpt = useCallback((cls: any) => {
    if (!presentations || presentations.length === 0) return null;
    let modId = cls.lessonId || cls.moduleId || '';
    if (!modId && cls.description) {
      try {
        const parsed = typeof cls.description === 'string' ? JSON.parse(cls.description) : cls.description;
        modId = parsed?.moduleId || parsed?.lessonId || '';
      } catch {}
    }
    if (modId) {
      const match = presentations.find(
        (p) => p.inner_topic_id === modId || (resolver && resolver.resolveLessonId(p.inner_topic_id) === modId)
      );
      if (match) return match;
    }
    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = norm(cls.title || cls.session_title);
    if (target) {
      const exactMatch = presentations.find((p) => norm(p.title) === target || norm(p.lesson_name) === target);
      if (exactMatch) return exactMatch;

      const fuzzyMatch = presentations.find((p) => {
        const pt = norm(p.title);
        const pl = norm(p.lesson_name);
        return (pt && (pt.includes(target) || target.includes(pt))) ||
               (pl && (pl.includes(target) || target.includes(pl)));
      });
      if (fuzzyMatch) return fuzzyMatch;
    }
    return null;
  }, [presentations, resolver]);

  // Check if session belongs to one of the student's enrolled courses
  const sessionMatchesEnrolled = useCallback((cls: any) => {
    if (!user.enrolledCourses || user.enrolledCourses.length === 0) return false;

    const enrolledIds = new Set(user.enrolledCourses.map(String));
    const enrolledTitles = userCourses
      .map(c => String(c.title || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim())
      .filter(Boolean);

    let meta: any = null;
    try {
      meta = typeof cls.description === 'string' ? JSON.parse(cls.description) : cls.description;
    } catch {}

    let instrMeta: any = null;
    try {
      instrMeta = typeof cls.instructions === 'string' ? JSON.parse(cls.instructions) : cls.instructions;
    } catch {}

    const cId = cls.course_id || meta?.courseId || instrMeta?.courseId;
    const cName = cls.course_name || meta?.courseName || instrMeta?.courseName;

    // If session specifies a course ID
    if (cId) {
      if (enrolledIds.has(String(cId))) return true;
      if (cName) {
        const normC = String(cName).toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        return enrolledTitles.some(t => t.includes(normC) || normC.includes(t));
      }
      return false;
    }

    // If session specifies a course name
    if (cName) {
      const normC = String(cName).toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
      return enrolledTitles.some(t => t.includes(normC) || normC.includes(t));
    }

    // If session has technology that is not 'General'
    const tech = String(cls.technology || '').trim().toLowerCase();
    if (tech && tech !== 'general' && tech !== 'core programming') {
      return enrolledTitles.some(t => t.includes(tech) || tech.includes(t));
    }

    // Truly general class with no course metadata
    return !meta?.courseId && !meta?.courseName;
  }, [user.enrolledCourses, userCourses]);

  // Shared per-row mapper (used by both the full upcoming/live list and the paginated completed list).
  const mapSession = useCallback((cls: any, now: Date) => {
    const { status: resolvedStatus, joinable } = resolveLiveClassStatus(
      cls.date, cls.time, cls.duration, cls.status, 10, now
    );
    let descCourse = '';
    let metaCourseId = cls.course_id || '';
    let metaLessonId = cls.module_id || cls.lesson_id || '';
    try {
      const meta = typeof cls.description === 'string' ? JSON.parse(cls.description) : cls.description;
      if (meta?.courseName) descCourse = meta.courseName;
      if (meta?.courseId && !metaCourseId) metaCourseId = meta.courseId;
      if (meta?.moduleId && !metaLessonId) metaLessonId = meta.moduleId;
      if (meta?.lessonId && !metaLessonId) metaLessonId = meta.lessonId;
    } catch {}
    try {
      const instr = typeof cls.instructions === 'string' ? JSON.parse(cls.instructions) : cls.instructions;
      if (instr?.courseName && !descCourse) descCourse = instr.courseName;
      if (instr?.courseId && !metaCourseId) metaCourseId = instr.courseId;
      if (instr?.moduleId && !metaLessonId) metaLessonId = instr.moduleId;
      if (instr?.lessonId && !metaLessonId) metaLessonId = instr.lessonId;
    } catch {}

    let courseName = descCourse || (cls.technology || '').trim();
    if (!courseName || courseName.toLowerCase() === 'general' || courseName.toLowerCase() === 'core programming') {
      courseName = primaryCourseTitle || 'Live Session';
    }

    // Resolve course thumbnail: match by courseId first, then by course name, then fallback
    const matchedCourse = userCourses.find((c: any) => c.id === metaCourseId)
      || userCourses.find((c: any) => c.title && courseName && c.title.toLowerCase() === courseName.toLowerCase())
      || userCourses[0];
    const courseThumbnail = cls.thumbnail_url || matchedCourse?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';

    return {
      id: cls.id,
      title: cls.session_title,
      course: courseName,
      courseId: metaCourseId,
      lessonId: metaLessonId,
      date: cls.date || '',
      time: cls.time || '',
      target_batch: cls.target_batch || cls.batch_code || '',
      instructor: { name: cls.instructor || 'Lead Trainer', avatar: '', title: 'Course Trainer' },
      scheduledAt: cls.date && cls.time ? `${cls.date} at ${cls.time.slice(0, 5)}` : (cls.date || 'TBD'),
      duration: cls.duration || '1h 30m',
      participants: 120,
      status: resolvedStatus,
      joinable,
      thumbnail: courseThumbnail,
      link: cls.meeting_link || '',
      isRecording: Boolean(cls.isRecording || cls.video_url || cls.recording_url)
    };
  }, [primaryCourseTitle, userCourses]);

  const loadSessions = useCallback(async (showLoading = false) => {
    if (showLoading && dbSessions.length === 0) {
      setSessionsLoading(true);
    }
    try {
      // 1. Fetch live sessions first (fast path for "Upcoming & Live")
      const livePromise = fetchAllLiveSessions(batchCode);

      // Fast settlement for "Upcoming & Live" (100ms or 0ms if cached)
      livePromise.then((liveData) => {
        if (liveData && liveData.length > 0) {
          setDbSessions((prev) => {
            const recOnly = prev.filter((s: any) => s.isRecording);
            const liveIds = new Set(liveData.map((s: any) => s.id));
            const retainedRec = recOnly.filter((r: any) => !liveIds.has(r.id));
            const next = [...liveData, ...retainedRec];
            try {
              sessionStorage.setItem(`aspire_live_sessions_${batchCode}`, JSON.stringify(next));
            } catch {}
            return next;
          });
          setSessionsLoading(false);
        }
      }).catch((err) => {
        console.warn('Live sessions fast-path error:', err);
      });

      // 2. Fetch recordings concurrently in background without blocking
      const recPromise = fetchRecordings(batchCode, user.batchCategory, user.enrolledCourses);

      const [liveData, recData] = await Promise.all([livePromise, recPromise]);

      const normalizedRecordings = (recData || []).map((r: any) => {
        let parsedCourseId = r.course_id || '';
        let parsedLessonId = r.module_id || r.lesson_id || '';
        if (r.instructions) {
          try {
            const parsed = typeof r.instructions === 'string' ? JSON.parse(r.instructions) : r.instructions;
            if (parsed?.courseId) parsedCourseId = parsed.courseId;
            if (parsed?.moduleId) parsedLessonId = parsed.moduleId;
            if (parsed?.lessonId) parsedLessonId = parsed.lessonId;
          } catch {}
        }
        if (!parsedCourseId && r.description) {
          try {
            const parsed = typeof r.description === 'string' ? JSON.parse(r.description) : r.description;
            if (parsed?.courseId) parsedCourseId = parsed.courseId;
            if (parsed?.moduleId && !parsedLessonId) parsedLessonId = parsed.moduleId;
            if (parsed?.lessonId && !parsedLessonId) parsedLessonId = parsed.lessonId;
          } catch {}
        }
        return {
          id: r.id,
          session_title: r.title || r.concept_name,
          technology: r.technology || '',
          date: r.posted_date || (r.created_at ? r.created_at.slice(0, 10) : ''),
          time: '10:00 AM - 11:30 AM',
          meeting_link: r.video_url,
          status: 'completed',
          instructor: r.instructor || 'Lead Trainer',
          description: r.description || r.instructions,
          instructions: r.instructions,
          course_id: parsedCourseId,
          module_id: parsedLessonId,
          target_batch: r.target_batch,
          batch_code: batchCode,
          duration: r.duration || '1h 30m',
          video_url: r.video_url,
          thumbnail_url: r.thumbnail,
          isRecording: true
        };
      });

      const existingIds = new Set((liveData || []).map((s: any) => s.id));
      const combined = [...(liveData || [])];
      for (const r of normalizedRecordings) {
        if (!existingIds.has(r.id)) {
          combined.push(r);
        }
      }

      setDbSessions(combined);
      try {
        sessionStorage.setItem(`aspire_live_sessions_${batchCode}`, JSON.stringify(combined));
      } catch {}
    } catch (err) {
      console.error("Failed to load live sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, [batchCode, user.batchCategory, user.enrolledCourses, dbSessions.length]);

  useEffect(() => {
    loadSessions(dbSessions.length === 0);
  }, [loadSessions]);

  // Realtime subscription: auto-refresh when classes finish or recordings are published
  useEffect(() => {
    let debounceTimer: any = null;

    const handleRealtime = () => {
      invalidateCacheByPrefix('all_live_sessions:');
      invalidateCacheByPrefix('live_sessions:');
      invalidateCacheByPrefix('recordings:');
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadSessions(false);
      }, 200);
    };

    const channel = supabase
      .channel(`live_classes_realtime_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recordings' },
        handleRealtime
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        handleRealtime
      )
      .subscribe();

    const handleFocus = () => {
      loadSessions(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [loadSessions]);

  const mappedSessions = useMemo(() => {
    // 1. Filter sessions for student's enrolled courses
    const forStudent = dbSessions.filter(sessionMatchesEnrolled);

    // 2. Map and resolve status using current real-time clock
    const mapped = forStudent.map(cls => mapSession(cls, currentTime));

    // 3. Sort: Ongoing (LIVE NOW) first, then upcoming chronologically by start time
    mapped.sort((a, b) => {
      if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
      if (a.status !== 'ongoing' && b.status === 'ongoing') return 1;

      if (a.status === 'upcoming' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status === 'upcoming') return 1;

      const timeA = parseSessionStart(a.date, a.time)?.getTime() ?? 0;
      const timeB = parseSessionStart(b.date, b.time)?.getTime() ?? 0;
      return timeA - timeB;
    });

    return mapped;
  }, [dbSessions, mapSession, sessionMatchesEnrolled, currentTime]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('aspire_live_view_mode') as 'grid' | 'list') || 'list';
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('aspire_live_view_mode', mode);
  };

  const [classroomViewMode, setClassroomViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('aspire_classroom_view_mode') as 'grid' | 'list') || 'grid';
  });

  const handleClassroomViewModeChange = (mode: 'grid' | 'list') => {
    setClassroomViewMode(mode);
    localStorage.setItem('aspire_classroom_view_mode', mode);
  };

  // ── Recordings (completed tab): pagination (10 per page) ──
  const RECORDINGS_PER_PAGE = 10;
  const [recordingsPage, setRecordingsPage] = useState<number>(1);
  useEffect(() => { setRecordingsPage(1); }, [tab, searchQuery, selectedTech, dateFilter, customDate]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedTech !== 'all' || dateFilter !== 'all' || customDate !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTech('all');
    setDateFilter('all');
    setCustomDate('');
  };

  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    // Add user's enrolled / unlocked courses from My Learning
    userCourses.forEach((c) => {
      if (c.title) set.add(c.title);
    });
    if (set.size === 0) {
      set.add(primaryCourseTitle);
    }
    // Also add any other distinct course names from mapped sessions (excluding "General")
    mappedSessions.forEach((s) => {
      if (s.course && s.course.toLowerCase() !== 'general' && s.course.toLowerCase() !== 'core programming') {
        set.add(s.course);
      }
    });
    return Array.from(set);
  }, [userCourses, primaryCourseTitle, mappedSessions]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    localStorage.setItem('aspire_live_tab', newTab);
    if (newTab === 'completed') {
      if (route !== 'recordings') navigate('recordings');
    } else if (newTab === 'classroom') {
      if (route !== 'live' || params.tab !== 'classroom') navigate('live', { tab: 'classroom' });
    } else {
      if (route !== 'live' || params.tab) navigate('live');
    }
  };

  const [activeRecording, setActiveRecording] = useState<any | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(true);

  const handleToggleReminder = (cls: any) => {
    const isCurrentlySet = reminders[cls.id];
    setReminders((prev) => ({ ...prev, [cls.id]: !isCurrentlySet }));
    
    if (!isCurrentlySet) {
      setToastMessage({
        title: 'Success!',
        desc: `You'll be notified when ${cls.title} starts.`,
      });
    } else {
      setToastMessage({
        title: 'Notification Removed',
        desc: `You will no longer receive reminders for this class.`,
      });
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleWatchRecording = async (cls: any) => {
    const defaultCourseId = user.enrolledCourses?.[0] || 'crs-1786624019154-w';
    const courseId = cls.courseId || defaultCourseId;

    // 1. If the recording already carries a direct lessonId, open that lesson immediately
    if (cls.lessonId) {
      navigate('lesson', { id: courseId, lesson: cls.lessonId });
      return;
    }

    // 2. Try to find the matching lesson by title in course_lessons
    try {
      const cleanTitle = (cls.title || '').trim().split(',')[0].split('&')[0].trim();
      if (cleanTitle) {
        const { data: matchedLessons } = await supabase
          .from('course_lessons')
          .select('id, course_id')
          .ilike('title', `%${cleanTitle}%`)
          .limit(1);

        if (matchedLessons && matchedLessons.length > 0) {
          const matched = matchedLessons[0];
          navigate('lesson', {
            id: matched.course_id || courseId,
            lesson: matched.id
          });
          return;
        }
      }
    } catch (err) {
      console.error('Error finding lesson for recording:', err);
    }

    // 3. Fallback: open the course screen (modules tab shown by default)
    navigate('course', { id: courseId });
  };

  const filtered = useMemo(() => {
    const now = currentTime;
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const yestDate = new Date(Date.now() - 86400000);
    const yestStr = `${yestDate.getFullYear()}-${String(yestDate.getMonth() + 1).padStart(2, '0')}-${String(yestDate.getDate()).padStart(2, '0')}`;

    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;

    return mappedSessions.filter((c) => {
      if (tab === 'upcoming') {
        if (c.status === 'ongoing') return true; // always show live-now sessions
        if (c.status !== 'upcoming') return false;
        // Unscheduled sessions (date is null/empty or 'TBD') must not be shown
        if (!c.date || c.date === 'TBD') return false;
        // Show all scheduled sessions for today and upcoming future dates
        return c.date >= todayStr;
      }
      if (tab === 'completed') {
        // Only show genuine recordings from recordings table, not unrecorded live sessions
        if (!c.isRecording) return false;
        if (c.status !== 'completed') return false;

        // Concept gating: if this recording belongs to a curriculum concept/lesson,
        // ensure the student's batch has reached and completed/unlocked this concept.
        const targetLessonId = c.lessonId || (resolver ? resolver.resolveEntityLessonId(c) : '');
        if (targetLessonId && !isUnlocked(targetLessonId)) {
          return false;
        }

        // Target batch isolation
        const tb = String(c.target_batch || '').toLowerCase();
        const userBatch = (batchCode || '').toLowerCase();
        const userCat = (user.batchCategory || '').toLowerCase();
        const isWeekend = userCat === 'weekend' || userBatch.includes('s') || userBatch.includes('weekend');
        const targetBatchStr = isWeekend ? 'weekend batch' : 'weekday batch';
        if (tb && !tb.includes('all') && tb !== 'all batches') {
          const matchesBatch = (userBatch && tb.includes(userBatch)) || tb.includes(targetBatchStr);
          if (!matchesBatch) return false;
        }

        // Live Class Completion Gating:
        // A recording must NEVER be displayed before the live class for that topic
        // has actually been scheduled AND completed for the student's batch!
        const liveSessionsOnly = dbSessions.filter((s: any) => !s.isRecording);
        const norm = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

        const matchingLiveSession = liveSessionsOnly.find((s: any) => {
          let sLessonId = '';
          try {
            const m = typeof s.description === 'string' ? JSON.parse(s.description) : s.description;
            sLessonId = m?.moduleId || m?.lessonId || '';
          } catch {}
          if (!sLessonId && s.instructions) {
            try {
              const instr = typeof s.instructions === 'string' ? JSON.parse(s.instructions) : s.instructions;
              sLessonId = instr?.moduleId || instr?.lessonId || '';
            } catch {}
          }
          if (targetLessonId && sLessonId && targetLessonId === sLessonId) return true;

          const normS = norm(s.session_title || s.title);
          const normC = norm(c.title);
          if (normS && normC && (normS === normC || normS.includes(normC) || normC.includes(normS))) {
            return true;
          }
          return false;
        });

        if (matchingLiveSession) {
          // If the live class is unscheduled for this student's batch, DO NOT display the recording!
          if (!matchingLiveSession.date) {
            return false;
          }
          // If scheduled, verify that the live class has actually finished!
          const { status: liveStatus } = resolveLiveClassStatus(
            matchingLiveSession.date,
            matchingLiveSession.time,
            matchingLiveSession.duration,
            matchingLiveSession.status,
            10,
            now
          );
          if (liveStatus !== 'completed') {
            // Live class is still upcoming or in progress!
            return false;
          }
        } else if (targetLessonId) {
          // This recording is tied to a curriculum lesson, but this student's batch has no live class scheduled/completed for it
          return false;
        }

        // Keyword Search (title, instructor, course, date)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTitle = (c.title || '').toLowerCase().includes(q);
          const matchesInstructor = (c.instructor?.name || '').toLowerCase().includes(q);
          const matchesCourse = (c.course || '').toLowerCase().includes(q);
          const matchesDate = (c.date || c.scheduledAt || '').toLowerCase().includes(q);
          if (!matchesTitle && !matchesInstructor && !matchesCourse && !matchesDate) return false;
        }

        // Technology / Course filter
        if (selectedTech !== 'all' && c.course !== selectedTech) {
          return false;
        }

        // Date filter
        if (dateFilter === 'today' && c.date !== todayStr) return false;
        if (dateFilter === 'yesterday' && c.date !== yestStr) return false;
        if (dateFilter === 'week' && (!c.date || c.date < weekAgoStr)) return false;
        if (dateFilter === 'custom' && customDate && c.date !== customDate) return false;

        return true;
      }
      return true;
    });
  }, [mappedSessions, dbSessions, batchCode, user.batchCategory, tab, searchQuery, selectedTech, dateFilter, customDate, isUnlocked, resolver, currentTime]);

  const totalRecordings = filtered.length;
  const totalRecordingsPages = Math.max(1, Math.ceil(totalRecordings / RECORDINGS_PER_PAGE));
  const safeRecordingsPage = Math.min(recordingsPage, totalRecordingsPages);

  const displayList = useMemo(() => {
    if (tab === 'completed') {
      const start = (safeRecordingsPage - 1) * RECORDINGS_PER_PAGE;
      return filtered.slice(start, start + RECORDINGS_PER_PAGE);
    }
    return filtered;
  }, [filtered, tab, safeRecordingsPage]);

  useEffect(() => {
    if (params?.id && tab === 'completed') {
      const el = document.getElementById(`recording-card-${params.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-purple-500', 'shadow-lg');
        const timer = setTimeout(() => {
          el.classList.remove('ring-2', 'ring-purple-500', 'shadow-lg');
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [params?.id, tab, displayList]);

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12 relative">

      <div id="tour-live-header" className="flex items-center justify-between pb-2">
        <div>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">Live Classes</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Join live sessions and watch recorded lectures.</p>
        </div>
      </div>

      {/* Tabs & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          id="tour-live-tabs"
          variant="pills"
          tabs={[
            { id: 'upcoming', label: 'Upcoming & Live' },
            { id: 'completed', label: 'Recordings' },
            { id: 'classroom', label: 'Classroom' },
          ]}
          active={tab}
          onChange={handleTabChange}
        />

        {/* View Mode on Recordings or Classroom tab */}
        {(tab === 'completed' || tab === 'classroom') && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-end sm:self-auto shrink-0">
            <button
              onClick={() => tab === 'classroom' ? handleClassroomViewModeChange('grid') : handleViewModeChange('grid')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                (tab === 'classroom' ? classroomViewMode === 'grid' : viewMode === 'grid') ? "bg-purple-50 text-[#7c3aed] border border-purple-200" : "text-slate-400 hover:text-slate-700"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => tab === 'classroom' ? handleClassroomViewModeChange('list') : handleViewModeChange('list')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                (tab === 'classroom' ? classroomViewMode === 'list' : viewMode === 'list') ? "bg-purple-50 text-[#7c3aed] border border-purple-200" : "text-slate-400 hover:text-slate-700"
              )}
              title="Compact List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── STRESS-FREE SEARCH & FILTER TOOLBAR FOR RECORDINGS ── */}
      {tab === 'completed' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search recordings by topic, lesson, trainer, or date..."
                className="w-full bg-slate-50"
              />
            </div>

            {/* Course Filter */}
            <div className="w-full md:w-64 shrink-0">
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#7c3aed] transition-colors"
              >
                <option value="all">All Courses</option>
                {courseOptions.map((cName) => (
                  <option key={cName} value={cName}>{cName}</option>
                ))}
              </select>
            </div>

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Date Filter Quick Pills + Custom Calendar Picker */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <CalendarDays className="w-3.5 h-3.5 text-[#7c3aed]" /> Filter Date:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All Dates' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Past 7 Days' },
                { id: 'custom', label: 'Pick Date' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDateFilter(d.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all",
                    dateFilter === d.id
                      ? "bg-purple-50 text-[#7c3aed] border border-purple-200 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                  )}
                >
                  {d.label}
                </button>
              ))}

              {dateFilter === 'custom' && (
                <div className="flex items-center gap-1.5 pl-1 animate-fade-in">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="px-3 py-1.5 bg-purple-50/50 border border-purple-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#7c3aed]"
                  />
                  {customDate && (
                    <button
                      onClick={() => setCustomDate('')}
                      className="text-slate-400 hover:text-slate-600 p-1 text-xs"
                      title="Clear custom date"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDINGS & SESSIONS LIST/GRID VIEW ── */}
      {tab === 'classroom' ? (
        <div className="space-y-6">
          {/* Classroom Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1">
                <SearchInput
                  value={classroomSearch}
                  onChange={setClassroomSearch}
                  placeholder="Search unlocked presentation slides by topic, module, or title..."
                  className="w-full bg-slate-50"
                />
              </div>

              {classroomStageOptions.length > 0 && (
                <div className="w-full sm:w-64 shrink-0">
                  <select
                    value={classroomStage}
                    onChange={(e) => setClassroomStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#7c3aed] transition-colors"
                  >
                    <option value="all">All Curriculum Stages</option>
                    {classroomStageOptions.map((stg) => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>
              )}

              {(classroomSearch || classroomStage !== 'all') && (
                <button
                  onClick={() => {
                    setClassroomSearch('');
                    setClassroomStage('all');
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Classroom Decks Grid */}
          {presentationsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredClassroomPresentations.length === 0 ? (
            <div className="py-16 px-6 bg-white border border-slate-200/90 rounded-[2rem] text-center flex flex-col items-center justify-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] shadow-xs">
                <PresentationIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                  {classroomSearch || classroomStage !== 'all'
                    ? "No Matching Presentations Found"
                    : "No Unlocked Presentations Yet"}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm max-w-md font-medium mt-1">
                  {classroomSearch || classroomStage !== 'all'
                    ? "Try adjusting your search query or stage filters to view other slides."
                    : "Presentations are unlocked as you complete milestone lessons in your learning roadmap. Check back as you advance!"}
                </p>
              </div>
              {(classroomSearch || classroomStage !== 'all') && (
                <button
                  onClick={() => {
                    setClassroomSearch('');
                    setClassroomStage('all');
                  }}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Show All Unlocked Decks
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {classroomViewMode === 'list' ? (
                <div className="space-y-3">
                  {paginatedClassroomPresentations.map((ppt) => (
                    <div
                      key={ppt.id}
                      onClick={() => {
                        localStorage.setItem('aspire_live_tab', 'classroom');
                        navigate('presentation', { id: ppt.id, from: 'classroom' });
                      }}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <PresentationIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {ppt.subtopic_name && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-500 truncate">
                                {ppt.subtopic_name}
                              </span>
                            </div>
                          )}
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-[#7c3aed] transition-colors leading-snug truncate">
                            {ppt.title || ppt.lesson_name}
                          </h4>
                          {ppt.lesson_name && (
                            <p className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1.5 mt-0.5">
                              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Lesson: {ppt.lesson_name}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center self-end sm:self-center">
                        <a
                          href={`/presentation?id=${ppt.id}&from=classroom`}
                          onClick={(e) => {
                            if (!e.ctrlKey && !e.metaKey) {
                              e.preventDefault();
                              e.stopPropagation();
                              localStorage.setItem('aspire_live_tab', 'classroom');
                              navigate('presentation', { id: ppt.id, from: 'classroom' });
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-[#7c3aed] text-[#7c3aed] hover:text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-2xs group-hover:bg-[#7c3aed] group-hover:text-white active:scale-95"
                        >
                          <span>Open Slides</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedClassroomPresentations.map((ppt) => (
                    <div
                      key={ppt.id}
                      onClick={() => {
                        localStorage.setItem('aspire_live_tab', 'classroom');
                        navigate('presentation', { id: ppt.id, from: 'classroom' });
                      }}
                      className="p-5 rounded-[1.5rem] bg-white border border-slate-200/90 hover:border-purple-300 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                    >
                      <div>
                        {/* Top Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0">
                            <PresentationIcon className="w-4 h-4" />
                          </div>
                          {ppt.subtopic_name && (
                            <span className="text-[11px] font-bold text-slate-500 truncate max-w-[200px]">
                              {ppt.subtopic_name}
                            </span>
                          )}
                        </div>

                        {/* Presentation Title */}
                        <h4 className="font-extrabold text-base text-slate-900 group-hover:text-[#7c3aed] transition-colors leading-snug line-clamp-2 mb-2">
                          {ppt.title || ppt.lesson_name}
                        </h4>

                        {/* Lesson & Subtopic Meta */}
                        <div className="space-y-1.5 text-xs text-slate-500 font-semibold mb-4">
                          {ppt.subtopic_name && (
                            <p className="line-clamp-1 flex items-center gap-1.5 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                              <span>{ppt.subtopic_name}</span>
                            </p>
                          )}
                          {ppt.lesson_name && (
                            <p className="line-clamp-1 flex items-center gap-1.5 text-slate-500">
                              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Lesson: {ppt.lesson_name}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                        <a
                          href={`/presentation?id=${ppt.id}&from=classroom`}
                          onClick={(e) => {
                            if (!e.ctrlKey && !e.metaKey) {
                              e.preventDefault();
                              e.stopPropagation();
                              localStorage.setItem('aspire_live_tab', 'classroom');
                              navigate('presentation', { id: ppt.id, from: 'classroom' });
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-[#7c3aed] text-[#7c3aed] hover:text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-2xs group-hover:bg-[#7c3aed] group-hover:text-white active:scale-95"
                        >
                          <span>Open Slides</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Scroll Sentinel for Infinite Pagination */}
              {hasMoreClassroom && (
                <div ref={classroomSentinelRef} className="py-8 flex justify-center items-center gap-2 text-xs font-bold text-slate-400">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading more presentations...</span>
                </div>
              )}

              {!hasMoreClassroom && filteredClassroomPresentations.length > 0 && (
                <div className="py-6 text-center text-xs font-bold text-slate-400">
                  All {filteredClassroomPresentations.length} unlocked presentations loaded
                </div>
              )}
            </div>
          )}
        </div>
      ) : sessionsLoading ? (
        tab === 'completed' ? (
          <RecordingCardSkeleton count={6} viewMode={viewMode} />
        ) : (
          <LiveSessionCardSkeleton count={2} />
        )
      ) : displayList.length === 0 ? (
        <div className="col-span-full py-16 px-6 bg-white border border-slate-200/90 rounded-[2rem] text-center flex flex-col items-center justify-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] shadow-xs">
            {hasActiveFilters ? <Search className="w-8 h-8" /> : <CalendarX className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
              {hasActiveFilters 
                ? "No Recordings Found" 
                : tab === 'completed'
                  ? "No Recordings Available"
                  : "Not Yet Scheduled"}
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md font-medium mt-1">
              {hasActiveFilters 
                ? "No recordings match your current search, technology, or date filters. Try changing your filters." 
                : tab === 'completed'
                  ? "There are currently no recorded lectures available for your enrolled course."
                  : "There are currently no live sessions scheduled for your enrolled course. Check back soon!"}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters & Show All
            </button>
          )}
        </div>
      ) : (
        <div>
          {viewMode === 'list' && tab === 'completed' ? (
            /* ── COMPACT LIST VIEW FOR STRESS-FREE BROWSING ── */
            <div className="space-y-3">
          {displayList.map((cls) => (
            <div 
              key={cls.id} 
              id={`recording-card-${cls.id}`}
              onClick={() => handleWatchRecording(cls)}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-purple-300 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] group-hover:bg-[#7c3aed] group-hover:text-white transition-all shrink-0 shadow-2xs">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-[#7c3aed] text-[10px] font-black uppercase tracking-wider border border-purple-100">
                      {cls.course}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> {cls.scheduledAt}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {cls.duration}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-[#7c3aed] transition-colors line-clamp-1">
                    {cls.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <span>Instructor:</span>
                    <span className="text-slate-800 font-bold">{cls.instructor.name}</span>
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {(() => {
                  const sessionPpt = getSessionPpt(cls);
                  if (sessionPpt && (cls.status === 'completed' || isPptUnlocked(sessionPpt))) {
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('presentation', { id: sessionPpt.id, from: 'classroom' });
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-200 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
                        title="View Class Slides"
                      >
                        <PresentationIcon className="w-3.5 h-3.5" />
                        <span>Slides</span>
                      </button>
                    );
                  }
                  return null;
                })()}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWatchRecording(cls);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Watch Recording
                </button>
              </div>
            </div>
          ))}
        </div>
          ) : (
            /* ── GRID CARD VIEW ── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {displayList.map((cls, index) => {
            const isReminderSet = reminders[cls.id];
            return (
              <Card key={cls.id} id={`recording-card-${cls.id}`} className="relative overflow-hidden group border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
                <div 
                  className="relative h-44 overflow-hidden cursor-pointer"
                  onClick={() => {
                    if (cls.status === 'completed') {
                      handleWatchRecording(cls);
                    } else if (cls.status === 'ongoing') {
                      if (cls.link) {
                        window.open(cls.link, '_blank');
                      } else {
                        toast.info('Meeting link is not available yet. Please check back shortly.');
                      }
                    }
                  }}
                >
                  <img src={cls.thumbnail} alt={cls.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  
                  {cls.status === 'ongoing' && (
                    <div className="absolute top-3 left-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                        </span>
                        LIVE NOW
                      </div>
                    </div>
                  )}
                  {cls.status === 'completed' && (
                    <>
                      {/* Top Right Recorded Status badge */}
                      <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-md">
                        <Play className="w-3 h-3 text-purple-300 fill-purple-300" />
                        <span className="text-[9px] font-black text-purple-200 tracking-wider uppercase">Recorded</span>
                      </div>
                      {/* Center Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-[#7c3aed] transition-all shadow-lg">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <p className="text-white font-extrabold text-base sm:text-lg leading-tight mb-0.5 drop-shadow-md">{cls.title}</p>
                    <p className="text-white/80 text-xs font-semibold drop-shadow-sm">{cls.course}</p>
                  </div>
              </div>
              
              <CardBody className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar src={cls.instructor.avatar} name={cls.instructor.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{cls.instructor.name}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{cls.instructor.title}</p>
                  </div>
                  <StatusChip status={cls.status} />
                </div>
                
                <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap text-xs font-semibold text-slate-500 mb-5 pt-4 border-t border-slate-100">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />{cls.scheduledAt}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{cls.duration}</span>
                </div>
                
                {cls.status === 'ongoing' ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (cls.link) {
                          window.open(cls.link, '_blank');
                        } else {
                          toast.info('Meeting link is not available yet. Please check back shortly.');
                        }
                      }} 
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Radio className="w-4 h-4" /> Join Live Class on Zoom
                    </button>
                    {(() => {
                      const sessionPpt = getSessionPpt(cls);
                      if (sessionPpt && isPptUnlocked(sessionPpt)) {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('presentation', { id: sessionPpt.id, from: 'classroom' });
                            }}
                            className="px-3.5 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-200 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
                            title="View Live Class Slides (View Only)"
                          >
                            <PresentationIcon className="w-4 h-4" />
                            <span>Slides</span>
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : cls.status === 'completed' ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleWatchRecording(cls)}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" /> Watch Recording
                    </button>
                    {(() => {
                      const sessionPpt = getSessionPpt(cls);
                      if (sessionPpt && (cls.status === 'completed' || isPptUnlocked(sessionPpt))) {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('presentation', { id: sessionPpt.id, from: 'classroom' });
                            }}
                            className="px-3.5 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-200 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
                            title="View Class Slides"
                          >
                            <PresentationIcon className="w-4 h-4" />
                            <span>Slides</span>
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <button 
                    onClick={() => handleToggleReminder(cls)}
                    className={cn(
                      "w-full py-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 border shadow-2xs active:scale-95",
                      isReminderSet 
                        ? "bg-purple-50 text-[#7c3aed] border-purple-200 hover:bg-purple-100" 
                        : "bg-slate-50 hover:bg-purple-50/50 text-slate-700 hover:text-[#7c3aed] border-slate-200 hover:border-purple-200"
                    )}
                  >
                    {isReminderSet ? (
                      <>
                        <BellRing className="w-4 h-4 text-[#7c3aed] animate-pulse" />
                        <span>Reminder Set (Notified 🔔)</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-[#7c3aed]" />
                        <span>Set Reminder</span>
                      </>
                    )}
                  </button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
          )}

          {tab === 'completed' && totalRecordingsPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200/80 mt-6">
            <p className="text-xs font-semibold text-slate-500">
              Page <span className="font-bold text-slate-900">{safeRecordingsPage}</span> of <span className="font-bold text-slate-900">{totalRecordingsPages}</span>
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setRecordingsPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={safeRecordingsPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalRecordingsPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => {
                      setRecordingsPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      "w-8 h-8 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center",
                      safeRecordingsPage === page
                        ? "bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white shadow-xs scale-105"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setRecordingsPage((p) => Math.min(totalRecordingsPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={safeRecordingsPage === totalRecordingsPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-3 right-6 z-[100] animate-fade-in max-w-sm sm:max-w-md font-sans">
          <div className="bg-[#e6f4ea] border border-[#ceead6] rounded-[1.25rem] px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm flex items-start gap-3 backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-[#137333] stroke-[2.2] shrink-0 mt-0.5" />
            <div className="flex-1 pr-1 min-w-0">
              <h4 className="font-bold text-base sm:text-lg text-[#137333] tracking-tight leading-tight">{toastMessage.title}</h4>
              <p className="text-xs sm:text-sm font-normal text-[#137333] leading-snug mt-1">{toastMessage.desc}</p>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-[#137333]/80 hover:text-[#137333] p-0.5 -mt-0.5 -mr-1 transition-colors shrink-0"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LiveClassroomScreen() {
  const { navigate, params } = useNav();
  const { user } = useUser();
  const [cls, setCls] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      if (!params.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('id', params.id)
          .maybeSingle();

        if (data) {
          setCls({
            id: data.id,
            title: data.session_title,
            course: data.technology || 'Core Programming',
            instructor: {
              name: data.instructor || 'Lead Instructor',
              avatar: '',
              title: 'LMS Instructor'
            },
            scheduledAt: data.date && data.time ? `${data.date} at ${data.time.slice(0, 5)}` : (data.date || 'TBD'),
            duration: data.duration || '1h 30m',
            participants: 120,
            status: data.status || 'upcoming',
            thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
            link: data.meeting_link || ''
          });
        } else {
          // fallback if not found in db (demo preview fallback)
          setCls({
            id: params.id || 'demo',
            title: 'Introduction to Version Control & Git Architecture',
            course: 'Python Full Stack + DSA with AI',
            instructor: {
              name: 'Srinivas Rao',
              avatar: '',
              title: 'Staff Engineer'
            },
            scheduledAt: 'Today at 10:00',
            duration: '120m',
            participants: 1240,
            status: 'ongoing',
            thumbnail: 'https://images.unsplash.com/photo-1618401479427-c8ef9465fbe1?w=800&q=80',
            link: ''
          });
        }
      } catch (err) {
        console.error("Error loading session:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [params.id]);

  const [tab, setTab] = useState('chat');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState<{name: string, avatar: string, msg: string, time: string, mentor?: boolean}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [votedPollOption, setVotedPollOption] = useState<number | null>(null);

  if (loading || !cls) {
    return <LiveClassroomSkeleton />;
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { name: user.name, avatar: user.avatar, msg: newMessage, time: 'Just now' }
    ]);
    setNewMessage('');
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in h-[calc(100vh-5.5rem)] flex flex-col pb-2">
      {/* Top Classroom Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('live')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
            title="Back to Live Classes"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> DEMO PREVIEW
              </span>
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Users2 className="w-3.5 h-3.5" /> Simulated Environment
              </span>
            </div>
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-tight">
              {cls.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => navigate('live')}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition-all border border-rose-200 flex items-center gap-1.5 active:scale-95"
          >
            <PhoneOff className="w-4 h-4" /> Leave Class
          </button>
        </div>
      </div>

      {/* Main Classroom Layout (Video Stage + Interactive Chat/Polls Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        
        {/* Left Area: Live Video Stage & Participant Strip */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          
          {/* Main Video View Container */}
          {/* Main Video View Container - Now Zoom Launchpad */}
          <div className="relative rounded-[2.2rem] overflow-hidden bg-[#0c0f1d] shadow-2xl flex-1 border border-slate-800 flex flex-col items-center justify-center group py-16">
            
            {/* Tech Background Image Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-[#0a0f2c] to-[#140e2b]" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-10 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

            {/* Launchpad Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-8 p-6 w-full max-w-2xl">
              <div className="w-24 h-24 rounded-[2rem] bg-slate-900 border border-slate-700 flex items-center justify-center relative shadow-2xl overflow-hidden">
                <div className="absolute inset-0 rounded-[2rem] border-2 border-blue-500/50" />
                <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                <Video className="w-10 h-10 text-blue-500" />
              </div>
              
              <div className="space-y-3">
                <h3 className="font-extrabold text-3xl text-white">Zoom Classroom</h3>
                <p className="text-sm font-medium text-slate-400 mx-auto max-w-md">
                  This session uses Zoom for secure, high-quality video broadcasting. Join the meeting to participate.
                </p>
              </div>

              {cls.link ? (
                <div className="flex flex-col items-center gap-5 w-full">
                  <a
                    href={cls.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-blue-500/25 ring-1 ring-blue-400/50"
                  >
                    <Video className="w-6 h-6" />
                    Launch Zoom Meeting
                  </a>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800/80">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Please keep this LMS tab open to access your interactive class notes.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5 w-full">
                  <div className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-slate-800 text-slate-500 font-extrabold text-lg flex items-center justify-center gap-3 border border-slate-700 cursor-not-allowed">
                    <VideoOff className="w-6 h-6" />
                    Meeting Link Unavailable
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800/80">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    The trainer hasn't provided the meeting link yet.
                  </div>
                </div>
              )}
            </div>

            {/* Video Top Bar Overlay (Instructor Info) */}
            <div className="absolute top-0 left-0 right-0 p-4 sm:p-5 flex items-center justify-between z-20 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
              <div className="flex items-center gap-3">
                <Avatar src={cls.instructor.avatar} name={cls.instructor.name} size="sm" className="ring-2 ring-blue-400/50" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white/90 text-sm font-black">{cls.instructor.name}</p>
                    <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50 text-[9px] font-black uppercase tracking-wider">
                      HOST
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Participant Avatar Strip */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-[#7c3aed]" />
              <h3 className="font-extrabold text-slate-900 text-xs">Active Students (Demo)</h3>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 italic">Simulation active</span>
            </div>
          </div>

        </div>

        {/* Right Area: Interactive Side Panel (Chat, Polls, Notes) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
          
          {/* Panel Tabs Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-1">
              {[
                { id: 'chat', label: 'Chat', icon: MessageCircle, count: chatMessages.length },
                { id: 'notes', label: 'Notes', icon: FileText },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all",
                    tab === t.id
                      ? "bg-white text-[#7c3aed] border border-purple-100 shadow-2xs"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                  {t.count && (
                    <span className="px-1.5 py-0.2 rounded-full bg-purple-50 text-[#7c3aed] text-[10px] font-black">
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Wrapper to overlay lock on scroll and input area */}
          <div className="flex-1 relative flex flex-col min-h-0">
            
            {/* Tab Scroll Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 filter blur-[1.5px] pointer-events-none">
              {tab === 'chat' && (
                <div className="space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-10">
                      <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400">No messages yet. Be the first to say hello!</p>
                    </div>
                  )}
                  {chatMessages.map((c, i) => (
                    <div key={i} className={cn("flex gap-2.5 p-2.5 rounded-xl transition-colors", c.mentor ? "bg-purple-50/70 border border-purple-100" : "hover:bg-slate-50")}>
                      <Avatar src={c.avatar} name={c.name} size="sm" className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black text-slate-900">{c.name}</span>
                          {c.mentor && (
                            <span className="px-1.5 py-0.2 rounded bg-[#7c3aed] text-white text-[9px] font-black uppercase tracking-wider">
                              INSTRUCTOR
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-400 ml-auto shrink-0">{c.time}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed break-words">{c.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'notes' && (
                <div className="flex flex-col h-full space-y-2">
                  <textarea 
                    className="w-full flex-1 min-h-[160px] text-xs font-semibold text-slate-800 focus:outline-none resize-none bg-transparent placeholder:text-slate-400 leading-relaxed" 
                    placeholder="Take notes during the live class..." 
                    defaultValue={``} 
                  />
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">All notes saved locally</span>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Message Sending Input */}
            {tab === 'chat' && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0 filter blur-[1.5px] pointer-events-none">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7c3aed] transition-colors" 
                    placeholder="Ask a question or type a message..." 
                  />
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* Premium Lock Overlay */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[3px] flex flex-col items-center justify-center p-6 text-center z-30 select-none">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-100 shadow-md shadow-purple-500/5 mb-3.5 animate-slide-up">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 tracking-wide uppercase">Workspace Locked</h4>
              <p className="text-xs font-semibold text-slate-500 mt-2 max-w-[220px] leading-relaxed mx-auto">
                Classroom chat and personal notes will activate dynamically once a live class starts.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
