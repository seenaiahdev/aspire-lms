import { useState } from 'react';
import {
  Play, Star, Clock, BookOpen, Users, ChevronRight, CheckCircle2,
  Lock, FileText, Code2, ClipboardCheck, FolderGit2, MessageCircle,
  Download, Share2, Heart, Award,
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { courses } from '@/data/mock';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { DifficultyBadge } from '@/components/ui/StatusChip';
import { AccordionItem } from '@/components/ui/Accordion';
import { cn } from '@/lib/utils';

const lessonIcons: Record<string, any> = {
  video: Play, reading: FileText, quiz: ClipboardCheck, project: FolderGit2,
};

export function CourseScreen() {
  const { navigate, params } = useNav();
  const course = courses.find((c) => c.id === params.id) || courses[0];
  const [tab, setTab] = useState('modules');

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'My Learning', onClick: () => navigate('learning') },
          { label: course.title },
        ]}
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white shadow-xl border border-purple-400/30">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 blur-3xl translate-x-1/3 -translate-y-1/3" />
        
        <div className="relative z-10 p-8 sm:p-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 border border-white/20 text-xs font-black tracking-wider shadow-sm">
              {course.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-black shadow-sm">
              {course.level}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-bold backdrop-blur-sm">
              Bestseller
            </span>
          </div>

          <h1 className="font-extrabold text-2xl sm:text-4xl text-white leading-snug max-w-3xl">
            {course.title}
          </h1>
          <p className="text-purple-100 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
            {course.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-semibold text-purple-100 pt-2 border-t border-white/20">
            <span className="flex items-center gap-1.5 font-bold">
              <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>{course.rating} ({course.reviews} reviews)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{(course.students / 1000).toFixed(1)}k students</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{course.duration}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>{course.lessons} lessons</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Purple Underline Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px overflow-x-auto scrollbar-hide">
            {[
              { id: 'modules', label: 'Modules' },
              { id: 'overview', label: 'Overview' },
              { id: 'resources', label: 'Resources' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'discussion', label: 'Discussion' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-5 py-3 font-extrabold text-sm border-b-2 transition-all shrink-0",
                  tab === t.id
                    ? "border-[#7c3aed] text-[#7c3aed] bg-purple-50/50 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Modules */}
          {tab === 'modules' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-0">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">Course Content</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{course.modules.length} modules · {course.lessons} lessons · {course.duration}</p>
                  </div>
                  <ProgressRing value={course.progress} size={60} strokeWidth={6} color="text-[#7c3aed]" />
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  {course.modules.map((mod: any, i: number) => (
                    <AccordionItem
                      key={mod.id}
                      title={`${i + 1}. ${mod.title}`}
                      defaultOpen={i === 0}
                      rightSlot={<span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">{mod.lessons.length} lessons</span>}
                    >
                      <div className="space-y-1.5 pt-2">
                        {mod.lessons.map((lesson: any) => {
                          const Icon = lessonIcons[lesson.type] || Play;
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => navigate('lesson', { id: course.id, lesson: lesson.id })}
                              className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-purple-50/60 border border-transparent hover:border-purple-100 transition-all group text-left"
                            >
                              <div className={cn(
                                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                                lesson.completed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-[#7c3aed] border border-purple-100',
                              )}>
                                {lesson.completed ? (
                                  <CheckCircle2 className="w-4.5 h-4.5" />
                                ) : lesson.preview ? (
                                  <Play className="w-4 h-4" />
                                ) : (
                                  <Icon className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-bold', lesson.completed ? 'text-slate-500' : 'text-slate-900 group-hover:text-[#7c3aed] transition-colors')}>{lesson.title}</p>
                                <p className="text-xs font-semibold text-slate-400 mt-0.5">{lesson.duration} · {lesson.type}</p>
                              </div>
                              {!lesson.completed && !lesson.preview && <Lock className="w-4 h-4 text-slate-300" />}
                              {lesson.preview && <span className="px-2 py-0.5 rounded bg-purple-100 text-[#7c3aed] text-[10px] font-black uppercase tracking-wider">Preview</span>}
                            </button>
                          );
                        })}
                      </div>
                    </AccordionItem>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'overview' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-4">
                <h3 className="font-extrabold text-slate-900 text-lg">About This Course</h3>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{course.description}</p>
                <h4 className="font-extrabold text-slate-900 pt-2">What you'll learn</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {course.tags.map((tag: string) => (
                    <div key={tag} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-[#7c3aed] shrink-0" />
                      {tag}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'discussion' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-6">
                <div className="flex gap-4">
                  <Avatar src="https://i.pravatar.cc/200?img=12" name="Aarav" size="md" />
                  <div className="flex-1 space-y-3">
                    <textarea placeholder="Ask a question or share your thoughts..." className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 outline-none text-sm font-semibold text-slate-900 min-h-[90px] resize-none" />
                    <div className="flex justify-end">
                      <button className="px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold shadow-md transition-all">
                        Post Comment
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {[
                    { name: 'Ishita Verma', avatar: 'https://i.pravatar.cc/200?img=20', time: '3h ago', message: 'Can someone explain the difference between useCallback and useMemo? I keep confusing them.', likes: 12, replies: 4 },
                    { name: 'Rohan Mehta', avatar: 'https://i.pravatar.cc/200?img=33', time: '5h ago', message: 'Great question! useCallback memoizes the function itself, while useMemo memoizes the result of the function call.', likes: 28, replies: 2 },
                  ].map((d, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                      <Avatar src={d.avatar} name={d.name} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-extrabold text-slate-900">{d.name}</span>
                          <span className="text-xs font-bold text-slate-400">{d.time}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-3">{d.message}</p>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                          <button className="flex items-center gap-1.5 hover:text-[#7c3aed] transition-colors"><Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> {d.likes}</button>
                          <button className="flex items-center gap-1.5 hover:text-[#7c3aed] transition-colors"><MessageCircle className="w-4 h-4" /> {d.replies} Replies</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'resources' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8">
                <div className="space-y-3">
                  {['React Cheat Sheet.pdf', 'Starter Code.zip', 'Project Requirements.pdf', 'API Documentation.pdf'].map((r, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-100 hover:border-purple-100 transition-colors cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                        <FileText className="w-5 h-5 text-[#7c3aed]" />
                      </div>
                      <span className="flex-1 text-sm font-extrabold text-slate-800 group-hover:text-[#7c3aed] transition-colors">{r}</span>
                      <Download className="w-4 h-4 text-slate-400 group-hover:text-[#7c3aed]" />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'reviews' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8">
                <div className="flex items-center gap-8 mb-6 pb-6 border-b border-slate-100">
                  <div className="text-center">
                    <p className="text-5xl font-black text-slate-900">{course.rating}</p>
                    <div className="flex gap-1 justify-center my-2">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className="text-xs font-bold text-slate-400">{course.reviews} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map((star) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 w-3">{star}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${star === 5 ? 68 : star === 4 ? 22 : star === 3 ? 7 : 2}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 w-8 text-right">{star === 5 ? '68%' : star === 4 ? '22%' : star === 3 ? '7%' : '2%'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Neha Gupta', avatar: 'https://i.pravatar.cc/200?img=31', rating: 5, time: '1 week ago', comment: 'Absolutely fantastic course! The instructor explains complex concepts in a very intuitive way. The projects are challenging but rewarding.' },
                    { name: 'Arjun Reddy', avatar: 'https://i.pravatar.cc/200?img=11', rating: 5, time: '2 weeks ago', comment: 'Best React course I have taken. The pace is perfect and the real-world examples make everything click.' },
                  ].map((r, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                      <Avatar src={r.avatar} name={r.name} size="sm" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-extrabold text-slate-900">{r.name}</span>
                          <div className="flex gap-0.5">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div>
                        </div>
                        <p className="text-sm font-medium text-slate-600">{r.comment}</p>
                        <p className="text-xs font-bold text-slate-400 mt-2">{r.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-6">
          {/* Instructor */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <h3 className="font-extrabold text-slate-900 text-lg">Instructor</h3>
            </CardHeader>
            <CardBody className="p-6 pt-2 space-y-4">
              <div className="flex items-center gap-3.5">
                <Avatar src={course.instructor.avatar} name={course.instructor.name} size="lg" className="border-2 border-purple-100" />
                <div>
                  <p className="font-extrabold text-slate-900 text-base">{course.instructor.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{course.instructor.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="flex items-center justify-center gap-1 text-sm font-black text-slate-900"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{course.instructor.rating}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Rating</p>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{(course.instructor.students / 1000).toFixed(1)}k</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Students</p>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{course.instructor.courses}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Courses</p>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">{course.instructor.bio}</p>
            </CardBody>
          </Card>

          {/* Progress Card */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden sticky top-24">
            <CardBody className="p-6 text-center space-y-4">
              <div className="relative inline-block">
                <ProgressRing value={course.progress} size={110} strokeWidth={8} showLabel={false} color="text-[#7c3aed]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900">{course.progress}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Done</span>
                </div>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-base mb-1">{course.progress}% Completed</p>
                <p className="text-xs font-semibold text-slate-500">{Math.round(course.lessons * course.progress / 100)} of {course.lessons} lessons</p>
              </div>

              <button
                onClick={() => navigate('lesson', { id: course.id })}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{course.progress > 0 ? 'Continue Learning' : 'Start Course'}</span>
              </button>

              <div className="flex gap-2 pt-2">
                <button className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                <button className="flex-1 py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 border border-purple-100">
                  <Award className="w-3.5 h-3.5" /> Certificate
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
