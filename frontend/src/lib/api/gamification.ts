import { supabase } from '../supabase';
import { cachedQuery, invalidateCache } from '../queryCache';
import { fetchBatchCategory } from './auth';

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
  assignmentSubmissions: any[] = [],
  extraData?: {
    quizAttempts?: any[];
    projectLinks?: Record<string, any>;
    projectsList?: any[];
  }
): boolean {
  if (!badge?.criteria) return false;
  const rawCriteria = String(badge.criteria || '').trim().toLowerCase();
  // Strip commas from numbers like "1,000 XP" or "2,500 XP"
  const criteria = rawCriteria.replace(/,/g, '');

  // 1. Streak-based criteria (e.g. "3-Day Streak", "7-Day Streak", "14-Day Streak", "30-Day Streak", "100-Day Streak")
  if (criteria.includes('streak')) {
    const match = criteria.match(/\d+/);
    const requiredStreak = match ? parseInt(match[0], 10) : 10;
    const currentStreak = Number(user?.streak ?? 0);
    return currentStreak >= requiredStreak;
  }

  // 2. Score / Assessment / Quiz criteria (e.g. "85% Score", "90% Score", "95% Score", "100% Perfect Score")
  if (criteria.includes('score') || criteria.includes('assessment') || criteria.includes('quiz') || criteria.includes('test')) {
    const scoreMatch = criteria.match(/(\d+)%/);
    const requiredScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 70;
    
    // Check both assessment attempts and quiz attempts for score >= requiredScore
    const allAttempts = [
      ...(assignmentSubmissions || []),
      ...(extraData?.quizAttempts || [])
    ];
    return allAttempts.some((a: any) => {
      const s = Number(a?.score ?? a?.grade ?? 0);
      return s >= requiredScore;
    });
  }

  // 3. Project Milestone criteria (MUST be evaluated before general coding problems!)
  // e.g. "1 Project Completed", "2 Projects Completed", "Capstone Project Approved"
  if (criteria.includes('project') || criteria.includes('capstone') || criteria.includes('portfolio') || criteria.includes('build')) {
    const localLinks = extraData?.projectLinks || (() => {
      try { return JSON.parse(localStorage.getItem('projectDriveLinks') || '{}'); } catch { return {}; }
    })();

    const submittedProjectIds = new Set<string>();
    // From practice_submissions
    (submissions || []).forEach((s: any) => {
      if (s.language === 'project' || String(s.problem_id || '').startsWith('proj-')) {
        submittedProjectIds.add(String(s.problem_id));
      }
    });
    // From drive links in localStorage
    Object.keys(localLinks).forEach((pid) => {
      if (localLinks[pid]) submittedProjectIds.add(pid);
    });

    if (criteria.includes('capstone')) {
      const hasCapstone = (extraData?.projectsList || []).some((p: any) => {
        const isCap = (p.project_type || p.type || '').toLowerCase() === 'capstone' ||
                      String(p.title || '').toLowerCase().includes('capstone');
        return isCap && submittedProjectIds.has(String(p.id));
      });
      return hasCapstone || submittedProjectIds.size >= 3;
    }

    const match = criteria.match(/\d+/);
    const requiredProjects = match ? parseInt(match[0], 10) : 1;
    return submittedProjectIds.size >= requiredProjects;
  }

  // 4. Coding & Practice Problem criteria
  // e.g. "1 Coding Problems Solved", "10 Problems", "25 Coding Problems Solved", "50 Problems", "100 Problems"
  if (criteria.includes('problem') || criteria.includes('coding') || criteria.includes('solve')) {
    const match = criteria.match(/\d+/);
    const requiredCount = match ? parseInt(match[0], 10) : 5;
    // Coding problems (exclude projects)
    const uniqueSolved = new Set(
      (submissions || [])
        .filter((s: any) => s.status === 'solved' && s.language !== 'project')
        .map((s: any) => s.problem_id)
    ).size;
    return uniqueSolved >= requiredCount;
  }

  // 5. Course Completion / Progress criteria
  // e.g. "25% Progress", "50% Progress", "75% Progress", "100% Course Completion"
  if (criteria.includes('completion') || criteria.includes('progress') || criteria.includes('complete')) {
    const match = criteria.match(/\d+/);
    const requiredProgress = match ? parseInt(match[0], 10) : 100;
    const maxCourseProg = Math.max(
      Number(user?.progress || 0),
      ...Object.values(user?.courseProgress || {}).map(Number)
    );
    return maxCourseProg >= requiredProgress;
  }

  // 6. Attendance criteria
  // e.g. "85% Attendance", "90% Attendance", "100% Perfect Attendance"
  if (criteria.includes('attendance') || criteria.includes('attend')) {
    const match = criteria.match(/\d+/);
    const requiredAttendance = match ? parseInt(match[0], 10) : 75;
    if (user?.attendanceStats && user.attendanceStats.totalSessions === 0) {
      return false;
    }
    const attendanceVal = Number(user?.attendancePercentage ?? user?.attendanceStats?.percentage ?? user?.attendance ?? 0);
    return attendanceVal >= requiredAttendance;
  }

  // 7. XP Points criteria
  // e.g. "100 XP", "250 XP", "500 XP", "1,000 XP", "2,500 XP", "5,000 XP", "7500 XP Points", "10000 XP Points"
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
  if (!studentId || studentId === 'guest') return [];
  return cachedQuery(`certificates:${studentId}`, async () => {
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
  }, 60_000); // 60 seconds
}

