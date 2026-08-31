export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Parse a live-session start time into a Date, using the DB date + time.
 * Handles the admin formats: "06:00 - 07:30 PM", "10:00 AM", "14:30", "10:00:00".
 * Returns null if it can't be parsed.
 */
export function parseSessionStart(dateStr: string, timeStr?: string): Date | null {
  if (!dateStr) return null;
  let hhmmss = '00:00:00';
  if (timeStr) {
    const parts = String(timeStr).split('-');
    const startPart = (parts[0] || '').trim();     // "06:00"
    const endPart = (parts[1] || '').trim();       // "07:30 PM"
    const isPM = /pm/i.test(endPart) || /pm/i.test(startPart);
    const isAM = /am/i.test(endPart) || /am/i.test(startPart);
    const m = startPart.match(/(\d{1,2}):(\d{2})/);
    if (m) {
      let hours = parseInt(m[1], 10);
      const minutes = m[2];
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      hhmmss = `${String(hours).padStart(2, '0')}:${minutes}:00`;
    }
  }
  const d = new Date(`${dateStr}T${hhmmss}`);
  return isNaN(d.getTime()) ? null : d;
}

/** Convert a duration label like "1h 30m" / "45m" / "2h" to minutes (default 90). */
export function durationToMinutes(duration?: string, fallback = 90): number {
  if (!duration) return fallback;
  const h = String(duration).match(/(\d+)\s*h/i);
  const mm = String(duration).match(/(\d+)\s*m/i);
  const total = (h ? parseInt(h[1], 10) : 0) * 60 + (mm ? parseInt(mm[1], 10) : 0);
  return total > 0 ? total : fallback;
}

export interface LiveClassStatus {
  status: 'upcoming' | 'ongoing' | 'completed';
  /** True when the student may join now (from `leadMinutes` before start through end). */
  joinable: boolean;
}

/**
 * Resolve a live session's status from the DB date/time/duration. A class becomes
 * `ongoing`/joinable `leadMinutes` (default 10) BEFORE its start time and stays so until it ends.
 */
export function resolveLiveClassStatus(
  dateStr: string,
  timeStr?: string,
  duration?: string,
  rawStatus?: string,
  leadMinutes = 10,
  now: Date = new Date()
): LiveClassStatus {
  const raw = String(rawStatus || '').toLowerCase();
  const start = parseSessionStart(dateStr, timeStr);
  if (!start) {
    if (raw === 'completed') return { status: 'completed', joinable: false };
    if (raw === 'ongoing') return { status: 'ongoing', joinable: true };
    return { status: 'upcoming', joinable: false };
  }
  const end = new Date(start.getTime() + durationToMinutes(duration) * 60000);
  const joinOpen = new Date(start.getTime() - leadMinutes * 60000);
  const t = now.getTime();
  if (raw === 'completed' || t > end.getTime()) return { status: 'completed', joinable: false };
  if (t >= joinOpen.getTime() && t <= end.getTime()) return { status: 'ongoing', joinable: true };
  return { status: 'upcoming', joinable: false };
}

/**
 * Format a student's batch code for display (e.g. extracts "S1", "S2", "W1", "W2", stripping "A26" prefixes).
 */
export function formatBatchDisplay(batchCode?: string, registrationId?: string): string {
  if (batchCode) {
    const stripped = batchCode.replace(/^A\d+[-_]?/i, '').trim();
    if (stripped) {
      return stripped.toUpperCase();
    }
  }
  
  if (registrationId) {
    const strippedReg = registrationId.replace(/^A\d+[-_]?/i, '').trim();
    const matchWithNum = strippedReg.match(/^([a-zA-Z]+)[-_]?([1-9])/);
    if (matchWithNum) {
      return `${matchWithNum[1]}${matchWithNum[2]}`.toUpperCase();
    }
    const letterMatch = strippedReg.match(/^([a-zA-Z]+)/);
    if (letterMatch) {
      const letters = letterMatch[1].toUpperCase();
      return letters.length === 1 ? `${letters}1` : letters;
    }
  }

  return 'S1';
}

