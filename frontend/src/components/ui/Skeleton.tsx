import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-5 space-y-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs', className)}>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * CourseCardSkeleton — replicates the layout of course catalog cards
 */
export function CourseCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <Skeleton className="h-6 w-4/5 rounded-lg" />
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-2/3 rounded" />
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * ScheduleCardSkeleton — for live classes and task schedule widgets
 */
export function ScheduleCardSkeleton() {
  return (
    <div className="p-5 rounded-[1.5rem] bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded-lg mb-2" />
        <Skeleton className="h-3.5 w-1/2 rounded mb-4" />
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <Skeleton className="h-3.5 w-28 rounded" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * AssessmentItemSkeleton — for assignments, quizzes, and practice list rows
 */
export function AssessmentItemSkeleton() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-4 w-3/5 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
      </div>
      <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
    </div>
  );
}

/**
 * TableSkeleton — for tabular data views
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CourseScreenSkeleton — full-screen skeleton matching CourseScreen layout
 */
export function CourseScreenSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-20 rounded" />
        <span className="text-slate-300">/</span>
        <Skeleton className="h-3.5 w-32 rounded" />
      </div>

      {/* Hero Banner skeleton */}
      <div className="bg-slate-900 rounded-[2rem] p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full bg-slate-800" />
            <Skeleton className="h-5 w-20 rounded-full bg-slate-800" />
          </div>
          <Skeleton className="h-8 sm:h-10 w-4/5 rounded-xl bg-slate-800" />
          <Skeleton className="h-4 w-full rounded bg-slate-800" />
          <Skeleton className="h-4 w-3/4 rounded bg-slate-800" />
          
          <div className="pt-4 flex items-center gap-4">
            <Skeleton className="h-9 w-32 rounded-xl bg-purple-900/60" />
            <Skeleton className="h-4 w-28 rounded bg-slate-800" />
          </div>
        </div>
      </div>

      {/* Tabs bar skeleton */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Modules accordion skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            </div>
            <Skeleton className="w-5 h-5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * LessonPlayerSkeleton — 16:9 video player placeholder + curriculum sidebar skeleton
 */
export function LessonPlayerSkeleton() {
  return (
    <div className="min-h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-4 lg:gap-6 font-sans">
      {/* Left video area */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Back button skeleton */}
        <Skeleton className="h-4 w-32 rounded" />

        {/* 16:9 Player container */}
        <div className="w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden relative shadow-lg flex items-center justify-center">
          <Skeleton className="w-16 h-16 rounded-full bg-slate-800" />
        </div>

        {/* Lesson title and action bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <Skeleton className="h-6 w-2/3 rounded-lg" />
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Right curriculum sidebar */}
      <div className="w-full lg:w-96 bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4 shrink-0">
        <div className="space-y-2 border-b border-slate-100 pb-4">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3.5 w-4/5 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * WorkspaceSkeleton — IDE layout skeleton (top header, left problem description, right editor shimmer)
 */
export function WorkspaceSkeleton() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col font-sans">
      {/* Header Bar */}
      <div className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg bg-slate-800" />
          <Skeleton className="h-4 w-40 rounded bg-slate-800" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-lg bg-slate-800" />
          <Skeleton className="h-8 w-24 rounded-lg bg-purple-900/60" />
        </div>
      </div>

      {/* 2-Pane Editor Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Problem Pane */}
        <div className="w-full md:w-1/2 border-r border-slate-800 bg-slate-900 p-6 space-y-4">
          <Skeleton className="h-6 w-3/5 rounded bg-slate-800" />
          <Skeleton className="h-4 w-full rounded bg-slate-800" />
          <Skeleton className="h-4 w-4/5 rounded bg-slate-800" />
          <div className="pt-4 space-y-2">
            <Skeleton className="h-4 w-32 rounded bg-slate-800" />
            <Skeleton className="h-24 w-full rounded-xl bg-slate-800/80" />
          </div>
        </div>

        {/* Right Code Editor Pane */}
        <div className="w-full md:w-1/2 bg-slate-950 p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-28 rounded bg-slate-800" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn('h-3 bg-slate-800/60 rounded', i % 3 === 0 ? 'w-2/3' : i % 2 === 0 ? 'w-4/5' : 'w-1/2')}
              />
            ))}
          </div>
          <div className="h-12 border-t border-slate-800 flex items-center justify-between pt-3">
            <Skeleton className="h-7 w-28 rounded bg-slate-800" />
            <Skeleton className="h-7 w-20 rounded bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LiveClassroomSkeleton — video stream placeholder + chat sidebar
 */
export function LiveClassroomSkeleton() {
  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col lg:flex-row gap-4 p-4 font-sans">
      {/* Video stream box */}
      <div className="flex-1 bg-slate-900 rounded-3xl flex flex-col justify-between p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-44 rounded-full bg-slate-800" />
          <Skeleton className="h-6 w-20 rounded-full bg-rose-900/60" />
        </div>
        <div className="flex justify-center">
          <Skeleton className="w-16 h-16 rounded-full bg-slate-800" />
        </div>
        <div className="flex justify-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full bg-slate-800" />
          <Skeleton className="w-10 h-10 rounded-full bg-slate-800" />
          <Skeleton className="w-10 h-10 rounded-full bg-slate-800" />
        </div>
      </div>

      {/* Classroom Chat/Side pane */}
      <div className="w-full lg:w-80 bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
        <div className="space-y-4">
          <Skeleton className="h-5 w-28 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * ProfileCardSkeleton — identity card shimmer for ProfileScreen
 */
export function ProfileCardSkeleton() {
  return (
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-center animate-pulse">
      <div className="flex justify-center">
        <Skeleton className="w-28 h-28 rounded-full border-4 border-slate-100 shadow-sm" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-48 rounded-lg mx-auto" />
        <Skeleton className="h-4 w-32 rounded mx-auto" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
        <div className="p-3 rounded-2xl bg-slate-50 space-y-1">
          <Skeleton className="h-3 w-16 rounded mx-auto" />
          <Skeleton className="h-4 w-20 rounded mx-auto" />
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 space-y-1">
          <Skeleton className="h-3 w-16 rounded mx-auto" />
          <Skeleton className="h-4 w-20 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}
