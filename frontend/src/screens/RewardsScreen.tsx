import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Gift, Sparkles, Lock, Unlock, CheckCircle2, Award, ShoppingBag, ArrowRight, Package, Truck, X, ShieldCheck, Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { triggerFileDownload } from '@/lib/downloadHelper';
import { useNav } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/UserContext';
import { fetchRewards } from '@/lib/api';
import { supabase } from '@/lib/supabase';

import { rewardsSteps } from '@/lib/tourSteps';
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
  isLocked?: boolean;
}

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
  const { user } = useUser();
  const [rewardsState, setRewardsState] = useState<SwagReward[]>([]);
  const [selectedReward, setSelectedReward] = useState<SwagReward | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const [lockedToast, setLockedToast] = useState(false);
  const [loading, setLoading] = useState(true);

  const userXp = user?.xp || 0;

  useEffect(() => {
    const loadRewards = async () => {
      try {
        const data = await fetchRewards();
        const enhanced = data.map((item: any) => {
          const reqXp = item.reward_required_xp_points ?? item.requiredXp ?? 0;
          let imgUrl = item.reward_image_url || item.productImage || '';
          
          if (imgUrl.includes('/rewards/')) {
            if (imgUrl.includes('mug')) imgUrl = '/rewards/mug.png';
            else if (imgUrl.includes('notebook')) imgUrl = '/rewards/notebook.png';
            else if (imgUrl.includes('backpack')) imgUrl = '/rewards/backpack.png';
            else if (imgUrl.includes('stickers')) imgUrl = '/rewards/stickers.png';
            else if (imgUrl.includes('tshirt')) imgUrl = '/rewards/tshirt.png';
            else if (imgUrl.includes('bottle') || imgUrl.includes('flask')) imgUrl = '/rewards/bottle.jpg';
          }

          return {
            id: item.id,
            name: item.reward_title || item.name || '',
            category: item.category || 'General',
            description: item.description || '',
            currentXp: userXp,
            requiredXp: reqXp,
            isUnlocked: userXp >= reqXp,
            productImage: imgUrl,
            tag: userXp >= reqXp ? 'UNLOCKED' : 'LOCKED',
            isLocked: item.is_locked ?? false
          };
        });
        const visible = enhanced.filter((item: any) => !item.isLocked);
        visible.sort((a, b) => a.requiredXp - b.requiredXp);
        setRewardsState(visible);
      } catch (error) {
        console.error('Failed to fetch rewards:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRewards();

    // Set up real-time subscription for rewards table
    const channel = supabase
      .channel('rewards_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rewards'
        },
        () => {
          console.log("Real-time rewards table updated, reloading list...");
          loadRewards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userXp]);

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
      <div id="tour-rewards-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-[2rem] bg-white border border-slate-200/90 shadow-xs">
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

        <div id="tour-rewards-balance" className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white font-black text-xs shadow-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span>{userXp} Total Student XP</span>
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
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
      ) : rewardsState.length === 0 ? (
        <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">No rewards available yet</div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewardsState.map((reward, index) => {
          const progressPercent = Math.round((reward.currentXp / reward.requiredXp) * 100);
          const isClaimed = claimedId === reward.id;

          return (
            <Card
              key={reward.id}
              id={index === 0 ? 'tour-rewards-card-0' : undefined}
              className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-200/90 shadow-sm transition-all duration-300 flex flex-col justify-between group min-h-[380px]"
            >
              
              <div 
                className="flex flex-col h-full justify-between transition-all duration-500 cursor-pointer"
                onClick={() => {
                  if (!reward.isUnlocked) {
                    setLockedToast(true);
                    setTimeout(() => setLockedToast(false), 3000);
                  }
                }}
              >
                
                {/* Full Seamless Edge-to-Edge Image Header */}
                <div className="relative h-80 sm:h-[340px] w-full overflow-hidden shrink-0 bg-[#0f111a]">
                  <img
                    src={reward.productImage}
                    alt={reward.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
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

                  {/* Unlocked / Locked Actions */}
                  <div className="pt-3 border-t border-slate-100 mt-auto">
                    {isClaimed ? (
                      <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Claimed & Shipping Dispatched!</span>
                      </div>
                    ) : reward.isUnlocked ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClaimReward(reward); }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 text-amber-300" />
                        <span>Claim Swag Reward</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLockedToast(true);
                          setTimeout(() => setLockedToast(false), 3000);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200/80 font-extrabold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Locked Reward</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </Card>
          );
        })}
      </div>
      )}


      {/* ════════ REWARD DETAILS MODAL ════════ */}
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

      {/* ════════ CUSTOM TOAST NOTIFICATION ════════ */}
      {lockedToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up pointer-events-none">
          <div className="flex items-center gap-4 px-5 py-3.5 bg-[#090b14]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 shrink-0 shadow-inner">
              <Lock className="w-5 h-5 text-purple-300" />
            </div>
            <div className="pr-2">
              <h4 className="font-black text-sm text-slate-50 tracking-wide uppercase">Coming Soon</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">This content is currently locked.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default RewardsScreen;
