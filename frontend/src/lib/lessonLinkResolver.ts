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
  /** Map any entity (project, assessment, quiz, practice problem) to its canonical Scheme B course_lessons id. */
  resolveEntityLessonId: (entity: any) => string;
  /** "Class Topics & Syllabus Covered" for a lesson (canonical Scheme B lesson id). */
  getCoverTopics: (lessonId: string) => CoverTopic[];
}

const norm = (s: any): string =>
  String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const compositeKey = (moduleTitle: any, lessonTitle: any): string =>
  `${norm(moduleTitle)}::${norm(lessonTitle)}`;

// Session cache: one build per set of course ids.
const cache = new Map<string, Promise<LessonResolver>>();

const identityResolver: LessonResolver = {
  resolveLessonId: (id) => id,
  resolveEntityLessonId: (entity) => rawLessonLink(entity),
  getCoverTopics: () => []
};

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
    const [topicsRes, lessonsRes, milestonesRes, sessionsRes, assessmentsRes, quizzesRes, projectsRes] = await Promise.all([
      supabase.from('course_topics').select('id, subtopics').in('course_id', courseIds),
      supabase.from('course_lessons').select('id, title, module_id').in('course_id', courseIds),
      supabase.from('milestones_data').select('id, stages, overview'),
      supabase.from('live_sessions').select('id, session_title, description, publish_status, batch_code, target_batch'),
      supabase.from('assessments').select('topic_id, topic_name, course_id').in('course_id', courseIds),
      supabase.from('quizzes').select('inner_topic_id, topic_name, course_id').in('course_id', courseIds),
      supabase.from('projects').select('inner_topic_id, title, description, course_id').in('course_id', courseIds),
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

    // PRIMARY bridge source: assessments/quizzes/projects still carry Scheme A ids (topic_id / inner_topic_id)
    // AND the lesson title (topic_name), while milestones_data has migrated to Scheme B ids. Map each
    // entity's Scheme A lesson id → Scheme B id by matching its title to course_lessons. Without this,
    // `isUnlocked()` never resolves l_git_* ids and all assessments/quizzes stay hidden.
    const bridgeByTitle = (aId: string, title: string) => {
      const id = String(aId || '').trim();
      const bId = titleToBId.get(norm(title));
      if (id && bId && !bIds.has(id) && !aIdToBId.has(id)) aIdToBId.set(id, bId);
    };
    for (const a of assessmentsRes.data || []) {
      const aId = String(a.topic_id || '').split('||')[2] || '';
      const title = String(a.topic_name || '').split('||').pop() || '';
      bridgeByTitle(aId, title);
    }
    for (const z of quizzesRes.data || []) {
      bridgeByTitle(z.inner_topic_id, z.topic_name);
    }
    for (const p of projectsRes.data || []) {
      let modTitle = '';
      try { modTitle = JSON.parse(p.description || '{}').moduleName || ''; } catch {}
      bridgeByTitle(p.inner_topic_id, modTitle || p.title);
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

      // Link the session to its lesson. Prefer the session_title matched to a course_lessons title — the
      // session title reflects the real class content, so this auto-corrects admin mis-tags where a
      // session's moduleId/moduleName point at the WRONG lesson (e.g. a "Bootstrap Components" session
      // mistakenly tagged onto the Git lesson). Fall back to the Scheme A moduleId, then the module name.
      let bId = titleToBId.get(norm(session?.session_title)) || '';
      if (!bId) {
        const rawLessonId = desc.moduleId || '';
        bId = rawLessonId ? resolveLessonId(rawLessonId) : '';
        if (!bIds.has(bId)) {
          bId = titleToBId.get(norm(desc.moduleName)) || bId;
        }
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

    const resolveEntityLessonId = (entity: any): string => {
      if (!entity) return '';
      // 1. Check description moduleName / lessonTitle (matches LearningScreen projLessonTitle)
      try {
        const desc = JSON.parse(entity.description || '{}');
        if (desc.moduleName) {
          const bId = titleToBId.get(norm(desc.moduleName));
          if (bId) return bId;
        }
        if (desc.lessonTitle) {
          const bId = titleToBId.get(norm(desc.lessonTitle));
          if (bId) return bId;
        }
        if (desc.lessonId) {
          const id = resolveLessonId(String(desc.lessonId).trim());
          if (id) return id;
        }
      } catch {}
      // 2. Check direct topic_name or lesson_title
      if (entity.lesson_title) {
        const bId = titleToBId.get(norm(entity.lesson_title));
        if (bId) return bId;
      }
      if (entity.topic_name) {
        const t = String(entity.topic_name).split('||').pop() || '';
        const bId = titleToBId.get(norm(t));
        if (bId) return bId;
      }
      // 3. Check topic_id (e.g. course||module||lesson_id)
      if (entity.topic_id) {
        const parts = String(entity.topic_id).split('||');
        if (parts[2]) {
          const id = resolveLessonId(String(parts[2]).trim());
          if (id) return id;
        }
      }
      // 4. Check inner_topic_id
      if (entity.inner_topic_id) {
        const id = resolveLessonId(String(entity.inner_topic_id).trim());
        if (id) return id;
      }
      // 5. Check lesson_id
      if (entity.lesson_id) {
        const id = resolveLessonId(String(entity.lesson_id).trim());
        if (id) return id;
      }
      return '';
    };

    return {
      resolveLessonId,
      resolveEntityLessonId,
      getCoverTopics: (lessonId: string) => bIdToCoverTopics.get(lessonId) || [],
    };
  } catch (err) {
    console.warn('Failed to build lesson link resolver, using identity:', err);
    return identityResolver;
  }
}

/** Clear the resolver cache so the next getLessonResolver() rebuilds from fresh admin data. */
export function clearLessonResolverCache(): void {
  cache.clear();
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

/** Extract the raw lesson-link id an entity carries (assessment `topic_id`, `inner_topic_id`, `lesson_id`, or module description). */
export function rawLessonLink(entity: any): string {
  if (!entity) return '';
  if (entity.inner_topic_id) return entity.inner_topic_id;
  if (entity.topic_id) {
    const parts = String(entity.topic_id).split('||');
    return parts[2] || '';
  }
  if (entity.lesson_id) return entity.lesson_id;
  try {
    const desc = JSON.parse(entity.description || '{}');
    if (desc.lessonId) return desc.lessonId;
    if (desc.innerTopicId) return desc.innerTopicId;
    if (desc.moduleName) return desc.moduleName;
  } catch {}
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
    (entity: any) => {
      if (!entity) return false;
      const lessonId = resolver ? resolver.resolveEntityLessonId(entity) : rawLessonLink(entity);
      if (!lessonId) return false;
      return unlockedIds.includes(lessonId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolver, unlockedKey]
  );

  return { isUnlocked, isEntityUnlocked, ready: !!resolver };
}
