import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useUser } from './UserContext';

/**
 * ────────────────────────────────────────────────────────────────────────────
 * Lesson-link id bridge + cover-topics
 * ────────────────────────────────────────────────────────────────────────────
 * The admin data stores the SAME lessons under two different id schemes:
 *
 *   Scheme B (course_topics / course_lessons / milestone_locks / coding_questions)
 *     stage `top-stg-1`, module `mod-git`, lesson `lesson-1787196281985-0`
 *
 *   Scheme A (milestones_data / assessments / projects / live_sessions.description)
 *     stage `s1`, module `m1_git`, lesson `l_git_1`
 *
 * Unlock state (`user.unlockedLessonIds`, from `milestone_locks`) is keyed by Scheme B.
 * coding_questions link with Scheme B and cascade fine, but assessments
 * (`topic_id = s1||m1_git||l_git_1`) and projects (`inner_topic_id = l_git_3`) link with
 * Scheme A ids that never match — so their content never surfaces for an unlocked lesson.
 *
 * We bridge Scheme A → Scheme B by matching (module title :: lesson title). `milestones_data`
 * supplies Scheme A id → titles; `course_topics` + `course_lessons` supply titles → Scheme B id.
 *
 * "Class Topics & Syllabus Covered" content lives in `live_sessions.description` (a JSON string
 * with `moduleId` = Scheme A lesson id and a `topics[]` array). We resolve each session to its
 * canonical Scheme B lesson id and expose its topics via getCoverTopics().
 */

export interface CoverTopic {
  title: string;
  agenda?: string;
}

export interface LessonResolver {
  /** Map any lesson-link id (Scheme A or B) to the canonical Scheme B course_lessons id. */
  resolveLessonId: (rawId: string) => string;
  /** "Class Topics & Syllabus Covered" for a lesson (canonical Scheme B lesson id). */
  getCoverTopics: (lessonId: string) => CoverTopic[];
}

const norm = (s: any): string =>
  String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const compositeKey = (moduleTitle: any, lessonTitle: any): string =>
  `${norm(moduleTitle)}::${norm(lessonTitle)}`;

// Session cache: one build per set of course ids.
const cache = new Map<string, Promise<LessonResolver>>();

const identityResolver: LessonResolver = { resolveLessonId: (id) => id, getCoverTopics: () => [] };

interface CollectedLesson {
  moduleTitle: string;
  lessonTitle: string;
  lessonId: string;
}

/**
 * Collect {moduleTitle, lessonTitle, lessonId} from a milestones_data row's stages.
 * Handles BOTH nesting shapes the admin has used:
 *   - new: stage.subtopics[](module) -> .modules[](lesson)
 *   - old: stage.modules[](module)   -> .lessons[](lesson)
 */
function walkMilestoneStages(stages: any[], out: CollectedLesson[]) {
  if (!Array.isArray(stages)) return;
  for (const stage of stages) {
    const moduleContainers = (stage?.subtopics?.length ? stage.subtopics : stage?.modules) || [];
    for (const mc of moduleContainers) {
      const moduleTitle = mc?.title;
      const lessonList = (mc?.modules?.length ? mc.modules : mc?.lessons) || [];
      for (const lesson of lessonList) {
        if (lesson?.id && lesson?.title) {
          out.push({ moduleTitle, lessonTitle: lesson.title, lessonId: lesson.id });
        }
      }
    }
  }
}

/** Safely parse a live_sessions.description JSON string. */
function parseSessionDescription(desc: any): any | null {
  if (!desc || typeof desc !== 'string') return null;
  try {
    return JSON.parse(desc);
  } catch {
    return null;
  }
}

/** Whether a live session targets the given batch (via description.targetBatches, batch_code, or target_batch). */
function sessionTargetsBatch(session: any, desc: any, batchCode: string): boolean {
  if (!batchCode) return true; // batch unknown — don't over-hide
  const want = norm(batchCode);
  const tb = desc?.targetBatches;
  if (Array.isArray(tb)) {
    if (tb.some((b: any) => norm(b) === want || norm(b) === 'all' || norm(b) === 'all batches')) return true;
  }
  if (session?.batch_code && norm(session.batch_code) === want) return true;
  const targetStr = norm(session?.target_batch || '');
  if (targetStr) {
    if (targetStr.includes('all batches') || targetStr === 'all') return true;
    if (targetStr.split(',').map((s) => s.trim()).includes(want)) return true;
  }
  return false;
}

