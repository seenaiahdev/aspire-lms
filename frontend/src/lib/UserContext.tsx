import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, AttendanceStats } from '@/types';
import {
  fetchStudentByPhone,
  fetchBatchCategory,
  fetchStudentProfile,
  fetchUserSubmissions,
  fetchAssignmentAttempts,
  courseTargetsBatch,
  computeCourseProgress,
  issueCertificateIfComplete,
  recalculateUserStreak,
  isWeekdayBatchUser,
  fetchStudentAttendanceStats,
  invalidateAttendanceCache
} from '@/lib/api';
import { invalidateCache } from './queryCache';
import { hasValidSession } from '@/lib/nav';
import { supabase } from './supabase';

const initialUser: ExtendedUser = {
  id: 'guest',
  name: 'New Student',
  email: 'student@aspirenext.edu',
  avatar: '',
  role: 'Student',
  program: "Bachelor's Degree",
  college: '',
  startYear: 2023,
  endYear: 2027,
  joinedDate: 'Aug 2026',
  xp: 0,
  level: 1,
  streak: 0,
  rank: 120,
  bio: 'No biography set yet. Go to Settings to introduce yourself!',
  skills: [],
  socials: [
    { label: 'GitHub', value: 'Not connected' },
    { label: 'LinkedIn', value: 'Not connected' },
    { label: 'Portfolio', value: 'Not connected' },
  ],
  courseProgress: {},
};


export interface MilestoneLockRecord {
  id: string;
  course_id?: string | null;
  stage_id?: string | null;
  module_id?: string | null;
  lesson_id: string;
  batch_code?: string | null;
  is_locked: boolean;
  unlock_datetime?: string | null;
  updated_at?: string | null;
  isUnlocked: boolean;
  unlockedAtMs: number;
}

interface ExtendedUser extends User {
  batchCode?: string;
  batchCategory?: 'Weekday' | 'Weekend';
  mobile?: string;
  gpa?: number;
  attendance?: number;
  attendancePercentage?: number;
  attendanceStats?: AttendanceStats;
  progress?: number;
  status?: string;
  registrationId?: string;
  enrolledCourses?: string[];
  courseProgress?: Record<string, number>;
  unlockedLessonIds?: string[];
  milestoneLocks?: MilestoneLockRecord[];
  locksLoaded?: boolean;
  notifPrefs?: { assignments: boolean; live: boolean; placement: boolean; weekly: boolean };
}

function buildBatchTargets(resolvedBatch?: string, studentBatch?: string, batchCategory?: string) {
  const preferredBatches = Array.from(
    new Set([resolvedBatch, studentBatch].map((b) => String(b || '').trim()).filter(Boolean))
  );
  const allTargets = Array.from(
    new Set([
      ...preferredBatches,
      'ALL',
      'All Batches',
      batchCategory,
      batchCategory ? `${batchCategory} Batch` : '',
    ].map((b) => String(b || '').trim()).filter(Boolean))
  );
  return { preferredBatches, allTargets };
}

function locksSignature(records: MilestoneLockRecord[]): string {
  return records
    .map((r) => `${r.id}:${r.lesson_id}:${r.module_id || ''}:${r.isUnlocked ? 1 : 0}:${r.unlockedAtMs}`)
    .sort()
    .join('|');
}

