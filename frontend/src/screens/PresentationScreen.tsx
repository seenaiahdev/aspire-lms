import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, ExternalLink, Presentation as PresentationIcon, 
  Code2, ClipboardCheck, Brain, FolderGit2,
  Clock, BookOpen,
  Maximize2, Minimize2, Lock, Play
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { useUser } from '@/lib/UserContext';
import { usePreload } from '@/lib/PreloadContext';
import { fetchPresentations, PresentationRecord, getPresentationEmbedUrl } from '@/lib/api';
import { useUnlockResolver } from '@/lib/lessonLinkResolver';
import { cn } from '@/lib/utils';

export function PresentationScreen() {
  const { params, navigate } = useNav();
  const { user } = useUser();
  const preload = usePreload();
  const { isUnlocked, isEntityUnlocked, resolver } = useUnlockResolver();

  const [presentation, setPresentation] = useState<PresentationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyllabusLoading, setIsSyllabusLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // References
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const embedUrl = useMemo(() => {
    return presentation?.ppt_url ? getPresentationEmbedUrl(presentation.ppt_url) : '';
  }, [presentation?.ppt_url]);

  // True Native Fullscreen API integration
  const toggleFullscreen = () => {
    const elem = playerContainerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => setIsFullscreen(true));
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => setIsFullscreen(false));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  const presentationId = params.id || '';
  const fromRoute = params.from || 'classroom';

  // Find presentation from preload cache or fetch fallback
  useEffect(() => {
    let alive = true;

    async function loadData() {
      if (preload.presentations && preload.presentations.length > 0) {
        const found = preload.presentations.find(
          (p) => p.id === presentationId || p.inner_topic_id === presentationId
        );
        if (found) {
          if (alive) {
            setPresentation(found);
            setLoading(false);
          }
          return;
        }
      }

      try {
        const all = await fetchPresentations();
        if (!alive) return;
        const found = all.find(
          (p) => p.id === presentationId || p.inner_topic_id === presentationId
        );
        setPresentation(found || null);
      } catch (err) {
        console.error('Failed to load presentation record:', err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();
    return () => {
      alive = false;
    };
  }, [presentationId, preload.presentations]);

  // Reset loading state when presentation changes
  useEffect(() => {
    if (presentation?.ppt_url) {
      setIframeLoading(true);
    }
  }, [presentation?.ppt_url]);

  // Candidate course IDs to load syllabus from
  const candidateCourseIds = useMemo(() => {
    const set = new Set<string>();
    if (presentation?.course_id) set.add(presentation.course_id);
    if (user?.enrolledCourses && user.enrolledCourses.length > 0) {
      user.enrolledCourses.forEach((c) => set.add(c));
    }
    if (preload.courses && preload.courses.length > 0) {
      preload.courses.forEach((c: any) => set.add(c.id));
    }
    return Array.from(set);
  }, [presentation?.course_id, user?.enrolledCourses, preload.courses]);

  // Ensure course syllabi are fetched so related coursework is never 0
  useEffect(() => {
    let alive = true;

    async function loadSyllabi() {
      if (candidateCourseIds.length === 0) {
        if (alive) setIsSyllabusLoading(false);
        return;
      }

      const missing = candidateCourseIds.filter((cid) => !preload.syllabi?.[cid]);
      if (missing.length === 0) {
        if (alive) setIsSyllabusLoading(false);
        return;
      }

      setIsSyllabusLoading(true);
      try {
        await Promise.all(
          missing.map((cid) => preload.ensureCourseSyllabus(cid).catch(() => null))
        );
      } catch (err) {
        console.error('[PresentationScreen] Failed ensuring course syllabus:', err);
      } finally {
        if (alive) setIsSyllabusLoading(false);
      }
    }

    loadSyllabi();
    return () => {
      alive = false;
    };
  }, [candidateCourseIds, preload.syllabi, preload.ensureCourseSyllabus]);

  // Focus iframe on keyboard navigation keys if focus is on outer page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Backspace') {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          iframeRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine unlock status
  const isPptLocked = useMemo(() => {
    if (!presentation) return false;
    if (!user?.unlockedLessonIds || user.unlockedLessonIds.length === 0) return false;
    if (user.unlockedLessonIds.includes(presentation.inner_topic_id)) return false;
    if (resolver && user.unlockedLessonIds.includes(resolver.resolveLessonId(presentation.inner_topic_id))) return false;
    return !isEntityUnlocked(presentation) && !isUnlocked(presentation.inner_topic_id);
  }, [presentation, user?.unlockedLessonIds, resolver, isEntityUnlocked, isUnlocked]);

  // Find mapped lesson coursework
  const matchedLessonData = useMemo(() => {
    if (!presentation || !preload.syllabi) return null;

    const norm = (str?: string) => (str || '').toLowerCase().trim();
    const clean = (str?: string) => norm(str).replace(/[^a-z0-9]/g, '');

    const pId = presentation.inner_topic_id;
    const resolvedPId = resolver ? resolver.resolveLessonId(pId) : pId;
    const pTitle = norm(presentation.title);
    const pCleanTitle = clean(presentation.title);
    const pLessonName = norm(presentation.lesson_name);
    const pCleanLessonName = clean(presentation.lesson_name);

    for (const [courseId, syllabus] of Object.entries(preload.syllabi)) {
      if (!syllabus?.stages) continue;
      for (const stage of syllabus.stages) {
        for (const mod of stage.modules) {
          for (const l of mod.lessons) {
            const resolvedLId = resolver ? resolver.resolveLessonId(l.id) : l.id;
            const matchesId = (pId && (pId === l.id || resolvedPId === resolvedLId)) || (presentation.id && presentation.id === l.id);
            
            const lTitle = norm(l.title);
            const lCleanTitle = clean(l.title);

            const matchesTitle = !matchesId && (
              (pTitle && lTitle === pTitle) ||
              (pLessonName && lTitle === pLessonName) ||
              (pCleanTitle && lCleanTitle && (pCleanTitle === lCleanTitle || lCleanTitle.includes(pCleanTitle) || pCleanTitle.includes(lCleanTitle))) ||
              (pCleanLessonName && lCleanTitle && (pCleanLessonName === lCleanTitle || lCleanTitle.includes(pCleanLessonName) || pCleanLessonName.includes(lCleanTitle)))
            );

            if (matchesId || matchesTitle) {
              return {
                stageTitle: stage.title,
                moduleTitle: mod.title,
                moduleId: mod.id,
                courseId: courseId,
                lesson: l,
              };
            }
          }
        }
      }
    }
    return null;
  }, [presentation, preload.syllabi, resolver]);

  const handleBack = () => {
    if (fromRoute === 'milestones') {
      navigate('milestones');
    } else if (fromRoute === 'dashboard') {
      navigate('dashboard');
    } else if (fromRoute === 'lesson' && matchedLessonData?.courseId && matchedLessonData?.lesson?.id) {
      navigate('lesson', { id: matchedLessonData.courseId, lesson: matchedLessonData.lesson.id });
    } else {
      localStorage.setItem('aspire_live_tab', 'classroom');
      navigate('live', { tab: 'classroom' });
    }
  };

  // Skeleton Loader
  if (loading) {
    return (
      <div className="h-[calc(100vh-7.5rem)] max-h-[calc(100vh-7.5rem)] overflow-hidden bg-slate-50/70 p-1 sm:p-2 font-sans flex flex-col gap-2 max-w-[1600px] mx-auto select-none animate-pulse">
        <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-1.5 sm:px-4 rounded-xl border border-slate-200/90 shadow-2xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-56 sm:w-80 h-4 bg-slate-200 rounded-md" />
              <div className="w-32 h-2.5 bg-slate-100 rounded-md" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch overflow-hidden">
          <div className="lg:col-span-8 h-full min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-1.5 sm:p-2 flex flex-col overflow-hidden">
            <div className="w-full h-full rounded-lg bg-slate-900 flex flex-col items-center justify-center gap-3 border border-slate-800">
              <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <div className="w-32 h-3 bg-slate-700/60 rounded-md" />
            </div>
          </div>

          <div className="lg:col-span-4 h-full min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col overflow-hidden">
            <div className="w-32 h-4 bg-slate-200 rounded-md shrink-0" />
            <div className="space-y-2 flex-1 my-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
                  <div className="w-20 h-3 bg-slate-200 rounded" />
                  <div className="w-full h-3 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed]">
          <PresentationIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Presentation Not Found</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md">The requested presentation deck is unavailable or has been archived.</p>
        </div>
        <button
          onClick={handleBack}
          className="px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-extrabold shadow-md hover:bg-[#6d28d9] transition-all cursor-pointer"
        >
          Return to Classroom
        </button>
      </div>
    );
  }

  if (isPptLocked) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Presentation Locked</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            This presentation deck is tied to a milestone lesson you haven't unlocked yet. Continue progressing through your learning roadmap to reveal this slide deck.
          </p>
        </div>
        <button
          onClick={() => navigate('milestones')}
          className="px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-extrabold shadow-md hover:bg-[#6d28d9] transition-all cursor-pointer"
        >
          View Milestones Roadmap
        </button>
      </div>
    );
  }

  const lesson = matchedLessonData?.lesson;

  const practices = lesson?.practices || [];
  const assessments = lesson?.assessments || [];
  const quizzes = lesson?.quizzes || [];
  const projects = lesson?.projects || [];
  const video = lesson?.video;

  const totalCourseworkCount = [
    lesson ? 1 : 0,
    practices.length,
    assessments.length,
    quizzes.length,
    projects.length
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="h-[calc(100vh-7.5rem)] max-h-[calc(100vh-7.5rem)] overflow-hidden bg-slate-50/70 p-1 sm:p-2 font-sans flex flex-col gap-2 max-w-[1600px] mx-auto select-none">
      
      {/* ── UNIFIED HEADER (STREAMLINED: CLEAN & NO BADGES) ── */}
      <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-1.5 sm:px-4 rounded-xl border border-slate-200/90 shadow-2xs shrink-0">
        {/* Left: Back Arrow + Lesson Title + Module Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-[#7c3aed] border border-slate-200/80 hover:border-purple-200 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
            title="Back to Classroom"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug truncate" title={presentation.title || presentation.lesson_name}>
              {presentation.title || presentation.lesson_name}
            </h1>
            {(presentation.subtopic_name || matchedLessonData?.moduleTitle) && (
              <p className="text-[11px] font-bold text-slate-400 truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>{presentation.subtopic_name || matchedLessonData?.moduleTitle}</span>
                {presentation.lesson_name && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 truncate">{presentation.lesson_name}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right: Stage Title (Clean typography without badge) */}
        {matchedLessonData?.stageTitle && (
          <span className="text-xs font-semibold text-slate-500 truncate max-w-[220px] hidden sm:inline-block">
            {matchedLessonData.stageTitle}
          </span>
        )}
      </div>

      {/* ── 2-COLUMN STUDIO LAYOUT: SINGLE STATIC SCREEN (NO PAGE SCROLLING) ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch overflow-hidden">
        
        {/* ── LEFT COLUMN: CINEMA PRESENTATION SLIDES (lg:col-span-8) ── */}
        <div className="lg:col-span-8 h-full min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-1.5 sm:p-2 flex flex-col overflow-hidden">
          
          {/* ── PLAYER CONTAINER ── */}
          <div 
            ref={playerContainerRef}
            className={cn(
              "relative w-full h-full rounded-lg overflow-hidden bg-black flex-1 min-h-0 flex items-center justify-center transition-all duration-300",
              isFullscreen && "fixed inset-0 z-[99999] rounded-none shadow-2xl bg-black"
            )}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Close button in Fullscreen mode */}
            {isFullscreen && (
              <div className="absolute top-3 right-14 z-40">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                </button>
              </div>
            )}

            {/* Spinner loader while iframe initializes */}
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 z-10 pointer-events-none">
                <div className="w-8 h-8 border-3 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-xs font-bold tracking-wide">Loading presentation...</p>
              </div>
            )}

            {/* Google Slides Iframe Embed (Native player uncovered: 0ms instant slide navigation, real-time counter) */}
            {embedUrl ? (
              <iframe
                ref={iframeRef}
                src={embedUrl}
                title={presentation.title || 'Presentation Viewer'}
                className="w-full h-full border-0 bg-black block absolute inset-0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation"
                onLoad={() => setIframeLoading(false)}
              />
            ) : (
              <div className="text-center p-8 text-slate-400 flex flex-col items-center justify-center h-full">
                <p className="font-bold text-sm">Unable to render presentation embed preview.</p>
                <p className="text-xs text-slate-500 mt-1">Presentation link is unavailable.</p>
              </div>
            )}

            {/* ── MASK BOTTOM-RIGHT GOOGLE BRANDING & PROVIDE CLEAN FULLSCREEN TOGGLE ── */}
            <div className="absolute bottom-0 right-0 z-20 h-[30px] w-36 bg-[#f8fafd] flex items-center justify-end pr-2 rounded-br-lg select-none">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

          </div>

        </div>

        {/* ── RIGHT COLUMN: UNIFIED LESSON COURSEWORK CARD (lg:col-span-4) ── */}
        <div className="lg:col-span-4 h-full min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center font-bold shrink-0">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-slate-900 leading-tight">
                  Related Coursework
                </h2>
                <p className="text-[10px] font-semibold text-slate-400">
                  Lecture video, practice lab & assessments
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {isSyllabusLoading && !matchedLessonData ? 'Loading...' : `${totalCourseworkCount} items`}
            </span>
          </div>

          {/* Unified Container holding Video + Coursework Activities */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 my-2">
            
            {isSyllabusLoading && !matchedLessonData ? (
              <div className="space-y-2.5 animate-pulse my-1">
                <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 h-16 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-3 bg-purple-200 rounded" />
                    <div className="w-48 h-3.5 bg-purple-100 rounded" />
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 h-14" />
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 h-14" />
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 h-14" />
              </div>
            ) : (
              <>
            
            {/* ── 1. FEATURED LECTURE VIDEO CARD ── */}
            {matchedLessonData?.lesson && (
              <div
                onClick={() => {
                  if (matchedLessonData?.courseId && matchedLessonData?.lesson?.id) {
                    navigate('lesson', { id: matchedLessonData.courseId, lesson: matchedLessonData.lesson.id });
                  } else {
                    navigate('milestones');
                  }
                }}
                className="p-3 rounded-2xl bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white border border-purple-200/90 hover:border-[#7c3aed] shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6d28d9] to-[#8b5cf6] text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#7c3aed]">
                        Class Video
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {video?.duration || '45m'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-[#7c3aed] transition-colors truncate mt-0.5">
                      {presentation.lesson_name || presentation.title}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-[#7c3aed] text-white text-[10px] font-black group-hover:bg-[#6d28d9] transition-all flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                >
                  <span>Watch</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* ── 2. COMBINED COURSEWORK ACTIVITIES LIST ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 divide-y divide-slate-150/80 overflow-hidden shadow-2xs">
              
              {/* Coding Practices (Labs) */}
              {practices.map((practice: any) => (
                <div
                  key={practice.id}
                  onClick={() => navigate('workspace', { id: practice.id })}
                  className="p-3 bg-white hover:bg-amber-50/30 transition-all cursor-pointer group flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                      <Code2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-amber-700">
                          Practice Lab
                        </span>
                        {practice.duration && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {practice.duration}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-700 transition-colors truncate mt-0.5">
                        {practice.title}
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-lg bg-amber-50 group-hover:bg-amber-600 text-amber-700 group-hover:text-white border border-amber-200 group-hover:border-amber-600 text-[10px] font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Solve</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {/* Daily Assessments */}
              {assessments.map((assessment: any) => (
                <div
                  key={assessment.id}
                  onClick={() => navigate('assignments')}
                  className="p-3 bg-white hover:bg-purple-50/30 transition-all cursor-pointer group flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-purple-700">
                          Daily Assessment
                        </span>
                        {assessment.duration && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {assessment.duration}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-purple-700 transition-colors truncate mt-0.5">
                        {assessment.title}
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-lg bg-purple-50 group-hover:bg-[#7c3aed] text-purple-700 group-hover:text-white border border-purple-200 group-hover:border-[#7c3aed] text-[10px] font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Take</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {/* Quizzes */}
              {quizzes.map((quiz: any) => (
                <div
                  key={quiz.id}
                  onClick={() => navigate('quizzes')}
                  className="p-3 bg-white hover:bg-indigo-50/30 transition-all cursor-pointer group flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                      <Brain className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-indigo-700">
                          Knowledge Quiz
                        </span>
                        {quiz.questions?.length && (
                          <span className="text-[10px] font-bold text-slate-400">
                            {quiz.questions.length} Qs
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-indigo-700 transition-colors truncate mt-0.5">
                        {quiz.title}
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white border border-indigo-200 group-hover:border-indigo-600 text-[10px] font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Start</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {/* Projects */}
              {projects.map((proj: any) => (
                <div
                  key={proj.id}
                  onClick={() => navigate('projects')}
                  className="p-3 bg-white hover:bg-emerald-50/30 transition-all cursor-pointer group flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                      <FolderGit2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-700">
                          Course Project
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {proj.type ? `${proj.type.toUpperCase()}` : 'MINI'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors truncate mt-0.5">
                        {proj.title}
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white border border-emerald-200 group-hover:border-emerald-600 text-[10px] font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>View</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {practices.length === 0 && assessments.length === 0 && quizzes.length === 0 && projects.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 font-bold">
                  No additional coursework assignments for this specific lecture.
                </div>
              )}

            </div>
            </>
          )}

          </div>

        </div>

      </div>

    </div>
  );
}
