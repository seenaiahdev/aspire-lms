import { supabase } from '../supabase';
import { cachedQuery, invalidateCache } from '../queryCache';
import { getBatchesMap } from './auth';
import { recalculateUserStreak } from './gamification';

/**
 * Fetches course tracks filtered by the user's batch category.
 */
export async function fetchCourses(batchCategory: string) {
  return cachedQuery(`courses_by_batch:${batchCategory}`, async () => {
    const targetBatchStr = batchCategory === 'Weekday' ? 'Weekday Batch' : 'Weekend Batch';
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .or(`target_batch.eq.All Batches,target_batch.eq.${targetBatchStr}`);

    if (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }

    return data || [];
  }, 60_000); // 60 seconds
}

/**
 * Whether a `target_batch` string releases content to a given student.
 * Matches: empty/"all batches"/"all"; the category ("Weekday Batch"/"Weekend Batch"); or a comma-list
 * that includes the specific batch code (e.g. "A26W1, A26S1"). Used to decide which courses appear in
 * MyLearning — courses are released by target_batch, NOT only by the student's enrolled_courses array.
 */
export function courseTargetsBatch(target: any, batchCode: string, category?: string): boolean {
  const t = String(target ?? '').trim().toLowerCase();
  if (!t) return false;
  if (t.includes('all batch') || t === 'all') return true;
  const cat = String(category ?? '').trim().toLowerCase();
  if (cat && (t.includes(`${cat} batch`) || t === cat)) return true;
  const want = String(batchCode ?? '').trim().toLowerCase();
  if (!want) return false;
  return t.split(',').map((s) => s.trim()).includes(want);
}

/**
 * Fetches the milestones (stages & modules syllabus) for a given batch category.
 */
export async function fetchMilestones(batchCategory: string) {
  return cachedQuery(`milestones:${batchCategory}`, async () => {
    const { data, error } = await supabase
      .from('milestones_data')
      .select('*')
      .eq('id', 'batch_data')
      .maybeSingle();

    if (error) {
      console.error('Error fetching milestones:', error);
      throw error;
    }

    if (!data) return { overview: {}, stages: [] };

    const batchKey = batchCategory === 'Weekday' ? 'Weekday Batch' : 'Weekend Batch';
    const batchData = data.overview?.batchData?.[batchKey];

    return {
      overview: batchData?.overview || data.overview || {},
      stages: batchData?.stages || []
    };
  }, 60_000); // 60 seconds
}

function liveSessionBatchFilter(batchCode: string): string {
  const b = (batchCode || '').trim();
  if (!b) {
    return 'target_batch.ilike.%all batches%,target_batch.ilike.%all%';
  }
  const isWeekend = b.toUpperCase().includes('S') || b.toLowerCase().includes('weekend');
  const catFilter = isWeekend ? 'target_batch.ilike.%weekend%' : 'target_batch.ilike.%weekday%';
  return `batch_code.eq.${b},target_batch.ilike.%${b}%,target_batch.ilike.%all batches%,target_batch.ilike.%all%,${catFilter}`;
}

/**
 * Fetches live and upcoming sessions from the live_sessions table for a specific batch.
 */
