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

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-ink-950 min-h-[280px] lg:min-h-[340px]">
        <img src={course.banner} alt={course.title} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/20" />
        <div className="relative z-10 p-6 lg:p-8 flex flex-col h-full justify-end">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="primary" className="bg-primary-600 text-white">{course.category}</Badge>
            <DifficultyBadge difficulty={course.level} />
            <Badge variant="default" className="bg-white/10 text-white backdrop-blur-sm border border-white/20">Bestseller</Badge>
          </div>
          <h1 className="font-display font-bold text-2xl lg:text-3xl text-white mb-2 max-w-2xl">{course.title}</h1>
          <p className="text-white/80 text-sm lg:text-base mb-4 max-w-xl">{course.subtitle}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-secondary-400 fill-secondary-400" />{course.rating} ({course.reviews} reviews)</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{(course.students / 1000).toFixed(1)}k students</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{course.duration}</span>
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{course.lessons} lessons</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <Tabs
            variant="underline"
            tabs={[
              { id: 'modules', label: 'Modules' },
              { id: 'overview', label: 'Overview' },
              { id: 'resources', label: 'Resources' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'discussion', label: 'Discussion' },
            ]}
            active={tab}
            onChange={setTab}
          />

          {/* Modules */}
          {tab === 'modules' && (
            <Card>
              <CardBody className="p-0">
                <div className="p-5 border-b border-ink-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-ink-900">Course Content</h3>
                      <p className="text-xs text-ink-500 mt-0.5">{course.modules.length} modules · {course.lessons} lessons · {course.duration}</p>
                    </div>
                    <ProgressRing value={course.progress} size={56} />
                  </div>
                </div>
                <div className="px-5">
                  {course.modules.map((mod: any, i: number) => (
                    <AccordionItem
                      key={mod.id}
                      title={`${i + 1}. ${mod.title}`}
                      defaultOpen={i === 0}
                      rightSlot={<span className="text-xs text-ink-400">{mod.lessons.length} lessons</span>}
                    >
                      <div className="space-y-1">
                        {mod.lessons.map((lesson: any) => {
                          const Icon = lessonIcons[lesson.type] || Play;
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => navigate('lesson', { id: course.id, lesson: lesson.id })}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-ink-50 transition-colors group text-left"
                            >
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                lesson.completed ? 'bg-success-100' : 'bg-ink-100',
                              )}>
                                {lesson.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-success-600" />
                                ) : lesson.preview ? (
                                  <Play className="w-3.5 h-3.5 text-ink-600" />
                                ) : (
                                  <Icon className="w-3.5 h-3.5 text-ink-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium', lesson.completed ? 'text-ink-500' : 'text-ink-800')}>{lesson.title}</p>
                                <p className="text-xs text-ink-400">{lesson.duration} · {lesson.type}</p>
                              </div>
                              {!lesson.completed && !lesson.preview && <Lock className="w-3.5 h-3.5 text-ink-300" />}
                              {lesson.preview && <Badge variant="accent" size="sm">Preview</Badge>}
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
            <Card>
              <CardBody>
                <h3 className="font-bold text-ink-900 mb-3">About This Course</h3>
                <p className="text-sm text-ink-600 leading-relaxed mb-4">{course.description}</p>
                <h4 className="font-semibold text-ink-800 mb-2">What you'll learn</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {course.tags.map((tag: string) => (
                    <div key={tag} className="flex items-center gap-2 text-sm text-ink-600">
                      <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                      {tag}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'discussion' && (
            <Card>
              <CardBody>
                <div className="flex gap-3 mb-6">
                  <Avatar src="https://i.pravatar.cc/200?img=12" name="Aarav" size="md" />
                  <div className="flex-1">
                    <textarea placeholder="Ask a question or share your thoughts..." className="input min-h-[80px] resize-none" />
                    <div className="flex justify-end mt-2">
                      <Button size="sm">Post</Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Ishita Verma', avatar: 'https://i.pravatar.cc/200?img=20', time: '3h ago', message: 'Can someone explain the difference between useCallback and useMemo? I keep confusing them.', likes: 12, replies: 4 },
                    { name: 'Rohan Mehta', avatar: 'https://i.pravatar.cc/200?img=33', time: '5h ago', message: 'Great question! useCallback memoizes the function itself, while useMemo memoizes the result of the function call.', likes: 28, replies: 2 },
                  ].map((d, i) => (
                    <div key={i} className="flex gap-3">
                      <Avatar src={d.avatar} name={d.name} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-ink-800">{d.name}</span>
                          <span className="text-xs text-ink-400">{d.time}</span>
                        </div>
                        <p className="text-sm text-ink-600 mb-2">{d.message}</p>
                        <div className="flex items-center gap-4 text-xs text-ink-400">
                          <button className="flex items-center gap-1 hover:text-primary-600 transition-colors"><Heart className="w-3.5 h-3.5" /> {d.likes}</button>
                          <button className="flex items-center gap-1 hover:text-primary-600 transition-colors"><MessageCircle className="w-3.5 h-3.5" /> {d.replies}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'resources' && (
            <Card>
              <CardBody>
                <div className="space-y-2">
                  {['React Cheat Sheet.pdf', 'Starter Code.zip', 'Project Requirements.pdf', 'API Documentation.pdf'].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 hover:bg-ink-100 transition-colors cursor-pointer">
                      <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-accent-600" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-ink-700">{r}</span>
                      <Download className="w-4 h-4 text-ink-400" />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'reviews' && (
            <Card>
              <CardBody>
                <div className="flex items-center gap-6 mb-6 pb-6 border-b border-ink-100">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-ink-900 font-display">{course.rating}</p>
                    <div className="flex gap-0.5 justify-center my-1">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 text-secondary-400 fill-secondary-400" />)}
                    </div>
                    <p className="text-xs text-ink-500">{course.reviews} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5,4,3,2,1].map((star) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-ink-500 w-3">{star}</span>
                        <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                          <div className="h-full rounded-full bg-secondary-400" style={{ width: `${star === 5 ? 68 : star === 4 ? 22 : star === 3 ? 7 : 2}%` }} />
                        </div>
                        <span className="text-xs text-ink-400 w-8 text-right">{star === 5 ? '68%' : star === 4 ? '22%' : star === 3 ? '7%' : '2%'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Neha Gupta', avatar: 'https://i.pravatar.cc/200?img=31', rating: 5, time: '1 week ago', comment: 'Absolutely fantastic course! The instructor explains complex concepts in a very intuitive way. The projects are challenging but rewarding.' },
                    { name: 'Arjun Reddy', avatar: 'https://i.pravatar.cc/200?img=11', rating: 5, time: '2 weeks ago', comment: 'Best React course I have taken. The pace is perfect and the real-world examples make everything click.' },
                  ].map((r, i) => (
                    <div key={i} className="flex gap-3">
                      <Avatar src={r.avatar} name={r.name} size="sm" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-ink-800">{r.name}</span>
                          <div className="flex gap-0.5">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="w-3 h-3 text-secondary-400 fill-secondary-400" />)}</div>
                        </div>
                        <p className="text-sm text-ink-600">{r.comment}</p>
                        <p className="text-xs text-ink-400 mt-1">{r.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-4">
          {/* Instructor */}
          <Card>
            <CardHeader>
              <h3 className="font-bold text-ink-900 mb-4">Instructor</h3>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={course.instructor.avatar} name={course.instructor.name} size="lg" />
                <div>
                  <p className="font-bold text-ink-900">{course.instructor.name}</p>
                  <p className="text-xs text-ink-500">{course.instructor.title}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-ink-900"><Star className="w-3.5 h-3.5 text-secondary-400 fill-secondary-400" />{course.instructor.rating}</p>
                  <p className="text-2xs text-ink-400">Rating</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink-900">{(course.instructor.students / 1000).toFixed(1)}k</p>
                  <p className="text-2xs text-ink-400">Students</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-ink-900">{course.instructor.courses}</p>
                  <p className="text-2xs text-ink-400">Courses</p>
                </div>
              </div>
              <p className="text-xs text-ink-500 mt-4 leading-relaxed">{course.instructor.bio}</p>
            </CardBody>
          </Card>

          {/* Progress card */}
          {course.enrolled ? (
            <Card className="sticky top-20">
              <CardBody className="text-center">
                <ProgressRing value={course.progress} size={100} strokeWidth={8} className="mb-4" />
                <p className="font-bold text-ink-900 mb-1">{course.progress}% Complete</p>
                <p className="text-xs text-ink-500 mb-4">{Math.round(course.lessons * course.progress / 100)} of {course.lessons} lessons</p>
                <Button fullWidth onClick={() => navigate('lesson', { id: course.id })} leftIcon={<Play className="w-4 h-4" />}>
                  {course.progress > 0 ? 'Continue Learning' : 'Start Course'}
                </Button>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" fullWidth size="sm" leftIcon={<Share2 className="w-3.5 h-3.5" />}>Share</Button>
                  <Button variant="outline" fullWidth size="sm" leftIcon={<Award className="w-3.5 h-3.5" />}>Certificate</Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card className="sticky top-20">
              <CardBody className="text-center">
                <p className="text-3xl font-bold text-ink-900 font-display mb-1">Free</p>
                <p className="text-xs text-ink-500 mb-4">Full access · Lifetime</p>
                <Button fullWidth size="lg" onClick={() => navigate('lesson', { id: course.id })}>Enroll Now</Button>
                <Button variant="outline" fullWidth size="md" className="mt-2" leftIcon={<Play className="w-4 h-4" />}>Watch Preview</Button>
                <div className="mt-4 pt-4 border-t border-ink-100 space-y-2 text-left">
                  <p className="text-xs font-semibold text-ink-700">This course includes:</p>
                  {['On-demand video', 'Downloadable resources', 'Certificate of completion', 'Access on mobile and TV'].map((f) => (
                    <p key={f} className="flex items-center gap-2 text-xs text-ink-500"><CheckCircle2 className="w-3.5 h-3.5 text-success-500" />{f}</p>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
