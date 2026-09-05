import { supabase } from './supabase';
import { cachedQuery, invalidateCache } from './queryCache';/**
 * Clean phone number to compare suffixes (removes non-digits and takes last 10 digits)
 */
function cleanPhoneSuffix(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Resolves a student record from Supabase matching their mobile number.
 */
export async function fetchStudentByPhone(phone: string) {
  const searchSuffix = cleanPhoneSuffix(phone);
  if (!searchSuffix) return null;

  const pickExact = (rows: any[]) =>
    rows.find((s: any) => s?.mobile_number && cleanPhoneSuffix(s.mobile_number) === searchSuffix) || rows[0] || null;

  // SECURITY (preferred): the get_student_by_phone SECURITY DEFINER RPC returns ONLY the single matching
  // row, so once the 20260905000000_lock_students_pii migration is applied (which also revokes anon SELECT
  // on `students`), the PII table can't be dumped with the public anon key.
  const { data, error } = await supabase.rpc('get_student_by_phone', { suffix: searchSuffix });

  if (!error) {
    return pickExact(Array.isArray(data) ? data : data ? [data] : []);
  }

  // Migration not applied yet (RPC missing → PGRST202) — fall back to the direct suffix lookup so LOGIN
  // KEEPS WORKING. This path stops working (by design) only after the migration revokes anon SELECT, at
  // which point the RPC above succeeds instead. Any error other than "function not found" is re-thrown.
  const fnMissing = error.code === 'PGRST202' || /Could not find the function|schema cache/i.test(error.message || '');
  if (!fnMissing) {
    console.error('Error fetching student by phone (RPC):', error);
    throw error;
  }
  console.warn('get_student_by_phone RPC not found — using direct lookup (apply 20260905000000_lock_students_pii to enable the secure path).');

  const { data: rows, error: err2 } = await supabase
    .from('students')
    .select('*')
    .ilike('mobile_number', `%${searchSuffix}`)
    .limit(5);
  if (err2) {
    console.error('Error fetching student by phone (fallback):', err2);
    throw err2;
  }
  return pickExact(rows || []);
}

/**
 * Resolves a cohort batch category (e.g. 'Weekday' or 'Weekend') by batch code.
 */
export async function fetchBatchCategory(batchCode: string): Promise<'Weekday' | 'Weekend' | null> {
  const { data, error } = await supabase
    .from('batches')
    .select('category')
    .eq('code', batchCode)
    .maybeSingle();

  if (error) {
    console.error('Error fetching batch category:', error);
    throw error;
  }

  return (data?.category as 'Weekday' | 'Weekend') || null;
}

/**
 * Fetches course tracks filtered by the user's batch category.
 */
export async function fetchCourses(batchCategory: string) {
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
}

/**
 * Fetches jobs for the placement board, filtered by cohort category.
 */
export async function fetchJobs(batchCategory: string, batchCode: string = '') {
  const targetBatchStr = batchCategory === 'Weekday' ? 'Weekday Batch' : 'Weekend Batch';
  let orQuery = `target_batch.eq.All Batches,target_batch.eq.${targetBatchStr}`;
  if (batchCode) {
    orQuery += `,target_batch.eq.${batchCode}`;
  }

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .or(orQuery);

  if (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }

  if (!data) return [];

  return data.map((item: any) => ({
    id: item.id,
    company: item.company || 'TCS',
    role: item.job_title || 'Software Engineer',
    location: item.location || 'Remote',
    type: item.job_type || 'Full-Time',
    salary: item.salary || 'LPA',
    posted: item.posted_date || 'Recent',
    logo: item.logo || '',
    description: item.description || 'Job details...',
    status: item.publish_status === 'Closed' ? 'closed' : 'open',
    skills: item.skills || ['Python', 'Django', 'SQL'],
    isLocked: item.is_locked ?? false
  }));
}

/**
 * Fetches placement preparation resources.
 */
export async function fetchPlacementResources() {
  return cachedQuery('placement_resources', async () => {
    try {
      const { data, error } = await supabase
        .from('placement_resources')
        .select('*')
        .eq('publish_status', 'Published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching placement resources:', error);
        throw error;
      }
      return data || [];
    } catch {
      return [];
    }
  });
}

/**
 * Builds a PostgREST `.or()` filter that matches a batch against a live_sessions row via
 * batch_code (exact), target_batch (comma-list substring), or an "All Batches" target.
 * A session is targeted to many batches (target_batch = "A26W1, A26W2, A26S1, …"), so
 * matching only batch_code hides sessions from batches that are actually targeted.
 */
function liveSessionBatchFilter(batchCode: string): string {
  const b = batchCode || '';
  return `batch_code.eq.${b},target_batch.ilike.%${b}%,target_batch.ilike.%all batches%`;
}

/**
 * Fetches live and upcoming sessions from the live_sessions table for a specific batch.
 * NOTE: status is derived from date/time by the caller (the DB stores capitalized labels like
 * "Upcoming"), so we do not filter by status here.
 */