export async function fetchLiveSessions(batchCode: string) {
  const b = (batchCode || '').trim();
  return cachedQuery(`live_sessions:${b}`, async () => {
    try {
      const today = new Date();
      today.setDate(today.getDate() - 14); // include past 14 days and all upcoming
      const minDate = today.toISOString().split('T')[0];

      let query = supabase
        .from('live_sessions')
        .select('*')
        .gte('date', minDate);

      query = query.or(liveSessionBatchFilter(b));

      const { data, error } = await query
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(100);

      if (error) {
        console.warn('Error fetching live sessions:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn('Exception in fetchLiveSessions:', err);
      return [];
    }
  }, 120_000); // 2 minutes
}

/**
 * Fetches all sessions (ongoing, upcoming, completed) from the live_sessions table for a
 * specific batch.
 */
export async function fetchAllLiveSessions(batchCode: string) {
  const b = (batchCode || '').trim();
  return cachedQuery(`all_live_sessions:${b}`, async () => {
    try {
      let query = supabase
        .from('live_sessions')
        .select('*');

      query = query.or(liveSessionBatchFilter(b));

      const { data, error } = await query
        .order('date', { ascending: false, nullsFirst: false })
        .order('time', { ascending: false, nullsFirst: false })
        .limit(500);

      if (error) {
        console.warn('Error fetching all live sessions:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn('Exception in fetchAllLiveSessions:', err);
      return [];
    }
  }, 120_000); // 2 minutes
}

/**
 * Fetches the daily schedule/topics for a date + batch from the live_sessions table.
 */
export async function fetchDailySchedules(dateStr: string, batchCode: string) {
  return cachedQuery(`daily_schedules:${dateStr}:${batchCode}`, async () => {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('date', dateStr)
      .or(liveSessionBatchFilter(batchCode))
      .order('time', { ascending: true });

    if (error) {
      console.warn('Error fetching daily schedules from live_sessions:', error.message);
      return [];
    }

    return (data || []).map((s: any) => {
      let meta: any = null;
      try { meta = JSON.parse(s.description); } catch { /* description may be plain text */ }
      return {
        id: s.id,
        date: s.date,
        batch_code: s.batch_code,
        title: s.session_title,
        subtopic: (meta && meta.subtopicName) || s.technology || '',
        topic: (meta && meta.moduleName) || s.technology || '',
        time: s.time,
        description:
          (meta && meta.text) ||
          (meta && meta.moduleName) ||
          (typeof s.description === 'string' && !meta ? s.description : '') ||
          'Live class session',
        status: String(s.status || 'upcoming').toLowerCase(),
      };
    });
  }, 30_000); // 30 seconds
}

export async function fetchCoursesByIds(courseIds: string[]) {
  if (!courseIds || courseIds.length === 0) return [];
  return cachedQuery(`courses:${[...courseIds].sort().join(',')}`, async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .in('id', courseIds);

    if (error) {
      console.error('Error fetching enrolled courses:', error);
      throw error;
    }

    return data || [];
  });
}

export async function fetchAssignments(batchCode: string, batchCategory?: string, courseId?: string, enrolledCourses?: string[]) {
  const cacheKey = `assignments:${batchCode}:${batchCategory || ''}:${courseId || ''}:${(enrolledCourses || []).sort().join(',')}`;
  return cachedQuery(cacheKey, async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('assessments table not available:', error.message);
        return [];
      }

      if (!data) return [];

      const norm = (s: any) => String(s ?? '').trim().toLowerCase();
      const wantBatch = norm(batchCode);
      const wantCat = norm(batchCategory);
      const validCourses = new Set([
        ...(Array.isArray(enrolledCourses) ? enrolledCourses : []),
        courseId
      ].filter(Boolean));

      const filtered = data.filter((item: any) => {
        const pub = norm(item.publish_status);
        if (pub && (pub.includes('draft') || pub.includes('hidden'))) return false;

        // 1. Strict Course Check: If assessment specifies course_id, it MUST belong to the student's enrolled courses
        if (item.course_id && validCourses.size > 0 && !validCourses.has(item.course_id)) {
          return false;
        }

        // 2. Batch targeting check
        const tb = norm(item.target_batch);
        if (tb) {
          const batchMatches =
            tb.includes('all batches') ||
            tb === 'all' ||
            tb === 'all batch' ||
            (wantBatch && tb.split(',').map((s) => s.trim()).includes(wantBatch)) ||
            (wantCat && (tb.includes(wantCat) || (wantCat === 'weekend' && (tb.includes('weekend') || tb.includes('s1') || tb.includes('s2'))) || (wantCat === 'weekday' && (tb.includes('weekday') || tb.includes('w1') || tb.includes('w2'))))) ||
            (wantBatch.length >= 3 && tb.includes(wantBatch.slice(0, 3)));
          if (!batchMatches) return false;
        }

        return true;
      });

      return filtered.map((item: any) => {
        const type = 'mcq' as 'coding' | 'mcq';
        const lessonId = item.topic_id ? String(item.topic_id).split('||')[2] : (item.lesson_id || '');
        return {
          ...item,
          id: item.id,
          lesson_id: lessonId,
          inner_topic_id: lessonId,
          target_batch: item.target_batch,
          course_id: item.course_id,
          topic_name: item.topic_name,
          slug: item.id,
          type: type,
          title: item.title,
          category: item.course_name || 'General',
          difficulty: 'Intermediate' as const,
          xp: item.total_marks ?? 100,
          timeEstimate: `${item.duration_minutes || 45} mins`,
          description: item.topic_name ? `Topic: ${item.topic_name.split('||').pop()}` : 'Assessment test',
          status: 'pending' as 'pending' | 'completed',
          attemptsCount: 0,
          passedCount: 0,
          failedCount: 0,
          bestScorePercentage: 0,
          attemptHistory: [],
          topic_id: item.topic_id,
          dueDate: item.due_date,
          mcqQuestions: (item.mcqs || []).map((q: any, index: number) => ({
            id: index,
            question: q.question,
            codeSnippet: q.codeSnippet || '',
            options: q.options || [],
          })),
          codingProblem: item.coding_questions && item.coding_questions[0] ? {
            instructions: item.coding_questions[0].description || item.coding_questions[0].instructions || '',
            starterCode: item.coding_questions[0].starterCode || 'def solution():\n    pass',
            testCases: item.coding_questions[0].testCases || []
          } : undefined
        };
      });
    } catch {
      return [];
    }
  }, 120_000); // 2 minutes
}

