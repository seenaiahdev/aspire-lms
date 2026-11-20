import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, ExternalLink, Presentation as PresentationIcon, 
  FileText, Code2, ClipboardCheck, Brain, FolderGit2, Video, 
  Clock, ShieldAlert, Sparkles, BookOpen, Layers, CheckCircle2,
  Maximize2, Minimize2, ChevronRight, Lock
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

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
      navigate('live', { tab: 'classroom' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-bold">Loading presentation page...</p>
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
    <div className="min-h-[calc(100vh-4.5rem)] bg-slate-50/70 p-4 sm:p-6 lg:p-8 font-sans space-y-6 max-w-7xl mx-auto select-none">
      
      {/* ── TOP HEADER / BREADCRUMB BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-[#7c3aed] border border-slate-200/80 hover:border-purple-200 flex items-center justify-center transition-all shrink-0 cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 flex-wrap">
              <span 
                onClick={handleBack} 
                className="hover:text-slate-700 cursor-pointer transition-colors"
              >
                {fromRoute === 'milestones' ? 'Milestones' : fromRoute === 'dashboard' ? 'Dashboard' : 'Classroom'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-600 truncate max-w-[200px]">
                {presentation.stage_name || matchedLessonData?.stageTitle || 'Course Slides'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-[#7c3aed] font-extrabold truncate max-w-[240px]">
                {presentation.title}
              </span>
            </div>
          </div>
        </div>

        {/* View-Only Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
            <span>View Only • No Download</span>
          </span>
        </div>
      </div>

      {/* ── MAIN PRESENTATION CARD ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-7 space-y-5">
        
        {/* Presentation Metadata Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <PresentationIcon className="w-3 h-3 text-[#7c3aed]" />
                {presentation.provider || 'Google Slides'}
              </span>
              {presentation.course_name && (
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                  {presentation.course_name}
                </span>
              )}
              {presentation.subtopic_name && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                  {presentation.subtopic_name}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {presentation.title || presentation.lesson_name}
            </h1>
            {presentation.lesson_name && (
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Mapped Lesson: <strong>{presentation.lesson_name}</strong></span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-[#7c3aed] border border-slate-200 hover:border-purple-200 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
            </button>
          </div>
        </div>

        {/* ── EMBEDDED SLIDE VIEWER CANVAS ── */}
        <div 
          className={cn(
            "w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-800 transition-all duration-300",
            isFullscreen ? "fixed inset-3 z-[99999] rounded-2xl shadow-2xl" : "aspect-video max-h-[580px] min-h-[380px]"
          )}
          onContextMenu={(e) => e.preventDefault()}
        >
          {isFullscreen && (
            <div className="absolute top-3 right-3 z-30">
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Close Fullscreen</span>
              </button>
            </div>
          )}

          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 z-10">
              <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-bold tracking-wide">Loading slide deck...</p>
            </div>
          )}

          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={presentation.title || 'Presentation Viewer'}
              className="w-full h-full border-0 bg-black"
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
        </div>

        {/* Presentation Footer */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pt-1">
          <span>Batch: {presentation.target_batch || 'Weekday Batch'}</span>
          <span>Added: {presentation.created_date || 'Classroom Deck'}</span>
        </div>
      </div>

      {/* ── RELATED LESSON COURSEWORK & RESOURCES ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-7 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                Related Lesson Coursework & Resources
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Labs, assessments, and projects mapped to this lecture topic
              </p>
            </div>
          </div>

          {matchedLessonData?.courseId && (
            <button
              onClick={() => navigate('milestones')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-extrabold text-[#7c3aed] hover:underline cursor-pointer"
            >
              <span>View Milestone Roadmap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!hasCoursework ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-slate-150">
            <p className="text-xs font-bold text-slate-600">
              This presentation covers foundational concepts for this topic. No additional coding lab or assessment is required for this specific slide deck.
            </p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Review the presentation thoroughly to prepare for upcoming milestone modules.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            
            {/* Coding Practices */}
            {practices.map((practice: any) => (
              <div
                key={practice.id}
                onClick={() => navigate('workspace', { id: practice.id })}
                className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                      Coding Lab
                    </span>
                    {practice.completed && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2">
                    {practice.title}
                  </h4>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {practice.duration || '20m'}
                  </span>
                  <span className="text-amber-600 font-extrabold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
                className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7c3aed] border border-purple-200 text-[10px] font-black uppercase">
                      Daily Assessment
                    </span>
                    {asmnt.completed && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#7c3aed] transition-colors line-clamp-2">
                    {asmnt.title}
                  </h4>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {asmnt.duration || '15m'}
                  </span>
                  <span className="text-[#7c3aed] font-extrabold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
                className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase">
                      Weekly Assessment
                    </span>
                    {quiz.completed && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {quiz.title}
                  </h4>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {quiz.duration || '30m'}
                  </span>
                  <span className="text-indigo-600 font-extrabold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                      Project
                    </span>
                    {proj.completed && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {proj.title}
                  </h4>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-400 font-semibold">
                    {proj.type ? `${proj.type.toUpperCase()} PROJECT` : 'PROJECT'}
                  </span>
                  <span className="text-emerald-600 font-extrabold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
                className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7c3aed] border border-purple-200 text-[10px] font-black uppercase">
                      Class Video
                    </span>
                    {video.completed && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Watched
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#7c3aed] transition-colors line-clamp-2">
                    {presentation.lesson_name || presentation.title} (Lecture)
                  </h4>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {video.duration || '45m'}
                  </span>
                  <span className="text-[#7c3aed] font-extrabold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
  );
}
