import { useState, useEffect } from 'react';
import { Award, ShieldCheck, Lock, Loader2, Linkedin } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { useNotifications } from '@/lib/NotificationsContext';
import { fetchBadges, fetchUserSubmissions, fetchAssignmentAttempts } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Opens a LinkedIn share composer pre-filled with the earned badge. */
function shareBadgeOnLinkedIn(badgeName: string) {
  const postText = `Thrilled to share that I have just unlocked the "${badgeName}" badge on AspireNext LMS! 🎓✨\n\nAspireNext has been an incredible platform, providing industry-ready skills and an amazing learning experience! 🚀\n\nIf you are looking to elevate your career and master Python, Full Stack, DSA, or AI, I highly recommend checking out AspireNext!\n\n#AspireNext #LMS #ContinuousLearning #Upskilling #${badgeName.replace(/\s+/g, '')} #CareerGrowth #TechEducation`;
  const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(postText)}`;
  window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

const badgeMedalStyles: Record<string, { bg: string; border: string; glow: string; icon: string }> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 via-indigo-600 to-indigo-800',
    border: 'border-2 border-white ring-1 ring-indigo-400',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.4)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-600',
    border: 'border-2 border-white ring-1 ring-orange-400',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.5)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)] animate-pulse'
  },
  rose: {
    bg: 'bg-gradient-to-br from-red-500 via-rose-600 to-rose-800',
    border: 'border-2 border-white ring-1 ring-rose-400',
    glow: 'shadow-[0_0_10px_rgba(244,63,94,0.45)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  emerald: {
    bg: 'bg-gradient-to-br from-teal-400 via-emerald-500 to-emerald-700',
    border: 'border-2 border-white ring-1 ring-emerald-400',
    glow: 'shadow-[0_0_10px_rgba(16,185,129,0.45)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  purple: {
    bg: 'bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-800',
    border: 'border-2 border-white ring-1 ring-purple-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.55)]',
    icon: 'text-yellow-300 drop-shadow-[0_1px_4px_rgba(253,224,71,0.5)]'
  },
  sky: {
    bg: 'bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700',
    border: 'border-2 border-white ring-1 ring-sky-300',
    glow: 'shadow-[0_0_8px_rgba(56,189,248,0.4)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600',
    border: 'border-2 border-white ring-1 ring-blue-300',
    glow: 'shadow-[0_0_8px_rgba(6,182,212,0.4)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900',
    border: 'border-2 border-white ring-1 ring-amber-300',
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.5)]',
    icon: 'text-amber-400 drop-shadow-[0_1px_4px_rgba(251,191,36,0.5)]'
  }
};

/** Decide whether a student has earned a badge from its free-text criteria + their activity. */
function evaluateBadgeCriteria(
  badge: any,
  user: any,
  submissions: any[],
  assignmentSubmissions: any[]
): boolean {
  if (!badge.criteria) return false;
  const criteria = badge.criteria.toLowerCase();

  if (criteria.includes('streak')) {
    const match = criteria.match(/\d+/);
    const requiredStreak = match ? parseInt(match[0], 10) : 10;
    return (user.streak || 0) >= requiredStreak;
  }

  if (criteria.includes('score') || criteria.includes('assessment') || criteria.includes('quiz') || criteria.includes('test')) {
    const scoreMatch = criteria.match(/(\d+)%/);
    const requiredScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 70;
    return (assignmentSubmissions || []).some((a) => (a.grade || 0) >= requiredScore);
  }

  if (criteria.includes('problem') || criteria.includes('coding') || criteria.includes('solve') || criteria.includes('project')) {
    const match = criteria.match(/\d+/);
    const requiredCount = match ? parseInt(match[0], 10) : 5;
    const uniqueSolved = new Set((submissions || []).filter(s => s.status === 'solved' || s.language === 'project').map(s => s.problem_id)).size;
    return uniqueSolved >= requiredCount;
  }

  if (criteria.includes('completion') || criteria.includes('progress') || criteria.includes('complete')) {
    const match = criteria.match(/\d+/);
    const requiredProgress = match ? parseInt(match[0], 10) : 100;
    return (user.progress || 0) >= requiredProgress;
  }

  if (criteria.includes('attendance') || criteria.includes('attend')) {
    const match = criteria.match(/\d+/);
    const requiredAttendance = match ? parseInt(match[0], 10) : 75;
    return (user.attendance || 0) >= requiredAttendance;
  }

  if (criteria.includes('xp') || criteria.includes('points')) {
    const match = criteria.match(/\d+/);
    const requiredXP = match ? parseInt(match[0], 10) : 100;
    return (user.xp || 0) >= requiredXP;
  }

  // Unrecognized criteria are NOT auto-earned.
  return false;
}

/**
 * The Badges tab content (moved out of the Profile screen). Shows every badge with an
 * earned/locked state and an "N of M unlocked" summary. Self-contained: fetches its own data.
 */
export function BadgesPanel() {
  const { user } = useUser();
  const { addNotification } = useNotifications();
  const [badges, setBadges] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [b, s, a] = await Promise.all([
          fetchBadges(),
          user?.id ? fetchUserSubmissions(user.id) : Promise.resolve([]),
          user?.id ? fetchAssignmentAttempts(user.id) : Promise.resolve([]),
        ]);
        if (!active) return;
        setBadges(b || []);
        setSubmissions(s || []);
        setAttempts(a || []);
      } catch (err) {
        console.error('Failed to load badges:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id]);

  const evaluated = badges
    .map((b) => ({ ...b, earned: evaluateBadgeCriteria(b, user, submissions, attempts) }))
    .sort((a, b) => Number(b.earned) - Number(a.earned));
  const earnedCount = evaluated.filter((b) => b.earned).length;

  // Notify the student when a badge becomes newly unlocked (baseline silently on first load so we
  // don't back-fill notifications for badges earned before this ran).
  useEffect(() => {
    const sid = user?.id;
    if (!sid || sid === 'guest' || loading || badges.length === 0) return;
    const earnedIds = badges
      .filter((b) => evaluateBadgeCriteria(b, user, submissions, attempts))
      .map((b) => b.id);
    const key = `aspire_seen_badges_${sid}`;
    let seen: string[] | null = null;
    try { seen = JSON.parse(localStorage.getItem(key) || 'null'); } catch { seen = null; }
    if (seen === null) {
      try { localStorage.setItem(key, JSON.stringify(earnedIds)); } catch {}
      return;
    }
    const seenSet = new Set(seen);
    const newly = earnedIds.filter((id) => !seenSet.has(id));
    if (newly.length > 0) {
      newly.forEach((id) => {
        const b = badges.find((x) => x.id === id);
        addNotification(
          {
            id: `notif-badge-${id}-${sid}`,
            student_id: sid, type: 'achievement',
            title: 'Badge unlocked! 🏅',
            message: `You earned the "${b?.name || 'new'}" badge.`,
            read: false, created_at: new Date().toISOString(),
          },
          { showToast: true, persistDb: true }
        );
      });
      try { localStorage.setItem(key, JSON.stringify(earnedIds)); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges, submissions, attempts, loading, user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[2rem] bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center border border-purple-100 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">Achievement Badges</h3>
            <p className="text-xs text-slate-500 font-medium">Earn badges by keeping streaks, acing assessments, and completing coursework.</p>
          </div>
        </div>
        <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white font-black text-xs shadow-md shrink-0 text-center">
          {earnedCount} / {evaluated.length} Unlocked
        </div>
      </div>

      {evaluated.length === 0 ? (
        <div className="text-center py-16 space-y-2 bg-white rounded-[2rem] border border-slate-200/80">
          <ShieldCheck className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">No badges configured yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {evaluated.map((badge) => {
            const Icon = ((Icons as any)[badge.icon] || (Icons as any)[badge.icon?.charAt(0).toUpperCase() + badge.icon?.slice(1)] || Icons.Award) as Icons.LucideIcon;
            const medalStyle = badgeMedalStyles[badge.color || 'blue'] || badgeMedalStyles.blue;
            const earned = badge.earned;

            return (
              <div
                key={badge.id}
                className={cn(
                  'relative flex flex-col items-center text-center p-5 rounded-[1.6rem] border transition-all bg-white',
                  earned ? 'border-purple-200/80 shadow-sm hover:shadow-md' : 'border-slate-200/80 opacity-80'
                )}
              >
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mb-3 relative shrink-0 transition-transform',
                  earned ? cn(medalStyle.bg, medalStyle.border, medalStyle.glow, 'hover:scale-110') : 'bg-slate-100 border-2 border-white ring-1 ring-slate-200'
                )}>
                  {earned && <div className="absolute top-1 left-2.5 w-4 h-1.5 bg-white/20 rounded-full blur-[0.5px] rotate-[-15deg] pointer-events-none" />}
                  {earned
                    ? <Icon className={cn('w-8 h-8', medalStyle.icon)} />
                    : <Lock className="w-6 h-6 text-slate-400" />}
                </div>
                <span className={cn('text-[11px] font-black uppercase tracking-wider leading-tight line-clamp-2', earned ? 'text-slate-800' : 'text-slate-400')}>
                  {badge.name}
                </span>
                {badge.criteria && (
                  <span className="text-[10px] font-medium text-slate-400 mt-1 line-clamp-2 leading-snug">{badge.criteria}</span>
                )}
                <span className={cn(
                  'mt-2.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide',
                  earned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                )}>
                  {earned ? 'Unlocked' : 'Locked'}
                </span>

                {earned && (
                  <button
                    onClick={() => shareBadgeOnLinkedIn(badge.name)}
                    className="mt-3 w-full py-1.5 px-3 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all"
                  >
                    <Linkedin className="w-3.5 h-3.5 shrink-0" /> Share
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BadgesPanel;
