import { useState, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Settings, ArrowLeft, ArrowRight,
  CheckCircle2, FileText, MessageCircle, Download, Bookmark,
  PenLine, List, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Video, RotateCcw,
  SkipBack, SkipForward, Maximize2, Lock,
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { courses } from '@/data/mock';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

function SidebarModuleAccordion({ mod, course, currentLesson, navigate }: any) {
  const [isOpen, setIsOpen] = useState(
    mod.lessons.some((l: any) => l.id === currentLesson?.id)
  );
  return (
    <div className="space-y-1.5 border border-slate-100 p-2 rounded-xl">
      <button 
        onClick={() => setIsOpen(!isOpen)}
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
            const isLocked = !lesson.completed && !lesson.preview;
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
                  lesson.completed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                  isCurrent ? 'bg-[#7c3aed] text-white' : 'bg-slate-100 text-slate-400',
                )}>
                  {lesson.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : (isLocked ? <Lock className="w-3.5 h-3.5 opacity-50" /> : li + 1)}
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
  const course = courses.find((c) => c.id === params.id) || courses[0];
  const [tab, setTab] = useState(() => {
    return localStorage.getItem('aspire_lesson_tab') || 'notes';
  });
  const handleTabChange = (t: string) => {
    setTab(t);
    localStorage.setItem('aspire_lesson_tab', t);
  };
  const [playing, setPlaying] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true });

  const toggleModule = (idx: number) => {
    setExpandedModules((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const allLessons = course.stages?.flatMap((s: any) => s.modules).flatMap((m: any) => m.lessons) || [];
  const currentIdx = allLessons.findIndex((l: any) => l.id === params.lesson);
  const safeCurrentIdx = currentIdx !== -1 ? currentIdx : 0;
  const currentLesson = allLessons[safeCurrentIdx];
  const prevLesson = safeCurrentIdx > 0 ? allLessons[safeCurrentIdx - 1] : null;
  const nextLesson = safeCurrentIdx < allLessons.length - 1 ? allLessons[safeCurrentIdx + 1] : null;

  const currentStageIndex = course.stages?.findIndex((s: any) => 
    s.modules.some((m: any) => m.lessons.some((l: any) => l.id === currentLesson?.id))
  );
  
  useEffect(() => {
    if (currentStageIndex !== undefined && currentStageIndex !== -1) {
      setExpandedModules((prev) => ({ ...prev, [currentStageIndex]: true }));
    }
  }, [currentStageIndex]);

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-6 overflow-hidden font-sans pb-2 relative">
      
      {/* Left Area: Sized Video Player + Notes Tabs */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto space-y-4 pr-1 pb-6">
        
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
                <button 
                  onClick={() => navigate('course', { id: course.id })} 
                  className="text-white/80 hover:text-white text-xs font-bold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-md transition-all mr-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-white font-extrabold text-sm sm:text-base tracking-tight">{currentLesson.title}</span>
              </div>
              <p className="text-slate-400 text-[11px] font-semibold tracking-wide ml-0.5">4K · Ultra HD · AspireLMS Masterclass</p>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all">
                <Bookmark className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Video Coming Soon Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3">
            <div className="px-5 py-2.5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-2.5 pointer-events-none">
              <Video className="w-4 h-4 text-purple-300" />
              <span className="text-white font-extrabold text-sm tracking-wide">Video Coming Soon</span>
            </div>
            <p className="text-white/60 text-[11px] font-bold tracking-wider uppercase">Content in Production</p>
          </div>

          {/* Bottom Player Controls Dock (Matches Reference Design) */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-30 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent space-y-3">
            
            {/* Timeline Scrubber Bar with Timestamps at Both Ends */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/90 font-mono font-bold shrink-0">12:04</span>
              
              {/* White Progress Bar with Seeker Handle Dot */}
              <div className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden cursor-pointer group/bar relative">
                <div className="h-full rounded-full bg-white relative" style={{ width: '42%' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border border-slate-900 cursor-pointer" />
                </div>
              </div>

              <span className="text-xs text-white/70 font-mono font-semibold shrink-0">{currentLesson.duration}</span>
            </div>

            {/* Controls Actions Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3.5">
                {/* Skip Back 10s */}
                <button className="text-white/80 hover:text-white transition-colors p-1" title="Rewind 10s">
                  <SkipBack className="w-4 h-4 fill-white/80" />
                </button>

                {/* Main Circular Solid White Play/Pause Button */}
                <button 
                  onClick={() => setPlaying(!playing)} 
                  className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {playing ? <Pause className="w-4 h-4 fill-slate-950 text-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 text-slate-950 ml-0.5" />}
                </button>

                {/* Skip Forward 10s */}
                <button className="text-white/80 hover:text-white transition-colors p-1" title="Forward 10s">
                  <SkipForward className="w-4 h-4 fill-white/80" />
                </button>

                {/* Volume Button */}
                <button className="text-white/80 hover:text-white transition-colors p-1 ml-1">
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                  1.0x
                </span>
                <button className="text-white/80 hover:text-white transition-colors p-1">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Lesson Header & Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider">
                {course.stages?.[currentStageIndex >= 0 ? currentStageIndex : 0]?.title || 'Module'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-extrabold">
                Lesson {currentIdx + 1} of {allLessons.length}
              </span>
            </div>
            <h1 className="font-extrabold text-slate-900 text-lg sm:text-xl">{currentLesson.title}</h1>
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
              <div className="flex flex-col h-full justify-center items-center text-center py-4">
                <PenLine className="w-8 h-8 text-slate-200 mb-2" />
                <h4 className="text-xs font-bold text-slate-800">Your notes will appear here</h4>
                <p className="text-[10px] text-slate-500 mt-1">Start typing below to save notes for this lesson.</p>
              </div>
            )}

            {tab === 'transcript' && (
              <div className="flex flex-col h-full justify-center items-center text-center py-4">
                <FileText className="w-8 h-8 text-slate-200 mb-2" />
                <h4 className="text-xs font-bold text-slate-800">Transcript unavailable</h4>
                <p className="text-[10px] text-slate-500 mt-1">This lesson does not have a transcript yet.</p>
              </div>
            )}

            {tab === 'resources' && (
              <div className="flex flex-col h-full justify-center items-center text-center py-4">
                <Download className="w-8 h-8 text-slate-200 mb-2" />
                <h4 className="text-xs font-bold text-slate-800">No resources attached</h4>
                <p className="text-[10px] text-slate-500 mt-1">Check back later for downloadable files.</p>
              </div>
            )}

            {tab === 'discussion' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Avatar name="New Student" size="sm" />
                  <input className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-[#7c3aed] outline-none" placeholder="Ask a question about this lesson..." />
                </div>
                <div className="flex flex-col items-center text-center py-6 border-t border-slate-100 mt-4">
                  <MessageCircle className="w-8 h-8 text-slate-200 mb-2" />
                  <h4 className="text-xs font-bold text-slate-800">No discussions yet</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Be the first to start a conversation.</p>
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
              const isStageOpen = expandedModules[si] ?? (si === 0);
              const stageLessons = stage.modules.flatMap((m: any) => m.lessons);
              return (
                <div key={stage.id} className="rounded-xl border border-slate-100 overflow-hidden shadow-2xs">
                  {/* Stage Header Card Toggle */}
                  <button
                    onClick={() => toggleModule(si)}
                    className="w-full p-3 bg-slate-50 hover:bg-purple-50/40 flex items-center justify-between transition-colors text-left"
                  >
                    <p className="text-xs font-extrabold text-slate-800 line-clamp-1">
                      {si + 1}. {stage.title}
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
                        <SidebarModuleAccordion key={mod.id} mod={mod} course={course} currentLesson={currentLesson} navigate={navigate} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