async function buildResolver(courseIds: string[], batchCode: string): Promise<LessonResolver> {
  try {
    const [topicsRes, lessonsRes, milestonesRes, sessionsRes] = await Promise.all([
      supabase.from('course_topics').select('id, subtopics').in('course_id', courseIds),
      supabase.from('course_lessons').select('id, title, module_id').in('course_id', courseIds),
      supabase.from('milestones_data').select('id, stages, overview'),
      supabase.from('live_sessions').select('id, session_title, description, publish_status, batch_code, target_batch'),
    ]);

    const courseLessons = lessonsRes.data || [];
    if (courseLessons.length === 0) return identityResolver;

    // module_id (Scheme B) -> module title, from course_topics.subtopics
    const moduleIdToTitle = new Map<string, string>();
    for (const topic of topicsRes.data || []) {
      for (const sub of topic?.subtopics || []) {
        if (sub?.id) moduleIdToTitle.set(sub.id, sub.title || '');
      }
    }

    // (moduleTitle::lessonTitle) -> Scheme B course_lessons id, plus lessonTitle-alone fallback
    const compositeToBId = new Map<string, string>();
    const titleToBId = new Map<string, string>();
    const bIds = new Set<string>();
    for (const l of courseLessons) {
      bIds.add(l.id);
      const modTitle = moduleIdToTitle.get(l.module_id) || '';
      compositeToBId.set(compositeKey(modTitle, l.title), l.id);
      const t = norm(l.title);
      if (t && !titleToBId.has(t)) titleToBId.set(t, l.id);
    }

    // Scheme A lesson id -> Scheme B id, from milestones_data (unioned across all rows)
    const collected: CollectedLesson[] = [];
    for (const row of milestonesRes.data || []) {
      walkMilestoneStages(row?.stages, collected);
      const batchData = row?.overview?.batchData;
      if (batchData && typeof batchData === 'object') {
        for (const key of Object.keys(batchData)) {
          walkMilestoneStages(batchData[key]?.stages, collected);
        }
      }
    }

    const aIdToBId = new Map<string, string>();
    for (const { moduleTitle, lessonTitle, lessonId } of collected) {
      if (bIds.has(lessonId)) continue;
      const bId =
        compositeToBId.get(compositeKey(moduleTitle, lessonTitle)) ||
        titleToBId.get(norm(lessonTitle));
      if (bId) aIdToBId.set(lessonId, bId);
    }

    const resolveLessonId = (rawId: string): string => {
      if (!rawId) return rawId;
      if (bIds.has(rawId)) return rawId;
      return aIdToBId.get(rawId) || rawId;
    };

    // Cover topics from live_sessions.description.topics[], keyed by canonical Scheme B lesson id.
    const courseIdSet = new Set(courseIds);
    const bIdToCoverTopics = new Map<string, CoverTopic[]>();
    for (const session of sessionsRes.data || []) {
      // Only surface sessions the admin has published to the student LMS.
      const pub = String(session?.publish_status || '').toLowerCase();
      if (pub && !pub.includes('publish')) continue;
      const desc = parseSessionDescription(session?.description);
      if (!desc) continue;
      if (desc.courseId && courseIdSet.size && !courseIdSet.has(desc.courseId)) continue;
      if (!sessionTargetsBatch(session, desc, batchCode)) continue; // batch-strict
      const topics: CoverTopic[] = (desc.topics || [])
        .map((t: any) => ({ title: t?.title || '', agenda: t?.agenda || t?.description || t?.overview || '' }))
        .filter((t: CoverTopic) => t.title);
      if (topics.length === 0) continue;

      // Link the session to its lesson: prefer the Scheme A moduleId, fall back to the module name.
      const rawLessonId = desc.moduleId || '';
      let bId = rawLessonId ? resolveLessonId(rawLessonId) : '';
      if (!bIds.has(bId)) {
        bId = titleToBId.get(norm(desc.moduleName || session?.session_title)) || bId;
      }
      if (!bId) continue;

      // Merge topics from multiple sessions for the same lesson, de-duping by title.
      const existing = bIdToCoverTopics.get(bId) || [];
      const seen = new Set(existing.map((t) => norm(t.title)));
      for (const t of topics) {
        if (!seen.has(norm(t.title))) {
          existing.push(t);
          seen.add(norm(t.title));
        }
      }
      bIdToCoverTopics.set(bId, existing);
    }

    return {
      resolveLessonId,
      getCoverTopics: (lessonId: string) => bIdToCoverTopics.get(lessonId) || [],
    };
  } catch (err) {
    console.warn('Failed to build lesson link resolver, using identity:', err);
    return identityResolver;
  }
}

/** Get (and cache) a resolver for the given enrolled course ids + student batch. */
export function getLessonResolver(courseIds: string[], batchCode: string = ''): Promise<LessonResolver> {
  const ids = (courseIds || []).filter(Boolean).slice().sort();
  if (ids.length === 0) return Promise.resolve(identityResolver);
  const key = `${ids.join(',')}|${batchCode}`;
  if (!cache.has(key)) {
    cache.set(key, buildResolver(ids, batchCode));
  }
  return cache.get(key)!;
}

/** Extract the raw lesson-link id an entity carries (assessment `topic_id` or `inner_topic_id`). */
export function rawLessonLink(entity: any): string {
  if (!entity) return '';
  if (entity.inner_topic_id) return entity.inner_topic_id;
  if (entity.topic_id) {
    const parts = String(entity.topic_id).split('||');
    return parts[2] || '';
  }
  return '';
}

/**
 * Hook: returns `isUnlocked(rawId)` which accounts for the id-scheme bridge, plus
 * `isEntityUnlocked(entity)`. Falls back to a direct id comparison until the resolver
 * map finishes loading (so nothing regresses).
 */
export function useUnlockResolver() {
  const { user } = useUser();
  const [resolver, setResolver] = useState<LessonResolver | null>(null);

  const courseKey = (user?.enrolledCourses || []).join(',');
  const batchCode = user?.batchCode || '';
  useEffect(() => {
    let alive = true;
    getLessonResolver(user?.enrolledCourses || [], batchCode).then((r) => {
      if (alive) setResolver(r);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseKey, batchCode]);

  const unlockedIds = user?.unlockedLessonIds || [];
  const unlockedKey = unlockedIds.join(',');

  const isUnlocked = useCallback(
    (rawId: string) => {
      if (!rawId) return false;
      if (unlockedIds.includes(rawId)) return true;
      const mapped = resolver ? resolver.resolveLessonId(rawId) : rawId;
      return unlockedIds.includes(mapped);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolver, unlockedKey]
  );

  const isEntityUnlocked = useCallback(
    (entity: any) => isUnlocked(rawLessonLink(entity)),
    [isUnlocked]
  );

  return { isUnlocked, isEntityUnlocked, ready: !!resolver };
}