export async function fetchQuizzes(courseIds: string[]) {
  if (!courseIds || courseIds.length === 0) return [];
  const sortedIds = [...courseIds].sort().join(',');
  return cachedQuery(`quizzes:${sortedIds}`, async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('quizzes table not available:', error.message);
        return [];
      }
      const sanitized = (data || []).map((q: any) => ({
        ...q,
        mcqs: (q.mcqs || []).map((m: any) => {
          const { correctIndex, explanation, ...safeMcq } = m;
          return safeMcq;
        }),
      }));
      return sanitized;
    } catch {
      return [];
    }
  }, 45_000); // 45 seconds
}

export function extractBatchDueDate(
  rawDueDate: any,
  batchCode?: string,
  batchId?: string,
  batchesMap?: { codeToId?: Record<string, string>; idToCode?: Record<string, string> }
): string | null {
  if (!rawDueDate) return null;

  let parsed = rawDueDate;
  if (typeof rawDueDate === 'string') {
    const trimmed = rawDueDate.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return parsed ? String(parsed).trim() : null;
  }

  const code = (batchCode || '').trim();
  const id = (batchId || (batchesMap?.codeToId && code ? batchesMap.codeToId[code.toUpperCase()] || batchesMap.codeToId[code] : '') || '').trim();

  // 1. Direct match by batch ID
  if (id && parsed[id]) {
    return String(parsed[id]).trim();
  }

  // 2. Direct match by batch code
  if (code) {
    if (parsed[code]) return String(parsed[code]).trim();
    if (parsed[code.toUpperCase()]) return String(parsed[code.toUpperCase()]).trim();
    if (parsed[code.toLowerCase()]) return String(parsed[code.toLowerCase()]).trim();
  }

  // 3. Reverse map check
  if (batchesMap?.idToCode && code) {
    const targetCodeUpper = code.toUpperCase();
    for (const [key, val] of Object.entries(parsed)) {
      if (!val) continue;
      const mappedCode = batchesMap.idToCode[key];
      if (mappedCode && mappedCode.toUpperCase() === targetCodeUpper) {
        return String(val).trim();
      }
    }
  }

  // 4. Fallback to "all", "ALL", "default"
  if (parsed.all) return String(parsed.all).trim();
  if (parsed.ALL) return String(parsed.ALL).trim();
  if (parsed.default) return String(parsed.default).trim();

  return null;
}

