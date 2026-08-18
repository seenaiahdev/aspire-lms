import { Trophy, Flame, Zap, Lock, Sparkles, ArrowLeft, Award, Linkedin } from 'lucide-react';
import { badges } from '@/data/mock';
import { useUser } from '@/lib/UserContext';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

const rarityConfig: Record<string, { ring: string; bg: string; text: string; label: string }> = {
  common: { ring: 'ring-slate-200', bg: 'bg-slate-100', text: 'text-slate-600', label: 'Common' },
  rare: { ring: 'ring-blue-300', bg: 'bg-blue-100', text: 'text-blue-600', label: 'Rare' },
  epic: { ring: 'ring-purple-300', bg: 'bg-purple-100', text: 'text-purple-600', label: 'Epic' },
  legendary: { ring: 'ring-amber-300', bg: 'bg-amber-100', text: 'text-amber-600', label: 'Legendary' },
};

const badgeMedalStyles: Record<string, { bg: string; border: string; glow: string; icon: string }> = {
  b1: {
    bg: 'bg-gradient-to-br from-blue-500 via-indigo-600 to-indigo-800',
    border: 'border-4 border-slate-100 ring-2 ring-indigo-400',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    icon: 'text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
  },
  b2: {
    bg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-600',
    border: 'border-4 border-amber-200 ring-2 ring-orange-400',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.65)]',
    icon: 'text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)] animate-pulse'
  },
  b3: {
    bg: 'bg-gradient-to-br from-red-500 via-rose-600 to-rose-800',
    border: 'border-4 border-rose-200 ring-2 ring-rose-400',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.55)]',
    icon: 'text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
  },
  b4: {
    bg: 'bg-gradient-to-br from-teal-400 via-emerald-500 to-emerald-700',
    border: 'border-4 border-emerald-100 ring-2 ring-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.55)]',
    icon: 'text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
  },
  b5: {
    bg: 'bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-800',
    border: 'border-4 border-yellow-400 ring-2 ring-purple-400',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.7)]',
    icon: 'text-yellow-300 drop-shadow-[0_2px_8px_rgba(253,224,71,0.5)]'
  },
  b6: {
    bg: 'bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700',
    border: 'border-4 border-sky-100 ring-2 ring-sky-300',
    glow: 'shadow-[0_0_15px_rgba(56,189,248,0.5)]',
    icon: 'text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
  },
  b7: {
    bg: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600',
    border: 'border-4 border-slate-100 ring-2 ring-blue-300',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.5)]',
    icon: 'text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
  },
  b8: {
    bg: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900',
    border: 'border-4 border-amber-400 ring-2 ring-amber-300',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.65)]',
    icon: 'text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]'
  }
};

