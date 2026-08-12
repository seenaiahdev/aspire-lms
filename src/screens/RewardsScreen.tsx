import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Gift, Sparkles, Lock, Unlock, CheckCircle2, Award, ShoppingBag, ArrowRight, Package, Truck, X, ShieldCheck
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { triggerFileDownload } from '@/lib/downloadHelper';
import { useNav } from '@/lib/nav';
import { cn } from '@/lib/utils';
import aspireLogo from '@/assests/Aspire_logo.jpg';
import aspireBackpackImg from '@/assests/media_1786109472875.jpg';

export interface SwagReward {
  id: string;
  name: string;
  category: string;
  description: string;
  currentXp: number;
  requiredXp: number;
  isUnlocked: boolean; // Unlocked item is the Bag
  productImage: string;
  tag: string;
}

const swagRewardsList: SwagReward[] = [
  {
    id: 'r1',
    name: 'Locked Reward (Coming Soon)',
    category: 'Locked',
    description: 'Locked Reward',
    currentXp: 0,
    requiredXp: 1200,
    isUnlocked: false,
    productImage: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80',
    tag: '0% COMPLETED',
  },
  {
    id: 'r2',
    name: 'Locked Reward (Coming Soon)',
    category: 'Locked',
    description: 'Locked Reward',
    currentXp: 0,
    requiredXp: 750,
    isUnlocked: false,
    productImage: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=800&q=80',
    tag: '0% COMPLETED',
  },
  {
    id: 'r3',
    name: 'Locked Reward (Coming Soon)',
    category: 'Locked',
    description: 'Locked Reward',
    currentXp: 0,
    requiredXp: 1000,
    isUnlocked: false,
    productImage: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
    tag: '0% COMPLETED',
  },
  {
    id: 'r4',
    name: 'Locked Reward (Coming Soon)',
    category: 'Locked',
    description: 'Locked Reward',
    currentXp: 0,
    requiredXp: 2000,
    isUnlocked: false,
    productImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    tag: '0% COMPLETED',
  },
  {
    id: 'r5',
    name: 'Locked Reward (Coming Soon)',
    category: 'Locked',
    description: 'Locked Reward',
    currentXp: 0,
    requiredXp: 5000,
    isUnlocked: false,
    productImage: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    tag: '0% COMPLETED',
  },
  {
    id: 'r6',
    name: 'Locked Reward (Coming Soon)',
    category: 'Locked',
    description: 'Locked Reward',
    currentXp: 0,
    requiredXp: 3000,
    isUnlocked: false,
    productImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    tag: '0% COMPLETED',
  }
];

function CircularRewardLock({ progress, size = 76 }: { progress: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {/* SVG Circular Progress Ring */}
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-purple-500/20"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-[#7c3aed] transition-all duration-700 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      {/* Center Lock Icon */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-full border border-purple-400/40 m-1 shadow-md">
        <Lock className="w-6 h-6 text-purple-300 drop-shadow-sm" />
      </div>
    </div>
  );
}

