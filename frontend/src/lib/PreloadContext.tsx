/**
 * PreloadContext — On-demand & background data caching for Aspire LMS.
 *
 * Implements Tier-1 (Memory) and Tier-2 (SessionStorage) SWR caching.
 * Unvisited tabs/courses never execute queries on startup.
 * When a student navigates or hovers over a tab, data is served instantly (0ms)
 * from cache or fetched on-demand without database statement timeouts.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useUser } from './UserContext';
import { supabase } from './supabase';
import {
  fetchCoursesByIds,
  fetchCompletedLessons,
  fetchPresentations,
  fetchBatchStudentCount,
  fetchAllLiveSessions,
  fetchRecordings,
  PresentationRecord,
} from './api';
import { getLessonResolver, clearLessonResolverCache, LessonResolver } from './lessonLinkResolver';
import { isDueDatePassed } from './utils';
import {
  cachedQuery,
  getCached,
  prefetchQuery,
  invalidateCache,
  invalidateCacheByPrefix,
  CACHE_TTL,
} from './queryCache';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PreloadState {
  /** true when user global context & primary courses are loaded */
  ready: boolean;
  /** true while background/startup fetch is running */
  loading: boolean;
  /** Course objects from the DB */
  courses: any[];
  /** courseId → built syllabus tree (stages → modules → lessons) */
  syllabi: Record<string, any>;
  /** Batch-wide student count for the logged-in user's batch */
  batchStudentCount: number;
  /** Lesson IDs the student has completed (video watched) */
  completedLessons: Set<string>;
  /** Assessment/quiz/practice completion sets */
  doneAssess: Set<string>;
  failedAssess: Set<string>;
  doneQuiz: Set<string>;
  failedQuiz: Set<string>;
  donePractice: Set<string>;
  /** Recordings keyed by normalised lesson title */
  recByTitle: Map<string, any>;
  /** Presentation slides cached */
  presentations: PresentationRecord[];
  /** Bump this to force a full re-prefetch (e.g. after realtime content change) */
  reloadKey: number;
  bumpReload: () => void;
  /** On-demand course syllabus builder (0ms from memory/sessionStorage if cached) */
  ensureCourseSyllabus: (courseId: string) => Promise<any>;
  /** On-demand presentations prefetch */
  ensurePresentations: (enrolledCourses?: string[]) => Promise<PresentationRecord[]>;
  /** On-demand recordings map fetch */
  ensureRecordings: () => Promise<Map<string, any>>;
  /** Predictive hover/touch intent prefetcher */
  prefetchRoute: (route: string) => void;
}

const defaultState: PreloadState = {
  ready: false,
  loading: false,
  courses: [],
  syllabi: {},
  batchStudentCount: 1,
  presentations: [],
  completedLessons: new Set(),
  doneAssess: new Set(),
  failedAssess: new Set(),
  doneQuiz: new Set(),
  failedQuiz: new Set(),
  donePractice: new Set(),
  recByTitle: new Map(),
  reloadKey: 0,
  bumpReload: () => {},
  ensureCourseSyllabus: async () => null,
  ensurePresentations: async () => [],
  ensureRecordings: async () => new Map(),
  prefetchRoute: () => {},
};

interface MemoryPreloadCache {
  userId: string;
  courses: any[];
  syllabi: Record<string, any>;
  batchStudentCount: number;
  completedLessons: Set<string>;
  doneAssess: Set<string>;
  failedAssess: Set<string>;
  doneQuiz: Set<string>;
  failedQuiz: Set<string>;
  donePractice: Set<string>;
  recByTitle: Map<string, any>;
  presentations: PresentationRecord[];
}

let memoryPreloadCache: MemoryPreloadCache | null = null;

const PreloadContext = createContext<PreloadState>(defaultState);

// ─────────────────────────────────────────────
// Helpers (mirrors LearningScreen logic exactly)
// ─────────────────────────────────────────────

