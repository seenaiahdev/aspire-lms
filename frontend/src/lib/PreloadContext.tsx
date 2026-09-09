/**
 * PreloadContext — Background data prefetching after login.
 *
 * Fires all heavy My Learning / Milestones / Quizzes / Assignments queries
 * in the background as soon as the user logs in, while they are reading the
 * Dashboard.  By the time they click a tab, all data is already in memory.
 *
 * LearningScreen reads from usePreload() and skips its own Supabase fetches
 * when preload.ready === true.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUser } from './UserContext';
import { supabase } from './supabase';
import {
  fetchCoursesByIds,
  fetchCompletedLessons,
} from './api';
import { getLessonResolver, clearLessonResolverCache } from './lessonLinkResolver';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PreloadState {
  /** true when dbCourses + syllabi are fully loaded */
  ready: boolean;
  /** true while the background fetch is running */
  loading: boolean;
  /** Course objects from the DB */
  courses: any[];
  /** courseId → built syllabus tree (stages → modules → lessons) */
  syllabi: Record<string, any>;
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
  /** Bump this to force a full re-prefetch (e.g. after realtime content change) */
  reloadKey: number;
  bumpReload: () => void;
}

const defaultState: PreloadState = {
  ready: false,
  loading: false,
  courses: [],
  syllabi: {},
  completedLessons: new Set(),
  doneAssess: new Set(),
  failedAssess: new Set(),
  doneQuiz: new Set(),
  failedQuiz: new Set(),
  donePractice: new Set(),
  recByTitle: new Map(),
  reloadKey: 0,
  bumpReload: () => {},
};

const PreloadContext = createContext<PreloadState>(defaultState);

