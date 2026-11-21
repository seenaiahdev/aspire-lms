import { isDueDatePassed } from './utils';
import type { LessonResolver } from './lessonLinkResolver';

export interface PresentationRecord {
  id: string;
  course_id?: string;
  topic_id?: string;
  inner_topic_id?: string;
  lesson_name?: string;
  title?: string;
  presentation_url?: string;
  embed_url?: string;
  slide_count?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyllabusPracticeItem {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
}

export interface SyllabusAssessmentItem {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  failed?: boolean;
}

export interface SyllabusProjectItem {
  id: string;
  title: string;
  type?: string;
  completed: boolean;
  isAutoSubmitted?: boolean;
}

export interface SyllabusQuizItem {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  failed?: boolean;
}

export interface SyllabusVideoInfo {
  preview: boolean;
  duration: string;
  completed: boolean;
  videoUrl: string;
  thumbnail: string;
}

export interface SyllabusLesson {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  completed: boolean;
  videoCompleted: boolean;
  coverTopics?: any[];
  presentation?: any | null;
  videoUrl?: string;
  videoThumbnail?: string;
  video: SyllabusVideoInfo;
  practices: SyllabusPracticeItem[];
  assessments: SyllabusAssessmentItem[];
  projects: SyllabusProjectItem[];
  quizzes: SyllabusQuizItem[];
  order_index?: number;
}

export interface SyllabusModule {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  lessons: SyllabusLesson[];
  order_index?: number;
}

export interface SyllabusStage {
  id: string;
  title: string;
  modules: SyllabusModule[];
  order_index?: number;
}

export interface SyllabusTree {
  id: string;
  courseId: string;
  stages: SyllabusStage[];
  modules: SyllabusModule[];
  totalModules: number;
  totalLessons: number;
}

export interface BuildSyllabusParams {
  courseId?: string;
  topics?: any[];
  lessons?: any[];
  assessments?: any[];
  codingQuestions?: any[];
  projects?: any[];
  quizzes?: any[];
  recordings?: any[];
  resolver?: LessonResolver;
  batchCode?: string;
  batchCategory?: string;
  doneLessons?: Set<string> | any;
  doneAssess?: Set<string> | any;
  failedAssess?: Set<string> | any;
  doneQuiz?: Set<string> | any;
  failedQuiz?: Set<string> | any;
  donePractice?: Set<string> | any;
  recByTitle?: Map<string, any> | any;
  presentationsData?: PresentationRecord[];
}

export function toSafeSet(input: any): Set<string> {
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

export function toSafeMap(input: any): Map<string, any> {
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

export const normTitle = (s: any): string =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const isPassedRow = (r: any): boolean => {
  const score = Number(r?.score ?? 0);
  const status = String(r?.status ?? '').toLowerCase();
  return score >= 70 || status === 'passed';
};

export const assessLessonTitle = (a: any): string =>
  normTitle(String(a?.topic_name || '').split('||').pop());

export const projLessonTitle = (p: any): string => {
  try { return normTitle(JSON.parse(p?.description || '{}').moduleName); } catch { return ''; }
};

const defaultResolver: LessonResolver = {
  resolveLessonId: (id: string) => id,
  resolveEntityLessonId: (entity: any) => entity?.lesson_id || entity?.inner_topic_id || '',
  getCoverTopics: () => [],
};

export function buildCourseSyllabusTree(
  paramsOrTopics?: BuildSyllabusParams | any[],
  lessonsArg?: any[],
  assessmentsArg?: any[],
  codingQuestionsArg?: any[],
  projectsArg?: any[],
  quizzesArg?: any[],
  recordingsArg?: any[]
): SyllabusTree {
  let params: BuildSyllabusParams;

  if (Array.isArray(paramsOrTopics)) {
    // If any positional argument is a string, treat as courseId
    let positionalCourseId = '';
    const otherArgs = [lessonsArg, assessmentsArg, codingQuestionsArg, projectsArg, quizzesArg, recordingsArg];
    for (const arg of otherArgs) {
      if (typeof arg === 'string') {
        positionalCourseId = arg;
        break;
      }
    }

    params = {
      courseId: positionalCourseId || undefined,
      topics: paramsOrTopics,
      lessons: Array.isArray(lessonsArg) ? lessonsArg : [],
      assessments: Array.isArray(assessmentsArg) ? assessmentsArg : [],
      codingQuestions: Array.isArray(codingQuestionsArg) ? codingQuestionsArg : [],
      projects: Array.isArray(projectsArg) ? projectsArg : [],
      quizzes: Array.isArray(quizzesArg) ? quizzesArg : [],
      recordings: Array.isArray(recordingsArg) ? recordingsArg : [],
    };
  } else {
    params = paramsOrTopics || {};
  }

  const {
    courseId = '',
    topics = [],
    lessons = [],
    assessments = [],
    codingQuestions = [],
    projects = [],
    quizzes = [],
    recordings = [],
    resolver = defaultResolver,
    batchCode = '',
    batchCategory = '',
    doneLessons,
    doneAssess,
    failedAssess,
    doneQuiz,
    failedQuiz,
    donePractice,
    recByTitle,
    presentationsData = [],
  } = params;

  const safeTopics = Array.isArray(topics) ? topics : [];
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeAssessments = Array.isArray(assessments) ? assessments : [];
  const safeCodingQuestions = Array.isArray(codingQuestions) ? codingQuestions : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];
  const safeRecordings = Array.isArray(recordings) ? recordings : [];

  const resolvedCourseId = courseId || (safeTopics[0]?.course_id ?? '');

  const safeDoneLessons = toSafeSet(doneLessons);
  const safeDoneAssess = toSafeSet(doneAssess);
  const safeFailedAssess = toSafeSet(failedAssess);
  const safeDoneQuiz = toSafeSet(doneQuiz);
  const safeFailedQuiz = toSafeSet(failedQuiz);
  const safeDonePractice = toSafeSet(donePractice);
  const safeRecByTitle = toSafeMap(recByTitle);

  // If recordings array passed, populate safeRecByTitle
  if (Array.isArray(recordings)) {
    for (const r of recordings) {
      if (!r) continue;
      [r.concept_name, r.title].forEach((t: any) => {
        const k = normTitle(t);
        if (k && !safeRecByTitle.has(k)) {
          safeRecByTitle.set(k, r);
        }
      });
    }
  }

  const userBatch = (batchCode || '').trim().toLowerCase();
  const userCat = (batchCategory || '').trim().toLowerCase();

  const relevantAssessments = (safeAssessments || []).filter((a: any) => {
    if (!a) return false;
    const pub = String(a.publish_status || '').toLowerCase();
    if (pub && (pub.includes('draft') || pub.includes('hidden'))) return false;
    if (resolvedCourseId && a.course_id && a.course_id !== resolvedCourseId) return false;
    const tb = String(a.target_batch || '').toLowerCase();
    if (!tb) return true;
    if (tb.includes('all batches') || tb === 'all') return true;
    if (userBatch && tb.split(',').map((s: string) => s.trim()).includes(userBatch)) return true;
    if (userCat && tb.includes(userCat)) return true;
    return false;
  });

  const sortedTopics = [...(safeTopics || [])].sort((a: any, b: any) => {
    const ordA = a?.order_index ?? a?.order ?? 0;
    const ordB = b?.order_index ?? b?.order ?? 0;
    return ordA - ordB;
  });

  const stages: SyllabusStage[] = sortedTopics.map((topic: any) => {
    const rawSubtopics = topic.subtopics;
    // Support both hierarchical subtopics and flat topic formats
    const subtopics = Array.isArray(rawSubtopics) && rawSubtopics.length > 0
      ? [...rawSubtopics].sort((a: any, b: any) => ((a?.order_index ?? a?.order ?? 0) - (b?.order_index ?? b?.order ?? 0)))
      : [{ id: topic.id, title: topic.title, description: topic.description || '', duration: topic.duration || '5h' }];

    return {
      id: topic.id,
      title: topic.title,
      modules: subtopics.map((sub: any) => {
        const rawModuleLessons = (safeLessons || []).filter((l: any) =>
          l && (l.module_id === sub.id || l.topic_id === sub.id || (sub.id === topic.id && l.topic_id === topic.id))
        );
        const seenTitles = new Set<string>();
        const uniqueLessons = rawModuleLessons.filter((l: any) => {
          const norm = String(l?.title || '').toLowerCase().trim();
          if (seenTitles.has(norm)) return false;
          seenTitles.add(norm);
          return true;
        });

        const moduleLessons = uniqueLessons.sort((a: any, b: any) => {
          const ordA = a?.order_index ?? a?.order ?? 0;
          const ordB = b?.order_index ?? b?.order ?? 0;
          return ordA - ordB;
        });

        return {
          id: sub.id,
          title: sub.title,
          description: sub.description || '',
          duration: sub.durationHours || sub.duration || '5h',
          lessons: moduleLessons.map((l: any, idx: number) => {
            const dbPractices = (safeCodingQuestions || []).filter((cq: any) =>
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
            const dbProjects = (safeProjects || []).filter((p: any) => {
              const t = projLessonTitle(p);
              const matches = (!!t && t === lessonTitleKey) || resolver.resolveLessonId(p.inner_topic_id) === l.id;
              if (!matches) return false;
              const titleKey = String(p.title || '').trim().toLowerCase();
              if (seenProjTitles.has(titleKey)) return false;
              seenProjTitles.add(titleKey);
              return true;
            });

            const dbQuizzes = (safeQuizzes || []).filter((q: any) => {
              if (resolver.resolveLessonId(q.inner_topic_id) === l.id) return true;
              const t = normTitle(q.topic_name);
              return !!t && t === lessonTitleKey;
            });

            const practices: SyllabusPracticeItem[] = dbPractices.map((cq: any) => ({
              id: cq.id,
              title: cq.title,
              duration: '20m',
              completed: safeDonePractice.has(cq.id) || safeDonePractice.has(String(cq.id || '').trim()),
            }));

            const lessonAssessments: SyllabusAssessmentItem[] = dbAssessments.map((asmnt: any) => {
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

            const lessonProjects: SyllabusProjectItem[] = dbProjects.map((p: any) => {
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

            const lessonQuizzes: SyllabusQuizItem[] = dbQuizzes.map((q: any) => {
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
              duration: l.duration_minutes ? `${l.duration_minutes}m` : (l.duration || rec?.duration || '45m'),
              completed: lessonCompleted,
              videoCompleted,
              coverTopics: resolver.getCoverTopics(l.id),
              presentation: matchingPpt || null,
              videoUrl: rec?.video_url || l.video_url || '',
              videoThumbnail: rec?.thumbnail || '',
              video: {
                preview: idx === 0,
                duration: rec?.duration || (l.duration_minutes ? `${l.duration_minutes}m` : '45m'),
                completed: videoCompleted,
                videoUrl: rec?.video_url || l.video_url || '',
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

  const allModules = stages.flatMap((s) => s.modules || []);
  const totalLessonCount = allModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return {
    id: resolvedCourseId,
    courseId: resolvedCourseId,
    stages,
    modules: allModules,
    totalModules: allModules.length,
    totalLessons: totalLessonCount,
  };
}
