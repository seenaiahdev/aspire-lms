import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Bell, FileText, Radio, Sparkles, Gift, X } from 'lucide-react';
import { useUser } from './UserContext';
import { supabase } from './supabase';
import {
  fetchNotifications, persistNotification,
  updateNotificationReadStatus, markAllNotificationsAsRead, deleteNotificationRow,
} from './api';

export interface AppNotification {
  id: string;
  student_id?: string;
  type: string;          // 'live' | 'assignment' | 'system' | 'community' | 'placement'
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
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const MAX_STORED = 100;
const listKey = (sid: string) => `aspire_notifications_${sid}`;
const unlockSeenKey = (sid: string) => `aspire_seen_unlocks_${sid}`;

const norm = (s: any) => String(s ?? '').trim().toLowerCase();

/** Whether a comma-list target_batch (or targetBatches array) includes the student's batch. */
function targetsBatch(target: any, batchCode: string, targetBatches?: any[]): boolean {
  if (!batchCode) return true;
  const want = norm(batchCode);
  if (Array.isArray(targetBatches) && targetBatches.some((b) => norm(b) === want || norm(b).includes('all'))) return true;
  const t = norm(target);
  if (!t) return false;
  if (t.includes('all batches') || t === 'all') return true;
  return t.split(',').map((s) => s.trim()).includes(want);
}

function loadStored(sid: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(listKey(sid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
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
    (n: AppNotification, opts: { showToast?: boolean; persistDb?: boolean } = {}) => {
      const sid = userRef.current?.id;
      if (!sid || sid === 'guest') return;

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
        dbRows = (await fetchNotifications(sid)) as AppNotification[];
      } catch { /* table may be unavailable */ }
      if (!alive) return;
      const byId = new Map<string, AppNotification>();
      [...dbRows, ...stored].forEach((n) => { if (n && n.id && !byId.has(n.id)) byId.set(n.id, n); });
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setNotifications(merged);
      persistLocal(sid, merged);
    })();
    return () => { alive = false; };
  }, [user?.id, persistLocal]);

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
            type: 'live',
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
      try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, (user?.unlockedLessonIds || []).join(',')]);

  // ── 2. Realtime subscriptions for DB changes → popup ──
  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest') return;
    const batch = user?.batchCode || '';
    const courses = user?.enrolledCourses || [];

    const channels: any[] = [];
    const sub = (name: string, table: string, handler: (payload: any) => void, filter?: string) => {
      const ch = supabase
        .channel(name)
        .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, handler)
        .subscribe();
      channels.push(ch);
    };

    // Live sessions (client-filtered by batch + published)
    sub('notif_live_sessions', 'live_sessions', (payload) => {
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

    // New assessments (INSERT) for the student's batch or course
    sub('notif_assessments', 'assessments', (payload) => {
      if (payload.eventType !== 'INSERT') return;
      const row = payload.new || {};
      if (!(targetsBatch(row.target_batch, batch) || courses.includes(row.course_id))) return;
      addNotification(
        { id: `notif-assess-${row.id}`, student_id: sid, type: 'assignment',
          title: 'New assessment posted', message: row.title || 'A new assessment is available.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // New projects (INSERT)
    sub('notif_projects', 'projects', (payload) => {
      if (payload.eventType !== 'INSERT') return;
      const row = payload.new || {};
      if (!(targetsBatch(row.target_batch, batch) || courses.includes(row.course_id))) return;
      addNotification(
        { id: `notif-project-${row.id}`, student_id: sid, type: 'assignment',
          title: 'New project assigned', message: row.title || 'A new project is available.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // Badges (INSERT) targeted to batch / all
    sub('notif_badges', 'badges', (payload) => {
      if (payload.eventType !== 'INSERT') return;
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
    sub('notif_rewards', 'rewards', (payload) => {
      const row = payload.new || {};
      if (payload.eventType === 'DELETE') return;
      if (payload.eventType === 'UPDATE' && row.is_locked !== false) return;
      addNotification(
        { id: `notif-reward-${row.id}-${row.is_locked === false ? 'unlocked' : 'new'}`, student_id: sid, type: 'system',
          title: row.is_locked === false ? 'Reward unlocked' : 'New reward available',
          message: row.reward_title || 'Check the rewards store.',
          read: false, created_at: new Date().toISOString() },
        { showToast: true, persistDb: true }
      );
    });

    // Admin notifications inserted directly into the notifications table for this student
    sub('notif_admin', 'notifications', (payload) => {
      if (payload.eventType === 'DELETE') return;
      const row = payload.new || {};
      if (row.student_id !== sid) return;
      addNotification(
        { id: row.id, student_id: sid, type: 'system',
          title: row.title || 'Notification', message: row.content || '',
          read: !!row.read, created_at: row.created_at || new Date().toISOString() },
        { showToast: true, persistDb: false }
      );
    }, `student_id=eq.${sid}`);

    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.batchCode, (user?.enrolledCourses || []).join(',')]);

  // ── Actions ──
  const markRead = useCallback((id: string) => {
    const sid = userRef.current?.id;
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (sid) persistLocal(sid, next);
      return next;
    });
    deleteNotificationRow(id).catch(() => {});
  }, [persistLocal]);

  const markAllRead = useCallback(() => {
    const sid = userRef.current?.id;
    setNotifications([]);
    if (sid) {
      persistLocal(sid, []);
      markAllNotificationsAsRead(sid).catch(() => {});
    }
  }, [persistLocal]);

  const deleteNotification = useCallback((id: string) => {
    const sid = userRef.current?.id;
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (sid) persistLocal(sid, next);
      return next;
    });
    deleteNotificationRow(id).catch(() => {});
  }, [persistLocal]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification }}>
      {children}
      {toast && createPortal(<NotificationToast n={toast} onClose={() => setToast(null)} />, document.body)}
    </NotificationsContext.Provider>
  );
}

function NotificationToast({ n, onClose }: { n: AppNotification; onClose: () => void }) {
  const Icon =
    n.type === 'assignment' ? FileText :
    n.type === 'live' ? Radio :
    n.title.toLowerCase().includes('reward') ? Gift :
    n.title.toLowerCase().includes('badge') ? Sparkles : Bell;
  return (
    <div className="fixed top-20 right-4 z-[100000] w-80 max-w-[90vw] animate-slide-left">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white flex items-center justify-center shrink-0 shadow-sm">
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