async function fetchResolvedMilestoneLocks(
  allTargets: string[],
  preferredBatches: string[]
): Promise<{
  unlockedLessonIds: string[];
  milestoneLocks: MilestoneLockRecord[];
  nextScheduledUnlockMs: number | null;
}> {
  if (allTargets.length === 0) {
    return { unlockedLessonIds: [], milestoneLocks: [], nextScheduledUnlockMs: null };
  }

  const { data: locks, error } = await supabase
    .from('milestone_locks')
    .select('id, course_id, stage_id, module_id, lesson_id, batch_code, is_locked, unlock_datetime, updated_at')
    .in('batch_code', allTargets);

  if (error || !locks) {
    throw error || new Error('Failed to fetch milestone locks');
  }

  const preferredSet = new Set(preferredBatches.map((b) => b.toLowerCase()));
  const deduped = new Map<string, any>();

  for (const row of locks) {
    const key = row.lesson_id ? `lesson:${row.lesson_id}` : (row.module_id ? `mod:${row.module_id}` : `row:${row.id}`);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, row);
      continue;
    }
    const rowIsPreferred = preferredSet.has(String(row.batch_code || '').trim().toLowerCase());
    const existingIsPreferred = preferredSet.has(String(existing.batch_code || '').trim().toLowerCase());
    if (rowIsPreferred && !existingIsPreferred) {
      deduped.set(key, row);
    } else if (rowIsPreferred === existingIsPreferred) {
      const rowUpd = row.updated_at ? Date.parse(row.updated_at) || 0 : 0;
      const exUpd = existing.updated_at ? Date.parse(existing.updated_at) || 0 : 0;
      if (rowUpd > exUpd) {
        deduped.set(key, row);
      }
    }
  }

  const nowMs = Date.now();
  let nextScheduledUnlockMs: number | null = null;

  const milestoneLocks: MilestoneLockRecord[] = Array.from(deduped.values()).map((l: any) => {
    const unlockDtMs = l.unlock_datetime ? Date.parse(l.unlock_datetime) : NaN;
    const hasValidDt = !Number.isNaN(unlockDtMs);
    const isUnlocked = hasValidDt ? unlockDtMs <= nowMs : !l.is_locked;
    const updatedAtMs = l.updated_at ? Date.parse(l.updated_at) : NaN;
    const unlockedAtMs = isUnlocked
      ? Math.max(hasValidDt ? unlockDtMs : 0, !Number.isNaN(updatedAtMs) ? updatedAtMs : 0)
      : 0;

    if (!isUnlocked && hasValidDt && unlockDtMs > nowMs) {
      if (nextScheduledUnlockMs === null || unlockDtMs < nextScheduledUnlockMs) {
        nextScheduledUnlockMs = unlockDtMs;
      }
    }

    return {
      id: l.id,
      course_id: l.course_id,
      stage_id: l.stage_id,
      module_id: l.module_id,
      lesson_id: l.lesson_id,
      batch_code: l.batch_code,
      is_locked: Boolean(l.is_locked),
      unlock_datetime: l.unlock_datetime,
      updated_at: l.updated_at,
      isUnlocked,
      unlockedAtMs,
    };
  });

  const unlockedLessonIds = milestoneLocks
    .filter((r) => r.isUnlocked && r.lesson_id)
    .map((r) => r.lesson_id);

  return { unlockedLessonIds, milestoneLocks, nextScheduledUnlockMs };
}

