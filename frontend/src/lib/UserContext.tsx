import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { fetchStudentByPhone, fetchBatchCategory, fetchStudentProfile, fetchUserSubmissions, fetchAssignmentAttempts } from '@/lib/api';
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
          
          const realProgress = profile?.progress ?? 0;
          const realStreak = profile?.attendance ?? 0;
          const realGpa = profile?.gpa ?? 0.00;

          let unlockedLessonIds: string[] = [];
          if (student.batch) {
            const { data: locks } = await supabase
              .from('milestone_locks')
              .select('lesson_id, is_locked, unlock_datetime')
              .eq('batch_code', student.batch);
            
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
            enrolledCourses: student.enrolled_courses || [],
            courseProgress: profile?.course_progress || {},
            unlockedLessonIds: unlockedLessonIds,
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

      const locksChannel = supabase
        .channel('milestone_locks_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'milestone_locks'
          },
          () => {
            console.log("Real-time milestone locks updated inside Context, reloading...");
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
            table: 'student_profiles'
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

      const submissionsChannel = supabase
        .channel('submissions_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'submissions'
          },
          () => {
            console.log("Real-time practice submissions changed, reloading User XP context...");
            refetchUser();
          }
        )
        .subscribe();

      const attemptsChannel = supabase
        .channel('assignment_submissions_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assignment_submissions'
          },
          () => {
            console.log("Real-time assessment submissions changed, reloading User XP context...");
            refetchUser();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(locksChannel);
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(submissionsChannel);
        supabase.removeChannel(attemptsChannel);
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
