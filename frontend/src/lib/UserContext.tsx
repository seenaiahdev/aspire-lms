import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User } from '@/types';
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
  isWeekdayBatchUser
} from '@/lib/api';
import { supabase } from './supabase';

const initialUser: ExtendedUser = {
  id: 'guest',
  name: 'New Student',
  email: 'student@aspirenext.edu',
  avatar: '',
  role: 'Student',
  program: 'Engineering Degree',
  college: 'IIT Hyderabad',
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


interface ExtendedUser extends User {
  batchCode?: string;
  batchCategory?: 'Weekday' | 'Weekend';
  mobile?: string;
  gpa?: number;
  attendance?: number;
  progress?: number;
  status?: string;
  registrationId?: string;
  enrolledCourses?: string[];
  courseProgress?: Record<string, number>;
  unlockedLessonIds?: string[];
  notifPrefs?: { assignments: boolean; live: boolean; placement: boolean; weekly: boolean };
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
    const cached = localStorage.getItem('aspire_cached_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return initialUser;
      }
    }
    return initialUser;
  });
  const [loading, setLoading] = useState(() => {
    const cached = localStorage.getItem('aspire_cached_user');
    return !cached;
  });

  const refetchUser = useCallback(async () => {
    const loggedInMobile = localStorage.getItem('aspire_logged_in_mobile');
    const isLoggedIn = localStorage.getItem('aspire_logged_in') === 'true';

    if (isLoggedIn && loggedInMobile) {
      const cached = localStorage.getItem('aspire_cached_user');
      if (!cached) {
        setLoading(true);
      }
      try {
        const student = await fetchStudentByPhone(loggedInMobile);
        if (student) {
          const batchCategory = await fetchBatchCategory(student.batch);
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
            const released = (allCourses || [])
              .filter((c: any) => {
                const pub = String(c.publish_status || '').toLowerCase();
                const isPublished = !pub || pub.includes('publish');
                return isPublished && courseTargetsBatch(c.target_batch, student.batch, batchCategory || undefined);
              })
              .map((c: any) => c.id);
            effectiveCourses = Array.from(new Set([...effectiveCourses, ...released]));
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
              try { return [cid, await computeCourseProgress(student.id, cid)]; }
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
          if (student.batch) {
            const { data: locks } = await supabase
              .from('milestone_locks')
              .select('lesson_id, is_locked, unlock_datetime')
              .in('batch_code', [student.batch, 'ALL']);
            
            if (locks) {
              const now = new Date();
              unlockedLessonIds = locks
                .filter((l: any) => !l.is_locked || (l.unlock_datetime && new Date(l.unlock_datetime) <= now))
                .map((l: any) => l.lesson_id);
            }
          }

          // Newly-unlocked lessons are detected in NotificationsContext (which watches
          // user.unlockedLessonIds) so notifications are generated in one place.

          const realXp = Number(profile?.xp ?? (student as any)?.xp ?? 0);

          const updatedUser = {
            id: student.id,
            name: student.name,
            email: student.email,
            avatar: student.avatar || '',
            role: 'Student',
            program: profile?.program || 'Engineering Degree',
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
            batchCode: student.batch,
            batchCategory: batchCategory || 'Weekday',
            mobile: loggedInMobile,
            gpa: realGpa,
            attendance: realStreak,
            progress: realProgress,
            status: student.status,
            registrationId: student.registration_id,
            enrolledCourses: stableEnrolledCourses,
            courseProgress: newCourseProgress,
            unlockedLessonIds: unlockedLessonIds,
            notifPrefs: {
              assignments: profile?.notif_assignments ?? true,
              live: profile?.notif_live ?? true,
              placement: profile?.notif_placement ?? true,
              weekly: profile?.notif_weekly ?? true,
            },
          };

          setUser(updatedUser);
          localStorage.setItem('aspire_cached_user', JSON.stringify(updatedUser));
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

  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    refetchUser();

    const loggedInMobile = localStorage.getItem('aspire_logged_in_mobile');
    const isLoggedIn = localStorage.getItem('aspire_logged_in') === 'true';

    if (isLoggedIn && loggedInMobile) {
      const cleanPhone = loggedInMobile.replace(/\D/g, '').slice(-10);

      // Shared debounced full refetch for cascading progress calculations
      let progressTimer: any = null;
      const bumpProgress = () => {
        if (progressTimer) clearTimeout(progressTimer);
        progressTimer = setTimeout(() => refetchUser(), 600);
      };

      const ts = Date.now();

      // 1. students table: Realtime changes (catches enrollment, direct XP/streak on students row)
      const studentsChannel = supabase
        .channel(`students_rt_${ts}`)
        .on(
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
                  const nextStreak = newRow.attendance !== undefined 
                    ? Number(newRow.attendance) 
                    : (newRow.streak !== undefined ? Number(newRow.streak) : prev.streak);
                  const updated = {
                    ...prev,
                    xp: nextXp,
                    level: Math.floor(nextXp / 500) + 1,
                    streak: nextStreak,
                    attendance: nextStreak,
                  };
                  try { localStorage.setItem('aspire_cached_user', JSON.stringify(updated)); } catch {}
                  return updated;
                });
              }
              bumpProgress();
            }
          }
        )
        .subscribe();

      // 2. student_profiles table: Realtime changes (catches XP, streak/attendance, bio, etc.)
      const profileChannel = supabase
        .channel(`student_profiles_rt_${ts}`)
        .on(
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
              const nextStreak = newRow.attendance !== undefined 
                ? Number(newRow.attendance) 
                : (newRow.streak !== undefined ? Number(newRow.streak) : curr?.streak);
              const nextProgress = newRow.progress !== undefined ? Number(newRow.progress) : curr?.progress;
              const nextGpa = newRow.gpa !== undefined ? Number(newRow.gpa) : curr?.gpa;

              const hasChanged = curr && (
                (newRow.xp !== undefined && nextXp !== curr.xp) ||
                (newRow.attendance !== undefined && nextStreak !== curr.streak) ||
                (newRow.streak !== undefined && nextStreak !== curr.streak) ||
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
                    attendance: nextStreak,
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
        )
        .subscribe();

      // 3. Milestone locks
      const locksFilter = userRef.current?.batchCode ? `batch_code=in.(${userRef.current.batchCode},ALL)` : undefined;
      const locksChannel = supabase
        .channel(`milestone_locks_rt_${ts}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestone_locks',
            ...(locksFilter ? { filter: locksFilter } : {})
          },
          () => {
            bumpProgress();
          }
        )
        .subscribe();

      // 4. Courses
      const coursesChannel = supabase
        .channel(`courses_rt_${ts}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'courses' },
          () => {
            bumpProgress();
          }
        )
        .subscribe();

      // 5. Coursework completions
      const progressChannel = supabase.channel(`progress_rt_${ts}`);
      progressChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_attempts' }, (payload) => {
          if (!payload.new || (payload.new as any).student_id === userRef.current?.id) bumpProgress();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts' }, (payload) => {
          if (!payload.new || (payload.new as any).user_id === userRef.current?.id) bumpProgress();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_submissions' }, (payload) => {
          if (!payload.new || (payload.new as any).student_id === userRef.current?.id) bumpProgress();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress' }, (payload) => {
          if (!payload.new || (payload.new as any).student_id === userRef.current?.id) bumpProgress();
        });
      ['assessments', 'quizzes', 'coding_questions', 'projects'].forEach((table) => {
        progressChannel.on('postgres_changes', { event: '*', schema: 'public', table }, bumpProgress);
      });
      progressChannel.subscribe();

      // 6. Window focus & visibility change: instant resync when user returns from DB editor / another tab
      const onSyncCheck = () => {
        if (document.visibilityState === 'visible') {
          refetchUser();
        }
      };
      window.addEventListener('focus', onSyncCheck);
      document.addEventListener('visibilitychange', onSyncCheck);

      return () => {
        supabase.removeChannel(studentsChannel);
        supabase.removeChannel(locksChannel);
        supabase.removeChannel(coursesChannel);
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(progressChannel);
        if (progressTimer) clearTimeout(progressTimer);
        window.removeEventListener('focus', onSyncCheck);
        document.removeEventListener('visibilitychange', onSyncCheck);
      };
    }
  }, [refetchUser]);

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
