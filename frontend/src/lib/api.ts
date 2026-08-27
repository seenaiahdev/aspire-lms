import { supabase } from './supabase';

/**
 * Clean phone number to compare suffixes (removes non-digits and takes last 10 digits)
 */
function cleanPhoneSuffix(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Resolves a student record from Supabase matching their mobile number.
 */
export async function fetchStudentByPhone(phone: string) {
  // Fetch all students (max 1000) to match by suffix
  const { data, error } = await supabase
    .from('students')
    .select('*');

  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  const searchSuffix = cleanPhoneSuffix(phone);
  if (!searchSuffix) return null;

  const student = data?.find(s => {
    if (!s.mobile_number) return false;
    return cleanPhoneSuffix(s.mobile_number) === searchSuffix;
  });

  return student || null;
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

  if (data) {
    // Recalculate streak asynchronously to ensure correctness (e.g. if a day was missed)
    recalculateUserStreak(studentId, (data as any).attendance ?? 0);
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

/**
 * Fetches course details matching a list of course IDs.
 */
export async function fetchCoursesByIds(courseIds: string[]) {
  if (!courseIds || courseIds.length === 0) return [];

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .in('id', courseIds);

  if (error) {
    console.error('Error fetching enrolled courses:', error);
    throw error;
  }

  return data || [];
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

export async function submitQuizAttempt(userId: string, quizId: string, score: number) {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        score,
        status: 'attempted',
        attempted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting quiz attempt:', error.message);
      throw error;
    }

    try {
      await incrementUserXP(userId, 50);
      await recalculateUserStreak(userId);
    } catch (xpErr) {
      console.warn('Failed to increment XP / recalculate streak after quiz attempt:', xpErr);
    }

    return data;
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
}

// ════════════════════════════════════════════════════════════════
// COMMUNITY & ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════

export async function fetchCommunityPosts() {
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
}

export async function fetchAnnouncements() {
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
}

// ════════════════════════════════════════════════════════════════
// BADGES & ACHIEVEMENTS
// ════════════════════════════════════════════════════════════════

export async function fetchBadges() {
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
    const { data, error } = await supabase
      .from('students')
      .select('id, name, avatar, email, batch')
      .order('name', { ascending: true })
      .limit(20);

    if (error) {
      console.warn('Error fetching leaderboard:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// RECORDINGS (uses live_sessions with completed status)
// ════════════════════════════════════════════════════════════════

export async function fetchRecordingById(sessionId: string) {
  try {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching recording:', error.message);
      return null;
    }
    return data;
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

export async function recalculateUserStreak(userId: string, currentStreak?: number): Promise<number> {
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

    const { data: practiceData, error: practiceError } = await supabase
      .from('practice_submissions')
      .select('submitted_at')
      .eq('student_id', userId);

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessment_attempts')
      .select('submitted_at')
      .eq('student_id', userId);

    if (practiceError) console.error('Error fetching practice submissions for streak:', practiceError);
    if (assessmentError) console.error('Error fetching assessment attempts for streak:', assessmentError);

    const allDates = new Set<string>();

    const addLocalDates = (items: any[]) => {
      (items || []).forEach(item => {
        const dateVal = item.submitted_at || item.created_at;
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

    const getLocalDateString = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    let streak = 0;
    if (allDates.has(todayStr) || allDates.has(yesterdayStr)) {
      let checkDate = new Date();
      if (allDates.has(todayStr)) {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 2);
      }

      while (true) {
        const dateStr = getLocalDateString(checkDate);
        if (allDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    if (streak !== finalCurrentStreak) {
      console.log(`Updating streak from ${finalCurrentStreak} to ${streak} for user ${userId}`);
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
  totalSize: number = 0
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

  // First solve: store one row + award XP.
  const row = { id: `psub-${Date.now()}`, student_id: userId, problem_id: problemId, attempt_count: 1, ...meta };
  const { data, error } = await supabase.from('practice_submissions').insert(row).select().single();

  if (error) {
    console.error('Error storing practice submission:', error.message);
    throw error;
  }

  try {
    await incrementUserXP(userId, 100);
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
  rewardXp?: number
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
  const { data, error } = await supabase.from('assessment_attempts').insert(row).select().single();

  if (error) {
    console.error('Error storing assessment attempt:', error.message);
    throw error;
  }

  // XP earned = score% × reward (assessment total_marks), first attempt only.
  try {
    const reward = rewardXp ?? 100;
    const pointsAwarded = Math.max(0, Math.round((score / 100) * reward));
    await incrementUserXP(userId, pointsAwarded);
    await recalculateUserStreak(userId);
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


