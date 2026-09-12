import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, FileText, Radio, BookOpen, GraduationCap, Gift, Award, Briefcase, HelpCircle, Code2, X,
  MapPin, FolderGit2, Library
} from 'lucide-react';
import { useUser } from './UserContext';
import { supabase } from './supabase';
import {
  fetchNotifications, persistNotification,
  updateNotificationReadStatus, markAllNotificationsAsRead, deleteNotificationRow,
  courseTargetsBatch, fetchRewards, fetchBadges, fetchUserSubmissions, fetchAssignmentAttempts,
  fetchQuizAttempts, fetchProjects,
  evaluateBadgeCriteria,
} from './api';
import { getLessonResolver, rawLessonLink } from './lessonLinkResolver';

export interface AppNotification {
  id: string;
  student_id?: string;
  type: string;          // 'course' | 'live' | 'assignment' | 'system' | 'community' | 'placement'
  title: string;
  message: string;
  content?: string;
  read: boolean;
  time?: string;
  timestamp?: string;
  created_at: string;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (n: AppNotification, opts?: { showToast?: boolean; persistDb?: boolean }) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const MAX_STORED = 100;
const listKey = (sid: string) => `aspire_notifications_${sid}`;
const unlockSeenKey = (sid: string) => `aspire_seen_unlocks_${sid}`;
// IDs of notifications explicitly dismissed by the user — never restore these from DB on re-login.
const dismissedKey = (sid: string) => `aspire_dismissed_notifs_${sid}`;

const norm = (s: any) => String(s ?? '').trim().toLowerCase();

/** Whether a comma-list target_batch (or targetBatches array) includes the student's batch. */
function targetsBatch(target: any, batchCode: string, targetBatches?: any[], category?: string): boolean {
  if (!batchCode) return true;
  const want = norm(batchCode);
  const cat = norm(category || (want.includes('w') ? 'weekday' : (want.includes('s') ? 'weekend' : '')));

  if (Array.isArray(targetBatches) && targetBatches.some((b) => {
    const nb = norm(b);
    return nb === want || nb.includes('all') || (cat && (nb.includes(`${cat} batch`) || nb === cat));
  })) return true;

  const t = norm(target);
  if (!t) return false;
  if (t.includes('all batch') || t === 'all') return true;
  if (cat && (t.includes(`${cat} batch`) || t === cat)) return true;
  return t.split(',').map((s) => s.trim()).includes(want);
}

function sanitizeNotification(n: AppNotification): AppNotification {
  if (!n) return n;
  let title = (n.title || '').trim();
  let message = (n.message || n.content || '').trim();

  // Strip all emojis and graphical symbols
  const emojiRegex = /[\u{1F300}-\u{1FAD6}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu;
  title = title.replace(emojiRegex, '').replace(/[!]+$/, '').trim();
  message = message.replace(emojiRegex, '').trim();

  // Professional copy normalization
  if (title.toLowerCase().includes('reward unlocked')) {
    title = 'Reward Unlocked';
    message = message.replace(/You unlocked ("[^"]+"). Claim it in the Rewards store\./i, '$1 is now available to claim in Rewards.');
  } else if (title.toLowerCase().includes('badge unlocked') || title.toLowerCase().includes('badge earned')) {
    title = 'Badge Earned';
    message = message.replace(/You earned the ("[^"]+") badge\./i, 'You have earned the $1 badge.');
  } else if (title.toLowerCase().includes('certificate issued')) {
    title = 'Certificate Issued';
  }

  return {
    ...n,
    title,
    message,
    content: n.content ? n.content.replace(emojiRegex, '').trim() : message,
  };
}

function loadStored(sid: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(listKey(sid));
    const parsed: AppNotification[] = raw ? JSON.parse(raw) : [];
    return parsed.map(sanitizeNotification);
  } catch {
    return [];
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, refetchUser } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toast, setToast] = useState<AppNotification | null>(null);

  // Keep the latest user + notifications in refs so realtime handlers stay stable.
  const userRef = useRef(user);
  userRef.current = user;
  const listRef = useRef<AppNotification[]>(notifications);
  listRef.current = notifications;
  const toastTimer = useRef<any>(null);

  const persistLocal = useCallback((sid: string, list: AppNotification[]) => {
    try {
      localStorage.setItem(listKey(sid), JSON.stringify(list.slice(0, MAX_STORED)));
    } catch { /* storage may be unavailable */ }
  }, []);

  /** Add a notification: de-dupe by id, prepend, persist locally, optionally toast + persist to DB. */
  const addNotification = useCallback(
    (rawN: AppNotification, opts: { showToast?: boolean; persistDb?: boolean } = {}) => {
      const sid = userRef.current?.id;
      if (!sid || sid === 'guest') return;

      const n = sanitizeNotification(rawN);

      // Respect the student's Settings toggles (student_profiles.notif_*). 'system'/admin-pushed and
      // any unknown type are always allowed.
      const prefs = userRef.current?.notifPrefs;
      if (prefs) {
        if (n.type === 'assignment' && prefs.assignments === false) return;
        if (n.type === 'live' && prefs.live === false) return;
        if (n.type === 'placement' && prefs.placement === false) return;
      }

      const existing = listRef.current;
      if (existing.some((x) => x.id === n.id)) return; // dedupe
      const next = [n, ...existing].slice(0, MAX_STORED);
      setNotifications(next);
      persistLocal(sid, next);

      if (opts.showToast) {
        setToast(n);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 6000);
      }
      if (opts.persistDb) {
        persistNotification({ id: n.id, studentId: sid, title: n.title, content: n.content || n.message });
      }
    },
    [persistLocal]
  );

  /** Checks if coursework entity belongs to an unlocked milestone lesson for the student */
  const checkIsMilestoneUnlocked = useCallback(
    async (entity: any): Promise<boolean> => {
      const unlockedIds = userRef.current?.unlockedLessonIds || [];
      if (unlockedIds.length === 0) return false;

      const rawId = rawLessonLink(entity);
      const enrolled = userRef.current?.enrolledCourses || [];
      const studentBatch = userRef.current?.batchCode || '';

      try {
        const resolver = await getLessonResolver(enrolled, studentBatch);
        const targetLessonId = resolver.resolveEntityLessonId(entity) || (rawId ? resolver.resolveLessonId(rawId) : '');

        // If entity is not linked to any lesson, it is not milestone-gated (standalone)
        if (!targetLessonId && !rawId) return true;

        return (
          (targetLessonId ? unlockedIds.includes(targetLessonId) : false) ||
          (rawId ? unlockedIds.includes(rawId) : false)
        );
      } catch {
        if (!rawId) return true;
        return unlockedIds.includes(rawId);
      }
    },
    []
  );

  // ── Initial load: merge stored (local) + admin rows from the DB (no toasts) ──
  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') {
      setNotifications([]);
      return;
    }
    let alive = true;
    (async () => {
      const stored = loadStored(sid);
      let dbRows: AppNotification[] = [];
      try {
        const fetched = (await fetchNotifications(sid)) as AppNotification[];
        dbRows = (fetched || []).map(sanitizeNotification);
      } catch { /* table may be unavailable */ }
      if (!alive) return;

      // Load the set of IDs the user has explicitly dismissed — never restore these.
      let dismissedIds = new Set<string>();
      try {
        const raw = localStorage.getItem(dismissedKey(sid));
        if (raw) dismissedIds = new Set(JSON.parse(raw));
      } catch {}

      const byId = new Map<string, AppNotification>();
      [...dbRows, ...stored].forEach((n) => {
        if (n && n.id && !byId.has(n.id) && !dismissedIds.has(n.id)) {
          byId.set(n.id, sanitizeNotification(n));
        }
      });
      // Course-level & milestone unlock purge: ensure students never see coursework notifications
      // from other courses, non-matching batches, drafts, or currently LOCKED milestone lessons.
      const enrolledSet = new Set(user?.enrolledCourses || []);
      const unlockedSet = new Set(user?.unlockedLessonIds || []);
      const studentBatch = user?.batchCode || '';
      const studentCat = user?.batchCategory || '';

      if (enrolledSet.size > 0) {
        try {
          const resolver = await getLessonResolver(Array.from(enrolledSet), studentBatch);
          const [assessRes, cqRes, quizRes, projRes] = await Promise.all([
            supabase.from('assessments').select('id, course_id, target_batch, topic_id, topic_name, publish_status'),
            supabase.from('coding_questions').select('id, course_id, target_batch, inner_topic_id, title'),
            supabase.from('quizzes').select('id, course_id, target_batch, target_batches, inner_topic_id, topic_name, status, title'),
            supabase.from('projects').select('id, course_id, target_batch, inner_topic_id, description, status, title')
          ]);

          const isItemAllowed = (item: any) => {
            if (item.course_id && !enrolledSet.has(item.course_id)) return false;
            if (item.target_batch && !targetsBatch(item.target_batch, studentBatch, item.target_batches, studentCat)) return false;
            const pub = norm(item.publish_status || item.status);
            if (pub && (pub.includes('draft') || pub.includes('hidden'))) return false;
            const rawId = rawLessonLink(item);
            const targetLessonId = resolver.resolveEntityLessonId(item) || (rawId ? resolver.resolveLessonId(rawId) : '');
            if (!targetLessonId && !rawId) return true; // standalone coursework
            return (
              (targetLessonId ? unlockedSet.has(targetLessonId) : false) ||
              (rawId ? unlockedSet.has(rawId) : false)
            );
          };

          if (assessRes.data) {
            const forbiddenAssessIds = new Set(
              assessRes.data.filter((a: any) => !isItemAllowed(a)).map((a: any) => a.id)
            );
            for (const [id] of byId.entries()) {
              const match = id.match(/^notif-assess-(.+)$/);
              if (match && forbiddenAssessIds.has(match[1])) {
                byId.delete(id);
              }
            }
          }

          if (cqRes.data) {
            const forbiddenCqIds = new Set(
              cqRes.data.filter((c: any) => !isItemAllowed(c)).map((c: any) => c.id)
            );
            for (const [id] of byId.entries()) {
              const match = id.match(/^notif-cq-(.+)$/);
              if (match && forbiddenCqIds.has(match[1])) {
                byId.delete(id);
              }
            }
          }

          if (quizRes.data) {
            const forbiddenQuizIds = new Set(
              quizRes.data.filter((q: any) => !isItemAllowed(q)).map((q: any) => q.id)
            );
            for (const [id] of byId.entries()) {
              const match = id.match(/^notif-quiz-(.+)$/);
              if (match && forbiddenQuizIds.has(match[1])) {
                byId.delete(id);
              }
            }
          }

          if (projRes.data) {
            const forbiddenProjIds = new Set(
              projRes.data.filter((p: any) => !isItemAllowed(p)).map((p: any) => p.id)
            );
            for (const [id] of byId.entries()) {
              const match = id.match(/^notif-project-(.+)$/);
              if (match && forbiddenProjIds.has(match[1])) {
                byId.delete(id);
              }
            }
          }
        } catch {}
      }

      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setNotifications(merged);
      persistLocal(sid, merged);
    })();
    return () => { alive = false; };
  }, [user?.id, (user?.unlockedLessonIds || []).join(','), persistLocal]);

  // ── 1. Lesson unlocks: react to unlockedLessonIds growing (covers realtime + time-based) ──

  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') return;
    const ids = user?.unlockedLessonIds || [];
    const key = unlockSeenKey(sid);
    let seen: string[] = [];
    const raw = localStorage.getItem(key);
    if (raw === null) {
      // First run: baseline silently (don't back-fill notifications for already-open lessons).
      try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
      return;
    }
    try { seen = JSON.parse(raw) || []; } catch { seen = []; }
    const seenSet = new Set(seen);
    const newly = ids.filter((id) => !seenSet.has(id));
    if (newly.length === 0) return;

    (async () => {
      const titleById: Record<string, string> = {};
      try {
        const { data } = await supabase.from('course_lessons').select('id, title').in('id', newly);
        (data || []).forEach((r: any) => { titleById[r.id] = r.title; });
      } catch {}
      newly.forEach((lessonId) => {
        addNotification(
          {
            id: `notif-unlock-${lessonId}-${sid}`,
            student_id: sid,
            type: 'course',
            title: 'New lesson unlocked',
            message: titleById[lessonId]
              ? `"${titleById[lessonId]}" is now available.`
              : 'A new lesson is now available.',
            read: false,
            created_at: new Date().toISOString(),
          },
          { showToast: true, persistDb: true }
        );
      });

      // Also notify coursework attached to these newly unlocked lessons:
      try {
        const enrolled = userRef.current?.enrolledCourses || [];
        const studentBatch = userRef.current?.batchCode || '';
        const studentCat = userRef.current?.batchCategory || '';
        const resolver = await getLessonResolver(enrolled, studentBatch);
        const [assessRes, cqRes, quizRes, projRes] = await Promise.all([
          supabase.from('assessments').select('*').in('course_id', enrolled),
          supabase.from('coding_questions').select('*').in('course_id', enrolled),
          supabase.from('quizzes').select('*').in('course_id', enrolled),
          supabase.from('projects').select('*').in('course_id', enrolled)
        ]);

        (assessRes.data || []).forEach((a: any) => {
          if (a.target_batch && !targetsBatch(a.target_batch, studentBatch, a.target_batches, studentCat)) return;
          const pub = norm(a.publish_status || a.status);
          if (pub && (pub.includes('draft') || pub.includes('hidden'))) return;
          const rawId = rawLessonLink(a);
          const targetLessonId = resolver.resolveEntityLessonId(a) || (rawId ? resolver.resolveLessonId(rawId) : '');
          if ((targetLessonId && newly.includes(targetLessonId)) || (rawId && newly.includes(rawId))) {
            const lTitle = titleById[targetLessonId] || (rawId ? titleById[rawId] : '') || '';
            addNotification(
              {
                id: `notif-assess-${a.id}`,
                student_id: sid,
                type: 'assignment',
                title: 'New assessment available',
                message: `${a.title || 'Assessment'} is now available${lTitle ? ` for ${lTitle}` : ''}.`,
                read: false,
                created_at: new Date().toISOString()
              },
              { showToast: true, persistDb: true }
            );
          }
        });

        (cqRes.data || []).forEach((cq: any) => {
          if (cq.target_batch && !targetsBatch(cq.target_batch, studentBatch, cq.target_batches, studentCat)) return;
          const rawId = rawLessonLink(cq);
          const targetLessonId = resolver.resolveEntityLessonId(cq) || (rawId ? resolver.resolveLessonId(rawId) : '');
          if ((targetLessonId && newly.includes(targetLessonId)) || (rawId && newly.includes(rawId))) {
            const lTitle = titleById[targetLessonId] || (rawId ? titleById[rawId] : '') || '';
            addNotification(
              {
                id: `notif-cq-${cq.id}`,
                student_id: sid,
                type: 'assignment',
                title: 'New practice problem available',
                message: `${cq.title || 'Practice problem'} is now available${lTitle ? ` for ${lTitle}` : ''}.`,
                read: false,
                created_at: new Date().toISOString()
              },
              { showToast: true, persistDb: true }
            );
          }
        });

        (quizRes.data || []).forEach((q: any) => {
          if (q.target_batch && !targetsBatch(q.target_batch, studentBatch, q.target_batches, studentCat)) return;
          const pub = norm(q.publish_status || q.status);
          if (pub && (pub.includes('draft') || pub.includes('hidden'))) return;
          const rawId = rawLessonLink(q);
          const targetLessonId = resolver.resolveEntityLessonId(q) || (rawId ? resolver.resolveLessonId(rawId) : '');
          if ((targetLessonId && newly.includes(targetLessonId)) || (rawId && newly.includes(rawId))) {
            const lTitle = titleById[targetLessonId] || (rawId ? titleById[rawId] : '') || '';
            addNotification(
              {
                id: `notif-quiz-${q.id}`,
                student_id: sid,
                type: 'assignment',
                title: 'New weekly quiz available',
                message: `${q.title || 'Quiz'} is now available${lTitle ? ` for ${lTitle}` : ''}.`,
                read: false,
                created_at: new Date().toISOString()
              },
              { showToast: true, persistDb: true }
            );
          }
        });

        (projRes.data || []).forEach((p: any) => {
          if (p.target_batch && !targetsBatch(p.target_batch, studentBatch, p.target_batches, studentCat)) return;
          const pub = norm(p.publish_status || p.status);
          if (pub && (pub.includes('draft') || pub.includes('hidden'))) return;
          const rawId = rawLessonLink(p);
          const targetLessonId = resolver.resolveEntityLessonId(p) || (rawId ? resolver.resolveLessonId(rawId) : '');
          if ((targetLessonId && newly.includes(targetLessonId)) || (rawId && newly.includes(rawId))) {
            const lTitle = titleById[targetLessonId] || (rawId ? titleById[rawId] : '') || '';
            addNotification(
              {
                id: `notif-project-${p.id}`,
                student_id: sid,
                type: 'assignment',
                title: 'New project assigned',
                message: `${p.title || 'Project'} is now available${lTitle ? ` for ${lTitle}` : ''}.`,
                read: false,
                created_at: new Date().toISOString()
              },
              { showToast: true, persistDb: true }
            );
          }
        });
      } catch (err) {
        console.warn('Error checking coursework for newly unlocked lessons:', err);
      }

      try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, (user?.unlockedLessonIds || []).join(',')]);

  // ── 2. Realtime subscriptions for DB changes → popup ──
  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') return;
    const batch = user?.batchCode || '';
    const category = user?.batchCategory || '';
    const courses = user?.enrolledCourses || [];

    const channel = supabase.channel(`notifs_multiplexed_${Date.now()}`);

    // Live sessions (client-filtered by batch + published)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, (payload) => {
      const row = payload.new || {};
      if (payload.eventType === 'DELETE') return;
      const pub = norm(row.publish_status);
      if (pub && !pub.includes('publish')) return;
      if (!targetsBatch(row.target_batch, batch)) return;
      addNotification(
        {
          id: `notif-live-${row.id}`,
          student_id: sid, type: 'live',
          title: 'Live class scheduled',
          message: `${row.session_title || 'Live class'}${row.date ? ` • ${row.date}` : ''}${row.time ? ` ${row.time}` : ''}`,
          read: false, created_at: new Date().toISOString(),
        },
        { showToast: true, persistDb: true }
      );
    });

    // New assessments (INSERT) for the student's batch and course
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assessments' }, async (payload) => {
      const row = payload.new || {};
      const curUser = userRef.current;
      const curBatch = curUser?.batchCode || batch;
      const curCategory = curUser?.batchCategory || category;
      const curCourses = curUser?.enrolledCourses || courses;

      if (row.course_id && curCourses.length > 0 && !curCourses.includes(row.course_id)) return;
      if (row.target_batch && !targetsBatch(row.target_batch, curBatch, row.target_batches, curCategory)) return;
      if (!row.course_id && !row.target_batch) return;
      const pub = norm(row.publish_status);
      if (pub && (pub.includes('draft') || pub.includes('hidden'))) return;

      const unlocked = await checkIsMilestoneUnlocked(row);
      if (!unlocked) return;

      addNotification(
        { id: `notif-assess-${row.id}`, student_id: sid, type: 'assignment',
          title: 'New assessment posted', message: row.title || 'A new assessment is available.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // New projects (INSERT)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, async (payload) => {
      const row = payload.new || {};
      const curUser = userRef.current;
      const curBatch = curUser?.batchCode || batch;
      const curCategory = curUser?.batchCategory || category;
      const curCourses = curUser?.enrolledCourses || courses;

      if (row.course_id && curCourses.length > 0 && !curCourses.includes(row.course_id)) return;
      if (row.target_batch && !targetsBatch(row.target_batch, curBatch, row.target_batches, curCategory)) return;
      if (!row.course_id && !row.target_batch) return;
      const pub = norm(row.publish_status || row.status);
      if (pub && (pub.includes('draft') || pub.includes('hidden'))) return;

      const unlocked = await checkIsMilestoneUnlocked(row);
      if (!unlocked) return;

      addNotification(
        { id: `notif-project-${row.id}`, student_id: sid, type: 'assignment',
          title: 'New project assigned', message: row.title || 'A new project is available.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // Badges (INSERT) targeted to batch / all
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'badges' }, (payload) => {
      const row = payload.new || {};
      if (!targetsBatch(row.target_batch, batch)) return;
      addNotification(
        { id: `notif-badge-${row.id}`, student_id: sid, type: 'system',
          title: 'New badge available', message: row.name || 'A new badge is available to earn.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // Rewards: new reward, or a reward becoming unlocked
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, (payload) => {
      const row = payload.new || {};
      if (payload.eventType === 'DELETE') return;
      if (payload.eventType === 'UPDATE' && row.is_locked !== false) return;
      addNotification(
        { id: `notif-reward-${row.id}-${row.is_locked === false ? 'unlocked' : 'new'}`, student_id: sid, type: 'system',
          title: row.is_locked === false ? 'Reward Unlocked' : 'New Reward Available',
          message: row.reward_title ? `"${row.reward_title}" is now available in Rewards.` : 'A new reward is available in Rewards.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // New course released to this student's batch (INSERT, or UPDATE that publishes it)
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
      if (payload.eventType === 'DELETE') return;
      const row = payload.new || {};
      const pub = norm(row.publish_status);
      if (pub && !pub.includes('publish')) return;
      if (!courseTargetsBatch(row.target_batch, batch, category)) return;
      addNotification(
        { id: `notif-course-${row.id}`, student_id: sid, type: 'course',
          title: 'New course available', message: row.title || 'A new course was added to your learning.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // New quizzes (INSERT) for the student's batch and course
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quizzes' }, async (payload) => {
      const row = payload.new || {};
      const curUser = userRef.current;
      const curBatch = curUser?.batchCode || batch;
      const curCategory = curUser?.batchCategory || category;
      const curCourses = curUser?.enrolledCourses || courses;

      if (row.course_id && curCourses.length > 0 && !curCourses.includes(row.course_id)) return;
      if (row.target_batch && !targetsBatch(row.target_batch, curBatch, row.target_batches, curCategory)) return;
      if (!row.course_id && !row.target_batch) return;
      const pub = norm(row.publish_status || row.status);
      if (pub && (pub.includes('draft') || pub.includes('hidden'))) return;

      const unlocked = await checkIsMilestoneUnlocked(row);
      if (!unlocked) return;

      addNotification(
        { id: `notif-quiz-${row.id}`, student_id: sid, type: 'assignment',
          title: 'New quiz posted', message: row.title || 'A new quiz is available.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // New coding questions (INSERT) for the student's batch and course
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coding_questions' }, async (payload) => {
      const row = payload.new || {};
      const curUser = userRef.current;
      const curBatch = curUser?.batchCode || batch;
      const curCategory = curUser?.batchCategory || category;
      const curCourses = curUser?.enrolledCourses || courses;

      if (row.course_id && curCourses.length > 0 && !curCourses.includes(row.course_id)) return;
      if (row.target_batch && !targetsBatch(row.target_batch, curBatch, row.target_batches, curCategory)) return;
      if (!row.course_id && !row.target_batch) return;

      const unlocked = await checkIsMilestoneUnlocked(row);
      if (!unlocked) return;

      addNotification(
        { id: `notif-cq-${row.id}`, student_id: sid, type: 'assignment',
          title: 'New practice problem available', message: row.title || 'A new coding problem is available in Practice Lab.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // New placement resources (INSERT, published)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'placement_resources' }, (payload) => {
      const row = payload.new || {};
      const pub = norm(row.publish_status);
      if (pub && !pub.includes('publish')) return;
      addNotification(
        { id: `notif-plres-${row.id}`, student_id: sid, type: 'placement',
          title: 'New placement resource', message: row.title || 'A new placement resource is available.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // New jobs (INSERT) targeted to the student's batch
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, (payload) => {
      const row = payload.new || {};
      if (!targetsBatch(row.target_batch, batch)) return;
      addNotification(
        { id: `notif-job-${row.id}`, student_id: sid, type: 'placement',
          title: 'New job posted', message: row.job_title || row.company || 'A new job opening is available.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // Certificate issued for this student (INSERT)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'certificates', filter: `student_id=eq.${sid}` }, (payload) => {
      const row = payload.new || {};
      if (row.student_id !== sid) return;
      addNotification(
        { id: `notif-cert-${row.id}`, student_id: sid, type: 'system',
          title: 'Certificate Issued', message: row.title ? `Your certificate for "${row.title}" is ready.` : 'Your certificate is ready to view.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // Admin notifications inserted directly into the notifications table for this student
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `student_id=eq.${sid}` }, (payload) => {
      if (payload.eventType === 'DELETE') return;
      const row = payload.new || {};
      if (row.student_id !== sid) return;
      addNotification(
        { id: row.id, student_id: sid, type: 'system',
          title: row.title || 'Notification', message: row.content || '',
          read: !!row.read, created_at: row.created_at || new Date().toISOString() },
        { showToast: true, persistDb: false }
      );
    });

    // Students table realtime: catches XP, streak, and profile updates directly
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
      const row = payload.new || {};
      const cleanRowPhone = row.mobile_number ? row.mobile_number.replace(/\D/g, '').slice(-10) : '';
      const cleanUserPhone = userRef.current?.mobile ? userRef.current.mobile.replace(/\D/g, '').slice(-10) : '';
      if (row.id === sid || (cleanUserPhone && cleanRowPhone && cleanUserPhone === cleanRowPhone)) {
        refetchUser?.();
      }
    });

    // Student profiles table realtime: catches direct XP, streak, and attendance updates
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles' }, (payload) => {
      const row = payload.new || {};
      if (row.student_id === sid || row.id === sid) {
        refetchUser?.();
      }
    });

    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.batchCode, user?.batchCategory, (user?.enrolledCourses || []).join(',')]);

  // ── 3. Centralized Real-time Unlocks for Rewards & Badges ──
  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') return;

    const userXp = Number(user.xp || 0);
    const rewardsKey = `aspire_unlocked_rewards_${sid}`;
    const badgesKey = `aspire_earned_badges_${sid}`;

    let isCancelled = false;

    (async () => {
      try {
        const [rewardsData, badgesData, submissionsData, attemptsData, quizData, projectsData] = await Promise.all([
          fetchRewards(),
          fetchBadges(),
          fetchUserSubmissions(sid),
          fetchAssignmentAttempts(sid),
          fetchQuizAttempts(sid),
          fetchProjects(),
        ]);

        if (isCancelled) return;

        // 1. REWARDS UNLOCK CHECK
        const unlockedRewards = (rewardsData || []).filter((r: any) => {
          if (r.is_locked) return false;
          const reqXp = r.reward_required_xp_points ?? r.requiredXp ?? 0;
          return userXp >= reqXp;
        });
        const currentUnlockedRewardIds = unlockedRewards.map((r: any) => r.id);

        const prevUnlockedRaw = localStorage.getItem(rewardsKey);
        if (prevUnlockedRaw === null) {
          // Initialize baseline for already-unlocked rewards on very first visit
          try { localStorage.setItem(rewardsKey, JSON.stringify(currentUnlockedRewardIds)); } catch {}
        } else {
          let prevUnlockedIds: string[] = [];
          try { prevUnlockedIds = JSON.parse(prevUnlockedRaw) || []; } catch {}
          const prevSet = new Set(prevUnlockedIds);
          const newlyUnlockedRewards = unlockedRewards.filter((r: any) => !prevSet.has(r.id));

          if (newlyUnlockedRewards.length > 0) {
            newlyUnlockedRewards.forEach((r: any) => {
              // Use a STABLE, deterministic ID (no Date.now() / random) so that once
              // this notification is read & deleted, addNotification's dedup check prevents
              // it from ever reappearing on the next effect run.
              addNotification(
                {
                  id: `notif-reward-unlock-${sid}-${r.id}`,
                  student_id: sid,
                  type: 'achievement',
                  title: 'Reward Unlocked',
                  message: `"${r.reward_title || r.name || 'A reward'}" is now available to claim in Rewards.`,
                  read: false,
                  created_at: new Date().toISOString(),
                },
                { showToast: true, persistDb: true }
              );
            });
          }

          // Always synchronize stored baseline with the current unlocked set.
          // When XP is reduced, stored baseline shrinks; when XP is increased again, it correctly fires!
          try { localStorage.setItem(rewardsKey, JSON.stringify(currentUnlockedRewardIds)); } catch {}
        }

        // 2. BADGES EARNED CHECK
        const earnedBadges = (badgesData || []).filter((b: any) =>
          evaluateBadgeCriteria(b, user, submissionsData || [], attemptsData || [], {
            quizAttempts: quizData || [],
            projectsList: projectsData || []
          })
        );
        const currentEarnedBadgeIds = earnedBadges.map((b: any) => b.id);

        const prevBadgesRaw = localStorage.getItem(badgesKey);
        if (prevBadgesRaw === null) {
          // Initialize baseline for already-earned badges on very first visit
          try { localStorage.setItem(badgesKey, JSON.stringify(currentEarnedBadgeIds)); } catch {}
        } else {
          let prevEarnedIds: string[] = [];
          try { prevEarnedIds = JSON.parse(prevBadgesRaw) || []; } catch {}
          const prevBadgeSet = new Set(prevEarnedIds);
          const newlyEarnedBadges = earnedBadges.filter((b: any) => !prevBadgeSet.has(b.id));

          if (newlyEarnedBadges.length > 0) {
            newlyEarnedBadges.forEach((b: any) => {
              // Stable deterministic ID — same badge can only generate one notification ever.
              addNotification(
                {
                  id: `notif-badge-earned-${sid}-${b.id}`,
                  student_id: sid,
                  type: 'achievement',
                  title: 'Badge Earned',
                  message: `You have earned the "${b.name || 'new'}" badge.`,
                  read: false,
                  created_at: new Date().toISOString(),
                },
                { showToast: true, persistDb: true }
              );
            });
          }

          // Always synchronize stored baseline with current earned set
          try { localStorage.setItem(badgesKey, JSON.stringify(currentEarnedBadgeIds)); } catch {}
        }
      } catch (err) {
        console.error('Error evaluating rewards/badges unlock notifications:', err);
      }
    })();

    return () => { isCancelled = true; };
  }, [user?.id, user?.xp, user?.streak, user?.progress, user?.attendance, addNotification]);

  // ── Actions ──

  /** Record an ID as dismissed so it is never restored from DB on next login. */
  const recordDismissed = useCallback((ids: string[]) => {
    const sid = userRef.current?.id;
    if (!sid || ids.length === 0) return;
    try {
      const key = dismissedKey(sid);
      const raw = localStorage.getItem(key);
      let existing: string[] = [];
      try { existing = raw ? JSON.parse(raw) : []; } catch {}
      const updated = Array.from(new Set([...existing, ...ids]));
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  }, []);

  const markRead = useCallback((id: string) => {
    const sid = userRef.current?.id;
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (sid) persistLocal(sid, next);
      return next;
    });
    recordDismissed([id]);
    deleteNotificationRow(id).catch(() => {});
  }, [persistLocal, recordDismissed]);

  const markAllRead = useCallback(() => {
    const sid = userRef.current?.id;
    const allIds = listRef.current.map((n) => n.id);
    setNotifications([]);
    if (sid) {
      persistLocal(sid, []);
      markAllNotificationsAsRead(sid).catch(() => {});
    }
    recordDismissed(allIds);
  }, [persistLocal, recordDismissed]);

  const deleteNotification = useCallback((id: string) => {
    const sid = userRef.current?.id;
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (sid) persistLocal(sid, next);
      return next;
    });
    recordDismissed([id]);
    deleteNotificationRow(id).catch(() => {});
  }, [persistLocal, recordDismissed]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification, addNotification }}>
      {children}
      {toast && createPortal(<NotificationToast n={toast} onClose={() => setToast(null)} />, document.body)}
    </NotificationsContext.Provider>
  );
}

export interface NotificationIconConfig {
  Icon: React.ComponentType<{ className?: string }>;
  bg: string;
  toastBg: string;
}

export function getNotificationIconConfig(n: { type?: string; title?: string; message?: string }): NotificationIconConfig {
  const title = (n.title || '').toLowerCase();
  const type = (n.type || '').toLowerCase();
  const msg = (n.message || '').toLowerCase();

  // 1. My Learning & Courses (Exact Sidebar GraduationCap icon)
  if (type === 'course' || type === 'learning' || title.includes('course') || title.includes('lesson') || title.includes('unlock') || title.includes('curriculum') || title.includes('syllabus') || title.includes('module')) {
    return {
      Icon: GraduationCap,
      bg: 'bg-purple-50 text-[#7c3aed] border border-purple-100',
      toastBg: 'bg-gradient-to-br from-[#7c3aed] to-[#6d28d9]',
    };
  }

  // 2. Live Classes (Exact Sidebar Radio icon)
  if (type === 'live' || title.includes('live') || title.includes('class') || title.includes('session') || title.includes('webinar')) {
    return {
      Icon: Radio,
      bg: 'bg-rose-50 text-rose-600 border border-rose-100',
      toastBg: 'bg-gradient-to-br from-rose-600 to-red-600',
    };
  }

  // 3. Milestones (Exact Sidebar MapPin icon)
  if (type === 'milestones' || title.includes('milestone') || title.includes('stage') || title.includes('roadmap')) {
    return {
      Icon: MapPin,
      bg: 'bg-sky-50 text-sky-600 border border-sky-100',
      toastBg: 'bg-gradient-to-br from-sky-600 to-blue-600',
    };
  }

  // 4. Practice Hub / Assessments / Quizzes (Exact Sidebar FileText icon)
  if (type === 'assignment' || title.includes('assessment') || title.includes('assignment') || title.includes('quiz') || title.includes('test')) {
    return {
      Icon: FileText,
      bg: 'bg-amber-50 text-amber-600 border border-amber-100',
      toastBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    };
  }

  // 5. Practice Lab (Exact Sidebar Code2 icon)
  if (type === 'practice' || title.includes('practice') || title.includes('problem') || title.includes('compiler') || title.includes('coding')) {
    return {
      Icon: Code2,
      bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      toastBg: 'bg-gradient-to-br from-emerald-600 to-teal-600',
    };
  }

  // 6. Projects (Exact Sidebar FolderGit2 icon)
  if (type === 'projects' || title.includes('project')) {
    return {
      Icon: FolderGit2,
      bg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      toastBg: 'bg-gradient-to-br from-indigo-600 to-purple-600',
    };
  }

  // 7. Resources (Exact Sidebar Library icon)
  if (type === 'resources' || title.includes('resource') || title.includes('material') || title.includes('document')) {
    return {
      Icon: Library,
      bg: 'bg-blue-50 text-blue-600 border border-blue-100',
      toastBg: 'bg-gradient-to-br from-blue-600 to-indigo-600',
    };
  }

  // 8. Placement Hub (Exact Sidebar Briefcase icon)
  if (type === 'placement' || title.includes('job') || title.includes('placement') || title.includes('hiring') || title.includes('internship')) {
    return {
      Icon: Briefcase,
      bg: 'bg-teal-50 text-teal-600 border border-teal-100',
      toastBg: 'bg-gradient-to-br from-teal-600 to-emerald-600',
    };
  }

  // 9. Certifications (Exact Sidebar Award icon)
  if (type === 'certifications' || title.includes('certif') || title.includes('badge') || title.includes('achievement')) {
    return {
      Icon: Award,
      bg: 'bg-amber-50 text-amber-600 border border-amber-100',
      toastBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    };
  }

  // 10. Rewards (Exact Sidebar Gift icon)
  if (type === 'rewards' || title.includes('reward') || title.includes('swag') || title.includes('merch')) {
    return {
      Icon: Gift,
      bg: 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100',
      toastBg: 'bg-gradient-to-br from-fuchsia-600 to-pink-600',
    };
  }

  // Default Fallback
  return {
    Icon: Bell,
    bg: 'bg-purple-50 text-[#7c3aed] border border-purple-100',
    toastBg: 'bg-gradient-to-br from-[#7c3aed] to-[#6d28d9]',
  };
}

function NotificationToast({ n, onClose }: { n: AppNotification; onClose: () => void }) {
  const { Icon, toastBg } = getNotificationIconConfig(n);
  return (
    <div className="fixed top-20 right-4 z-[100000] w-80 max-w-[90vw] animate-slide-left">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)]">
        <div className={`w-9 h-9 rounded-xl ${toastBg} text-white flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-sm text-slate-900 leading-snug">{n.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
