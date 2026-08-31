import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { fetchStudentByPhone, fetchBatchCategory, fetchStudentProfile, fetchUserSubmissions, fetchAssignmentAttempts, courseTargetsBatch, computeCourseProgress, issueCertificateIfComplete } from '@/lib/api';
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

          // Compute REAL course progress from coursework completions (there is no other progress source).
          const newCourseProgress: Record<string, number> = { ...(profile?.course_progress || {}) };
          for (const cid of effectiveCourses) {
            try { newCourseProgress[cid] = await computeCourseProgress(student.id, cid); } catch {}
          }
          const primaryPct = effectiveCourses.length ? (newCourseProgress[effectiveCourses[0]] ?? 0) : (profile?.progress ?? 0);

          // Persist only when it changed (avoids a student_profiles realtime → refetch loop).
          const prevCP = profile?.course_progress || {};
          const cpChanged = JSON.stringify(prevCP) !== JSON.stringify(newCourseProgress) || (profile?.progress ?? 0) !== primaryPct;
          if (cpChanged) {
            try {
              await supabase.from('student_profiles')
                .update({ course_progress: newCourseProgress, progress: primaryPct })
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
          const realStreak = profile?.attendance ?? 0;
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

          const realXp = profile?.xp ?? 0;

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
            enrolledCourses: effectiveCourses,
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

  useEffect(() => {
    refetchUser();

    const loggedInMobile = localStorage.getItem('aspire_logged_in_mobile');
    const isLoggedIn = localStorage.getItem('aspire_logged_in') === 'true';

    if (isLoggedIn && loggedInMobile) {
      // Clean phone number suffix to compare with payload
      const cleanPhone = loggedInMobile.replace(/\D/g, '').slice(-10);
      
      const channel = supabase
        .channel('students_realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'students'
          },
          (payload) => {
            if (payload.new && payload.new.mobile_number) {
              const cleanPayloadPhone = payload.new.mobile_number.replace(/\D/g, '').slice(-10);
              if (cleanPhone === cleanPayloadPhone) {
                console.log("Seenu's enrollment or batch updated in database. Reloading context...", payload.new);
                refetchUser();
              }
            }
          }
        )
        .subscribe();

      // Include global ("ALL") locks alongside the student's own batch.
      const locksFilter = user.batchCode ? `batch_code=in.(${user.batchCode},ALL)` : undefined;

      const locksChannel = supabase
        .channel('milestone_locks_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestone_locks',
            ...(locksFilter ? { filter: locksFilter } : {})
          },
          () => {
            console.log("Real-time milestone locks updated inside Context, reloading...");
            refetchUser();
          }
        )
        .subscribe();

      // A course released/updated for this batch should appear in MyLearning live.
      const coursesChannel = supabase
        .channel('courses_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'courses' },
          () => {
            console.log('Real-time courses changed, reloading context...');
            refetchUser();
          }
        )
        .subscribe();

      const profileChannel = supabase
        .channel('student_profiles_realtime')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'student_profiles',
            filter: `student_id=eq.${user.id}`
          },
          (payload) => {
            const cached = localStorage.getItem('aspire_cached_user');
            if (cached) {
              try {
                const currentUser = JSON.parse(cached);
                if (payload.new && payload.new.student_id === currentUser.id) {
                  console.log("Current student profile updated in database, reloading context...", payload.new);
                  refetchUser();
                }
              } catch {}
            }
          }
        )
        .subscribe();

      // Recompute course progress + XP + auto-issue certificate whenever the numbers change: the student's
      // OWN completions (attempt tables) OR the coursework TOTALS (admin adds/removes an item). Debounced so
      // a burst of changes triggers a single refetch. Replaces the old legacy submissions channels (empty).
      let progressTimer: any = null;
      const bumpProgress = () => {
        if (progressTimer) clearTimeout(progressTimer);
        progressTimer = setTimeout(() => refetchUser(), 700);
      };
      const progressChannel = supabase.channel('progress_realtime');
      // Student completions (student-filtered).
      progressChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_attempts', filter: `student_id=eq.${user.id}` }, bumpProgress)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_attempts', filter: `user_id=eq.${user.id}` }, bumpProgress)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_submissions', filter: `student_id=eq.${user.id}` }, bumpProgress)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress', filter: `student_id=eq.${user.id}` }, bumpProgress);
      // Coursework totals (any change re-derives the denominator).
      ['assessments', 'quizzes', 'coding_questions', 'projects'].forEach((table) => {
        progressChannel.on('postgres_changes', { event: '*', schema: 'public', table }, bumpProgress);
      });
      progressChannel.subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(locksChannel);
        supabase.removeChannel(coursesChannel);
        supabase.removeChannel(profileChannel);
        if (progressTimer) clearTimeout(progressTimer);
        supabase.removeChannel(progressChannel);
      };
    }
  }, [refetchUser, user?.id, user?.batchCode]);

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
    <UserContext.Provider value={{ user, updateUser, refetchUser, loading }}>
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