interface UserContextType {
  user: ExtendedUser;
  setUser: React.Dispatch<React.SetStateAction<ExtendedUser>>;
  updateUser: (updates: Partial<ExtendedUser>) => void;
  refetchUser: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser>(() => {
    if (!hasValidSession()) {
      return initialUser;
    }
    const cached = localStorage.getItem('aspire_cached_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { ...parsed, locksLoaded: false };
      } catch (e) {
        return initialUser;
      }
    }
    return initialUser;
  });
  const [loading, setLoading] = useState(() => {
    if (!hasValidSession()) return false;
    const cached = localStorage.getItem('aspire_cached_user');
    return !cached;
  });

  const userRef = useRef(user);
  userRef.current = user;
  const scheduledUnlockTimerRef = useRef<any>(null);
  const syncMilestoneLocksRef = useRef<() => Promise<void>>(async () => {});

  const scheduleExactUnlockCheck = useCallback((nextUnlockMs: number | null) => {
    if (scheduledUnlockTimerRef.current) {
      clearTimeout(scheduledUnlockTimerRef.current);
      scheduledUnlockTimerRef.current = null;
    }
    if (!nextUnlockMs) return;
    const delay = nextUnlockMs - Date.now() + 300;
    // Cap at 24h to stay well inside 32-bit setTimeout range
    if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
      scheduledUnlockTimerRef.current = setTimeout(() => {
        syncMilestoneLocksRef.current();
      }, delay);
    }
  }, []);

  const refetchUser = useCallback(async () => {
    const loggedInMobile = localStorage.getItem('aspire_logged_in_mobile');
    const isLoggedIn = hasValidSession();

    if (isLoggedIn && loggedInMobile) {
      const cached = localStorage.getItem('aspire_cached_user');
      if (!cached) {
        setLoading(true);
      }
      try {
        const student = await fetchStudentByPhone(loggedInMobile);
        if (student) {
          const dbCat = await fetchBatchCategory(student.batch);
          const regUpper = String(student.registration_id || '').toUpperCase();
          const batchUpper = String(student.batch || '').toUpperCase();

          let resolvedCategory: 'Weekday' | 'Weekend' = dbCat || 'Weekday';
          if (regUpper.startsWith('A26S') || regUpper.includes('S0') || batchUpper.includes('S')) {
            resolvedCategory = 'Weekend';
          } else if (regUpper.startsWith('A26W') || regUpper.includes('W0') || batchUpper.includes('W')) {
            resolvedCategory = 'Weekday';
          }

          let resolvedBatch = student.batch;
          if (regUpper.startsWith('A26S') && (!resolvedBatch || resolvedBatch.toUpperCase().includes('W'))) {
            resolvedBatch = 'A26S1';
          } else if (regUpper.startsWith('A26W') && (!resolvedBatch || resolvedBatch.toUpperCase().includes('S'))) {
            resolvedBatch = 'A26W1';
          }

          const batchCategory = resolvedCategory;
          const profile = await fetchStudentProfile(student.id);

          // Effective course set = the student's enrolled_courses UNION every course RELEASED to their
          // batch (courses.target_batch = "All Batches" / category / their batch code). Admin releases
          // courses by batch, so MyLearning (and all content keyed off enrolledCourses) must include them.
          let effectiveCourses: string[] = [...(student.enrolled_courses || [])];
          const courseTitleById: Record<string, string> = {};
          try {
            const { data: allCourses } = await supabase
              .from('courses')
              .select('id, title, target_batch, publish_status');
            (allCourses || []).forEach((c: any) => { courseTitleById[c.id] = c.title; });
            const validCourseIds = new Set((allCourses || []).map((c: any) => c.id));
            const released = (allCourses || [])
              .filter((c: any) => {
                const pub = String(c.publish_status || '').toLowerCase();
                const isPublished = !pub || pub.includes('publish');
                return isPublished && courseTargetsBatch(c.target_batch, student.batch, batchCategory || undefined);
              })
              .map((c: any) => c.id);
            effectiveCourses = Array.from(new Set([...effectiveCourses, ...released]));
            if (validCourseIds.size > 0) {
              effectiveCourses = effectiveCourses.filter((cid) => validCourseIds.has(cid));
            }
          } catch (e) {
            console.warn('Failed to load batch-released courses:', e);
          }

          // Keep enrolledCourses array reference stable if IDs didn't change
          const prevEnrolled = userRef.current?.enrolledCourses || [];
          const coursesUnchanged = prevEnrolled.length === effectiveCourses.length &&
            effectiveCourses.every((c, i) => c === prevEnrolled[i]);
          const stableEnrolledCourses = coursesUnchanged ? prevEnrolled : effectiveCourses;

          // Compute REAL course progress from coursework completions (there is no other progress source).
          // Run all courses CONCURRENTLY (was a serial await-in-loop → ~9×K queries in series on every
          // login and every realtime tick). Promise.all overlaps the round-trips; a per-course failure
          // keeps the previously known value instead of aborting the batch.
          const newCourseProgress: Record<string, number> = { ...(profile?.course_progress || {}) };
          const progressPairs = await Promise.all(
            effectiveCourses.map(async (cid): Promise<[string, number]> => {
              try { return [cid, await computeCourseProgress(student.id, cid, student.registration_id)]; }
              catch { return [cid, newCourseProgress[cid] ?? 0]; }
            })
          );
          for (const [cid, pct] of progressPairs) newCourseProgress[cid] = pct;
          const primaryPct = effectiveCourses.length ? (newCourseProgress[effectiveCourses[0]] ?? 0) : (profile?.progress ?? 0);

          // Persist only when progress actually changed (avoids an infinite student_profiles realtime loop).
          const prevProgress = Number(profile?.progress ?? 0);
          if (prevProgress !== primaryPct && student.id && student.id !== 'guest') {
            try {
              await supabase.from('student_profiles')
                .update({ progress: primaryPct })
                .eq('student_id', student.id);
            } catch (e) { console.warn('Failed to persist course progress:', e); }
          }
          // Auto-issue a certificate for any course that is now 100% complete.
          for (const cid of effectiveCourses) {
            if (newCourseProgress[cid] === 100) {
              issueCertificateIfComplete(student.id, cid, courseTitleById[cid] || 'Course Certificate');
            }
          }

          const realProgress = primaryPct;
          const isWeekday = isWeekdayBatchUser({
            batchCategory,
            batch: student.batch,
            registration_id: student.registration_id,
          });

          let realStreak = Number(profile?.attendance ?? (profile as any)?.streak ?? (student as any)?.streak ?? (student as any)?.attendance ?? 0);
          if (student.id && student.id !== 'guest') {
            try {
              realStreak = await recalculateUserStreak(student.id, realStreak, isWeekday);
            } catch (streakErr) {
              console.warn('Streak recalculation on login skipped:', streakErr);
            }
          }
          const realGpa = profile?.gpa ?? 0.00;

          let unlockedLessonIds: string[] = [];
          let milestoneLocks: MilestoneLockRecord[] = [];
          let locksLoaded = false;
          try {
            const { preferredBatches, allTargets } = buildBatchTargets(resolvedBatch, student.batch, resolvedCategory);
            const resolvedLocks = await fetchResolvedMilestoneLocks(allTargets, preferredBatches);
            unlockedLessonIds = resolvedLocks.unlockedLessonIds;
            milestoneLocks = resolvedLocks.milestoneLocks;
            locksLoaded = true;
            scheduleExactUnlockCheck(resolvedLocks.nextScheduledUnlockMs);
          } catch (lockErr) {
            console.warn('Failed to fetch milestone locks:', lockErr);
          }

          // Newly-unlocked lessons are detected in NotificationsContext (which watches
          // user.unlockedLessonIds) so notifications are generated in one place.

          const realXp = Number(profile?.xp ?? (student as any)?.xp ?? 0);

          let attendanceStats: AttendanceStats = {
            percentage: 0,
            presentCount: 0,
            absentCount: 0,
            totalSessions: 0,
            records: [],
          };
          if (student.id && student.id !== 'guest') {
            try {
              attendanceStats = await fetchStudentAttendanceStats(student.id, resolvedBatch || student.batch, student.registration_id);
            } catch (attErr) {
              console.warn('Attendance calculation skipped:', attErr);
            }
          }

          const updatedUser = {
            id: student.id,
            name: student.name,
            email: student.email,
            avatar: student.avatar || '',
            role: 'Student',
            program: profile?.program || "Bachelor's Degree",
            college: profile?.college || '',
            startYear: profile?.start_year || undefined,
            endYear: profile?.end_year || undefined,
            joinedDate: student.joined_date || 'Jan 2026',
            xp: realXp,
            level: Math.floor(realXp / 500) + 1,
            streak: realStreak,
            rank: realGpa,
            bio: profile?.bio || '',
            skills: profile?.skills || [],
            socials: profile?.socials || [
              { label: 'GitHub', value: 'Not connected' },
              { label: 'LinkedIn', value: 'Not connected' },
              { label: 'Portfolio', value: 'Not connected' },
            ],
            batchCode: resolvedBatch || student.batch,
            batchCategory: resolvedCategory,
            mobile: loggedInMobile,
            gpa: realGpa,
            attendance: attendanceStats.percentage,
            attendancePercentage: attendanceStats.percentage,
            attendanceStats: attendanceStats,
            progress: realProgress,
            status: student.status,
            registrationId: student.registration_id,
            enrolledCourses: stableEnrolledCourses,
            courseProgress: newCourseProgress,
            unlockedLessonIds: unlockedLessonIds,
            milestoneLocks: milestoneLocks,
            locksLoaded: locksLoaded,
            notifPrefs: {
              assignments: profile?.notif_assignments ?? true,
              live: profile?.notif_live ?? true,
              placement: profile?.notif_placement ?? true,
              weekly: profile?.notif_weekly ?? true,
            },
          };

          setUser(updatedUser);
          try {
            const { locksLoaded: _omitLocksLoaded, ...cacheableUser } = updatedUser;
            localStorage.setItem('aspire_cached_user', JSON.stringify(cacheableUser));
          } catch {}
        }
      } catch (e) {
        console.error('Failed to load user from Supabase:', e);
      } finally {
        setLoading(false);
      }
    } else {
      setUser(initialUser);
      localStorage.removeItem('aspire_cached_user');
      setLoading(false);
    }
  }, []);



  const syncMilestoneLocks = useCallback(async () => {
    const curr = userRef.current;
    if (!curr || !curr.id || curr.id === 'guest' || !hasValidSession()) return;
    try {
      const { preferredBatches, allTargets } = buildBatchTargets(curr.batchCode, curr.batchCode, curr.batchCategory);
      const { unlockedLessonIds, milestoneLocks, nextScheduledUnlockMs } = await fetchResolvedMilestoneLocks(allTargets, preferredBatches);
      scheduleExactUnlockCheck(nextScheduledUnlockMs);

      const prevSig = locksSignature(curr.milestoneLocks || []);
      const nextSig = locksSignature(milestoneLocks);
      if (!curr.locksLoaded || prevSig !== nextSig) {
        setUser((prev) => {
          if (!prev || prev.id !== curr.id) return prev;
          const updated = {
            ...prev,
            unlockedLessonIds,
            milestoneLocks,
            locksLoaded: true,
          };
          try {
            const { locksLoaded: _omit, ...cacheable } = updated;
            localStorage.setItem('aspire_cached_user', JSON.stringify(cacheable));
          } catch {}
          return updated;
        });
      }
    } catch (err) {
      console.warn('Lightweight milestone lock sync failed:', err);
    }
  }, [scheduleExactUnlockCheck]);

  syncMilestoneLocksRef.current = syncMilestoneLocks;

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  useEffect(() => {
    const sid = user?.id;
    const loggedInMobile = localStorage.getItem('aspire_logged_in_mobile');
    const isLoggedIn = hasValidSession();

    if (sid && sid !== 'guest' && isLoggedIn && loggedInMobile) {
      const cleanPhone = loggedInMobile.replace(/\D/g, '').slice(-10);

      // Shared debounced full refetch for cascading progress calculations
      let progressTimer: any = null;
      const bumpProgress = () => {
        if (progressTimer) clearTimeout(progressTimer);
        progressTimer = setTimeout(() => refetchUser(), 600);
      };

      const ts = Date.now();

      // Consolidate all user and progress realtime subscriptions into ONE multiplexed WebSocket channel
      const userChannel = supabase.channel(`user_multiplexed_${ts}`);

      // 1. students table: Realtime changes (catches enrollment, direct XP/streak on students row)
      userChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        (payload) => {
          const newRow = payload.new || {};
          const sid = userRef.current?.id;
          const regId = userRef.current?.registrationId;
          const cleanPayloadPhone = newRow.mobile_number ? newRow.mobile_number.replace(/\D/g, '').slice(-10) : '';
          const cleanUserPhone = userRef.current?.mobile ? userRef.current.mobile.replace(/\D/g, '').slice(-10) : cleanPhone;

          const matchesId = sid && (newRow.id === sid || newRow.registration_id === sid);
          const matchesReg = regId && (newRow.id === regId || newRow.registration_id === regId);
          const matchesPhone = cleanUserPhone && cleanPayloadPhone && cleanUserPhone === cleanPayloadPhone;

          if (matchesId || matchesReg || matchesPhone) {
            console.log('Real-time students table updated:', newRow);
            if (newRow.xp !== undefined || newRow.streak !== undefined || newRow.attendance !== undefined) {
              setUser((prev) => {
                const nextXp = newRow.xp !== undefined ? Number(newRow.xp) : prev.xp;
                const nextStreak = newRow.streak !== undefined ? Number(newRow.streak) : prev.streak;
                const nextAttendance = newRow.attendance !== undefined ? Number(newRow.attendance) : prev.attendance;
                const updated = {
                  ...prev,
                  xp: nextXp,
                  level: Math.floor(nextXp / 500) + 1,
                  streak: nextStreak,
                  attendance: nextAttendance,
                };
                try { localStorage.setItem('aspire_cached_user', JSON.stringify(updated)); } catch {}
                return updated;
              });
            }
            bumpProgress();
          }
        }
      );

      // 2. student_profiles table: Realtime changes (catches XP, streak/attendance, bio, etc.)
      userChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_profiles'
        },
        (payload) => {
          const newRow = payload.new || {};
          const sid = userRef.current?.id;
          const regId = userRef.current?.registrationId;
          const targetId = newRow.student_id || newRow.id;

          if (sid && (targetId === sid || targetId === regId)) {
            const curr = userRef.current;
            const nextXp = newRow.xp !== undefined ? Number(newRow.xp) : curr?.xp;
            const nextStreak = newRow.streak !== undefined 
              ? Number(newRow.streak) 
              : (newRow.attendance !== undefined ? Number(newRow.attendance) : curr?.streak);
            const nextAttendance = newRow.attendance !== undefined ? Number(newRow.attendance) : curr?.attendance;
            const nextProgress = newRow.progress !== undefined ? Number(newRow.progress) : curr?.progress;
            const nextGpa = newRow.gpa !== undefined ? Number(newRow.gpa) : curr?.gpa;

            const hasChanged = curr && (
              (newRow.xp !== undefined && nextXp !== curr.xp) ||
              (newRow.attendance !== undefined && nextAttendance !== curr.attendance) ||
              (nextStreak !== curr.streak) ||
              (newRow.progress !== undefined && nextProgress !== curr.progress) ||
              (newRow.gpa !== undefined && nextGpa !== curr.gpa)
            );

            if (hasChanged) {
              console.log('Real-time student_profiles updated:', newRow);
              setUser((prev) => {
                const updated = {
                  ...prev,
                  xp: nextXp,
                  level: Math.floor(nextXp / 500) + 1,
                  streak: nextStreak,
                  attendance: nextAttendance,
                  progress: nextProgress,
                  gpa: nextGpa,
                  rank: nextGpa,
                };
                try { localStorage.setItem('aspire_cached_user', JSON.stringify(updated)); } catch {}
                return updated;
              });
              bumpProgress();
            }
          }
        }
      );

      let lockTimer: any = null;
      const bumpLocks = () => {
        if (lockTimer) clearTimeout(lockTimer);
        lockTimer = setTimeout(() => {
          syncMilestoneLocks();
        }, 250);
      };

      // 3. Milestone locks (listen to all changes so admin lock/unlock triggers immediate sync)
      userChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestone_locks'
        },
        () => {
          bumpLocks();
        }
      );

      // 3b. New lessons/modules added to an unlocked curriculum also trigger lock sync
      ['course_lessons', 'course_topics'].forEach((table) => {
        userChannel.on('postgres_changes', { event: '*', schema: 'public', table }, bumpLocks);
      });

      // 4. Courses
      userChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        () => {
          bumpProgress();
        }
      );

      const invalidateCourseworkCache = (sid?: string) => {
        if (!sid) return;
        invalidateCache(`student_lp:${sid}`);
        invalidateCache(`student_lp_set:${sid}`);
        invalidateCache(`student_aa:${sid}`);
        invalidateCache(`student_aa_full:${sid}`);
        invalidateCache(`student_qa:${sid}`);
        invalidateCache(`student_qa_full:${sid}`);
        invalidateCache(`student_ps:${sid}`);
        invalidateCache(`student_ps_full:${sid}`);
      };

      // 5. Coursework completions & lesson progress
      userChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_attempts' }, (payload) => {
          const sid = userRef.current?.id;
          const regId = userRef.current?.registrationId;
          const targetId = (payload.new as any)?.student_id || (payload.old as any)?.student_id;
          if (!targetId || targetId === sid || targetId === regId) {
            invalidateCourseworkCache(sid);
            bumpProgress();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts' }, (payload) => {
          const sid = userRef.current?.id;
          const regId = userRef.current?.registrationId;
          const targetId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
          if (!targetId || targetId === sid || targetId === regId) {
            invalidateCourseworkCache(sid);
            bumpProgress();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_submissions' }, (payload) => {
          const sid = userRef.current?.id;
          const regId = userRef.current?.registrationId;
          const targetId = (payload.new as any)?.student_id || (payload.old as any)?.student_id;
          if (!targetId || targetId === sid || targetId === regId) {
            invalidateCourseworkCache(sid);
            bumpProgress();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress' }, (payload) => {
          const sid = userRef.current?.id;
          const regId = userRef.current?.registrationId;
          const targetId = (payload.new as any)?.student_id || (payload.old as any)?.student_id;
          if (!targetId || targetId === sid || targetId === regId) {
            invalidateCourseworkCache(sid);
            bumpProgress();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          const sid = userRef.current?.id;
          const regId = userRef.current?.registrationId;
          const batch = userRef.current?.batchCode;
          const isRelevant = !sid || !newRow?.student_id ||
            newRow?.student_id === sid ||
            oldRow?.student_id === sid ||
            (regId && (newRow?.student_id === regId || oldRow?.student_id === regId)) ||
            (batch && (newRow?.batch_code === batch || oldRow?.batch_code === batch));

          if (isRelevant) {
            invalidateAttendanceCache(sid);
            invalidateAttendanceCache();
            bumpProgress();
          }
        });

      ['assessments', 'quizzes', 'coding_questions', 'projects'].forEach((table) => {
        userChannel.on('postgres_changes', { event: '*', schema: 'public', table }, bumpProgress);
      });

      userChannel.subscribe();

      // 6. Window focus & visibility change: instant resync when user returns from DB editor / another tab
      const onSyncCheck = () => {
        if (document.visibilityState === 'visible') {
          invalidateCourseworkCache(userRef.current?.id);
          invalidateAttendanceCache();
          syncMilestoneLocks();
          refetchUser();
        }
      };
      window.addEventListener('focus', onSyncCheck);
      document.addEventListener('visibilitychange', onSyncCheck);

      // 7a. Lightweight milestone lock poll every 10s (covers both scheduled unlocks and DBs without realtime on milestone_locks)
      const lockPollInterval = setInterval(() => {
        syncMilestoneLocks();
      }, 10000);

      // 7b. Periodic full resync (every 60s)
      const scheduleInterval = setInterval(() => {
        refetchUser();
      }, 60000);

      return () => {
        supabase.removeChannel(userChannel);
        if (progressTimer) clearTimeout(progressTimer);
        if (lockTimer) clearTimeout(lockTimer);
        if (scheduledUnlockTimerRef.current) {
          clearTimeout(scheduledUnlockTimerRef.current);
          scheduledUnlockTimerRef.current = null;
        }
        clearInterval(lockPollInterval);
        clearInterval(scheduleInterval);
        window.removeEventListener('focus', onSyncCheck);
        document.removeEventListener('visibilitychange', onSyncCheck);
      };
    }
  }, [refetchUser, syncMilestoneLocks, user?.id, user?.batchCode, user?.batchCategory]);

  const updateUser = (updates: Partial<ExtendedUser>) => {
    setUser((prevUser) => {
      const updated = {
        ...prevUser,
        ...updates,
      };
      localStorage.setItem('aspire_cached_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUser, refetchUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
