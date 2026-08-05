import React from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNav } from '@/lib/nav';

export function RewardsScreen() {
  return (
    <div className="max-w-5xl mx-auto py-20 px-6 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="rounded-3xl bg-white p-10 shadow-md text-center">
          <div className="mx-auto w-28 h-28 rounded-full bg-primary-50 flex items-center justify-center mb-6">
            <Gift className="w-12 h-12 text-primary-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Rewards</h1>
          <p className="text-slate-500 mb-6">We're building a rewards system to celebrate milestones, streaks, and top contributors.</p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" size="md">Notify Me</Button>
            <RewardExplore />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-md">
          <h3 className="text-lg font-semibold mb-3">Planned features</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 mt-1" />
              <div>
                <div className="font-medium">Tiered rewards</div>
                <div className="text-xs">Badges, points and redeemable perks for active learners.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 mt-1" />
              <div>
                <div className="font-medium">Progress milestones</div>
                <div className="text-xs">Celebrate course completions and streaks with special rewards.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-sky-400 mt-1" />
              <div>
                <div className="font-medium">Leaderboard & challenges</div>
                <div className="text-xs">Compete with peers and earn seasonal prizes.</div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RewardsScreen;

function RewardExplore() {
  const { navigate } = useNav();
  return (
    <Button variant="ghost" size="md" onClick={() => navigate('learning')}>
      Explore Courses
    </Button>
  );
}
