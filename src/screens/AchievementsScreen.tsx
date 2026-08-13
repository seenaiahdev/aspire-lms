import { Trophy, Flame, Zap, Star, TrendingUp, TrendingDown, Minus, Lock, Sparkles } from 'lucide-react';
import { badges, leaderboard } from '@/data/mock';
import { useUser } from '@/lib/UserContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

const rarityConfig: Record<string, { ring: string; bg: string; text: string; label: string }> = {
  common: { ring: 'ring-ink-200', bg: 'bg-ink-100', text: 'text-ink-600', label: 'Common' },
  rare: { ring: 'ring-accent-300', bg: 'bg-accent-100', text: 'text-accent-600', label: 'Rare' },
  epic: { ring: 'ring-secondary-300', bg: 'bg-secondary-100', text: 'text-secondary-600', label: 'Epic' },
  legendary: { ring: 'ring-primary-300', bg: 'bg-primary-100', text: 'text-primary-600', label: 'Legendary' },
};

export function AchievementsScreen() {
  const { user: currentUser } = useUser();
  const earned = badges.filter(b => b.earned);
  const totalXP = currentUser.xp;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink-900">Achievements</h2>
        <p className="text-ink-500 text-sm mt-1">Your badges, streaks, and leaderboard ranking</p>
      </div>

      {/* XP & Level Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <ProgressRing value={(totalXP % 500) / 500 * 100} size={120} strokeWidth={10} showLabel={false} className="mb-3" />
          <p className="text-3xl font-bold text-ink-900 font-display">Level {currentUser.level}</p>
          <p className="text-sm text-ink-500">{totalXP.toLocaleString()} XP</p>
          <p className="text-xs text-ink-400 mt-1">{500 - (totalXP % 500)} XP to Level {currentUser.level + 1}</p>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-error-100 flex items-center justify-center mb-3">
            <Flame className="w-8 h-8 text-error-600" />
          </div>
          <p className="text-3xl font-bold text-ink-900 font-display">{currentUser.streak}</p>
          <p className="text-sm text-ink-500">Day Streak</p>
          <Badge variant="error" className="mt-2">Personal Best: 52 days</Badge>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary-100 flex items-center justify-center mb-3">
            <Trophy className="w-8 h-8 text-secondary-600" />
          </div>
          <p className="text-3xl font-bold text-ink-900 font-display">#{currentUser.rank}</p>
          <p className="text-sm text-ink-500">Leaderboard Rank</p>
          <Badge variant="success" className="mt-2">Top 3!</Badge>
        </Card>
      </div>

      {/* Badges */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-ink-900 text-lg">Badges</h3>
          <span className="text-sm text-ink-500">{earned.length} of {badges.length} earned</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge) => {
            const Icon = (Icons as any)[badge.icon] as Icons.LucideIcon;
            const rarity = rarityConfig[badge.rarity];
            return (
              <Card key={badge.id} hover className={cn('p-5 text-center', !badge.earned && 'opacity-60')}>
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ring-2',
                  badge.earned ? `${rarity.bg} ${rarity.ring}` : 'bg-ink-100 ring-ink-200',
                )}>
                  {badge.earned ? <Icon className={cn('w-8 h-8', rarity.text)} /> : <Lock className="w-6 h-6 text-ink-400" />}
                </div>
                <p className="font-bold text-ink-900 text-sm mb-1">{badge.name}</p>
                <p className="text-xs text-ink-500 mb-2">{badge.description}</p>
                <Badge variant={badge.earned ? (badge.rarity === 'legendary' ? 'primary' : badge.rarity === 'epic' ? 'secondary' : badge.rarity === 'rare' ? 'accent' : 'default') : 'default'} size="sm">
                  {badge.earned ? rarity.label : 'Locked'}
                </Badge>
                {badge.earned && badge.date && <p className="text-2xs text-ink-400 mt-2">Earned {badge.date}</p>}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="font-bold text-ink-900 text-lg mb-4">Leaderboard</h3>
        <Card>
          <CardBody className="space-y-2">
            {leaderboard.map((entry) => (
              <div key={entry.rank} className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-colors',
                entry.name === currentUser.name ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-ink-50',
              )}>
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  entry.rank === 1 ? 'bg-secondary-400 text-white' :
                  entry.rank === 2 ? 'bg-ink-300 text-white' :
                  entry.rank === 3 ? 'bg-secondary-700 text-white' :
                  'bg-ink-100 text-ink-500',
                )}>{entry.rank}</span>
                <Avatar src={entry.avatar} name={entry.name} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-800">{entry.name}</p>
                  <p className="text-xs text-ink-500">Level {entry.level} · {entry.streak} day streak</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink-700">{entry.xp.toLocaleString()} XP</span>
                  {entry.trend === 'up' ? <TrendingUp className="w-4 h-4 text-success-500" /> :
                   entry.trend === 'down' ? <TrendingDown className="w-4 h-4 text-error-500" /> :
                   <Minus className="w-4 h-4 text-ink-300" />}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