// ════════════════════════════════════════════════════════════════
// REWARDS
// ════════════════════════════════════════════════════════════════

export async function fetchRewards() {
  return cachedQuery('rewards', async () => {
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
  }, 60_000); // 60 seconds
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
  invalidateCache(`reward_claims:${claim.student_id}`);
  return data;
}

export async function fetchRewardClaims(studentId: string) {
  if (!studentId || studentId === 'guest') return [];
  return cachedQuery(`reward_claims:${studentId}`, async () => {
    const { data, error } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching reward claims:', error);
      return [];
    }
    return data || [];
  }, 30_000); // 30 seconds
}

// ════════════════════════════════════════════════════════════════
// LEADERBOARD (uses students table)
// ════════════════════════════════════════════════════════════════

export async function fetchLeaderboard() {
  return cachedQuery('leaderboard', async () => {
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
  }, 120_000); // 2 minutes (Realtime provides instant invalidation on updates)
}

// ════════════════════════════════════════════════════════════════
// XP & STREAK MANAGEMENT
// ════════════════════════════════════════════════════════════════

export async function incrementUserXP(
  userId: string,
  amount: number
): Promise<{ success: boolean; newXp?: number; error?: string }> {
  if (!userId || userId === 'guest' || !amount || amount <= 0) {
    return { success: false, error: 'invalid_parameters' };
  }

  // 1. Primary: Atomic database increment via SECURITY DEFINER RPC
  try {
    const { data: newXp, error: rpcError } = await supabase.rpc('increment_student_xp', {
      p_student_id: userId,
      p_amount: Math.round(amount),
    });

    if (!rpcError) {
      invalidateCache(`student_profile:${userId}`);
      return { success: true, newXp: Number(newXp) };
    }
    console.warn('XP RPC increment failed, trying fallback:', rpcError.code || 'rpc_error');
  } catch (err: any) {
    console.warn('XP RPC increment exception, trying fallback:', err?.code || 'rpc_exception');
  }

  // 2. Fallback: Read-modify-write to preserve existing XP progression reliability
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('student_profiles')
      .select('xp')
      .eq('student_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching student profile for XP increment:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const currentXp = profile?.xp ?? 0;
    const newXp = currentXp + Math.round(amount);

    const { error: updateError } = await supabase
      .from('student_profiles')
      .update({ xp: newXp })
      .eq('student_id', userId);

    if (updateError) {
      console.error('Error updating student profile XP:', updateError);
      return { success: false, error: updateError.message };
    }

    invalidateCache(`student_profile:${userId}`);
    return { success: true, newXp };
  } catch (err: any) {
    return { success: false, error: err?.message || 'fallback_failed' };
  }
}

