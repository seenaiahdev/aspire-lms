import { supabase } from './supabase';

export const ACTIVE_SESSION_STORAGE_KEY = 'aspire_active_session_id';
export const KICKED_OUT_REASON_KEY = 'aspire_kicked_out_reason';

export interface ActiveSessionInfo {
  activeSessionId: string;
  deviceLabel: string;
  activeAt: string | null;
}

/** Returns a concise human-readable browser and OS label for session conflict prompts. */
export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  let os = 'Desktop';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
}

/** Generates a unique session ID for the current browser login. */
export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sess-${crypto.randomUUID()}`;
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getLocalSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLocalSessionId(sessionId: string): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
  } catch {}
}

export function clearLocalSessionId(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {}
}

/**
 * Fetches the student's currently active session from Supabase via SECURITY DEFINER RPC.
 * Returns null if no active session exists or if the migration has not been applied yet.
 */
export async function getActiveSessionInfo(studentId: string): Promise<ActiveSessionInfo | null> {
  if (!studentId || studentId === 'guest') return null;
  try {
    const { data, error } = await supabase.rpc('get_student_active_session', {
      p_student_id: studentId,
    });
    if (error || !data) return null;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.active_session_id) return null;

    return {
      activeSessionId: String(row.active_session_id),
      deviceLabel: String(row.active_session_device || 'Another device'),
      activeAt: row.active_session_at || null,
    };
  } catch {
    return null;
  }
}

/**
 * Atomically claims the single active session for this student in Supabase and stores it locally.
 */
export async function claimActiveSession(studentId: string, sessionId?: string): Promise<string> {
  const newSessionId = sessionId || generateSessionId();
  setLocalSessionId(newSessionId);

  if (!studentId || studentId === 'guest') return newSessionId;
  try {
    await supabase.rpc('claim_student_session', {
      p_student_id: studentId,
      p_session_id: newSessionId,
      p_device_label: getDeviceLabel(),
    });
  } catch (err) {
    console.warn('claim_student_session RPC skipped:', err);
  }
  return newSessionId;
}

/**
 * Clears the student's active session in Supabase on manual logout (only if it matches local session).
 */
export async function clearActiveSession(studentId?: string | null, sessionId?: string | null): Promise<void> {
  const sid = studentId || '';
  const sess = sessionId || getLocalSessionId() || '';
  clearLocalSessionId();

  if (!sid || sid === 'guest' || !sess) return;
  try {
    await supabase.rpc('clear_student_session', {
      p_student_id: sid,
      p_session_id: sess,
    });
  } catch (err) {
    console.warn('clear_student_session RPC skipped:', err);
  }
}