export async function fetchProjects(
  batchCode: string = '',
  batchCategory?: string,
  courseId?: string,
  enrolledCourses?: string[]
) {
  const normCourseId = courseId || (enrolledCourses && enrolledCourses.length > 0 ? enrolledCourses[0] : '');
  const cacheKey = `projects:${batchCode}:${batchCategory || ''}:${normCourseId}:${(enrolledCourses || []).sort().join(',')}`;
  return cachedQuery(cacheKey, async () => {
    let query = supabase.from('projects').select('*');
    if (normCourseId) {
      query = query.eq('course_id', normCourseId);
    } else if (enrolledCourses && enrolledCourses.length > 0) {
      query = query.in('course_id', enrolledCourses);
    }

    const [{ data, error }, batchesMap] = await Promise.all([
      query.order('created_at', { ascending: false }),
      getBatchesMap()
    ]);

    if (error) {
      console.warn('projects table not available:', error.message);
      throw new Error(`projects fetch failed: ${error.message}`);
    }

    const validCourses = new Set((enrolledCourses || []).filter(Boolean));
    if (courseId) validCourses.add(courseId);

    return (data || [])
      .filter((item: any) => {
        if (item.course_id && validCourses.size > 0 && !validCourses.has(item.course_id)) {
          return false;
        }
        if (item.target_batch && !courseTargetsBatch(item.target_batch, batchCode, batchCategory)) {
          return false;
        }
        return true;
      })
      .map((item: any) => {
        const resolved = extractBatchDueDate(item.due_date, batchCode, batchCategory, batchesMap);
        return {
          ...item,
          due_date: resolved || '',
          dueDate: resolved || '',
          batch_due_dates: item.due_date,
        };
      });
  }, 300_000); // 5 minutes
}

export async function fetchResources(courseId?: string) {
  return cachedQuery('resources', async () => {
    try {
      const { data, error } = await supabase
        .from('placement_resources')
        .select('*')
        .eq('publish_status', 'Published')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('placement_resources table not available:', error.message);
        return [];
      }

      return (data || []).map((item: any) => {
        const rawType = (item.type || '').trim();
        const typeLower = rawType.toLowerCase();
        let finalType = 'notes';
        if (typeLower.includes('pdf')) finalType = 'pdf';
        else if (typeLower.includes('note')) finalType = 'notes';
        else if (typeLower.includes('cheat')) finalType = 'cheatsheet';
        else if (typeLower.includes('road')) finalType = 'roadmap';
        else if (typeLower.includes('temp')) finalType = 'template';
        else if (typeLower.includes('guide')) finalType = 'guide';
        else if (rawType) finalType = typeLower.replace(/\s+/g, '-');

        return {
          id: item.id,
          title: item.title || 'Untitled Resource',
          category: item.category || 'General',
          type: finalType,
          snippet: item.snippet || '',
          updatedAt: item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
          downloads: 0,
          size: item.read_time || '5 min read',
          link_url: item.link_url || ''
        };
      });
    } catch {
      return [];
    }
  });
}

export async function fetchPracticeProblems(
  courseId?: string,
  batchCode?: string,
  batchCategory?: string,
  enrolledCourses?: string[]
) {
  const validCourseList = Array.from(new Set([
    ...(Array.isArray(enrolledCourses) ? enrolledCourses : []),
    courseId
  ].filter(Boolean) as string[]));
  const normCourseId = courseId || (validCourseList.length > 0 ? validCourseList[0] : '');

  const cacheKey = `practice_problems:${normCourseId}:${batchCode || ''}:${batchCategory || ''}:${validCourseList.slice().sort().join(',')}`;
  return cachedQuery(cacheKey, async () => {
    try {
      let query = supabase.from('coding_questions').select('*').order('created_at', { ascending: true });

      if (normCourseId && (!enrolledCourses || enrolledCourses.length <= 1)) {
        query = query.eq('course_id', normCourseId);
      } else if (validCourseList.length > 0) {
        query = query.in('course_id', validCourseList);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('coding_questions table error:', error.message);
        throw new Error(`coding_questions fetch failed: ${error.message}`);
      }
      if (!data) return [];

      const courseSet = new Set(validCourseList);
      const filtered = data.filter((item: any) => {
        if (item.course_id && courseSet.size > 0 && !courseSet.has(item.course_id)) {
          return false;
        }
        return true;
      });

      return filtered;
    } catch (err) {
      console.warn('Failed to fetch practice problems:', err);
      throw err;
    }
  }, 120_000); // 2 minutes
}

