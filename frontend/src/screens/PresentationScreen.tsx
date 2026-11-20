import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ArrowLeft, ExternalLink, Presentation as PresentationIcon, 
  FileText, Code2, ClipboardCheck, Brain, FolderGit2, Video, 
  Clock, BookOpen, CheckCircle2,
  Maximize2, Minimize2, ChevronRight, Lock,
  Pen, Highlighter, Eraser, Trash2, Palette, X
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
  { name: 'Slate', value: '#0f172a' },
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
      // 1. Fast path: check preload memory cache first
      if (preload.presentations && preload.presentations.length > 0) {
        const found = preload.presentations.find(
          (p) => p.id === presentationId || p.inner_topic_id === presentationId
        );
        if (found) {
          setPresentation(found);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: fetch from API
      setLoading(true);
      try {
        const list = await fetchPresentations(user.enrolledCourses);
        if (!alive) return;
        const found = list.find(
          (p) => p.id === presentationId || p.inner_topic_id === presentationId
        );
        setPresentation(found || list[0] || null);
      } catch (err) {
        console.error('Failed to load presentation:', err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();
    return () => { alive = false; };
  }, [presentationId, preload.presentations, user.enrolledCourses]);

  // Reset iframe loading state when URL changes
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
      ctx.lineWidth = 26;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
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

  // Check if presentation is locked
  const isPptLocked = useMemo(() => {
    if (!presentation) return false;
    if (!user?.unlockedLessonIds || user.unlockedLessonIds.length === 0) return true;
    if (user.unlockedLessonIds.includes(presentation.inner_topic_id)) return false;
    if (resolver && user.unlockedLessonIds.includes(resolver.resolveLessonId(presentation.inner_topic_id))) return false;
    return !(isEntityUnlocked(presentation) || isUnlocked(presentation.inner_topic_id));
  }, [presentation, user?.unlockedLessonIds, resolver, isEntityUnlocked, isUnlocked]);

  // Locate the matching lesson and its coursework from preload.syllabi memory cache
  const matchedLessonData = useMemo(() => {
    if (!presentation || !preload.syllabi) return null;

    const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pTitle = norm(presentation.title || presentation.lesson_name);

    for (const courseId of Object.keys(preload.syllabi)) {
      const syllabus = preload.syllabi[courseId];
      if (!syllabus?.stages) continue;

      for (const stage of syllabus.stages) {
        for (const mod of stage.modules || []) {
          for (const l of mod.lessons || []) {
            const matchesId = Boolean(
              presentation.inner_topic_id && (
                l.id === presentation.inner_topic_id ||
                (resolver && resolver.resolveLessonId(presentation.inner_topic_id) === l.id)
              )
            );
            const matchesTitle = Boolean(
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

  // ── SKELETON LOADER (CARD-BASED MATCHING CINEMA STUDIO LAYOUT) ──
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4.5rem)] bg-slate-50/70 p-4 sm:p-6 lg:p-7 font-sans space-y-4 max-w-7xl mx-auto select-none animate-pulse">
        {/* Cinema Studio Header Skeleton */}
        <div className="flex items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-56 sm:w-80 h-4 bg-slate-200 rounded-md" />
              <div className="w-32 h-2.5 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-8 bg-slate-100 rounded-xl" />
            <div className="w-9 h-9 bg-slate-100 rounded-xl" />
          </div>
        </div>

        {/* 2-Column Grid Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column 16:9 Slide Canvas Skeleton */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <div className="w-full aspect-[16/9] rounded-2xl bg-slate-900 flex flex-col items-center justify-center gap-3 border border-slate-800">
              <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <div className="w-32 h-3 bg-slate-700/60 rounded-md" />
            </div>
          </div>

          {/* Right Column Coursework Card Skeleton */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-purple-100 shrink-0" />
              <div className="space-y-1">
                <div className="w-32 h-4 bg-slate-200 rounded-md" />
                <div className="w-24 h-2.5 bg-slate-100 rounded-md" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="w-20 h-4 bg-slate-200 rounded" />
                    <div className="w-10 h-3 bg-slate-200 rounded" />
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded" />
                  <div className="w-1/2 h-3 bg-slate-100 rounded" />
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
          className="px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-extrabold shadow-md hover:bg-[#6d28d9] transition-all"
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
          className="px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-extrabold shadow-md hover:bg-[#6d28d9] transition-all"
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
    <div className="min-h-[calc(100vh-4.5rem)] bg-slate-50/70 p-3 sm:p-5 lg:p-6 font-sans space-y-4 max-w-7xl mx-auto select-none">
      
      {/* ── UNIFIED CINEMA STUDIO HEADER (STREAMLINED: ZERO THEORY CLUTTER) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 rounded-2xl border border-slate-200/90 shadow-2xs">
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
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug truncate" title={presentation.title || presentation.lesson_name}>
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

        {/* Right: Studio Annotation Dock & Fullscreen SVG Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          {/* Annotation Control Bar */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
            {/* Pen Tool Button */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'pen' ? 'none' : 'pen')}
              className={cn(
                "p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer",
                activeTool === 'pen' 
                  ? "bg-[#7c3aed] text-white shadow-sm shadow-purple-500/20" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              )}
              title="Interactive Pen Tool"
            >
              <Pen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pen</span>
            </button>

            {/* Highlighter Tool Button */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'highlighter' ? 'none' : 'highlighter')}
              className={cn(
                "p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer",
                activeTool === 'highlighter' 
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-white"
              )}
              title="Interactive Highlighter Tool"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Highlight</span>
            </button>

            {/* Color Palette (Visible when Pen or Highlighter active) */}
            {(activeTool === 'pen' || activeTool === 'highlighter') && (
              <div className="flex items-center gap-1 px-1.5 border-l border-slate-200 animate-fade-in">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPenColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={cn(
                      "w-4 h-4 rounded-full transition-transform cursor-pointer shrink-0",
                      penColor === c.value ? "ring-2 ring-offset-1 ring-slate-700 scale-110" : "hover:scale-105 opacity-80"
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Eraser Tool Button */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'eraser' ? 'none' : 'eraser')}
              className={cn(
                "p-1.5 rounded-lg transition-all cursor-pointer",
                activeTool === 'eraser' 
                  ? "bg-rose-500 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-white"
              )}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>

            {/* Clear All Annotations */}
            <button
              type="button"
              onClick={clearCanvas}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
              title="Clear all drawings"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Fullscreen SVG Icon Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-purple-50 hover:bg-[#7c3aed] text-[#7c3aed] hover:text-white border border-purple-200 hover:border-purple-600 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full Screen'}</span>
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN STUDIO LAYOUT: SLIDES ON LEFT, RELATED COURSEWORK ON RIGHT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT COLUMN: CINEMA PRESENTATION SLIDES (lg:col-span-8) ── */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-3 sm:p-4 space-y-3">
          
          {/* ── 16:9 EDGE-TO-EDGE CANVAS (ZERO DARK PILLARBOX MARGINS) ── */}
          <div 
            className={cn(
              "w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-800 shadow-inner transition-all duration-300",
              isFullscreen 
                ? "fixed inset-2 z-[99999] rounded-2xl shadow-2xl flex items-center justify-center bg-black" 
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

            {/* Google Slides Iframe Embed */}
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={presentation.title || 'Presentation Viewer'}
                className="w-full h-full border-0 bg-black block"
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
                "absolute inset-0 w-full h-full z-20 transition-opacity",
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
          </div>
        </div>

        {/* ── RIGHT COLUMN: RELATED LESSON COURSEWORK & RESOURCES (lg:col-span-4) ── */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                Related Coursework
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Labs, assessments & projects for this topic
              </p>
            </div>
          </div>

          {!hasCoursework ? (
            <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-slate-150">
              <p className="text-xs font-bold text-slate-600">
                Foundational lecture topic.
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                No extra coursework mapped for this specific slide deck. Review slides thoroughly for upcoming modules.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              
              {/* Coding Practices */}
              {practices.map((practice: any) => (
                <div
                  key={practice.id}
                  onClick={() => navigate('workspace', { id: practice.id })}
                  className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-amber-300 bg-white hover:bg-amber-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                      Coding Lab
                    </span>
                    {practice.completed ? (
                      <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {practice.duration || '20m'}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                    {practice.title}
                  </h4>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
                    <span className="text-amber-600 font-extrabold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform">
                      <span>Solve Lab</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}

              {/* Daily Assessments */}
              {assessments.map((asmnt: any) => (
                <div
                  key={asmnt.id}
                  onClick={() => navigate('daily-assessment', { id: asmnt.id })}
                  className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-purple-300 bg-white hover:bg-purple-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7c3aed] border border-purple-200 text-[10px] font-black uppercase">
                      Daily Assessment
                    </span>
                    {asmnt.completed ? (
                      <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {asmnt.duration || '15m'}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#7c3aed] transition-colors line-clamp-2 leading-snug">
                    {asmnt.title}
                  </h4>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
                    <span className="text-[#7c3aed] font-extrabold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform">
                      <span>Take Assessment</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}

              {/* Weekly Assessment / Quizzes */}
              {quizzes.map((quiz: any) => (
                <div
                  key={quiz.id}
                  onClick={() => navigate('weekly-assessment', { id: quiz.id })}
                  className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-indigo-300 bg-white hover:bg-indigo-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase">
                      Weekly Assessment
                    </span>
                    {quiz.completed ? (
                      <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {quiz.duration || '30m'}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2 leading-snug">
                    {quiz.title}
                  </h4>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
                    <span className="text-indigo-600 font-extrabold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform">
                      <span>Take Quiz</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}

              {/* Projects */}
              {projects.map((proj: any) => (
                <div
                  key={proj.id}
                  onClick={() => navigate('projects', { tab: (proj.type || 'mini').toLowerCase(), id: proj.id })}
                  className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                      Project
                    </span>
                    {proj.completed ? (
                      <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">
                        {proj.type ? `${proj.type.toUpperCase()}` : 'MINI'}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                    {proj.title}
                  </h4>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
                    <span className="text-emerald-600 font-extrabold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform">
                      <span>View Project</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}

              {/* Lecture Recording */}
              {video?.videoUrl && (
                <div
                  onClick={() => {
                    if (matchedLessonData?.courseId && matchedLessonData?.lesson?.id) {
                      navigate('lesson', { id: matchedLessonData.courseId, lesson: matchedLessonData.lesson.id });
                    }
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200/90 hover:border-purple-300 bg-white hover:bg-purple-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7c3aed] border border-purple-200 text-[10px] font-black uppercase">
                      Class Video
                    </span>
                    {video.completed ? (
                      <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Watched
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {video.duration || '45m'}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#7c3aed] transition-colors line-clamp-2 leading-snug">
                    {presentation.lesson_name || presentation.title} (Lecture)
                  </h4>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end text-xs">
                    <span className="text-[#7c3aed] font-extrabold flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform">
                      <span>Watch Video</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
