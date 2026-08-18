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
export async function fetchJobs(batchCategory: string) {
  const targetBatchStr = batchCategory === 'Weekday' ? 'Weekday Batch' : 'Weekend Batch';
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .or(`target_batch.eq.All Batches,target_batch.eq.${targetBatchStr}`);

  if (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }

  return data || [];
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