function toSafeSet(input: any): Set<string> {
  if (!input) return new Set();
  if (input instanceof Set) return input;
  if (Array.isArray(input)) return new Set(input.map(String));
  if (typeof input === 'object') {
    if (input.__dataType === 'Set' && Array.isArray(input.values)) {
      return new Set(input.values.map(String));
    }
    return new Set(Object.keys(input));
  }
  return new Set();
}

function toSafeMap(input: any): Map<string, any> {
  if (!input) return new Map();
  if (input instanceof Map) return input;
  if (Array.isArray(input)) return new Map(input);
  if (typeof input === 'object') {
    if (input.__dataType === 'Map' && Array.isArray(input.entries)) {
      return new Map(input.entries);
    }
    return new Map(Object.entries(input));
  }
  return new Map();
}

const normTitle = (s: any) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const isPassedRow = (r: any) => {
  const score = Number(r.score ?? 0);
  const status = String(r.status ?? '').toLowerCase();
  return score >= 70 || status === 'passed';
};

const assessLessonTitle = (a: any) =>
  normTitle(String(a.topic_name || '').split('||').pop());

const projLessonTitle = (p: any) => {
  try { return normTitle(JSON.parse(p.description || '{}').moduleName); } catch { return ''; }
};

interface BuildSyllabusParams {
  courseId: string;
  topics: any[];
  lessons: any[];
  assessments: any[];
  codingQuestions: any[];
  projects: any[];
  quizzes: any[];
  resolver: LessonResolver;
  batchCode: string;
  batchCategory: string;
  doneLessons: Set<string>;
  doneAssess: Set<string>;
  failedAssess: Set<string>;
  doneQuiz: Set<string>;
  failedQuiz: Set<string>;
  donePractice: Set<string>;
  recByTitle: Map<string, any>;
  presentationsData: PresentationRecord[];
}