export async function fetchLiveSessions(batchCode: string) {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('*')
    .or(liveSessionBatchFilter(batchCode))
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching live sessions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches all sessions (ongoing, upcoming, completed) from the live_sessions table for a
 * specific batch (matched via batch_code or target_batch).
 */
export async function fetchAllLiveSessions(batchCode: string) {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('*')
    .or(liveSessionBatchFilter(batchCode))
    .order('date', { ascending: false })
    .order('time', { ascending: false });

  if (error) {
    console.error('Error fetching all live sessions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches the daily schedule/topics for a date + batch from the live_sessions table (the
 * `daily_schedules` table does not exist in the DB — admin publishes daily classes to
 * live_sessions). Rows are mapped to the daily-schedule shape the Dashboard expects.
 */
export async function fetchDailySchedules(dateStr: string, batchCode: string) {
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
}

// ════════════════════════════════════════════════════════════════
// STUDENT PROFILES — User LMS owned table (read/write)
// ════════════════════════════════════════════════════════════════

export interface StudentProfileRow {
  student_id: string;
  bio: string;
  program: string;
  college?: string;
  start_year?: number;
  end_year?: number;
  skills: { name: string; level: number }[];
  socials: { label: string; value: string }[];
  notif_assignments: boolean;
  notif_live: boolean;
  notif_placement: boolean;
  notif_weekly: boolean;
  connected_github: boolean;
  connected_linkedin: boolean;
  connected_portfolio: boolean;
  progress?: number;
  course_progress?: Record<string, number>;
  attendance?: number;
  gpa?: number;
  xp?: number;
  updated_at: string;
  created_at: string;
}

/**
 * Fetches the student profile from the User LMS student_profiles table.
 * Returns null if no profile row exists yet for this student.
 */
export async function fetchStudentProfile(studentId: string): Promise<StudentProfileRow | null> {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching student profile:', error);
    return null;
  }

  return data as StudentProfileRow | null;
}

/**
 * Creates or updates a student profile row (upsert on student_id).
 * Used for first-time setup and subsequent saves.
 */
export async function upsertStudentProfile(
  studentId: string,
  updates: Partial<Omit<StudentProfileRow, 'student_id' | 'created_at'>>
): Promise<StudentProfileRow | null> {
  const { data, error } = await supabase
    .from('student_profiles')
    .upsert(
      { student_id: studentId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'student_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting student profile:', error);
    throw error;
  }

  return data as StudentProfileRow;
}

/** Resize/crop an image file to a compact square JPEG data URL (keeps avatars small). */
function resizeImageToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas unavailable'));
        // Cover-crop the largest centered square, then scale down to `size`.
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('could not read image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a student avatar: resize → try Supabase Storage (keeps the DB row tiny) → fall back to a
 * compact data URL if Storage is unavailable. Persists the resulting URL to `students.avatar`
 * (which UserContext reads) and returns it.
 */
export async function updateStudentAvatar(studentId: string, file: File): Promise<string> {
  const dataUrl = await resizeImageToDataUrl(file, 256);
  let finalUrl = dataUrl;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `avatars/${String(studentId).replace(/[^a-zA-Z0-9._-]/g, '_')}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('submissions').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (!error) {
      const { data } = supabase.storage.from('submissions').getPublicUrl(path);
      if (data?.publicUrl) finalUrl = data.publicUrl;
    }
  } catch {
    // keep the data URL fallback
  }
  const { error: updErr } = await supabase.from('students').update({ avatar: finalUrl }).eq('id', studentId);
  if (updErr) throw updErr;
  return finalUrl;
}

/**
 * Fetches course details matching a list of course IDs.
 */
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

/**
 * Fetches reviews for a specific course.
 */
export async function fetchCourseReviews(courseId: string) {
  try {
    const { data, error } = await supabase
      .from('course_reviews')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('course_reviews table not available:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ════════════════════════════════════════════════════════════════

export async function fetchAssignments(batchCode: string, batchCategory?: string, courseId?: string) {
  try {
    let query = supabase.from('assessments').select('*');
    if (courseId) {
      query = query.eq('course_id', courseId);
    } else {
      const targetBatchStr = batchCategory === 'Weekend' ? 'Weekend Batch' : 'Weekday Batch';
      query = query.or(`target_batch.eq.All Batches,target_batch.eq.${targetBatchStr}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('assessments table not available:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((item: any) => {
      // Assessments are taken entirely as MCQs — a code-based question is shown as a code
      // snippet inside the MCQ (options to pick the correct answer), never a separate IDE.
      const type = 'mcq' as 'coding' | 'mcq';
      return {
        id: item.id,
        slug: item.id,
        type: type,
        title: item.title,
        category: item.course_name || 'General',
        difficulty: 'Intermediate' as const,
        // Admin stores the XP reward in the `total_marks` field.
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
          correctIndex: q.correctIndex || 0,
          explanation: q.explanation || 'Refer to classroom notes.'
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
}

// ════════════════════════════════════════════════════════════════
// QUIZZES
// ════════════════════════════════════════════════════════════════

export async function fetchQuizzes(courseIds: string[]) {
  try {
    if (!courseIds || courseIds.length === 0) return [];
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .in('course_id', courseIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('quizzes table not available:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchQuizAttempts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('attempted_at', { ascending: false });

    if (error) {
      console.warn('quiz_attempts table not available:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function submitQuizAttempt(
  userId: string,
  quizId: string,
  score: number,
  answers?: number[],
  totalQuestions?: number,
  correctAnswers?: number
) {
  try {
    const isPassed = score >= 70;
    const baseRow = {
      user_id: userId,
      quiz_id: quizId,
      score,
      total_questions: totalQuestions ?? null,
      correct_answers: correctAnswers ?? null,
      status: isPassed ? 'passed' : 'failed',
      attempted_at: new Date().toISOString(),
    };

    // Quizzes record the attempt with questions & answers breakdown
    let savedRow: any = null;
    const { data: withAns, error } = await supabase
      .from('quiz_attempts')
      .insert({ ...baseRow, answers: answers ?? [] })
      .select()
      .single();
    if (!error) {
      savedRow = withAns;
    } else {
      console.warn('Quiz attempt insert with answers failed, retrying without:', error.message);
      const { data: noAns, error: err2 } = await supabase
        .from('quiz_attempts')
        .insert(baseRow)
        .select()
        .single();
      if (err2) {
        console.error('Error inserting quiz attempt:', err2.message);
        throw err2;
      }
      savedRow = noAns;
    }

    // Award 10 XP only if passed (score >= 70%) to maintain sustainable reward gamification
    if (isPassed) {
      try {
        await incrementUserXP(userId, 10);
        await recalculateUserStreak(userId);
      } catch (xpErr) {
        console.warn('Failed to increment XP for passed quiz:', xpErr);
      }
    }

    return savedRow;
  } catch (err) {
    console.error('submitQuizAttempt failed:', err);
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════
// PROJECTS
// ════════════════════════════════════════════════════════════════

export async function fetchProjects(batchCode: string, batchCategory?: string, courseId?: string) {
  try {
    let query = supabase.from('projects').select('*');
    if (courseId) {
      query = query.eq('course_id', courseId);
    } else {
      const conditions = ["target_batch.eq.ALL", "target_batch.eq.All Batches"];
      if (batchCode) {
        conditions.push(`target_batch.eq.${batchCode}`);
      }
      if (batchCategory) {
        conditions.push(`target_batch.eq.${batchCategory}`);
        conditions.push(`target_batch.eq.${batchCategory} Batch`);
      }
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('projects table not available:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// RESOURCES
// ════════════════════════════════════════════════════════════════

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
        const typeLower = (item.type || '').toLowerCase();
        let finalType = 'notes';
        if (typeLower.includes('pdf')) finalType = 'pdf';
        else if (typeLower.includes('note')) finalType = 'notes';
        else if (typeLower.includes('cheat')) finalType = 'cheatsheet';
        else if (typeLower.includes('road')) finalType = 'roadmap';
        else if (typeLower.includes('temp')) finalType = 'template';

        return {
          id: item.id,
          title: item.title || 'Untitled Resource',
          category: item.category || 'General',
          type: finalType,
          updatedAt: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent',
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

// ════════════════════════════════════════════════════════════════
// COMMUNITY & ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════

export async function fetchCommunityPosts() {
  return cachedQuery('community_posts', async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('community_posts table not available:', error.message);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  });
}

export async function fetchAnnouncements() {
  return cachedQuery('announcements', async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('announcements table not available:', error.message);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  });
}

// ════════════════════════════════════════════════════════════════
// BADGES & ACHIEVEMENTS
// ════════════════════════════════════════════════════════════════

export async function fetchBadges() {
  return cachedQuery('badges', async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('badges table not available:', error.message);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  });
}

/** Decide whether a student has earned a badge from its criteria + their activity. */
export function evaluateBadgeCriteria(
  badge: any,
  user: any,
  submissions: any[] = [],
  assignmentSubmissions: any[] = []
): boolean {
  if (!badge?.criteria) return false;
  const criteria = badge.criteria.toLowerCase();

  if (criteria.includes('streak')) {
    const match = criteria.match(/\d+/);
    const requiredStreak = match ? parseInt(match[0], 10) : 10;
    return (user?.streak || 0) >= requiredStreak;
  }

  if (criteria.includes('score') || criteria.includes('assessment') || criteria.includes('quiz') || criteria.includes('test')) {
    const scoreMatch = criteria.match(/(\d+)%/);
    const requiredScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 70;
    return (assignmentSubmissions || []).some((a: any) => (a.grade || 0) >= requiredScore);
  }

  if (criteria.includes('problem') || criteria.includes('coding') || criteria.includes('solve') || criteria.includes('project')) {
    const match = criteria.match(/\d+/);
    const requiredCount = match ? parseInt(match[0], 10) : 5;
    const uniqueSolved = new Set((submissions || []).filter((s: any) => s.status === 'solved' || s.language === 'project').map((s: any) => s.problem_id)).size;
    return uniqueSolved >= requiredCount;
  }

  if (criteria.includes('completion') || criteria.includes('progress') || criteria.includes('complete')) {
    const match = criteria.match(/\d+/);
    const requiredProgress = match ? parseInt(match[0], 10) : 100;
    return (user?.progress || 0) >= requiredProgress;
  }

  if (criteria.includes('attendance') || criteria.includes('attend')) {
    const match = criteria.match(/\d+/);
    const requiredAttendance = match ? parseInt(match[0], 10) : 75;
    return (user?.attendance || 0) >= requiredAttendance;
  }

  if (criteria.includes('xp') || criteria.includes('points')) {
    const match = criteria.match(/\d+/);
    const requiredXP = match ? parseInt(match[0], 10) : 100;
    return (user?.xp || 0) >= requiredXP;
  }

  return false;
}

// ════════════════════════════════════════════════════════════════
// CERTIFICATES
// ════════════════════════════════════════════════════════════════

export async function fetchCertificates(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('certificates table not available:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// Real table columns: id, student_id, title, content, read, created_at.
// The UI expects { type, title, message, time/timestamp, icon }, so we
// normalize each row here (content -> message, created_at -> time) without
// touching the UI components.
// ════════════════════════════════════════════════════════════════

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function normalizeNotification(row: any) {
  const message = row.content ?? row.message ?? '';
  // Real table has no `type`; infer a sensible one from the id prefix, else 'system'.
  let type = row.type;
  if (!type) {
    const id = String(row.id || '');
    if (id.startsWith('notif-unlock')) type = 'live';
    else type = 'system';
  }
  const time = relativeTime(row.created_at);
  return {
    ...row,
    type,
    message,
    content: message,
    time,
    timestamp: time,
  };
}

export async function fetchNotifications(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('notifications table not available:', error.message);
      return [];
    }
    return (data || []).map(normalizeNotification);
  } catch {
    return [];
  }
}

/**
 * Best-effort persist of a notification row (Approach B). Uses a deterministic id so
 * repeated calls never duplicate. No-ops quietly if the anon INSERT policy is not yet
 * applied — realtime popups (Approach A) do not depend on this succeeding.
 */
export async function persistNotification(n: {
  id: string;
  studentId: string;
  title: string;
  content?: string;
}) {
  try {
    const { error } = await supabase
      .from('notifications')
      .upsert(
        {
          id: n.id,
          student_id: n.studentId,
          title: n.title,
          content: n.content || '',
          read: false,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    if (error) {
      // Expected while the anon INSERT RLS policy is not yet applied.
      console.debug('persistNotification skipped:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Back-compat wrapper for lesson-unlock notifications. */
export async function createUnlockNotification(studentId: string, lesson: { id: string; title?: string }) {
  const id = `notif-unlock-${lesson.id}-${studentId}`;
  await persistNotification({
    id,
    studentId,
    title: 'New lesson unlocked',
    content: lesson.title
      ? `"${lesson.title}" is now available. Check your lessons, assessments and practice.`
      : 'A new lesson is now available.',
  });
  return id;
}

// ════════════════════════════════════════════════════════════════
// PRACTICE PROBLEMS
// ════════════════════════════════════════════════════════════════

export async function fetchPracticeProblems(courseId?: string) {
  try {
    let query = supabase.from('coding_questions').select('*').order('created_at', { ascending: true });
    if (courseId) query = query.eq('course_id', courseId);

    const { data, error } = await query;

    if (error) {
      console.warn('coding_questions table not available:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// REWARDS / SWAG
// ════════════════════════════════════════════════════════════════

export async function fetchRewards() {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('rewards table not available:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// LEADERBOARD (uses students table)
// ════════════════════════════════════════════════════════════════

export async function fetchLeaderboard() {
  try {
    // SECURITY (preferred): the get_leaderboard RPC returns a non-PII projection (no email). Once the
    // 20260905000000_lock_students_pii migration is applied it is the only path (anon SELECT revoked).
    const { data, error } = await supabase.rpc('get_leaderboard', { row_limit: 20 });
    if (!error) return data || [];

    // Migration not applied yet → fall back to a direct read (still without email).
    const fnMissing = error.code === 'PGRST202' || /Could not find the function|schema cache/i.test(error.message || '');
    if (!fnMissing) {
      console.warn('Error fetching leaderboard:', error.message);
      return [];
    }
    const { data: rows } = await supabase
      .from('students')
      .select('id, name, avatar, batch')
      .limit(20);
    return rows || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// RECORDINGS (uses live_sessions with completed status)
// ════════════════════════════════════════════════════════════════

export async function fetchRecordingById(sessionId: string) {
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
      ? (row.instructor.name || 'Lead Instructor')
      : (row.instructor || 'Lead Instructor');

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
}

export async function fetchRecordings(batchCode: string) {
  try {
    // Try recordings table first
    const { data: recData, error: recError } = await supabase
      .from('recordings')
      .select('*')
      .eq('batch_code', batchCode)
      .order('created_at', { ascending: false });

    if (!recError && recData && recData.length > 0) {
      return recData;
    }

    // Fallback: completed live_sessions
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('batch_code', batchCode)
      .eq('status', 'completed')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Error fetching recordings:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// NEW SOLUTIONS & ATTEMPTS INTERACTION
// ════════════════════════════════════════════════════════════════

export async function incrementUserXP(userId: string, amount: number) {
  const { data: profile, error: fetchError } = await supabase
    .from('student_profiles')
    .select('xp')
    .eq('student_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching student profile for XP increment:', fetchError);
    return;
  }

  const currentXp = profile?.xp ?? 0;
  const newXp = currentXp + amount;

  const { error: updateError } = await supabase
    .from('student_profiles')
    .update({ xp: newXp })
    .eq('student_id', userId);

  if (updateError) {
    console.error('Error updating student profile XP:', updateError);
  }
}

/**
 * Detects whether a student belongs to a weekday batch based on their registration ID, batch code, or batch category.
 * Weekday batches typically feature 'a26w', 'w', or category 'Weekday'.
 */
export function isWeekdayBatchUser(user?: {
  registrationId?: string;
  batchCode?: string;
  batchCategory?: string;
  batch?: string;
  registration_id?: string;
  batch_category?: string;
} | null): boolean {
  if (!user) return false;
  const reg = (user.registrationId || user.registration_id || '').toLowerCase();
  const bCode = (user.batchCode || user.batch || '').toLowerCase();
  const bCat = (user.batchCategory || user.batch_category || '').toLowerCase();
  return (
    bCat === 'weekday' ||
    reg.includes('a26w') ||
    reg.includes('w') ||
    bCode.includes('a26w') ||
    bCode.startsWith('w') ||
    bCode.includes('w')
  );
}

export async function recalculateUserStreak(
  userId: string,
  currentStreak?: number,
  isWeekdayParam?: boolean
): Promise<number> {
  try {
    let finalCurrentStreak = currentStreak;
    if (finalCurrentStreak === undefined) {
      const { data } = await supabase
        .from('student_profiles')
        .select('attendance')
        .eq('student_id', userId)
        .maybeSingle();
      finalCurrentStreak = data?.attendance ?? 0;
    }

    // Determine whether this student is in a weekday batch (e.g. A26W)
    let isWeekday = isWeekdayParam;
    if (isWeekday === undefined && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('aspire_cached_user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u.id === userId) {
            isWeekday = isWeekdayBatchUser(u);
          }
        }
      } catch {
        // ignore localStorage parsing errors
      }
    }

    if (isWeekday === undefined) {
      try {
        const { data: st } = await supabase
          .from('students')
          .select('registration_id, batch')
          .eq('id', userId)
          .maybeSingle();
        if (st) {
          isWeekday = isWeekdayBatchUser(st);
          if (!isWeekday && st.batch) {
            const cat = await fetchBatchCategory(st.batch);
            isWeekday = cat === 'Weekday';
          }
        }
      } catch {
        // ignore network/lookup errors
      }
    }

    // Default to true for A26W/weekday cohorts if cannot be resolved
    if (isWeekday === undefined) {
      isWeekday = true;
    }

    const { data: practiceData, error: practiceError } = await supabase
      .from('practice_submissions')
      .select('submitted_at, created_at')
      .eq('student_id', userId);

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessment_attempts')
      .select('submitted_at, created_at')
      .eq('student_id', userId);

    const { data: quizData, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('attempted_at, created_at')
      .eq('user_id', userId);

    if (practiceError) console.error('Error fetching practice submissions for streak:', practiceError);
    if (assessmentError) console.error('Error fetching assessment attempts for streak:', assessmentError);
    if (quizError) console.error('Error fetching quiz attempts for streak:', quizError);

    const allDates = new Set<string>();

    const addLocalDates = (items: any[]) => {
      (items || []).forEach(item => {
        const dateVal = item.submitted_at || item.attempted_at || item.completed_at || item.created_at;
        if (dateVal) {
          const d = new Date(dateVal);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          allDates.add(`${yyyy}-${mm}-${dd}`);
        }
      });
    };

    addLocalDates(practiceData || []);
    addLocalDates(assessmentData || []);
    addLocalDates(quizData || []);

    const getLocalDateString = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const today = new Date();
    const todayStr = getLocalDateString(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = getLocalDateString(twoDaysAgo);

    let streak = 0;
    let checkDate: Date | null = null;

    // Check if the streak is active:
    // 1. Did work today
    if (allDates.has(todayStr)) {
      streak = 1;
      checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
    }
    // 2. Did work yesterday
    else if (allDates.has(yesterdayStr)) {
      streak = 1;
      checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
    }
    // 3. For weekday batches, Sunday is an official rest day:
    //    If today is Monday (day 1), yesterday was Sunday (holiday).
    //    If the student didn't submit on Sunday, check Saturday (2 days ago).
    //    If Saturday was submitted, the streak remains active!
    else if (isWeekday && today.getDay() === 1 && allDates.has(twoDaysAgoStr)) {
      streak = 1;
      checkDate = new Date(twoDaysAgo);
      checkDate.setDate(checkDate.getDate() - 1);
    }

    if (checkDate) {
      while (true) {
        const dateStr = getLocalDateString(checkDate);
        const dayOfWeek = checkDate.getDay(); // 0 = Sunday

        if (allDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (isWeekday && dayOfWeek === 0) {
          // Sunday is an official leave/rest day for weekday batches (A26W).
          // Taking Sunday off does NOT break the streak. Skip Sunday and continue checking previous days.
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // Unexcused day missed — streak terminates
          break;
        }
      }
    }

    if (streak !== finalCurrentStreak) {
      console.log(`Updating streak from ${finalCurrentStreak} to ${streak} for user ${userId} (weekday: ${isWeekday})`);
      await supabase
        .from('student_profiles')
        .update({ attendance: streak })
        .eq('student_id', userId);
    }

    return streak;
  } catch (err) {
    console.error('Error in recalculateUserStreak:', err);
    return currentStreak ?? 0;
  }
}

/** Mark a lesson (video) as completed for a student — idempotent upsert on a deterministic id. */
export async function markLessonComplete(userId: string, lessonId: string, courseId?: string): Promise<void> {
  try {
    await supabase.from('lesson_progress').upsert(
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
  } catch (e) {
    console.warn('markLessonComplete skipped:', e);
  }
}

/** Returns the set of lesson ids this student has marked complete. */
export async function fetchCompletedLessons(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('student_id', userId);
    return new Set((data || []).filter((r: any) => r.completed).map((r: any) => r.lesson_id));
  } catch {
    return new Set();
  }
}

/**
 * Computes a student's completion % for a course. Every VIDEO LESSON and every coursework item
 * (assessment + quiz + coding practice + project) counts as ONE unit; a lesson is "done" when the student
 * marks it complete (lesson_progress), coursework when attempted/submitted. Pure read — does not write.
 */
export async function computeCourseProgress(userId: string, courseId: string): Promise<number> {
  try {
    const [lRes, aRes, qRes, cRes, pRes] = await Promise.all([
      supabase.from('course_lessons').select('id').eq('course_id', courseId),
      supabase.from('assessments').select('id').eq('course_id', courseId),
      supabase.from('quizzes').select('id').eq('course_id', courseId),
      supabase.from('coding_questions').select('id').eq('course_id', courseId),
      supabase.from('projects').select('id').eq('course_id', courseId),
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

    const [lp, aa, qa, ps] = await Promise.all([
      supabase.from('lesson_progress').select('lesson_id, completed').eq('student_id', userId),
      supabase.from('assessment_attempts').select('assignment_id, score, status').eq('student_id', userId),
      supabase.from('quiz_attempts').select('quiz_id, score, status').eq('user_id', userId),
      supabase.from('practice_submissions').select('problem_id').eq('student_id', userId),
    ]);

    // Academic integrity: only coursework PASSED (score >= 70% or status 'passed' / 'Passed') counts towards course progress.
    const isAttemptPassed = (r: any) => {
      const score = Number(r.score ?? 0);
      const status = String(r.status ?? '').toLowerCase();
      return score >= 70 || status === 'passed';
    };

    const done =
      new Set((lp.data || []).filter((r: any) => r.completed).map((r: any) => String(r.lesson_id || '').trim()).filter((id: any) => lessonIds.has(id))).size +
      new Set((aa.data || []).filter(isAttemptPassed).map((r: any) => String(r.assignment_id || '').trim()).filter((id: any) => assessIds.has(id))).size +
      new Set((qa.data || []).filter(isAttemptPassed).map((r: any) => String(r.quiz_id || '').trim()).filter((id: any) => quizIds.has(id))).size +
      new Set((ps.data || []).map((r: any) => String(r.problem_id || '').trim()).filter((id: any) => practiceIds.has(id))).size;

    return Math.min(100, Math.round((done / total) * 100));
  } catch (err) {
    console.error('computeCourseProgress failed:', err);
    return 0;
  }
}

/**
 * Auto-issues a certificate row when a course is 100% complete (idempotent via a deterministic id).
 * Stores only metadata + a placeholder verify id — the admin attaches the real certificate_url (PDF) later.
 */
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
  } catch (e) {
    // Expected until the anon INSERT policy on certificates is applied.
    console.debug('issueCertificateIfComplete skipped:', e);
  }
}

/**
 * Records a practice/coding-lab submission in `practice_submissions` (student-keyed, clean —
 * no profiles FK / streak trigger). The actual files live in Supabase Storage; the DB keeps only
 * the URL + metadata (low DB consumption). One row per (student, problem):
 *   - 1st solve → INSERT + award 100 XP.
 *   - re-solve  → UPDATE the same row to the latest submission (storage_url/metadata, attempt_count+1); no XP.
 * `storageUrl` should be the real Supabase Storage public URL (see `uploadSubmissionBundle`).
 */
export async function submitPracticeProblem(
  userId: string,
  problemId: string,
  language: string,
  _code?: string,
  _sandboxUrl?: string,
  storageUrl?: string,
  projectName?: string,
  fileCount: number = 1,
  totalSize: number = 0,
  rewardXp?: number
) {
  // Find an existing submission for this student + problem.
  let priorRow: { id: string; attempt_count?: number } | null = null;
  try {
    const { data } = await supabase
      .from('practice_submissions')
      .select('id, attempt_count')
      .eq('student_id', userId)
      .eq('problem_id', problemId)
      .maybeSingle();
    priorRow = data;
  } catch {
    priorRow = null;
  }

  const meta = {
    storage_url: storageUrl,
    project_name: projectName,
    file_count: fileCount,
    total_size: totalSize,
    language,
    status: 'solved',
    submitted_at: new Date().toISOString(),
  };

  // Re-solve: update the same row to the latest work (admin reviews the latest); no XP.
  if (priorRow) {
    try {
      await supabase
        .from('practice_submissions')
        .update({ ...meta, attempt_count: (priorRow.attempt_count || 1) + 1 })
        .eq('id', priorRow.id);
    } catch (e) {
      console.warn('Failed to update practice submission:', e);
    }
    return priorRow;
  }

  // First solve: store one row + award calibrated XP.
  const row = { id: `psub-${Date.now()}`, student_id: userId, problem_id: problemId, attempt_count: 1, ...meta };
  const { data, error } = await supabase.from('practice_submissions').insert(row).select().single();

  if (error) {
    console.error('Error storing practice submission:', error.message);
    throw error;
  }

  try {
    const xpToAward = rewardXp ?? 25;
    await incrementUserXP(userId, xpToAward);
    await recalculateUserStreak(userId);
  } catch (xpErr) {
    console.warn('Failed to increment XP / recalculate streak after solving problem:', xpErr);
  }

  return data;
}

export async function fetchUserSubmissions(userId: string) {
  const { data, error } = await supabase
    .from('practice_submissions')
    .select('*')
    .eq('student_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.warn('practice_submissions table not available:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Records an assessment attempt in `assessment_attempts` (a clean student-keyed table,
 * following the working `personal_tasks`/`reward_claims` pattern — no profiles FK / triggers).
 *
 * To keep DB writes low and preserve a single reviewable result:
 *   - 1st attempt  → INSERT one row (score, attempt_count=1) and award XP (score% × reward).
 *   - Retry (2nd+) → do NOT insert; bump `attempt_count` on the existing row (score kept), no XP.
 *
 * `grade` is the score % (0–100). `feedback`/`attachments` are unused (kept for call-site compat).
 */
export async function submitAssignmentAttempt(
  userId: string,
  assignmentId: string,
  status: 'pending' | 'submitted' | 'reviewed' | 'overdue',
  grade?: number,
  _feedback?: string,
  _attachments: number = 0,
  rewardXp?: number,
  answers?: number[]
) {
  const score = grade ?? 0;

  // Look for an existing (first) attempt for this student + assessment.
  let priorRow: { id: string; attempt_count?: number } | null = null;
  try {
    const { data } = await supabase
      .from('assessment_attempts')
      .select('id, attempt_count')
      .eq('student_id', userId)
      .eq('assignment_id', assignmentId)
      .maybeSingle();
    priorRow = data;
  } catch {
    priorRow = null;
  }

  // Retry: only bump the counter (keep the 1st score for review); no XP.
  if (priorRow) {
    try {
      await supabase
        .from('assessment_attempts')
        .update({ attempt_count: (priorRow.attempt_count || 1) + 1 })
        .eq('id', priorRow.id);
    } catch (e) {
      console.warn('Failed to bump assessment attempt_count:', e);
    }
    return priorRow;
  }

  // First attempt: store one row.
  const row = {
    id: `aatt-${Date.now()}`,
    student_id: userId,
    assignment_id: assignmentId,
    score,
    status,
    attempt_count: 1,
    submitted_at: new Date().toISOString(),
  };

  // Persist the chosen answers when the column exists; fall back gracefully if the
  // `answers` migration has not been applied yet (unknown-column error).
  let data: any = null;
  {
    const { data: withAns, error } = await supabase
      .from('assessment_attempts')
      .insert({ ...row, answers: answers ?? [] })
      .select()
      .single();
    if (error) {
      console.warn('Assessment attempt insert with answers failed, retrying without:', error.message);
      const { data: noAns, error: err2 } = await supabase
        .from('assessment_attempts')
        .insert(row)
        .select()
        .single();
      if (err2) {
        console.error('Error storing assessment attempt:', err2.message);
        throw err2;
      }
      data = noAns;
    } else {
      data = withAns;
    }
  }

  // XP earned = only if PASSED (score >= 70%), first attempt only.
  // Failed attempts (score < 70) earn 0 XP. Base reward calibrated to 25 XP to protect rewards liability.
  try {
    if (score >= 70) {
      const reward = rewardXp ?? 25;
      const pointsAwarded = Math.max(0, Math.round((score / 100) * reward));
      await incrementUserXP(userId, pointsAwarded);
      await recalculateUserStreak(userId);
    }
  } catch (xpErr) {
    console.warn('Failed to increment XP / recalculate streak after assessment attempt:', xpErr);
  }

  return data;
}

export async function fetchAssignmentAttempts(userId: string) {
  const { data, error } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('student_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.warn('assessment_attempts table not available:', error.message);
    return [];
  }
  return data || [];
}

export async function submitRewardClaim(claim: {
  student_id: string;
  reward_id: string;
  full_name: string;
  contact_number: string;
  shipping_address: string;
  apparel_size?: string;
}) {
  const { data, error } = await supabase
    .from('reward_claims')
    .insert({
      id: `clm-${Date.now()}`,
      student_id: claim.student_id,
      reward_id: claim.reward_id,
      full_name: claim.full_name,
      contact_number: claim.contact_number,
      shipping_address: claim.shipping_address,
      apparel_size: claim.apparel_size || null,
      status: 'pending',
      claimed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting reward claim:', error);
    throw error;
  }
  return data;
}

export async function fetchRewardClaims(studentId: string) {
  const { data, error } = await supabase
    .from('reward_claims')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching reward claims:', error);
    return [];
  }
  return data || [];
}

// ════════════════════════════════════════════════════════════════
// JOB APPLICATIONS
// ════════════════════════════════════════════════════════════════

export async function submitJobApplication(application: {
  student_id: string;
  job_id: string;
  full_name: string;
  contact_number: string;
  resume_link: string;
  cover_letter?: string;
}) {
  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      id: `app-${Date.now()}`,
      student_id: application.student_id,
      job_id: application.job_id,
      full_name: application.full_name,
      contact_number: application.contact_number,
      resume_link: application.resume_link,
      cover_letter: application.cover_letter || null,
      status: 'applied',
      applied_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting job application:', error);
    throw error;
  }
  return data;
}

export async function fetchJobApplications(studentId: string) {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching job applications:', error);
    return [];
  }
  return data || [];
}

// ════════════════════════════════════════════════════════════════
// PERSONAL TASKS (SCHEDULE)
// ════════════════════════════════════════════════════════════════

export async function fetchPersonalTasks(studentId: string) {
  const { data, error } = await supabase
    .from('personal_tasks')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching personal tasks:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    student_id: row.student_id,
    title: row.title,
    type: row.type,
    date: row.date,
    dateKey: row.date_key,
    time: row.time,
    completed: row.completed
  }));
}

export async function submitPersonalTask(task: {
  id: string;
  student_id: string;
  title: string;
  type: string;
  date: string;
  dateKey: string;
  time: string;
  completed: boolean;
}) {
  const { data, error } = await supabase
    .from('personal_tasks')
    .insert({
      id: task.id,
      student_id: task.student_id,
      title: task.title,
      type: task.type,
      date: task.date,
      date_key: task.dateKey,
      time: task.time,
      completed: task.completed
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting personal task:', error);
    throw error;
  }
  return data;
}

export async function updatePersonalTaskCompletion(taskId: string, completed: boolean) {
  const { data, error } = await supabase
    .from('personal_tasks')
    .update({ completed: completed })
    .eq('id', taskId);

  if (error) {
    console.error('Error updating personal task completion:', error);
    throw error;
  }
  return data;
}

export async function deletePersonalTask(taskId: string) {
  const { data, error } = await supabase
    .from('personal_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting personal task:', error);
    throw error;
  }
  return data;
}

export async function updateNotificationReadStatus(id: string, read: boolean) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: read })
    .eq('id', id);

  if (error) {
    console.error('Error updating notification read status:', error);
    throw error;
  }
  return data;
}

export async function markAllNotificationsAsRead(studentId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('student_id', studentId);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
  return data;
}

export async function deleteNotificationRow(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting notification row:', error);
    throw error;
  }
  return data;
}


