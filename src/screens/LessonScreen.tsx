import { useState } from 'react';
import {
  Play, Pause, Volume2, Maximize, Settings, ArrowLeft, ArrowRight,
  CheckCircle2, FileText, MessageCircle, Download, Bookmark,
  PenLine, List, ChevronDown, ChevronUp,
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
  const [tab, setTab] = useState('notes');
  const [playing, setPlaying] = useState(true);

  const allLessons = course.modules.flatMap((m: any) => m.lessons);
  const currentIdx = allLessons.findIndex((l: any) => l.id === params.lesson) || 0;
  const currentLesson = allLessons[currentIdx] || allLessons[0];
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-ink-950 group">
        <img src={course.banner} alt={currentLesson.title} className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />

        {/* Center play */}
        <button
          onClick={() => setPlaying(!playing)}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
            {playing ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white ml-1" />}
          </div>
        </button>

        {/* Controls bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-primary-500" style={{ width: '35%' }} />
            </div>
            <span className="text-xs text-white/80 font-mono">12:34 / {currentLesson.duration}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setPlaying(!playing)} className="text-white hover:text-primary-400">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <Volume2 className="w-5 h-5 text-white/70" />
              <Settings className="w-5 h-5 text-white/70" />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-white/10 text-white backdrop-blur-sm">HD 1080p</Badge>
              <Maximize className="w-5 h-5 text-white/70" />
            </div>
          </div>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button onClick={() => navigate('course', { id: course.id })} className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to course
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Lesson header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary">{course.modules[0].title}</Badge>
              <Badge variant="default">Lesson {currentIdx + 1} of {allLessons.length}</Badge>
            </div>
            <h1 className="font-display font-bold text-xl text-ink-900 mb-2">{currentLesson.title}</h1>
            <div className="flex items-center gap-3 text-sm text-ink-500">
              <span className="flex items-center gap-1.5"><Avatar src={course.instructor.avatar} name={course.instructor.name} size="xs" />{course.instructor.name}</span>
              <span className="flex items-center gap-1"><FileText className="w-4 h-4" />{currentLesson.duration}</span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            variant="pills"
            tabs={[
              { id: 'notes', label: 'Notes', icon: <PenLine className="w-4 h-4" /> },
              { id: 'transcript', label: 'Transcript', icon: <FileText className="w-4 h-4" /> },
              { id: 'resources', label: 'Resources', icon: <Download className="w-4 h-4" /> },
              { id: 'discussion', label: 'Discussion', icon: <MessageCircle className="w-4 h-4" /> },
            ]}
            active={tab}
            onChange={setTab}
          />

          {/* Tab content */}
          {tab === 'notes' && (
            <div className="card p-5">
              <textarea
                placeholder="Take notes while you learn... Type here."
                className="w-full min-h-[200px] text-sm text-ink-700 focus:outline-none resize-none bg-transparent"
                defaultValue="Key takeaways from this lesson:
- useCallback memoizes the function reference
- useMemo memoizes the return value
- Use them when passing callbacks to optimized child components
- Don't overuse - only when there's a measurable performance benefit"
              />
              <div className="flex justify-between items-center pt-3 border-t border-ink-100">
                <p className="text-xs text-ink-400">Auto-saved 2 min ago</p>
                <Button size="sm" variant="secondary" leftIcon={<Bookmark className="w-3.5 h-3.5" />}>Save Note</Button>
              </div>
            </div>
          )}

          {tab === 'transcript' && (
            <div className="card p-5 space-y-3 max-h-[300px] overflow-y-auto">
              {[
                { time: '0:00', text: 'Welcome back. In this lesson, we are going to dive deep into React hooks.' },
                { time: '0:24', text: 'Hooks were introduced in React 16.8 and they changed how we write components.' },
                { time: '1:12', text: 'The most important hooks to understand are useState and useEffect.' },
                { time: '2:30', text: 'Let me show you a practical example of how useState works.' },
                { time: '4:15', text: 'Now let us look at useEffect and how it handles side effects.' },
                { time: '6:45', text: 'One common mistake is creating infinite loops with useEffect. Here is how to avoid that.' },
              ].map((t, i) => (
                <div key={i} className="flex gap-3 hover:bg-ink-50 p-2 rounded-lg transition-colors cursor-pointer">
                  <span className="text-xs text-primary-600 font-mono font-semibold shrink-0 w-10">{t.time}</span>
                  <p className="text-sm text-ink-600">{t.text}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'resources' && (
            <div className="card p-5 space-y-2">
              {['Lesson Slides.pdf', 'Code Examples.zip', 'Cheatsheet.pdf', 'Exercise Files.zip'].map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 hover:bg-ink-100 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-accent-600" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-ink-700">{r}</span>
                  <Download className="w-4 h-4 text-ink-400" />
                </div>
              ))}
            </div>
          )}

          {tab === 'discussion' && (
            <div className="card p-5">
              <div className="flex gap-3 mb-4">
                <Avatar src="https://i.pravatar.cc/200?img=12" name="Aarav" size="sm" />
                <input className="input" placeholder="Ask a question about this lesson..." />
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Karan Patel', avatar: 'https://i.pravatar.cc/200?img=15', time: '2h ago', message: 'At 4:15, why did you use useState instead of useReducer? Would not useReducer be better for complex state?', likes: 8 },
                ].map((d, i) => (
                  <div key={i} className="flex gap-3">
                    <Avatar src={d.avatar} name={d.name} size="sm" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-ink-800">{d.name}</span>
                        <span className="text-xs text-ink-400">{d.time}</span>
                      </div>
                      <p className="text-sm text-ink-600">{d.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              disabled={!prevLesson}
              onClick={() => prevLesson && navigate('lesson', { id: course.id, lesson: prevLesson.id })}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <Button
              onClick={() => nextLesson ? navigate('lesson', { id: course.id, lesson: nextLesson.id }) : navigate('course', { id: course.id })}
              rightIcon={nextLesson ? <ArrowRight className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            >
              {nextLesson ? 'Next Lesson' : 'Complete Course'}
            </Button>
          </div>
        </div>

        {/* Right — Lesson list */}
        <div className="space-y-4">
          <div className="card p-4 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink-900 flex items-center gap-2"><List className="w-4 h-4" />Course Content</h3>
              <Badge variant="primary">{course.progress}%</Badge>
            </div>
            <ProgressBar value={course.progress} className="mb-4" />
            <div className="space-y-4 max-h-[500px] overflow-y-auto -mr-2 pr-2">
              {course.modules.map((mod: any, mi: number) => (
                <div key={mod.id}>
                  <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-2">{mi + 1}. {mod.title}</p>
                  <div className="space-y-1">
                    {mod.lessons.map((lesson: any, li: number) => {
                      const isCurrent = lesson.id === currentLesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => navigate('lesson', { id: course.id, lesson: lesson.id })}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left',
                            isCurrent ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-ink-50',
                          )}
                        >
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                            lesson.completed ? 'bg-success-100 text-success-600' :
                            isCurrent ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-400',
                          )}>
                            {lesson.completed ? <CheckCircle2 className="w-4 h-4" /> : li + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs font-medium line-clamp-1', isCurrent ? 'text-primary-700' : 'text-ink-700')}>{lesson.title}</p>
                            <p className="text-2xs text-ink-400">{lesson.duration}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
