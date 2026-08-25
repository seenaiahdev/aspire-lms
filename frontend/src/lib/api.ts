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
 * Fetches live and upcoming sessions from the live_sessions table for a specific batch.
 */
export async function fetchLiveSessions(batchCode: string) {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('*')
    .in('status', ['ongoing', 'upcoming'])
    .eq('batch_code', batchCode)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching live sessions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches all sessions (ongoing, upcoming, completed) from the live_sessions table for a specific batch.
 */
export async function fetchAllLiveSessions(batchCode: string) {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('batch_code', batchCode)
    .order('date', { ascending: false })
    .order('time', { ascending: false });

  if (error) {
    console.error('Error fetching all live sessions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetches daily schedule tasks and lessons from daily_schedules table for a specific batch.
 */
export async function fetchDailySchedules(dateStr: string, batchCode: string) {
  const { data, error } = await supabase
    .from('daily_schedules')
    .select('*')
    .eq('date', dateStr)
    .eq('batch_code', batchCode)
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching daily schedules:', error);
    throw error;
  }

  return data || [];
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
      const type = (item.coding_count > 0 ? 'coding' : 'mcq') as 'coding' | 'mcq';
      return {
        id: item.id,
        slug: item.id,
        type: type,
        title: item.title,
        category: item.course_name || 'General',
        difficulty: 'Intermediate' as const,
        xp: 150,
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

export async function fetchQuizzes(batchCode: string) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('batch_code', batchCode)
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
// ════════════════════════════════════════════════════════════════

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
    return data || [];
  } catch {
    return [];
  }
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

export async function submitPracticeProblem(
  userId: string,
  problemId: string,
  language: string,
  code?: string,
  sandboxUrl?: string,
  storageUrl?: string,
  projectName?: string,
  fileCount: number = 1
) {
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      user_id: userId,
      problem_id: problemId,
      language: language,
      code: code,
      status: 'solved',
      sandbox_url: sandboxUrl,
      storage_url: storageUrl,
      project_name: projectName,
      file_count: fileCount,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting practice problem:', error);
    throw error;
  }

  // Increment user XP by 100 for solving a coding problem
  try {
    await incrementUserXP(userId, 100);
  } catch (xpErr) {
    console.warn('Failed to increment XP after solving problem:', xpErr);
  }

  return data;
}

export async function fetchUserSubmissions(userId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user submissions:', error);
    return [];
  }
  return data || [];
}

export async function submitAssignmentAttempt(
  userId: string,
  assignmentId: string,
  status: 'pending' | 'submitted' | 'reviewed' | 'overdue',
  grade?: number,
  feedback?: string,
  attachments: number = 0
) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .insert({
      user_id: userId,
      assignment_id: assignmentId,
      status: status,
      grade: grade,
      feedback: feedback,
      attachments: attachments,
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting assignment attempt:', error);
    throw error;
  }

  // Increment user XP dynamically based on score
  try {
    let pointsAwarded = 50; // Participation XP
    const score = grade ?? 0;
    if (score >= 100) {
      pointsAwarded = 250; // Base 200 + 50 perfect first-try bonus
    } else if (score >= 70) {
      pointsAwarded = Math.round(200 * (score / 100));
    } else if (score > 0) {
      pointsAwarded = Math.max(50, Math.round(200 * (score / 100)));
    }
    await incrementUserXP(userId, pointsAwarded);
  } catch (xpErr) {
    console.warn('Failed to increment XP after assignment attempt:', xpErr);
  }

  return data;
}

export async function fetchAssignmentAttempts(userId: string) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching assignment attempts:', error);
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