export async function decrementUserXP(
  userId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  if (!userId || userId === 'guest' || !amount || amount <= 0) {
    return { success: false, error: 'invalid_parameters' };
  }

  // 1. Primary: Atomic database decrement via SECURITY DEFINER RPC
  try {
    const { error: rpcError } = await supabase.rpc('decrement_student_xp', {
      p_student_id: userId,
      p_amount: Math.round(amount),
    });

    if (!rpcError) {
      invalidateCache(`student_profile:${userId}`);
      return { success: true };
    }
    console.warn('XP RPC decrement failed, trying fallback:', rpcError.code || 'rpc_error');
  } catch (err: any) {
    console.warn('XP RPC decrement exception, trying fallback:', err?.code || 'rpc_exception');
  }

  // 2. Fallback: Read-modify-write with 0 lower bound
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('student_profiles')
      .select('xp')
      .eq('student_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching student profile for XP decrement:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const currentXp = profile?.xp ?? 0;
    const newXp = Math.max(0, currentXp - Math.round(amount));

    const { error: updateError } = await supabase
      .from('student_profiles')
      .update({ xp: newXp })
      .eq('student_id', userId);

    if (updateError) {
      console.error('Error updating student profile XP:', updateError);
      return { success: false, error: updateError.message };
    }

    invalidateCache(`student_profile:${userId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'fallback_failed' };
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
  if (!userId || userId === 'guest') return currentStreak ?? 0;

  // 1. Primary Path: Fast atomic single-roundtrip database RPC (F-30)
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const { data, error } = await supabase.rpc('calculate_user_streak', {
      p_user_id: userId,
      p_is_weekday: isWeekdayParam ?? null,
      p_client_date: todayStr,
    });

    if (!error && typeof data === 'number') {
      return data;
    }
    if (error) {
      console.warn('Database streak RPC failed, falling back to client-side calculation:', error.message);
    }
  } catch (rpcErr) {
    console.warn('Streak RPC exception, falling back to client-side calculation:', rpcErr);
  }

  // 2. Resilient Fallback Path: Client-side calculation (preserves existing behavior)
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

    // Bound historical data query to 90 days to prevent unbounded egress and memory bloat
    const cutoffDate = new Date(Date.now() - 90 * 86400000).toISOString();

    const { data: practiceData, error: practiceError } = await supabase
      .from('practice_submissions')
      .select('submitted_at')
      .eq('student_id', userId)
      .gte('submitted_at', cutoffDate)
      .order('submitted_at', { ascending: false })
      .limit(100);

    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessment_attempts')
      .select('submitted_at')
      .eq('student_id', userId)
      .gte('submitted_at', cutoffDate)
      .order('submitted_at', { ascending: false })
      .limit(100);

    const { data: quizData, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('attempted_at')
      .eq('user_id', userId)
      .gte('attempted_at', cutoffDate)
      .order('attempted_at', { ascending: false })
      .limit(100);

    // Lesson/recording completions also count toward the streak
    const { data: lessonData, error: lessonError } = await supabase
      .from('lesson_progress')
      .select('updated_at')
      .eq('student_id', userId)
      .eq('completed', true)
      .gte('updated_at', cutoffDate)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (practiceError) console.error('Error fetching practice submissions for streak:', practiceError);
    if (assessmentError) console.error('Error fetching assessment attempts for streak:', assessmentError);
    if (quizError) console.error('Error fetching quiz attempts for streak:', quizError);
    if (lessonError) console.error('Error fetching lesson progress for streak:', lessonError);

    const allDates = new Set<string>();

    const addLocalDates = (items: any[]) => {
      (items || []).forEach(item => {
        const dateVal = item.submitted_at || item.attempted_at || item.completed_at || item.updated_at || item.created_at;
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
    addLocalDates(lessonData || []);

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
