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
import { isDueDatePassed, cleanPhoneSuffix } from './utils';
import { buildCourseSyllabusTree, toSafeSet, toSafeMap, normTitle, isPassedRow, type BuildSyllabusParams } from './syllabusTree';
import { realtimeManager } from './realtimeManager';
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
// Syllabus Tree construction extracted to shared frontend/src/lib/syllabusTree.ts (F-31)
// ─────────────────────────────────────────────

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
              cleanPhoneSuffix(user.mobile),
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

        // Non-blocking idle warm-up of active course syllabus and live sessions/recordings
        setTimeout(() => {
          if (!cancelled) {
            if (enrolledCourses.length > 0 && !existingSyllabi[enrolledCourses[0]]) {
              ensureCourseSyllabus(enrolledCourses[0]).catch(() => {});
            }
            if (batchCode) {
              fetchAllLiveSessions(batchCode).catch(() => {});
              fetchRecordings(batchCode, batchCategory, enrolledCourses).catch(() => {});
            }
          }
        }, 30);
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

    const preloadTopic = `preload_realtime_${sid}`;
    const channel = realtimeManager.getOrCreateChannel(preloadTopic);
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
      realtimeManager.releaseChannel(preloadTopic);
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
