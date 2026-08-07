import { useState } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Settings, ArrowLeft, ArrowRight,
  CheckCircle2, FileText, MessageCircle, Download, Bookmark,
  PenLine, List, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Video, RotateCcw,
  SkipBack, SkipForward, Maximize2,
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { courses } from '@/data/mock';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

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

  const allLessons = course.modules.flatMap((m: any) => m.lessons);
  const currentIdx = allLessons.findIndex((l: any) => l.id === params.lesson) || 0;
  const currentLesson = allLessons[currentIdx] || allLessons[0];
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-6 overflow-hidden font-sans pb-2 relative">
      
      {/* Left Area: Sized Video Player + Notes Tabs */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:overflow-hidden space-y-4 pr-1">
        
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

          {/* Center Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <button
              onClick={() => setPlaying(!playing)}
              className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center group/play hover:bg-white/25 transition-all shadow-2xl border border-white/20 active:scale-95 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg group-hover/play:scale-110 transition-transform">
                {playing ? <Pause className="w-5 h-5 fill-slate-950 text-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 text-slate-950 ml-0.5" />}
              </div>
            </button>
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
                {course.modules[0].title}
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
              onClick={() => nextLesson ? navigate('lesson', { id: course.id, lesson: nextLesson.id }) : navigate('course', { id: course.id })}
              rightIcon={nextLesson ? <ArrowRight className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-md"
            >
              {nextLesson ? 'Next Lesson' : 'Complete Course'}
            </Button>
          </div>
        </div>

        {/* Flexible Tabs & Note Taking Area (Scrollable inner box) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-4">
          
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
              <div className="flex flex-col h-full justify-between space-y-3">
                <textarea
                  placeholder="Take notes while you learn... Type here."
                  className="w-full flex-1 min-h-[100px] text-xs font-semibold text-slate-800 focus:outline-none resize-none bg-transparent"
                  defaultValue={`Key takeaways from this lesson:
- useCallback memoizes the function reference
- useMemo memoizes the return value
- Use them when passing callbacks to optimized child components
- Don't overuse - only when there's a measurable performance benefit`}
                />
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 shrink-0">
                  <p className="text-[11px] font-semibold text-slate-400">Auto-saved 2 min ago</p>
                  <button className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] font-extrabold text-xs flex items-center gap-1.5 border border-purple-100 transition-colors">
                    <Bookmark className="w-3.5 h-3.5" /> Save Note
                  </button>
                </div>
              </div>
            )}

            {tab === 'transcript' && (
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {[
                  { time: '0:00', text: 'Welcome back. In this lesson, we are going to dive deep into React hooks.' },
                  { time: '0:24', text: 'Hooks were introduced in React 16.8 and they changed how we write components.' },
                  { time: '1:12', text: 'The most important hooks to understand are useState and useEffect.' },
                  { time: '2:30', text: 'Let me show you a practical example of how useState works.' },
                  { time: '4:15', text: 'Now let us look at useEffect and how it handles side effects.' },
                ].map((t, i) => (
                  <div key={i} className="flex gap-3 hover:bg-purple-50/50 p-2 rounded-xl transition-colors cursor-pointer">
                    <span className="text-xs text-[#7c3aed] font-mono font-bold shrink-0 w-10">{t.time}</span>
                    <p className="text-xs font-medium text-slate-700">{t.text}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'resources' && (
              <div className="space-y-2">
                {['Lesson Slides.pdf', 'Code Examples.zip', 'Cheatsheet.pdf'].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-100 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-[#7c3aed]" />
                    <span className="flex-1 text-xs font-bold text-slate-800">{r}</span>
                    <Download className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            )}

            {tab === 'discussion' && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Avatar src="https://i.pravatar.cc/200?img=12" name="Aarav" size="sm" />
                  <input className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-[#7c3aed] outline-none" placeholder="Ask a question about this lesson..." />
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
                  <Avatar src="https://i.pravatar.cc/200?img=15" name="Karan" size="sm" />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Karan Patel</span>
                    <p className="text-xs font-medium text-slate-600 mt-0.5">At 4:15, why did you use useState instead of useReducer?</p>
                  </div>
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
            {course.modules.map((mod: any, mi: number) => {
              const isModuleOpen = expandedModules[mi] ?? (mi === 0);
              return (
                <div key={mod.id} className="rounded-xl border border-slate-100 overflow-hidden shadow-2xs">
                  {/* Module Header Card Toggle */}
                  <button
                    onClick={() => toggleModule(mi)}
                    className="w-full p-3 bg-slate-50 hover:bg-purple-50/40 flex items-center justify-between transition-colors text-left"
                  >
                    <p className="text-xs font-extrabold text-slate-800 line-clamp-1">
                      {mi + 1}. {mod.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-extrabold text-slate-400">{mod.lessons.length} lessons</span>
                      {isModuleOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>

                  {/* Module Lessons Accordion Drawer */}
                  {isModuleOpen && (
                    <div className="p-2 space-y-1.5 bg-white border-t border-slate-100 animate-fade-in">
                      {mod.lessons.map((lesson: any, li: number) => {
                        const isCurrent = lesson.id === currentLesson.id;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => navigate('lesson', { id: course.id, lesson: lesson.id })}
                            className={cn(
                              'w-full flex items-center gap-2.5 p-2 rounded-xl transition-all text-left border',
                              isCurrent 
                                ? 'bg-purple-50 border-purple-200 text-[#7c3aed] shadow-2xs font-extrabold' 
                                : 'bg-white hover:bg-slate-50 border-transparent text-slate-700'
                            )}
                          >
                            <div className={cn(
                              'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black',
                              lesson.completed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              isCurrent ? 'bg-[#7c3aed] text-white' : 'bg-slate-100 text-slate-400',
                            )}>
                              {lesson.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : li + 1}
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
            })}
          </div>
        </div>
      )}

    </div>
  );
}