// ─────────────────────────────────────────────
// Helpers (mirrors LearningScreen logic exactly)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function PreloadProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [state, setState] = useState<PreloadState>(defaultState);
  const [reloadKey, setReloadKey] = useState(0);

  const bumpReload = useCallback(() => {
    clearLessonResolverCache();
    setReloadKey(k => k + 1);
  }, []);

  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') {
      setState({ ...defaultState, bumpReload });
      return;
    }
    if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
      setState({ ...defaultState, ready: true, loading: false, bumpReload });
      return;
    }

    let cancelled = false;

    setState(prev => ({ ...prev, loading: true, ready: false }));

    // Preload lazy JS screen chunks in the background so code-splitting doesn't cause a delay on tab click
    import('@/screens/LearningScreen').catch(() => {});
    import('@/screens/LiveClassesScreen').catch(() => {});
    import('@/screens/AssignmentsScreen').catch(() => {});
    import('@/screens/PracticeScreen').catch(() => {});

    (async () => {
      try {
        const enrolledCourses = user.enrolledCourses!;
        const batchCode = user.batchCode || '';
        const batchCategory = user.batchCategory || 'Weekday';

        // Phase 1: Fire all flat queries in parallel
        const userLookupIds = Array.from(new Set([
          sid,
          String(sid || '').trim(),
          user.mobile,
          (user.mobile || '').replace(/\D/g, '').slice(-10),
          user.registrationId,
        ].filter(Boolean) as string[]));

        const [
          courses,
          aaRes,
          qaRes,
          psRes,
          recRes,
          doneLessons,
        ] = await Promise.all([
          fetchCoursesByIds(enrolledCourses),
          supabase.from('assessment_attempts').select('assignment_id, score, status').in('student_id', userLookupIds),
          supabase.from('quiz_attempts').select('quiz_id, score, status').in('user_id', userLookupIds),
          supabase.from('practice_submissions').select('problem_id').in('student_id', userLookupIds),
          supabase.from('recordings').select('title, concept_name, video_url, thumbnail, duration, target_batch, publish_status').order('created_at', { ascending: false }).limit(60),
          fetchCompletedLessons(sid),
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
            const k = normTitle(t); if (!k) return;
            const existing = recByTitle.get(k);
            if (!existing || (!recMatchesBatch(existing) && recMatchesBatch(r))) recByTitle.set(k, r);
          });
        });

        // Phase 2: Build syllabus per course (parallelised)
        const resolver = await getLessonResolver(enrolledCourses, batchCode);
        if (cancelled) return;

        const syllabiMap: Record<string, any> = {};

        await Promise.all(enrolledCourses.map(async (courseId) => {
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
            supabase.from('assessments').select('id, topic_id, topic_name, duration_minutes, title').eq('course_id', courseId),
            supabase.from('coding_questions').select('id, inner_topic_id, title').eq('course_id', courseId),
            supabase.from('projects').select('id, inner_topic_id, title, type, description').eq('course_id', courseId),
            supabase.from('quizzes').select('id, inner_topic_id, topic_name, duration_minutes, title').eq('course_id', courseId),
          ]);

          if (cancelled) return;
          if (!topics || !lessons) return;

          const stages = topics.map((topic: any) => {
            const subtopics = topic.subtopics || [];
            return {
              id: topic.id,
              title: topic.title,
              modules: subtopics.map((sub: any) => {
                const moduleLessons = lessons.filter((l: any) => l.module_id === sub.id);
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
                    const dbAssessments = (assessments || []).filter((asmnt: any) => {
                      const parts = asmnt.topic_id ? asmnt.topic_id.split('||') : [];
                      if (resolver.resolveLessonId(parts[2]) === l.id) return true;
                      const t = assessLessonTitle(asmnt);
                      return !!t && t === lessonTitleKey;
                    });
                    const dbProjects = (projects || []).filter((p: any) => {
                      const t = projLessonTitle(p);
                      return (!!t && t === lessonTitleKey) || resolver.resolveLessonId(p.inner_topic_id) === l.id;
                    });
                    const dbQuizzes = (quizzes || []).filter((q: any) => {
                      if (resolver.resolveLessonId(q.inner_topic_id) === l.id) return true;
                      const t = normTitle(q.topic_name);
                      return !!t && t === lessonTitleKey;
                    });

                    const practices = dbPractices.map((cq: any) => ({
                      id: cq.id, title: cq.title, duration: '20m',
                      completed: donePractice.has(cq.id) || donePractice.has(String(cq.id || '').trim()),
                    }));
                    const lessonAssessments = dbAssessments.map((asmnt: any) => {
                      const isDone = doneAssess.has(asmnt.id) || doneAssess.has(String(asmnt.id || '').trim());
                      const isFailed = !isDone && (failedAssess.has(asmnt.id) || failedAssess.has(String(asmnt.id || '').trim()));
                      return { id: asmnt.id, title: asmnt.title, duration: `${asmnt.duration_minutes || 15}m`, completed: isDone, failed: isFailed };
                    });
                    const lessonProjects = dbProjects.map((p: any) => ({
                      id: p.id, title: p.title, type: p.type || 'mini',
                      completed: donePractice.has(p.id) || donePractice.has(String(p.id || '').trim()),
                    }));
                    const lessonQuizzes = dbQuizzes.map((q: any) => {
                      const isDone = doneQuiz.has(q.id) || doneQuiz.has(String(q.id || '').trim());
                      const isFailed = !isDone && (failedQuiz.has(q.id) || failedQuiz.has(String(q.id || '').trim()));
                      return { id: q.id, title: q.title, duration: `${q.duration_minutes || 30}m`, completed: isDone, failed: isFailed };
                    });

                    const videoCompleted = doneLessons.has(l.id) || doneLessons.has(String(l.id || '').trim());
                    const items = [...practices, ...lessonAssessments, ...lessonProjects, ...lessonQuizzes];
                    const lessonCompleted = videoCompleted && items.every((it: any) => it.completed);
                    const rec = recByTitle.get(normTitle(l.title));

                    return {
                      id: l.id,
                      title: l.title,
                      description: l.description,
                      completed: lessonCompleted,
                      videoCompleted,
                      coverTopics: resolver.getCoverTopics(l.id),
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

          syllabiMap[courseId] = { id: courseId, stages };
        }));

        if (cancelled) return;

        setState({
          ready: true,
          loading: false,
          courses: courses || [],
          syllabi: syllabiMap,
          completedLessons: doneLessons,
          doneAssess,
          failedAssess,
          doneQuiz,
          failedQuiz,
          donePractice,
          recByTitle,
          reloadKey,
          bumpReload,
        });
      } catch (err) {
        console.error('[PreloadContext] Background prefetch failed:', err);
        if (!cancelled) {
          setState(prev => ({ ...prev, loading: false, bumpReload }));
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, (user?.enrolledCourses || []).join(','), reloadKey]);

  // Realtime: bump prefetch on any content / completion change
  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') return;
    if (!user.enrolledCourses?.length) return;

    let timer: any = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => bumpReload(), 800);
    };

    const channel = supabase.channel('preload_realtime');
    [
      'course_lessons', 'course_topics', 'assessments', 'quizzes',
      'projects', 'coding_questions', 'milestones_data', 'recordings',
      'assessment_attempts', 'quiz_attempts', 'practice_submissions', 'lesson_progress',
      'milestone_locks',
    ].forEach(table =>
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