export async function fetchRecordingById(sessionId: string) {
  if (!sessionId) return null;
  return cachedQuery(`recording:${sessionId}`, async () => {
    try {
      let row: any = null;
      const { data: recData } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (recData) {
        row = recData;
      } else {
        const { data: liveData, error: liveError } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();

        if (liveError) {
          console.warn('Error fetching live session recording:', liveError.message);
        }
        row = liveData;
      }

      if (!row) {
        return null;
      }

      const instructorName = typeof row.instructor === 'object' && row.instructor
        ? (row.instructor.name || 'Lead Trainer')
        : (row.instructor || 'Lead Trainer');

      return {
        ...row,
        title: row.session_title || row.title || row.concept_name || 'Live Masterclass Recording',
        course: row.technology || row.course || 'Masterclass',
        instructor: {
          name: instructorName,
          title: 'Senior Technical Trainer',
          avatar: row.instructor_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=7c3aed&color=fff`
        },
        thumbnail: row.thumbnail_url || row.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
        duration: row.duration || '1h 30m',
        scheduledAt: row.date ? `${row.date}${row.time ? ` · ${row.time}` : ''}` : (row.time || 'Completed'),
        participants: row.participants || 42,
        video_url: row.video_url || row.meeting_link || null
      };
    } catch {
      return null;
    }
  }, 60_000); // 60 seconds
}

export async function fetchRecordings(batchCode?: string, batchCategory?: string, enrolledCourses?: string[]) {
  const cacheKey = `recordings:${batchCode || ''}:${batchCategory || ''}:${(enrolledCourses || []).sort().join(',')}`;
  return cachedQuery(cacheKey, async () => {
    try {
      const isWeekend = batchCategory === 'Weekend' || (batchCode && (batchCode.toLowerCase().includes('s') || batchCode.toLowerCase().includes('weekend')));
      const targetBatchStr = isWeekend ? 'Weekend Batch' : 'Weekday Batch';
      const b = batchCode || '';
      const userEnrolled = enrolledCourses || [];

      // 1. Fetch published recordings from recordings table
      let recQuery = supabase.from('recordings').select('*');
      const { data: recData, error: recError } = await recQuery.order('created_at', { ascending: false });

      let filteredRecData: any[] = [];
      if (!recError && recData && recData.length > 0) {
        filteredRecData = recData.filter((r: any) => {
          const pub = String(r.publish_status || '').toLowerCase();
          if (pub === 'draft' || pub === 'hidden') return false;

          let rCourseId = r.course_id || '';
          let rModuleId = r.module_id || r.lesson_id || '';
          if (r.instructions) {
            try {
              const parsed = typeof r.instructions === 'string' ? JSON.parse(r.instructions) : r.instructions;
              if (parsed?.courseId) rCourseId = parsed.courseId;
              if (parsed?.moduleId) rModuleId = parsed.moduleId;
              if (parsed?.lessonId) rModuleId = parsed.lessonId;
            } catch {}
          }
          if (!rCourseId && r.description) {
            try {
              const parsed = typeof r.description === 'string' ? JSON.parse(r.description) : r.description;
              if (parsed?.courseId) rCourseId = parsed.courseId;
              if (parsed?.moduleId && !rModuleId) rModuleId = parsed.moduleId;
              if (parsed?.lessonId && !rModuleId) rModuleId = parsed.lessonId;
            } catch {}
          }

          if (rCourseId && !r.course_id) r.course_id = rCourseId;
          if (rModuleId && !r.module_id) r.module_id = rModuleId;

          const tb = (r.target_batch || '').toLowerCase();
          const hasExplicitBatch = tb && !tb.includes('all') && tb !== 'all batches';
          if (hasExplicitBatch) {
            const matchesBatch = (b && tb.includes(b.toLowerCase())) || (targetBatchStr && tb.includes(targetBatchStr.toLowerCase()));
            if (!matchesBatch) return false;
          }

          if (rCourseId && userEnrolled.length > 0) {
            return userEnrolled.includes(rCourseId);
          }

          if (tb.includes('all batches') || tb === 'all' || !tb) return true;
          if (b && tb.includes(b.toLowerCase())) return true;
          if (targetBatchStr && tb.includes(targetBatchStr.toLowerCase())) return true;

          if (userEnrolled.length === 0) return true;

          return false;
        });
      }

      // 2. Also check completed live_sessions
      let liveQuery = supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'completed');

      if (b) {
        liveQuery = liveQuery.or(liveSessionBatchFilter(b));
      }

      const { data: liveData, error: liveError } = await liveQuery.order('date', { ascending: false });

      if (liveError) {
        console.warn('Error fetching recordings from live_sessions:', liveError.message);
        return filteredRecData;
      }

      const recIds = new Set(filteredRecData.map((r: any) => r.id));
      const combined = [...filteredRecData];
      for (const item of (liveData || [])) {
        if (!recIds.has(item.id)) {
          combined.push(item);
        }
      }

      return combined;
    } catch {
      return [];
    }
  }, 60_000); // 60 seconds
}

export async function markLessonComplete(userId: string, lessonId: string, courseId?: string): Promise<{ streak?: number }> {
  try {
    const { error } = await supabase.from('lesson_progress').upsert(
      {
        id: `lp-${userId}-${lessonId}`,
        student_id: userId,
        lesson_id: lessonId,
        course_id: courseId || null,
        completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) throw error;
    invalidateCache(`student_lp:${userId}`);
    invalidateCache(`student_lp_set:${userId}`);

    try {
      const newStreak = await recalculateUserStreak(userId);
      return { streak: newStreak };
    } catch (streakErr) {
      console.warn('Streak recalculation after lesson complete skipped:', streakErr);
    }
    return {};
  } catch (e) {
    console.error('markLessonComplete failed:', e);
    throw e;
  }
}

export async function fetchCompletedLessons(userId: string): Promise<Set<string>> {
  if (!userId || userId === 'guest') return new Set();
  return cachedQuery(`student_lp_set:${userId}`, async () => {
    try {
      const { data } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('student_id', userId);
      return new Set((data || []).filter((r: any) => r.completed).map((r: any) => r.lesson_id));
    } catch {
      return new Set();
    }
  }, 15_000); // 15 seconds
}

export async function computeCourseProgress(userId: string, courseId: string, registrationId?: string): Promise<number> {
  try {
    const [lRes, aRes, qRes, cRes, pRes] = await Promise.all([
      cachedQuery(`course_items_lessons:${courseId}`, () => supabase.from('course_lessons').select('id').eq('course_id', courseId), 60000),
      cachedQuery(`course_items_assess:${courseId}`, () => supabase.from('assessments').select('id').eq('course_id', courseId), 60000),
      cachedQuery(`course_items_quizzes:${courseId}`, () => supabase.from('quizzes').select('id').eq('course_id', courseId), 60000),
      cachedQuery(`course_items_coding:${courseId}`, () => supabase.from('coding_questions').select('id').eq('course_id', courseId), 60000),
      cachedQuery(`course_items_projects:${courseId}`, () => supabase.from('projects').select('id, due_date, description').eq('course_id', courseId), 60000),
    ]);
    const lessonIds = new Set((lRes.data || []).map((r: any) => String(r.id || '').trim()));
    const assessIds = new Set((aRes.data || []).map((r: any) => String(r.id || '').trim()));
    const quizIds = new Set((qRes.data || []).map((r: any) => String(r.id || '').trim()));
    const practiceIds = new Set<string>([
      ...(cRes.data || []).map((r: any) => String(r.id || '').trim()),
      ...(pRes.data || []).map((r: any) => String(r.id || '').trim()),
    ]);
    const total = lessonIds.size + assessIds.size + quizIds.size + practiceIds.size;
    if (total === 0) return 0;

    const userIds = Array.from(new Set([userId, registrationId].filter(Boolean) as string[]));
    const [lp, aa, qa, ps] = await Promise.all([
      cachedQuery(`student_lp:${userId}`, () => {
        const q = supabase.from('lesson_progress').select('lesson_id, completed');
        return userIds.length > 1 ? q.in('student_id', userIds) : q.eq('student_id', userId);
      }, 15000),
      cachedQuery(`student_aa:${userId}`, () => {
        const q = supabase.from('assessment_attempts').select('assignment_id, score, status');
        return userIds.length > 1 ? q.in('student_id', userIds) : q.eq('student_id', userId);
      }, 15000),
      cachedQuery(`student_qa:${userId}`, () => {
        const q = supabase.from('quiz_attempts').select('quiz_id, score, status');
        return userIds.length > 1 ? q.in('user_id', userIds) : q.eq('user_id', userId);
      }, 15000),
      cachedQuery(`student_ps:${userId}`, () => {
        const q = supabase.from('practice_submissions').select('problem_id');
        return userIds.length > 1 ? q.in('student_id', userIds) : q.eq('student_id', userId);
      }, 15000),
    ]);

    const isAttemptPassed = (r: any) => {
      const score = Number(r.score ?? 0);
      const status = String(r.status ?? '').toLowerCase();
      return score >= 70 || status === 'passed';
    };

    const donePracticeIds = new Set<string>(
      (ps.data || []).map((r: any) => String(r.problem_id || '').trim())
    );

    const done =
      new Set((lp.data || []).filter((r: any) => r.completed).map((r: any) => String(r.lesson_id || '').trim()).filter((id: any) => lessonIds.has(id))).size +
      new Set((aa.data || []).filter(isAttemptPassed).map((r: any) => String(r.assignment_id || '').trim()).filter((id: any) => assessIds.has(id))).size +
      new Set((qa.data || []).filter(isAttemptPassed).map((r: any) => String(r.quiz_id || '').trim()).filter((id: any) => quizIds.has(id))).size +
      new Set([...donePracticeIds].filter((id: any) => practiceIds.has(id))).size;

    return Math.min(100, Math.round((done / total) * 100));
  } catch (err) {
    console.error('computeCourseProgress failed:', err);
    return 0;
  }
}

export async function issueCertificateIfComplete(userId: string, courseId: string, courseTitle: string): Promise<void> {
  try {
    await supabase.from('certificates').upsert(
      {
        id: `cert-${userId}-${courseId}`,
        student_id: userId,
        course_id: courseId,
        title: courseTitle || 'Course Certificate',
        verify_id: `verify-${courseId}-${userId}`,
        issued_date: new Date().toISOString(),
        status: 'earned',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    invalidateCache(`certificates:${userId}`);
  } catch (e) {
    console.debug('issueCertificateIfComplete skipped:', e);
  }
}

export interface PresentationRecord {
  id: string;
  title: string;
  description: string;
  ppt_url: string;
  provider: string;
  tags?: string[];
  course_id: string;
  course_name: string;
  stage_id: string;
  stage_name: string;
  subtopic_id: string;
  subtopic_name: string;
  inner_topic_id: string;
  lesson_name: string;
  target_batch: string;
  posted_by: string;
  created_date: string;
  created_at: string;
  updated_at: string;
}

export function getPresentationEmbedUrl(url: string): string {
  if (!url) return '';
  const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
  }
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  return url;
}

export async function fetchPresentations(courseIds?: string[]): Promise<PresentationRecord[]> {
  const cacheKey = `presentations:${(courseIds || []).sort().join(',') || 'all'}`;
  return cachedQuery(cacheKey, async () => {
    let query = supabase
      .from('presentations')
      .select('*')
      .order('created_at', { ascending: false });

    if (courseIds && courseIds.length > 0) {
      query = query.in('course_id', courseIds);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching presentations:', error);
      return [];
    }
    return (data || []) as PresentationRecord[];
  }, 30_000);
}