export function RewardsScreen() {
  const { navigate } = useNav();
  const [rewardsState, setRewardsState] = useState<SwagReward[]>(swagRewardsList);
  const [selectedReward, setSelectedReward] = useState<SwagReward | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);

  const unlockedCount = rewardsState.filter(r => r.isUnlocked).length;
  const lockedCount = rewardsState.filter(r => !r.isUnlocked).length;

  const handleClaimReward = (reward: SwagReward) => {
    setClaimedId(reward.id);
    setToastMessage(`Congratulations! ${reward.name} claimed successfully! Free campus shipping dispatched. 🚚🎁`);
  };

  return (
    <div className="space-y-6 font-sans pb-12 animate-fade-in">
      
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} position="top-right" />
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-[2rem] bg-white border border-slate-200/90 shadow-xs">
        <div>
          <span className="inline-block px-3 py-1 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider mb-2">
            STUDENT MERCHANDISE & SWAG STORE
          </span>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            AspireNext Rewards & Merchandise
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Earn XP points by solving coding practice problems, completing quizzes, and finishing course modules to unlock official branded merchandise.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white font-black text-xs shadow-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span>0 Total Student XP</span>
          </div>
        </div>
      </div>

      {/* Top 2 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Unlocked */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
            <Gift className="w-5.5 h-5.5 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{unlockedCount} Reward Unlocked</p>
            <p className="text-xs font-extrabold text-[#7c3aed]">Ready to Claim</p>
          </div>
        </Card>

        {/* Locked */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
            <Lock className="w-5.5 h-5.5 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{lockedCount} Locked Rewards</p>
            <p className="text-xs font-extrabold text-[#7c3aed]">Locked (XP Milestones)</p>
          </div>
        </Card>

      </div>


      {/* ════════ PRODUCTS REWARDS GRID ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewardsState.map((reward) => {
          const progressPercent = Math.round((reward.currentXp / reward.requiredXp) * 100);
          const isClaimed = claimedId === reward.id;

          return (
            <Card
              key={reward.id}
              className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-200/90 shadow-sm transition-all duration-300 flex flex-col justify-between group min-h-[380px]"
            >
              
              {/* ── CARD CONTENT (BLURRED IF LOCKED) ── */}
              <div className={cn("flex flex-col h-full justify-between transition-all duration-500", !reward.isUnlocked && "blur-[3px] opacity-40 select-none pointer-events-none")}>
                
                {/* Full Seamless Edge-to-Edge Image Header */}
                <div className="relative h-60 w-full overflow-hidden shrink-0 bg-slate-100">
                  <img
                    src={reward.productImage}
                    alt={reward.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Status Chip */}
                  <div className="absolute top-3 right-3 z-20">
                    {reward.isUnlocked ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> UNLOCKED DEMO
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                        LOCKED ({progressPercent}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-black text-[#7c3aed] uppercase bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        {reward.category}
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {reward.requiredXp} XP
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                      {reward.name}
                    </h3>
                  </div>

                  {/* Unlocked Actions */}
                  <div className="pt-3 border-t border-slate-100 mt-auto">
                    {isClaimed ? (
                      <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Claimed & Shipping Dispatched!</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClaimReward(reward); }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 text-amber-300" />
                        <span>Claim Swag Reward</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* ── FULL CARD BLURRED OVERLAY WHEN LOCKED (DEAD CENTER OF ENTIRE CARD) ── */}
              {!reward.isUnlocked && (
                <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center text-white space-y-3.5 animate-fade-in">
                  
                  {/* SVG Circular Progress Ring with Lock Icon in Center */}
                  <CircularRewardLock progress={progressPercent} size={80} />

                  <div className="max-w-xs space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[11px] font-black uppercase tracking-wider">
                      <span>LOCKED REWARD</span>
                      <span className="text-white">({reward.currentXp} / {reward.requiredXp} XP)</span>
                    </div>

                    <h4 className="font-extrabold text-sm sm:text-base text-white leading-snug line-clamp-2">
                      {reward.name}
                    </h4>

                  </div>

                </div>
              )}

            </Card>
          );
        })}
      </div>


      {/* ════════ PRODUCT DETAILS & CLAIM MODAL ════════ */}
      {selectedReward && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans cursor-default overflow-y-auto animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedReward(null); }}
        >
          <div className="w-full max-w-xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col justify-between animate-scale-up relative my-auto">
            
            {/* Sticky Close Button */}
            <button
              onClick={() => setSelectedReward(null)}
              className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Product Header Image (Seamless Edge-to-Edge Modern Design) */}
            <div className="relative h-80 w-full overflow-hidden shrink-0 bg-slate-100">
              <img src={selectedReward.productImage} alt={selectedReward.name} className="w-full h-full object-cover" />
            </div>

            {/* Product Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-[#7c3aed] uppercase bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                  {selectedReward.category}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 pt-2 leading-tight">
                  {selectedReward.name}
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Required XP</p>
                  <p className="text-base font-black text-slate-900 mt-0.5">{selectedReward.requiredXp} XP</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Student XP</p>
                  <p className="text-base font-black text-[#7c3aed] mt-0.5">{selectedReward.currentXp} XP</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Campus Delivery</p>
                  <p className="text-xs font-extrabold text-emerald-600 mt-0.5 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Free Express
                  </p>
                </div>
              </div>

              {!selectedReward.isUnlocked && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
                  <div className="flex items-center gap-2 text-[#7c3aed] font-extrabold text-xs">
                    <Lock className="w-4 h-4 text-[#7c3aed]" />
                    <span>Reward Currently Locked</span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    Earn <strong>{selectedReward.requiredXp - selectedReward.currentXp} more XP</strong> by completing lessons, solving coding practice questions, or submitting projects in AspireLMS to unlock this item.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedReward(null)}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-xs transition-colors"
              >
                Close
              </button>

              {selectedReward.isUnlocked ? (
                <button
                  onClick={() => { handleClaimReward(selectedReward); setSelectedReward(null); }}
                  className="flex-1 py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-300" />
                  <span>Confirm & Claim Swag Reward</span>
                </button>
              ) : (
                <button
                  onClick={() => { setSelectedReward(null); navigate('practice'); }}
                  className="flex-1 py-2.5 px-5 rounded-xl bg-slate-200 hover:bg-purple-50 text-slate-700 hover:text-[#7c3aed] font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                  <span>Earn XP in Practice Lab</span>
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

export default RewardsScreen;
