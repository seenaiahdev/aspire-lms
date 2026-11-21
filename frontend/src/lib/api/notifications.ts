import { supabase } from '../supabase';
import { cachedQuery, invalidateCache, invalidateCacheByPrefix } from '../queryCache';

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
  let type = row.type;
  if (!type) {
    const id = String(row.id || '');
    if (id.startsWith('notif-unlock-mod')) type = 'milestones';
    else if (id.startsWith('notif-unlock')) type = 'course';
    else if (id.startsWith('notif-assess') || id.startsWith('notif-quiz') || id.startsWith('notif-cq') || id.startsWith('notif-project')) type = 'assignment';
    else if (id.startsWith('notif-live')) type = 'live';
    else if (id.startsWith('notif-job') || id.startsWith('notif-plres')) type = 'placement';
    else if (id.startsWith('notif-badge') || id.startsWith('notif-reward') || id.startsWith('notif-cert')) type = 'achievement';
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

export async function fetchAnnouncements() {
  return cachedQuery('announcements', async () => {
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
  });
}

export async function fetchNotifications(studentId: string, opts?: { forceFresh?: boolean; limit?: number }) {
  if (!studentId || studentId === 'guest') return [];
  if (opts?.forceFresh) {
    invalidateCache(`notifications:${studentId}`);
  }
  const rowLimit = opts?.limit ?? 50;
  return cachedQuery(`notifications:${studentId}:${rowLimit}`, async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(rowLimit);

      if (error) {
        console.warn('notifications table not available:', error.message);
        return [];
      }
      return (data || []).map(normalizeNotification);
    } catch {
      return [];
    }
  }, 15_000); // 15 seconds
}

export async function persistNotification(n: {
  id: string;
  studentId: string;
  title: string;
  content?: string;
  createdAt?: string;
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
          created_at: n.createdAt || new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    if (error) {
      console.debug('persistNotification skipped:', error.message);
      return false;
    }
    invalidateCache(`notifications:${n.studentId}`);
    return true;
  } catch {
    return false;
  }
}

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

export async function updateNotificationReadStatus(id: string, read: boolean) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: read })
    .eq('id', id);

  if (error) {
    console.error('Error updating notification read status:', error);
    throw error;
  }
  invalidateCacheByPrefix('notifications:');
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
  invalidateCache(`notifications:${studentId}`);
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
  invalidateCacheByPrefix('notifications:');
  return data;
}