function buildCourseSyllabusTree({
  courseId,
  topics,
  lessons,
  assessments,
  codingQuestions,
  projects,
  quizzes,
  resolver,
  batchCode,
  batchCategory,
  doneLessons,
  doneAssess,
  failedAssess,
  doneQuiz,
  failedQuiz,
  donePractice,
  recByTitle,
  presentationsData,
}: BuildSyllabusParams) {
  const safeDoneLessons = toSafeSet(doneLessons);
  const safeDoneAssess = toSafeSet(doneAssess);
  const safeFailedAssess = toSafeSet(failedAssess);
  const safeDoneQuiz = toSafeSet(doneQuiz);
  const safeFailedQuiz = toSafeSet(failedQuiz);
  const safeDonePractice = toSafeSet(donePractice);
  const safeRecByTitle = toSafeMap(recByTitle);

  const userBatch = (batchCode || '').trim().toLowerCase();
  const userCat = (batchCategory || '').trim().toLowerCase();

  const relevantAssessments = (assessments || []).filter((a: any) => {
    const pub = String(a.publish_status || '').toLowerCase();
    if (pub && (pub.includes('draft') || pub.includes('hidden'))) return false;
    // Strict course isolation: assessment must belong to this course
    if (a.course_id && a.course_id !== courseId) return false;
    const tb = String(a.target_batch || '').toLowerCase();
    if (!tb) return true;
    if (tb.includes('all batches') || tb === 'all') return true;
    if (userBatch && tb.split(',').map((s: string) => s.trim()).includes(userBatch)) return true;
    if (userCat && tb.includes(userCat)) return true;
    return false;
  });

  const stages = topics.map((topic: any) => {
    const subtopics = topic.subtopics || [];
    return {
      id: topic.id,
      title: topic.title,
      modules: subtopics.map((sub: any) => {
        const rawModuleLessons = lessons.filter((l: any) => l.module_id === sub.id);
        const seenTitles = new Set<string>();
        const moduleLessons = rawModuleLessons.filter((l: any) => {
          const norm = String(l.title || '').toLowerCase().trim();
          if (seenTitles.has(norm)) return false;
          seenTitles.add(norm);
          return true;
        });

        return {
          id: sub.id,
          title: sub.title,
          description: sub.description || '',
          duration: sub.durationHours || sub.duration || '5h',
          lessons: moduleLessons.map((l: any, idx: number) => {
            const dbPractices = (codingQuestions || []).filter((cq: any) =>
              resolver.resolveLessonId(cq.inner_topic_id) === l.id
            );
            const lessonTitleKey = normTitle(l.title);

            const dbAssessments = (relevantAssessments || []).filter((asmnt: any) => {
              const parts = asmnt.topic_id ? asmnt.topic_id.split('||') : [];
              if (resolver.resolveLessonId(parts[2]) === l.id) return true;
              const aLessonTitle = assessLessonTitle(asmnt);
              if (aLessonTitle && aLessonTitle === lessonTitleKey) return true;
              const aModTitle = normTitle(parts[1] || (asmnt.topic_name ? asmnt.topic_name.split('||')[1] : ''));
              const currentModTitle = normTitle(sub.title);
              if (aModTitle && currentModTitle && (currentModTitle.includes(aModTitle) || aModTitle.includes(currentModTitle))) {
                const aWords = aLessonTitle.split(' ').filter((w: string) => w.length > 2);
                const lWords = lessonTitleKey.split(' ').filter((w: string) => w.length > 2);
                const overlap = aWords.filter((w: string) => lWords.includes(w));
                if (overlap.length >= 2) return true;
                if (aWords.length >= 2 && lWords.length >= 2 && aWords[0] === lWords[0] && aWords[1] === lWords[1]) return true;
              }
              return false;
            });

            const seenProjTitles = new Set<string>();
            const dbProjects = (projects || []).filter((p: any) => {
              const t = projLessonTitle(p);
              const matches = (!!t && t === lessonTitleKey) || resolver.resolveLessonId(p.inner_topic_id) === l.id;
              if (!matches) return false;
              const titleKey = String(p.title || '').trim().toLowerCase();
              if (seenProjTitles.has(titleKey)) return false;
              seenProjTitles.add(titleKey);
              return true;
            });

            const dbQuizzes = (quizzes || []).filter((q: any) => {
              if (resolver.resolveLessonId(q.inner_topic_id) === l.id) return true;
              const t = normTitle(q.topic_name);
              return !!t && t === lessonTitleKey;
            });

            const practices = dbPractices.map((cq: any) => ({
              id: cq.id,
              title: cq.title,
              duration: '20m',
              completed: safeDonePractice.has(cq.id) || safeDonePractice.has(String(cq.id || '').trim()),
            }));

            const lessonAssessments = dbAssessments.map((asmnt: any) => {
              const isDone = safeDoneAssess.has(asmnt.id) || safeDoneAssess.has(String(asmnt.id || '').trim());
              const isFailed = !isDone && (safeFailedAssess.has(asmnt.id) || safeFailedAssess.has(String(asmnt.id || '').trim()));
              return {
                id: asmnt.id,
                title: asmnt.title,
                duration: `${asmnt.duration_minutes || 15}m`,
                completed: isDone,
                failed: isFailed,
              };
            });

            const lessonProjects = dbProjects.map((p: any) => {
              let dueDate = p.due_date || '';
              if (!dueDate && p.description && typeof p.description === 'string') {
                try {
                  const parsed = JSON.parse(p.description);
                  dueDate = parsed.due_date || parsed.dueDate || '';
                } catch {}
              }
              const isOverdue = isDueDatePassed(dueDate);
              const isManualDone = safeDonePractice.has(p.id) || safeDonePractice.has(String(p.id || '').trim());
              return {
                id: p.id,
                title: p.title,
                type: p.type || 'mini',
                completed: isManualDone,
                isAutoSubmitted: !isManualDone && isOverdue,
              };
            });

            const lessonQuizzes = dbQuizzes.map((q: any) => {
              const isDone = safeDoneQuiz.has(q.id) || safeDoneQuiz.has(String(q.id || '').trim());
              const isFailed = !isDone && (safeFailedQuiz.has(q.id) || safeFailedQuiz.has(String(q.id || '').trim()));
              return {
                id: q.id,
                title: q.title,
                duration: `${q.duration_minutes || 30}m`,
                completed: isDone,
                failed: isFailed,
              };
            });

            const videoCompleted = safeDoneLessons.has(l.id) || safeDoneLessons.has(String(l.id || '').trim());
            const items = [...practices, ...lessonAssessments, ...lessonProjects, ...lessonQuizzes];
            const lessonCompleted = videoCompleted && items.every((it: any) => it.completed);
            const rec = safeRecByTitle.get(normTitle(l.title));

            const matchingPpt = (presentationsData || []).find((p: any) => {
              if (p.inner_topic_id && (p.inner_topic_id === l.id || resolver.resolveLessonId(p.inner_topic_id) === l.id)) {
                return true;
              }
              const pTitle = normTitle(p.title || p.lesson_name);
              return !!pTitle && pTitle === lessonTitleKey;
            });

            return {
              id: l.id,
              title: l.title,
              description: l.description,
              completed: lessonCompleted,
              videoCompleted,
              coverTopics: resolver.getCoverTopics(l.id),
              presentation: matchingPpt || null,
              video: {
                preview: idx === 0,
                duration: rec?.duration || '45m',
                completed: videoCompleted,
                videoUrl: rec?.video_url || '',
                thumbnail: rec?.thumbnail || '',
              },
              practices,
              assessments: lessonAssessments,
              projects: lessonProjects,
              quizzes: lessonQuizzes,
            };
          }),
        };
      }),
    };
  });

  return { id: courseId, stages };
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function PreloadProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [state, setState] = useState<PreloadState>(() => {
    const sid = user?.id;
    if (sid && memoryPreloadCache && memoryPreloadCache.userId === sid) {
      return {
        ...defaultState,
        ready: true,
        loading: false,
        courses: memoryPreloadCache.courses,
        syllabi: memoryPreloadCache.syllabi,
        batchStudentCount: memoryPreloadCache.batchStudentCount,
        presentations: memoryPreloadCache.presentations,
        completedLessons: memoryPreloadCache.completedLessons,
        doneAssess: memoryPreloadCache.doneAssess,
        failedAssess: memoryPreloadCache.failedAssess,
        doneQuiz: memoryPreloadCache.doneQuiz,
        failedQuiz: memoryPreloadCache.failedQuiz,
        donePractice: memoryPreloadCache.donePractice,
        recByTitle: memoryPreloadCache.recByTitle,
      };
    }
    return defaultState;
  });

  const [reloadKey, setReloadKey] = useState(0);
  const phase1PromiseRef = useRef<Promise<any> | null>(null);
  const latestStateRef = useRef<PreloadState>(state);
  latestStateRef.current = state;

  const bumpReload = useCallback(() => {
    clearLessonResolverCache();
    const sid = user?.id;
    if (sid) {
      invalidateCache(`student_lp:${sid}`);
      invalidateCache(`student_lp_set:${sid}`);
      invalidateCache(`student_aa:${sid}`);
      invalidateCache(`student_aa_full:${sid}`);
      invalidateCache(`student_qa:${sid}`);
      invalidateCache(`student_qa_full:${sid}`);
      invalidateCache(`student_ps:${sid}`);
      invalidateCache(`student_ps_full:${sid}`);
      invalidateCache(`user_aa:${sid}`);
      invalidateCache(`user_qa:${sid}`);
      invalidateCache(`user_ps:${sid}`);
    }
    invalidateCacheByPrefix('syllabus:');
    invalidateCacheByPrefix('user_courses:');
    invalidateCacheByPrefix('user_ppt:');
    invalidateCacheByPrefix('user_rec:');
    setReloadKey((k) => k + 1);
  }, [user?.id]);

  /**
   * On-demand Course Syllabus Loader.
   * Checks state -> checks queryCache (memory/sessionStorage) -> fetches scoped to courseId.
   */
  const ensureCourseSyllabus = useCallback(async (courseId: string) => {
    if (!courseId) return null;

    // 1. In-memory state check (0ms)
    if (latestStateRef.current.syllabi[courseId]) {
      return latestStateRef.current.syllabi[courseId];
    }

    // 2. Dual-tier query cache check (0ms)
    const cached = getCached<any>(`syllabus:${courseId}`);
    if (cached) {
      setState((prev) => ({
        ...prev,
        syllabi: { ...prev.syllabi, [courseId]: cached },
      }));
      if (memoryPreloadCache) {
        memoryPreloadCache.syllabi[courseId] = cached;
      }
      return cached;
    }

    // Await Phase 1 if currently in flight to ensure student completion sets are ready
    if (phase1PromiseRef.current) {
      try {
        await phase1PromiseRef.current;
      } catch {}
    }

    // 3. Fetch scoped queries on-demand with deduplication and 10m TTL
    const syllabus = await cachedQuery(
      `syllabus:${courseId}`,
      async () => {
        const batchCode = user?.batchCode || '';
        const batchCategory = user?.batchCategory || 'Weekday';
        const resolver = await getLessonResolver([courseId], batchCode);

        const [
          { data: topics },
          { data: lessons },
          { data: assessments },
          { data: codingQuestions },
          { data: projects },
          { data: quizzes },
        ] = await Promise.all([
          supabase.from('course_topics').select('*').eq('course_id', courseId).order('id', { ascending: true }),
          supabase.from('course_lessons').select('*').eq('course_id', courseId).order('sort_order', { ascending: true }),
          supabase.from('assessments').select('id, topic_id, topic_name, duration_minutes, title, course_id, target_batch, publish_status').eq('course_id', courseId),
          supabase.from('coding_questions').select('id, inner_topic_id, title').eq('course_id', courseId),
          supabase.from('projects').select('id, inner_topic_id, title, type, description, due_date').eq('course_id', courseId),
          supabase.from('quizzes').select('id, inner_topic_id, topic_name, duration_minutes, title').eq('course_id', courseId),
        ]);

        if (!topics || !lessons) return null;

        const cur = latestStateRef.current;
        return buildCourseSyllabusTree({
          courseId,
          topics,
          lessons,
          assessments: assessments || [],
          codingQuestions: codingQuestions || [],
          projects: projects || [],
          quizzes: quizzes || [],
          resolver,
          batchCode,
          batchCategory,
          doneLessons: cur.completedLessons,
          doneAssess: cur.doneAssess,
          failedAssess: cur.failedAssess,
          doneQuiz: cur.doneQuiz,
          failedQuiz: cur.failedQuiz,
          donePractice: cur.donePractice,
          recByTitle: cur.recByTitle,
          presentationsData: cur.presentations,
        });
      },
      CACHE_TTL.CURRICULUM
    );

    if (syllabus) {
      setState((prev) => ({
        ...prev,
        syllabi: { ...prev.syllabi, [courseId]: syllabus },
      }));
      if (memoryPreloadCache) {
        memoryPreloadCache.syllabi[courseId] = syllabus;
      }
    }
    return syllabus;
  }, [user?.batchCode, user?.batchCategory]);

  /**
   * On-demand presentations fetcher.
   */
  const ensurePresentations = useCallback(async (enrolled?: string[]) => {
    const targetCourses = enrolled || user?.enrolledCourses || [];
    if (!targetCourses.length) return [];
    return cachedQuery(
      `user_ppt:${targetCourses.join(',')}`,
      () => fetchPresentations(targetCourses),
      CACHE_TTL.STATIC
    );
  }, [user?.enrolledCourses]);

  /**
   * On-demand recordings getter.
   */
  const ensureRecordings = useCallback(async () => {
    return latestStateRef.current.recByTitle;
  }, []);

  /**
   * Predictive hover/touch intent prefetcher.
   * Warms cache non-blockingly before the user clicks a tab.
   */
  const prefetchRoute = useCallback((route: string) => {
    const enrolledCourses = user?.enrolledCourses || [];
    const firstCourseId = enrolledCourses[0];

    switch (route) {
      case 'learning':
      case 'milestones':
      case 'course':
        if (firstCourseId && !latestStateRef.current.syllabi[firstCourseId]) {
          ensureCourseSyllabus(firstCourseId).catch(() => {});
        }
        break;
      case 'live':
        {
          const b = user?.batchCode || 'A26W1';
          prefetchQuery(
            `all_live_sessions:${b}`,
            () => fetchAllLiveSessions(b),
            CACHE_TTL.DYNAMIC
          );
        }
        break;
      case 'recordings':
        {
          const b = user?.batchCode || '';
          const cat = user?.batchCategory || '';
          const enrolled = user?.enrolledCourses || [];
          const cacheKey = `recordings:${b}:${cat}:${[...enrolled].sort().join(',')}`;
          prefetchQuery(
            cacheKey,
            () => fetchRecordings(b, cat, enrolled),
            CACHE_TTL.DYNAMIC
          );
        }
        break;
      case 'practice':
        prefetchQuery(
          'practice_problems:active',
          () => supabase.from('practice_problems').select('*').eq('status', 'active'),
          CACHE_TTL.STATIC
        );
        break;
      case 'assignments':
      case 'daily-assessment':
      case 'weekly-assessment':
        if (firstCourseId) {
          prefetchQuery(
            `assessments:${firstCourseId}`,
            () => supabase.from('assessments').select('*').eq('course_id', firstCourseId),
            CACHE_TTL.DYNAMIC
          );
        }
        break;
      case 'quizzes':
        if (firstCourseId) {
          prefetchQuery(
            `quizzes:${firstCourseId}`,
            () => supabase.from('quizzes').select('*').eq('course_id', firstCourseId),
            CACHE_TTL.DYNAMIC
          );
        }
        break;
      default:
        break;
    }
  }, [user?.enrolledCourses, user?.batchCode, ensureCourseSyllabus]);

  // Phase 1: Startup student context (Courses, Progress, Batches)
  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') {
      setState({ ...defaultState, bumpReload, ensureCourseSyllabus, ensurePresentations, ensureRecordings, prefetchRoute });
      return;
    }
    if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
      setState({ ...defaultState, ready: true, loading: false, bumpReload, ensureCourseSyllabus, ensurePresentations, ensureRecordings, prefetchRoute });
      return;
    }

    let cancelled = false;

    // Stale-While-Revalidate: hydrate immediately from memory cache if available
    if (memoryPreloadCache && memoryPreloadCache.userId === sid) {
      setState((prev) => ({
        ...prev,
        ready: true,
        loading: false,
        courses: memoryPreloadCache!.courses,
        syllabi: memoryPreloadCache!.syllabi,
        batchStudentCount: memoryPreloadCache!.batchStudentCount,
        presentations: memoryPreloadCache!.presentations,
        completedLessons: memoryPreloadCache!.completedLessons,
        doneAssess: memoryPreloadCache!.doneAssess,
        failedAssess: memoryPreloadCache!.failedAssess,
        doneQuiz: memoryPreloadCache!.doneQuiz,
        failedQuiz: memoryPreloadCache!.failedQuiz,
        donePractice: memoryPreloadCache!.donePractice,
        recByTitle: memoryPreloadCache!.recByTitle,
        ensureCourseSyllabus,
        ensurePresentations,
        ensureRecordings,
        prefetchRoute,
      }));
    } else {
      // Check Tier-2 sessionStorage for existing syllabi upfront
      const hydratedSyllabi: Record<string, any> = {};
      for (const cid of user.enrolledCourses) {
        const stored = getCached<any>(`syllabus:${cid}`);
        if (stored) hydratedSyllabi[cid] = stored;
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        ready: prev.ready || prev.courses.length > 0 || Object.keys(hydratedSyllabi).length > 0,
        syllabi: { ...prev.syllabi, ...hydratedSyllabi },
        ensureCourseSyllabus,
        ensurePresentations,
        ensureRecordings,
        prefetchRoute,
      }));
    }

    const fetchPhase1 = async () => {
      try {
        const enrolledCourses = user.enrolledCourses!;
        const batchCode = user.batchCode || '';
        const batchCategory = user.batchCategory || 'Weekday';

        const userLookupIds = Array.from(
          new Set(
            [
              sid,
              String(sid || '').trim(),
              user.mobile,
              (user.mobile || '').replace(/\D/g, '').slice(-10),
              user.registrationId,
            ].filter(Boolean) as string[]
          )
        );

        const [
          courses,
          aaRes,
          qaRes,
          psRes,
          recRes,
          doneLessons,
          presentationsData,
          batchStudentCount,
        ] = await Promise.all([
          cachedQuery(`user_courses:${enrolledCourses.join(',')}`, () => fetchCoursesByIds(enrolledCourses), CACHE_TTL.STATIC).catch(() => []),
          cachedQuery(`user_aa:${sid}`, () => supabase.from('assessment_attempts').select('assignment_id, score, status').in('student_id', userLookupIds), CACHE_TTL.USER_DATA).catch(() => ({ data: [] })),
          cachedQuery(`user_qa:${sid}`, () => supabase.from('quiz_attempts').select('quiz_id, score, status').in('user_id', userLookupIds), CACHE_TTL.USER_DATA).catch(() => ({ data: [] })),
          cachedQuery(`user_ps:${sid}`, () => supabase.from('practice_submissions').select('problem_id').in('student_id', userLookupIds), CACHE_TTL.USER_DATA).catch(() => ({ data: [] })),
          cachedQuery(`user_rec:${batchCategory}`, () => supabase.from('recordings').select('title, concept_name, video_url, thumbnail, duration, target_batch, publish_status, instructions').order('created_at', { ascending: false }).limit(60), CACHE_TTL.MEDIUM).catch(() => ({ data: [] })),
          fetchCompletedLessons(sid).catch(() => new Set<string>()),
          cachedQuery(`user_ppt:${enrolledCourses.join(',')}`, () => fetchPresentations(enrolledCourses), CACHE_TTL.STATIC).catch(() => []),
          fetchBatchStudentCount(batchCode).catch(() => 1),
        ]);

        if (cancelled) return;

        // Build completion sets
        const doneAssess = new Set<string>(
          (aaRes.data || []).filter(isPassedRow).flatMap((r: any) => [String(r.assignment_id || '').trim(), r.assignment_id])
        );
        const failedAssess = new Set<string>(
          (aaRes.data || []).filter((r: any) => !isPassedRow(r)).flatMap((r: any) => [String(r.assignment_id || '').trim(), r.assignment_id])
        );
        for (const id of Array.from(doneAssess)) failedAssess.delete(id);

        const doneQuiz = new Set<string>(
          (qaRes.data || []).filter(isPassedRow).flatMap((r: any) => [String(r.quiz_id || '').trim(), r.quiz_id])
        );
        const failedQuiz = new Set<string>(
          (qaRes.data || []).filter((r: any) => !isPassedRow(r)).flatMap((r: any) => [String(r.quiz_id || '').trim(), r.quiz_id])
        );
        for (const id of Array.from(doneQuiz)) failedQuiz.delete(id);

        const donePractice = new Set<string>(
          (psRes.data || []).flatMap((r: any) => [String(r.problem_id || '').trim(), r.problem_id])
        );

        // Build recordings map
        const batchCat = batchCategory.toLowerCase();
        const recByTitle = new Map<string, any>();
        const recMatchesBatch = (r: any) => {
          const tb = String(r.target_batch || '').toLowerCase();
          return !tb || tb.includes('all') || (batchCat && tb.includes(batchCat));
        };
        (recRes.data || []).forEach((r: any) => {
          if (!r.video_url) return;
          const pub = String(r.publish_status || '').toLowerCase();
          if (pub.includes('draft') || pub.includes('hidden')) return;
          [r.concept_name, r.title].forEach((t: any) => {
            const k = normTitle(t);
            if (!k) return;
            const existing = recByTitle.get(k);
            if (!existing || (!recMatchesBatch(existing) && recMatchesBatch(r))) recByTitle.set(k, r);
          });
        });

        const finalBatchStudentCount = typeof batchStudentCount === 'number' ? batchStudentCount : 1;

        // Check sessionStorage for already-built syllabi
        const existingSyllabi: Record<string, any> = { ...latestStateRef.current.syllabi };
        for (const cid of enrolledCourses) {
          if (!existingSyllabi[cid]) {
            const stored = getCached<any>(`syllabus:${cid}`);
            if (stored) existingSyllabi[cid] = stored;
          }
        }

        memoryPreloadCache = {
          userId: sid,
          courses: courses || [],
          syllabi: existingSyllabi,
          batchStudentCount: finalBatchStudentCount,
          completedLessons: doneLessons,
          doneAssess,
          failedAssess,
          doneQuiz,
          failedQuiz,
          donePractice,
          recByTitle,
          presentations: presentationsData || [],
        };

        setState({
          ready: true,
          loading: false,
          courses: courses || [],
          syllabi: existingSyllabi,
          batchStudentCount: finalBatchStudentCount,
          presentations: presentationsData || [],
          completedLessons: doneLessons,
          doneAssess,
          failedAssess,
          doneQuiz,
          failedQuiz,
          donePractice,
          recByTitle,
          reloadKey,
          bumpReload,
          ensureCourseSyllabus,
          ensurePresentations,
          ensureRecordings,
          prefetchRoute,
        });

        // Non-blocking idle warm-up of active course syllabus if not already cached
        if (enrolledCourses.length > 0 && !existingSyllabi[enrolledCourses[0]]) {
          setTimeout(() => {
            if (!cancelled) {
              ensureCourseSyllabus(enrolledCourses[0]).catch(() => {});
            }
          }, 60);
        }
      } catch (err) {
        console.error('[PreloadContext] Phase 1 prefetch failed:', err);
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    phase1PromiseRef.current = fetchPhase1();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, (user?.enrolledCourses || []).join(','), reloadKey, bumpReload, ensureCourseSyllabus, ensurePresentations, ensureRecordings, prefetchRoute]);

  // Realtime subscription: invalidate specific cache keys on changes
  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') return;
    if (!user.enrolledCourses?.length) return;

    let timer: any = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => bumpReload(), 800);
    };

    const channel = supabase.channel(`preload_realtime_${sid}_${Date.now()}`);
    [
      'course_lessons',
      'course_topics',
      'assessments',
      'quizzes',
      'projects',
      'coding_questions',
      'milestones_data',
      'recordings',
      'assessment_attempts',
      'quiz_attempts',
      'practice_submissions',
      'lesson_progress',
      'milestone_locks',
    ].forEach((table) =>
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump)
    );
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, (user?.enrolledCourses || []).join(','), bumpReload]);

  return (
    <PreloadContext.Provider value={{ ...state, reloadKey, bumpReload }}>
      {children}
    </PreloadContext.Provider>
  );
}

export function usePreload(): PreloadState {
  return useContext(PreloadContext);
}
