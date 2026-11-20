import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ArrowLeft, ExternalLink, Presentation as PresentationIcon, 
  Code2, ClipboardCheck, Brain, FolderGit2, Video, 
  Clock, BookOpen, CheckCircle2,
  Maximize2, Minimize2, ChevronLeft, ChevronRight, Lock,
  Pen, Highlighter, Eraser, Trash2, X, Play
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

  // Interactive slide count and navigation
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = useMemo(() => {
    if (!presentation) return 10;
    const searchString = `${presentation.title || ''} ${presentation.description || ''} ${(presentation.tags || []).join(' ')}`;
    const match = searchString.match(/(\d+)\s*slides?/i);
    if (match && parseInt(match[1], 10) > 0) {
      return parseInt(match[1], 10);
    }
    return 10;
  }, [presentation]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => Math.max(1, prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => Math.min(totalSlides, prev + 1));
  };

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
      setCurrentSlide(1);
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

  // Keyboard navigation for slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTool !== 'none') return;
      if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => Math.min(totalSlides, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, totalSlides]);

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
      <div className="min-h-[calc(100vh-4.5rem)] bg-slate-50/70 p-3 sm:p-5 font-sans space-y-3 max-w-7xl mx-auto select-none animate-pulse">
        <div className="flex items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-56 sm:w-80 h-4 bg-slate-200 rounded-md" />
              <div className="w-32 h-2.5 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="w-24 h-8 bg-slate-100 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-3 space-y-3">
            <div className="w-full aspect-[16/9] rounded-2xl bg-slate-900 flex flex-col items-center justify-center gap-3 border border-slate-800">
              <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <div className="w-32 h-3 bg-slate-700/60 rounded-md" />
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <div className="w-32 h-4 bg-slate-200 rounded-md" />
            <div className="space-y-2">
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

  const embedUrl = getPresentationEmbedUrl(presentation.ppt_url);
  const lesson = matchedLessonData?.lesson;

  const practices = lesson?.practices || [];
  const assessments = lesson?.assessments || [];
  const quizzes = lesson?.quizzes || [];
  const projects = lesson?.projects || [];
  const video = lesson?.video;

  const hasCoursework = practices.length > 0 || assessments.length > 0 || quizzes.length > 0 || projects.length > 0 || !!video?.videoUrl;

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-slate-50/70 p-2.5 sm:p-4 lg:p-5 font-sans space-y-3.5 max-w-7xl mx-auto select-none">
      
      {/* ── UNIFIED CINEMA STUDIO HEADER (STREAMLINED & COMPACT) ── */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 sm:px-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Left: Back Arrow + Lesson Title + Module Subtitle */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-[#7c3aed] border border-slate-200/80 hover:border-purple-200 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
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

        {/* Right: Studio Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 text-xs font-black flex items-center gap-1.5 shadow-2xs">
            <PresentationIcon className="w-3.5 h-3.5 text-[#7c3aed]" />
            <span>Studio Mode</span>
          </span>
        </div>
      </div>

      {/* ── 2-COLUMN STUDIO LAYOUT: FITTING IN A SINGLE SCREEN ON DESKTOP ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ── LEFT COLUMN: CINEMA PRESENTATION SLIDES (lg:col-span-8) ── */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-2 sm:p-3 space-y-2 flex flex-col justify-between">
          
          {/* ── 16:9 EDGE-TO-EDGE CANVAS (ZERO DARK PILLARBOX MARGINS) ── */}
          <div 
            className={cn(
              "w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-800 shadow-inner transition-all duration-300",
              isFullscreen 
                ? "fixed inset-0 z-[99999] rounded-none shadow-2xl flex items-center justify-center bg-black" 
                : "aspect-[16/9] w-full"
            )}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Close button in Fullscreen mode */}
            {isFullscreen && (
              <div className="absolute top-4 right-4 z-40">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
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

            {/* Google Slides Iframe Embed (Height scaled to fill 100% edge-to-edge and push default bar under our dock) */}
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={presentation.title || 'Presentation Viewer'}
                className="w-full h-[calc(100%+32px)] border-0 bg-black block absolute top-0 left-0"
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
                "absolute inset-0 w-full h-[calc(100%-44px)] z-20 transition-opacity",
                activeTool !== 'none' 
                  ? "pointer-events-auto cursor-crosshair opacity-100" 
                  : "pointer-events-none opacity-90"
              )}
            />

            {/* Floating indicator when Pen / Drawing mode is active */}
            {activeTool !== 'none' && (
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-xl border border-slate-700 shadow-lg backdrop-blur-md text-xs font-bold animate-fade-in pointer-events-auto">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeTool === 'eraser' ? '#ef4444' : penColor }} />
                <span>
                  {activeTool === 'pen' ? 'Pen Mode' : activeTool === 'highlighter' ? 'Highlighter Mode' : 'Eraser Mode'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTool('none')}
                  className="ml-1 p-0.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Exit Drawing Mode"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── CUSTOM BOTTOM STUDIO CONTROLLER BAR (COVERS GOOGLE SLIDES WATERMARK) ── */}
            <div className="absolute bottom-0 inset-x-0 z-30 h-11 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 flex items-center justify-between px-3 select-none text-white shadow-2xl">
              {/* Left: Navigation and Slide Counter */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  disabled={currentSlide <= 1}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-purple-600 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors text-slate-200 hover:text-white cursor-pointer"
                  title="Previous Slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-2.5 py-1 rounded-lg bg-slate-800/90 text-purple-300 font-black text-xs border border-purple-500/20 tracking-wider">
                  <span className="text-white">{currentSlide}</span> / <span>{totalSlides}</span>
                </div>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  disabled={currentSlide >= totalSlides}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-purple-600 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors text-slate-200 hover:text-white cursor-pointer"
                  title="Next Slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Right: Annotation Tools & Fullscreen SVG (Completely covers Google Slides logo & text!) */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 px-1.5 rounded-xl border border-slate-800">
                {/* Pen */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'pen' ? 'none' : 'pen')}
                  className={cn(
                    "p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer",
                    activeTool === 'pen' 
                      ? "bg-[#7c3aed] text-white shadow-sm shadow-purple-500/30" 
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                  title="Interactive Pen Tool"
                >
                  <Pen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pen</span>
                </button>

                {/* Highlight */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'highlighter' ? 'none' : 'highlighter')}
                  className={cn(
                    "p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer",
                    activeTool === 'highlighter' 
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30" 
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                  title="Interactive Highlighter Tool"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Highlight</span>
                </button>

                {/* Color Palette (Visible when Pen or Highlighter active) */}
                {(activeTool === 'pen' || activeTool === 'highlighter') && (
                  <div className="flex items-center gap-1 px-1.5 border-l border-slate-700 animate-fade-in">
                    {PEN_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setPenColor(c.value)}
                        style={{ backgroundColor: c.value }}
                        className={cn(
                          "w-3.5 h-3.5 rounded-full transition-transform cursor-pointer shrink-0",
                          penColor === c.value ? "ring-2 ring-offset-1 ring-white scale-110" : "hover:scale-105 opacity-80"
                        )}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}

                {/* Eraser */}
                <button
                  type="button"
                  onClick={() => setActiveTool(activeTool === 'eraser' ? 'none' : 'eraser')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    activeTool === 'eraser' 
                      ? "bg-rose-500 text-white shadow-sm" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  )}
                  title="Eraser Tool"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>

                {/* Clear Canvas */}
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                  title="Clear All Drawings"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-700 mx-1" />

                {/* Fullscreen SVG Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-lg text-purple-400 hover:text-white hover:bg-purple-600/30 transition-all cursor-pointer"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── RIGHT COLUMN: RELATED LESSON COURSEWORK & RESOURCES (lg:col-span-4) ── */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center font-bold shrink-0">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-slate-900 leading-tight">
                  Related Coursework
                </h2>
                <p className="text-[10px] font-semibold text-slate-400">
                  Topic activities & media
                </p>
              </div>
            </div>
            {matchedLessonData?.stageTitle && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                {matchedLessonData.stageTitle}
              </span>
            )}
          </div>

          {!hasCoursework ? (
            <div className="py-6 px-4 text-center rounded-2xl bg-slate-50 border border-slate-150 my-auto">
              <p className="text-xs font-bold text-slate-600">
                Foundational lecture topic.
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                No extra coursework mapped for this specific slide deck. Review slides thoroughly for upcoming modules.
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[380px] sm:max-h-[430px] pr-1">
              
              {/* 1. TOP PRIORITY: LECTURE VIDEO (Featured at top!) */}
              {video?.videoUrl && (
                <div
                  onClick={() => {
                    if (matchedLessonData?.courseId && matchedLessonData?.lesson?.id) {
                      navigate('lesson', { id: matchedLessonData.courseId, lesson: matchedLessonData.lesson.id });
                    }
                  }}
                  className="p-2.5 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/70 to-indigo-50/40 hover:border-[#7c3aed] shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#7c3aed] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase text-[#7c3aed] bg-purple-100/70 px-1.5 py-0.2 rounded">
                          Video Lecture
                        </span>
                        {video.duration && (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> {video.duration}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-[#7c3aed] transition-colors truncate mt-0.5">
                        {presentation.lesson_name || presentation.title}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[#7c3aed] font-extrabold text-[11px] shrink-0 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Watch <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              )}

              {/* 2. Coding Practices */}
              {practices.map((practice: any) => (
                <div
                  key={practice.id}
                  onClick={() => navigate('workspace', { id: practice.id })}
                  className="p-2.5 rounded-xl border border-slate-200/90 hover:border-amber-300 bg-white hover:bg-amber-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                      <Code2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                          Lab
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
                  <span className="text-amber-600 font-extrabold text-[11px] shrink-0 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Solve <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              ))}

              {/* 3. Daily Assessments */}
              {assessments.map((assessment: any) => (
                <div
                  key={assessment.id}
                  onClick={() => navigate('assignments')}
                  className="p-2.5 rounded-xl border border-slate-200/90 hover:border-purple-300 bg-white hover:bg-purple-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200/60">
                          Assessment
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
                  <span className="text-purple-600 font-extrabold text-[11px] shrink-0 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Take <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              ))}

              {/* 4. Quizzes */}
              {quizzes.map((quiz: any) => (
                <div
                  key={quiz.id}
                  onClick={() => navigate('quizzes')}
                  className="p-2.5 rounded-xl border border-slate-200/90 hover:border-indigo-300 bg-white hover:bg-indigo-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
                      <Brain className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60">
                          Quiz
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
                  <span className="text-indigo-600 font-extrabold text-[11px] shrink-0 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Start <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              ))}

              {/* 5. Projects */}
              {projects.map((proj: any) => (
                <div
                  key={proj.id}
                  onClick={() => navigate('projects')}
                  className="p-2.5 rounded-xl border border-slate-200/90 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                      <FolderGit2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                          Project
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {proj.type ? `${proj.type.toUpperCase()}` : 'MINI'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors truncate mt-0.5">
                        {proj.title}
                      </h4>
                    </div>
                  </div>
                  <span className="text-emerald-600 font-extrabold text-[11px] shrink-0 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    View <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              ))}

            </div>
          )}

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
                <span>Full Lesson</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
