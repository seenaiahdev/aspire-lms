import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ArrowLeft, ExternalLink, Presentation as PresentationIcon, 
  Code2, ClipboardCheck, Brain, FolderGit2,
  Clock, BookOpen,
  Maximize2, Minimize2, ChevronRight, Lock,
  Pen, Highlighter, Eraser, Trash2, X, Play, MoreVertical
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { useUser } from '@/lib/UserContext';
import { usePreload } from '@/lib/PreloadContext';
import { fetchPresentations, PresentationRecord, getPresentationEmbedUrl } from '@/lib/api';
import { useUnlockResolver } from '@/lib/lessonLinkResolver';
import { cn } from '@/lib/utils';

const PEN_COLORS = [
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Coral', value: '#ef4444' },
  { name: 'White', value: '#ffffff' },
];

export function PresentationScreen() {
  const { params, navigate } = useNav();
  const { user } = useUser();
  const preload = usePreload();
  const { isUnlocked, isEntityUnlocked, resolver } = useUnlockResolver();

  const [presentation, setPresentation] = useState<PresentationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [showSlideMenu, setShowSlideMenu] = useState(false);

  // References
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close tools dropdown menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSlideMenu(false);
      }
    };
    if (showSlideMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSlideMenu]);

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

  // Interactive Drawing & Pen Canvas State
  const [activeTool, setActiveTool] = useState<'none' | 'pen' | 'highlighter' | 'eraser'>('none');
  const [penColor, setPenColor] = useState<string>('#7c3aed');
  const [penSize] = useState<number>(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

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

  // Synchronize canvas buffer with display bounding box
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height))) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx && canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);

      const ctx = canvas.getContext('2d');
      if (ctx && tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  useEffect(() => {
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [syncCanvasSize, isFullscreen]);

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    syncCanvasSize();
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPointRef.current = { x: clientX - rect.left, y: clientY - rect.top };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || activeTool === 'none' || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.save();
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(currentX, currentY, 14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (activeTool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 14;
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
      }
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
    }
    ctx.restore();

    lastPointRef.current = { x: currentX, y: currentY };
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

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
    const pId = presentation.inner_topic_id;
    const resolvedPId = resolver ? resolver.resolveLessonId(pId) : pId;
    const pTitle = norm(presentation.title);

    for (const [courseId, syllabus] of Object.entries(preload.syllabi)) {
      if (!syllabus?.stages) continue;
      for (const stage of syllabus.stages) {
        for (const mod of stage.modules) {
          for (const l of mod.lessons) {
            const resolvedLId = resolver ? resolver.resolveLessonId(l.id) : l.id;
            const matchesId = pId === l.id || resolvedPId === resolvedLId;
            const matchesTitle = !matchesId && (
              (pTitle && norm(l.title) === pTitle) ||
              (presentation.lesson_name && norm(presentation.lesson_name) === norm(l.title))
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
      <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/70 p-2 sm:p-3 font-sans flex flex-col gap-2.5 max-w-[1600px] mx-auto select-none animate-pulse">
        <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-2 sm:px-4 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-56 sm:w-80 h-4 bg-slate-200 rounded-md" />
              <div className="w-32 h-2.5 bg-slate-100 rounded-md" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          <div className="lg:col-span-8 h-full min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-2 flex flex-col overflow-hidden">
            <div className="w-full h-full rounded-xl bg-slate-900 flex flex-col items-center justify-center gap-3 border border-slate-800">
              <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <div className="w-32 h-3 bg-slate-700/60 rounded-md" />
            </div>
          </div>

          <div className="lg:col-span-4 h-full min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between overflow-hidden">
            <div className="w-32 h-4 bg-slate-200 rounded-md shrink-0" />
            <div className="space-y-2 flex-1 my-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
                  <div className="w-20 h-3 bg-slate-200 rounded" />
                  <div className="w-full h-3 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
            <div className="w-24 h-3 bg-slate-100 rounded-md shrink-0" />
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
    <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/70 p-2 sm:p-3 font-sans flex flex-col gap-2.5 max-w-[1600px] mx-auto select-none">
      
      {/* ── UNIFIED HEADER (STREAMLINED: CLEAN & NO BADGES) ── */}
      <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-2 sm:px-4 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0">
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
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        
        {/* ── LEFT COLUMN: CINEMA PRESENTATION SLIDES (lg:col-span-8) ── */}
        <div className="lg:col-span-8 h-full min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-2 flex flex-col overflow-hidden">
          
          {/* ── PLAYER CONTAINER ── */}
          <div 
            ref={playerContainerRef}
            className={cn(
              "relative w-full h-full rounded-xl overflow-hidden bg-black flex-1 min-h-0 flex items-center justify-center transition-all duration-300",
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

            {/* ── INTERACTIVE HTML5 DRAWING OVERLAY CANVAS ── */}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className={cn(
                "absolute inset-0 w-full h-[calc(100%-36px)] z-20 transition-opacity",
                activeTool !== 'none' 
                  ? "pointer-events-auto cursor-crosshair opacity-100" 
                  : "pointer-events-none opacity-90"
              )}
            />

            {/* Floating indicator when Pen / Drawing mode is active */}
            {activeTool !== 'none' && (
              <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-2 bg-white/95 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-md backdrop-blur-md text-xs font-semibold animate-fade-in pointer-events-auto">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeTool === 'eraser' ? '#ef4444' : penColor }} />
                <span>
                  {activeTool === 'pen' ? 'Pen Mode' : activeTool === 'highlighter' ? 'Highlighter Mode' : 'Eraser Mode'}
                </span>
                {(activeTool === 'pen' || activeTool === 'highlighter') && (
                  <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-200">
                    {PEN_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setPenColor(c.value)}
                        style={{ backgroundColor: c.value }}
                        className={cn(
                          "w-3.5 h-3.5 rounded-full transition-transform cursor-pointer shrink-0 border border-slate-200",
                          penColor === c.value ? "ring-2 ring-offset-1 ring-[#7c3aed] scale-110" : "hover:scale-105 opacity-80"
                        )}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTool('none')}
                  className="ml-1.5 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Exit Drawing Mode"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── FLOATING 3-DOTS TOOLS MENU (TOP-RIGHT) ── */}
            <div ref={menuRef} className="absolute top-2.5 right-2.5 z-30">
              <button
                type="button"
                onClick={() => setShowSlideMenu(!showSlideMenu)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md border backdrop-blur-md",
                  showSlideMenu
                    ? "bg-[#7c3aed] text-white border-purple-500"
                    : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border-slate-200/90"
                )}
                title="Tools & Slide Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showSlideMenu && (
                <div 
                  className="absolute top-10 right-0 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 text-xs text-slate-700 animate-fade-in"
                >
                  {presentation.ppt_url && (
                    <a
                      href={presentation.ppt_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setShowSlideMenu(false)}
                      className="w-full px-3 py-1.5 text-left hover:bg-purple-50 hover:text-[#7c3aed] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>Open in Google Slides</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      toggleFullscreen();
                      setShowSlideMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-purple-50 hover:text-[#7c3aed] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Annotation Tools
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool(activeTool === 'pen' ? 'none' : 'pen');
                      setShowSlideMenu(false);
                    }}
                    className={cn(
                      "w-full px-3 py-1.5 text-left transition-colors flex items-center justify-between cursor-pointer",
                      activeTool === 'pen' ? "bg-purple-50 text-[#7c3aed] font-semibold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Pen className="w-3.5 h-3.5" />
                      <span>Pen Tool</span>
                    </span>
                    {activeTool === 'pen' && <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool(activeTool === 'highlighter' ? 'none' : 'highlighter');
                      setShowSlideMenu(false);
                    }}
                    className={cn(
                      "w-full px-3 py-1.5 text-left transition-colors flex items-center justify-between cursor-pointer",
                      activeTool === 'highlighter' ? "bg-amber-50 text-amber-700 font-semibold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Highlighter className="w-3.5 h-3.5" />
                      <span>Highlighter Tool</span>
                    </span>
                    {activeTool === 'highlighter' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool(activeTool === 'eraser' ? 'none' : 'eraser');
                      setShowSlideMenu(false);
                    }}
                    className={cn(
                      "w-full px-3 py-1.5 text-left transition-colors flex items-center justify-between cursor-pointer",
                      activeTool === 'eraser' ? "bg-rose-50 text-rose-700 font-semibold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Eraser Tool</span>
                    </span>
                    {activeTool === 'eraser' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearCanvas();
                      setShowSlideMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-2 cursor-pointer text-slate-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Annotations</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Keyboard Shortcuts
                  </div>
                  <div className="px-3 py-1 text-[11px] text-slate-500 flex justify-between">
                    <span>Next / Prev Slide</span>
                    <span className="text-slate-400 font-mono">← / →</span>
                  </div>
                  <div className="px-3 py-1 text-[11px] text-slate-500 flex justify-between">
                    <span>Fullscreen</span>
                    <span className="text-slate-400 font-mono">Esc</span>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ── RIGHT COLUMN: UNIFIED LESSON COURSEWORK CARD (lg:col-span-4) ── */}
        <div className="lg:col-span-4 h-full min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between overflow-hidden">
          
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
              {totalCourseworkCount} items
            </span>
          </div>

          {/* Unified Container holding Video + Coursework Activities */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 my-2">
            
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

          </div>

          {/* Quick Footer inside right card */}
          {matchedLessonData?.lesson && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400 shrink-0">
              <span className="truncate max-w-[200px]">
                {matchedLessonData.lesson.title}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (matchedLessonData?.courseId && matchedLessonData?.lesson?.id) {
                    navigate('lesson', { id: matchedLessonData.courseId, lesson: matchedLessonData.lesson.id });
                  } else {
                    navigate('milestones');
                  }
                }}
                className="text-[#7c3aed] hover:underline font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Lesson Roadmap</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
