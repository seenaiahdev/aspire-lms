import { useState } from 'react';
import {
  Play, Star, Clock, BookOpen, Users, ChevronRight, CheckCircle2,
  Lock, FileText, Code2, ClipboardCheck, FolderGit2, MessageCircle,
  Download, Share2, Heart, Award, ChevronUp, ChevronDown, Check
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

function ModuleAccordion({ mod, course, navigate, isOpen, onToggle }: { mod: any, course: any, navigate: any, isOpen: boolean, onToggle: () => void }) {
  const allLessons = course.stages ? course.stages.flatMap((s: any) => s.modules.flatMap((m: any) => m.lessons)) : [];
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-2 sm:p-3 shadow-2xs">
      <button 
        onClick={onToggle}
        className={cn(
          "w-full flex justify-between items-center px-3 py-3.5 text-left cursor-pointer rounded-xl transition-all duration-300 group",
          isOpen ? "bg-purple-50/50 shadow-inner" : "hover:bg-slate-50"
        )}
      >
        <h4 className={cn("font-extrabold text-[15px] transition-colors", isOpen ? "text-[#7c3aed]" : "text-slate-800 group-hover:text-[#7c3aed]")}>{mod.title}</h4>
        <div className="flex items-center gap-3">
          {mod.duration && <span className={cn("text-[11px] font-extrabold px-2.5 py-1 rounded-md transition-colors", isOpen ? "bg-white text-purple-600 shadow-sm" : "bg-slate-100 text-slate-500")}>{mod.duration}</span>}
          {isOpen ? <ChevronUp className="w-4 h-4 text-[#7c3aed]" /> : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-[#7c3aed]" />}
        </div>
      </button>
      {isOpen && (
        <div className="space-y-2 pt-3 mt-1 pb-1 animate-fade-in pl-1">
          {mod.lessons.map((lesson: any, idx: number) => {
            const Icon = Play; // Since type is removed, default to Play
            const isPreview = lesson.video?.preview || lesson.preview;
            const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id);
            const isLessonLocked = (globalIdx > 0 && allLessons.slice(0, globalIdx).some((l: any) => !l.completed)) && !isPreview;
            
            return (
              <button
                key={lesson.id}
                onClick={(e) => {
                  if (isLessonLocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  navigate('lesson', { id: course.id, lesson: lesson.id });
                }}
                className={cn(
                  "w-full flex items-center gap-3.5 p-3 rounded-xl border border-transparent transition-all duration-200 group/lesson text-left relative overflow-hidden",
                  isLessonLocked
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-white hover:shadow-md hover:border-purple-100/50 hover:-translate-y-0.5 cursor-pointer z-10"
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                  lesson.completed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-[#7c3aed] border border-purple-100',
                )}>
                  {lesson.completed ? (
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  ) : isPreview ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold', lesson.completed ? 'text-slate-500' : 'text-slate-900 group-hover/lesson:text-[#7c3aed] transition-colors')}>{lesson.title}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{lesson.video?.duration || lesson.duration} · Video Lesson</p>
                </div>
                {isLessonLocked && <Lock className="w-4 h-4 text-slate-300 ml-auto" />}
                {isPreview && !lesson.completed && <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white text-[10px] font-black uppercase tracking-wider shadow-sm ml-auto">Preview</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CourseScreen() {
  const { navigate, params } = useNav();
  const course = courses.find((c) => c.id === params.id) || courses[0];
  const [tab, setTab] = useState('modules');
  const [openStageIndex, setOpenStageIndex] = useState<number | null>(0);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleShare = () => {
    const shareData = {
      title: course.title,
      text: `Learn ${course.title} with me on AspireNext!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData)
        .then(() => {
          setToastMessage("Course shared successfully! 🚀");
          setTimeout(() => setToastMessage(null), 3000);
        })
        .catch((err) => {
          console.error("Error sharing:", err);
        });
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setToastMessage("Course link copied to clipboard! Share it with your friends. 🚀");
          setTimeout(() => setToastMessage(null), 3000);
        })
        .catch((err) => {
          console.error("Clipboard error:", err);
        });
    }
  };

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
              "px-5 py-3 font-extrabold text-sm border-b-2 transition-all shrink-0 cursor-pointer",
              tab === t.id
                ? "border-[#7c3aed] text-[#7c3aed] bg-purple-50/50 rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Modules */}
          {tab === 'modules' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-0">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Course Content</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1">{course.stages?.length || 0} stages · {course.lessons} lessons · {course.duration}</p>
                    </div>
                    <ProgressRing value={course.progress} size={60} strokeWidth={6} color="text-[#7c3aed]" />
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    {course.stages?.map((stage: any, i: number) => {
                      const stageLessons = stage.modules.flatMap((m: any) => m.lessons);
                      return (
                      <AccordionItem
                        key={stage.id}
                        title={stage.title}
                        isOpen={openStageIndex === i}
                        onToggle={() => setOpenStageIndex(openStageIndex === i ? null : i)}
                        rightSlot={<span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">{stageLessons.length} lessons</span>}
                      >
                        <div className="space-y-4 pt-2">
                          {stage.modules.map((mod: any) => (
                            <ModuleAccordion 
                              key={mod.id} 
                              mod={mod} 
                              course={course} 
                              navigate={navigate} 
                              isOpen={openModuleId === mod.id}
                              onToggle={() => setOpenModuleId(openModuleId === mod.id ? null : mod.id)}
                            />
                          ))}
                        </div>
                      </AccordionItem>
                    )})}
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
                {course.progress === 0 ? (
                  <div className="text-center py-12 px-4 max-w-sm mx-auto flex flex-col items-center justify-center space-y-4 animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shadow-sm">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-black text-slate-900">Discussion Locked</h4>
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        The discussion board will be unlocked after you start the course.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('lesson', { id: course.id })}
                      className="px-6 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Course
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-4">
                      <Avatar name="New Student" size="md" />
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
                      {/* Empty Discussions */}
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-800">No discussions yet</h4>
                        <p className="text-xs text-slate-500 mt-1">Be the first to start a conversation.</p>
                      </div>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          )}

          {tab === 'resources' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8">
                <div className="space-y-3">
                  {/* Empty Resources */}
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-800">No resources available</h4>
                    <p className="text-xs text-slate-500 mt-1">Check back later for downloadable content.</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {tab === 'reviews' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8">
                <div className="flex items-center gap-8 mb-6 pb-6 border-b border-slate-100">
                  <div className="text-center">
                    <p className="text-5xl font-black text-slate-900">0.0</p>
                    <div className="flex gap-1 justify-center my-2">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 text-slate-200 fill-slate-200" />)}
                    </div>
                    <p className="text-xs font-bold text-slate-400">0 reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map((star) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 w-3">{star}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-slate-200" style={{ width: '0%' }} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 w-8 text-right">0%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Empty Reviews */}
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-800">No reviews yet</h4>
                    <p className="text-xs text-slate-500 mt-1">This course doesn't have any reviews.</p>
                  </div>
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
                <button 
                  onClick={handleShare}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                <button 
                  onClick={() => navigate('certificates')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 border border-purple-100 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" /> Certificate
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className="bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-slate-800">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