export function AchievementsScreen() {
  const { user: currentUser } = useUser();
  const { navigate } = useNav();

  // Dynamic calculations based on user's real-time stats
  const totalXP = (currentUser.xp || 0) * 15;
  const level = Math.floor(totalXP / 500) + 1;
  const progressRingValue = ((totalXP % 500) / 500) * 100;
  const xpToNextLevel = 500 - (totalXP % 500);

  const dynamicBadges = badges.map((badge) => {
    let earned = false;
    if (badge.id === 'b1') {
      // Fast Learner: progress > 0
      earned = currentUser.xp > 0;
    } else if (badge.id === 'b2') {
      // Streak Master: streak >= 30
      earned = (currentUser.streak || 0) >= 30;
    } else if (badge.id === 'b3') {
      // Quiz Champion: XP >= 200
      earned = totalXP >= 200;
    } else if (badge.id === 'b4') {
      // Helping Hand: XP >= 400
      earned = totalXP >= 400;
    } else if (badge.id === 'b5') {
      // Code Wizard: XP >= 600
      earned = totalXP >= 600;
    } else if (badge.id === 'b6') {
      // Early Bird: streak >= 10
      earned = (currentUser.streak || 0) >= 10;
    } else if (badge.id === 'b7') {
      // Team Player: XP >= 800
      earned = totalXP >= 800;
    } else if (badge.id === 'b8') {
      // Perfectionist: XP >= 1000
      earned = totalXP >= 1000;
    }

    return {
      ...badge,
      earned,
      date: earned ? 'Aug 17' : undefined,
    };
  });

  const earnedCount = dynamicBadges.filter(b => b.earned).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('profile')}
          className="w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer text-slate-600 shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-display font-bold text-2xl text-ink-900">Achievements</h2>
          <p className="text-ink-500 text-sm mt-1">Your badges, streaks, and stats tracker</p>
        </div>
      </div>

      {/* XP & Level Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 text-center flex flex-col items-center justify-center">
          <ProgressRing value={currentUser.xp || 0} size={120} strokeWidth={10} showLabel={true} color="stroke-[#7c3aed]" className="mb-3 text-[#7c3aed] text-lg font-black" />
          <p className="text-3xl font-bold text-ink-900 font-display">Level {level}</p>
          <p className="text-sm text-ink-500">{totalXP.toLocaleString()} XP</p>
          <p className="text-xs text-ink-400 mt-1">{xpToNextLevel} XP to Level {level + 1}</p>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-error-100 flex items-center justify-center mb-3">
            <Flame className="w-8 h-8 text-error-600" />
          </div>
          <p className="text-3xl font-bold text-ink-900 font-display">{currentUser.streak || 0}</p>
          <p className="text-sm text-ink-500">Day Streak</p>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-3">
            <Award className="w-8 h-8 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-ink-900 font-display">{earnedCount} / {dynamicBadges.length}</p>
          <p className="text-sm text-ink-500">Badges Unlocked</p>
          <Badge variant="success" className="mt-2">Keep Leveling Up!</Badge>
        </Card>
      </div>

      {/* Badges */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-ink-900 text-lg">Badges</h3>
          <span className="text-sm text-ink-500">{earnedCount} of {dynamicBadges.length} earned</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {dynamicBadges.map((badge) => {
            const Icon = (Icons as any)[badge.icon] as Icons.LucideIcon;
            const rarity = rarityConfig[badge.rarity];
            return (
              <Card key={badge.id} hover className={cn('p-5 text-center flex flex-col items-center justify-between border border-slate-100 rounded-[2rem] bg-white transition-all', !badge.earned && 'opacity-50')}>
                <div className="w-full flex flex-col items-center">
                  <div className={cn(
                    'w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all relative shrink-0',
                    badge.earned 
                      ? `${badgeMedalStyles[badge.id]?.bg} ${badgeMedalStyles[badge.id]?.border} ${badgeMedalStyles[badge.id]?.glow}` 
                      : 'bg-slate-100 border-4 border-slate-200 shadow-inner'
                  )}>
                    {/* Glowing highlight reflection for 3D effect */}
                    {badge.earned && (
                      <div className="absolute top-1 left-3 w-6 h-3 bg-white/25 rounded-full blur-[1px] rotate-[-15deg] pointer-events-none" />
                    )}
                    {badge.earned ? (
                      <Icon className={cn('w-9 h-9', badgeMedalStyles[badge.id]?.icon)} />
                    ) : (
                      <Lock className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <p className="font-extrabold text-slate-900 text-sm mb-1">{badge.name}</p>
                  <p className="text-xs font-semibold text-slate-500 mb-3 px-2 line-clamp-2 min-h-[32px]">{badge.description}</p>
                </div>
                <div className="w-full space-y-1">
                  <Badge variant={badge.earned ? (badge.rarity === 'legendary' ? 'primary' : badge.rarity === 'epic' ? 'secondary' : badge.rarity === 'rare' ? 'accent' : 'default') : 'default'} size="sm">
                    {badge.earned ? rarity.label : 'Locked'}
                  </Badge>
                  {badge.earned && badge.date && <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-wider">Earned {badge.date}</p>}
                </div>
                
                {badge.earned && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      let achievementDetails = "";
                      if (badge.id === 'b1') {
                        achievementDetails = "Completing 5 lessons in a single day was an exciting milestone on my learning journey!";
                      } else if (badge.id === 'b2') {
                        achievementDetails = "Maintaining a 30-day streak of active learning has been a fantastic way to build strong coding habits!";
                      } else if (badge.id === 'b3') {
                        achievementDetails = "Scoring 90% or higher on 10 quizzes has really pushed me to master the core concepts!";
                      } else if (badge.id === 'b4') {
                        achievementDetails = "Answering 50 community doubts and helping fellow developers has been an incredibly rewarding experience.";
                      } else if (badge.id === 'b5') {
                        achievementDetails = "Solving 100 coding problems has significantly leveled up my problem-solving and algorithmic thinking!";
                      } else if (badge.id === 'b6') {
                        achievementDetails = "Starting my study sessions before 7 AM for a whole week has built amazing discipline.";
                      } else if (badge.id === 'b7') {
                        achievementDetails = "Collaborating to complete 5 group projects taught me hands-on teamwork and software architecture.";
                      } else if (badge.id === 'b8') {
                        achievementDetails = "Achieving a perfect score of 100 on 5 assignments shows the high standards of execution I strive for!";
                      }

                      const postText = `Thrilled to share that I have just unlocked the "${badge.name}" badge on AspireNext LMS! 🎓✨\n\n${achievementDetails} AspireNext has been an incredible platform, providing industry-ready skills and an amazing learning experience! 🚀\n\nIf you are looking to elevate your career and master Python, Full Stack, DSA, or AI, I highly recommend checking out AspireNext!\n\n#AspireNext #LMS #ContinuousLearning #Upskilling #${badge.name.replace(/\s+/g, '')} #CareerGrowth #TechEducation`;
                      const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(postText)}`;
                      window.open(shareUrl, '_blank');
                    }}
                    className="mt-3 w-full py-1.5 px-3 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all"
                  >
                    <Linkedin className="w-3.5 h-3.5 shrink-0" /> Share
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
