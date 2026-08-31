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
import { fetchRewards, submitRewardClaim, fetchRewardClaims } from '@/lib/api';
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
  const [claimedRewards, setClaimedRewards] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem('aspire_claimed_rewards');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [claimRewardTarget, setClaimRewardTarget] = useState<SwagReward | null>(null);
  const [shippingName, setShippingName] = useState(user?.name || '');
  const [shippingPhone, setShippingPhone] = useState(user?.mobile || '');
  const [shippingDoorNo, setShippingDoorNo] = useState('');
  const [shippingStreet, setShippingStreet] = useState('');
  const [shippingVillage, setShippingVillage] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingPincode, setShippingPincode] = useState('');
  const [shippingSize, setShippingSize] = useState('M');
  const [lockedToastReward, setLockedToastReward] = useState<SwagReward | null>(null);
  const [loading, setLoading] = useState(true);

  const userXp = user?.xp || 0;

  useEffect(() => {
    if (user) {
      setShippingName(user.name || '');
      setShippingPhone(user.mobile || '');
    }
  }, [user]);

  useEffect(() => {
    const loadData = async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const [rewardsData, claimsData] = await Promise.all([
          fetchRewards(),
          user?.id ? fetchRewardClaims(user.id) : Promise.resolve([])
        ]);

        const claimsRecord: Record<string, any> = {};
        (claimsData || []).forEach((c: any) => {
          claimsRecord[c.reward_id] = {
            claimedAt: c.claimed_at,
            name: c.full_name,
            phone: c.contact_number,
            address: c.shipping_address,
            size: c.apparel_size
          };
        });
        setClaimedRewards(claimsRecord);

        const enhanced = rewardsData.map((item: any) => {
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
        if (showSpinner) setLoading(false);
      }
    };
    loadData();
  }, [userXp, user?.id]);

  const unlockedCount = rewardsState.filter(r => r.isUnlocked && !claimedRewards[r.id]).length;
  const lockedCount = rewardsState.filter(r => !r.isUnlocked).length;

  const handleClaimReward = async (reward: SwagReward, shippingDetails: any) => {
    try {
      if (!user?.id) throw new Error('User not logged in');

      // 1. Submit to Supabase table
      await submitRewardClaim({
        student_id: user.id,
        reward_id: reward.id,
        full_name: shippingDetails.name,
        contact_number: shippingDetails.phone,
        shipping_address: shippingDetails.address,
        apparel_size: shippingDetails.size
      });

      // 2. Fallback update to local state & localStorage
      setClaimedRewards((prev) => {
        const updated = {
          ...prev,
          [reward.id]: {
            claimedAt: new Date().toISOString(),
            ...shippingDetails
          }
        };
        localStorage.setItem('aspire_claimed_rewards', JSON.stringify(updated));
        return updated;
      });
      setToastMessage(`Success! ${reward.name} claimed successfully. Free express shipping has been dispatched to the provided address.`);
    } catch (dbErr: any) {
      console.error('Failed to submit reward claim to Supabase:', dbErr);
      setToastMessage(`Failed to submit claim: ${dbErr.message || 'database error'}`);
    }
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
          <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white font-black text-xs shadow-md flex items-center">
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
          const isClaimed = !!claimedRewards[reward.id];

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
                    setLockedToastReward(reward);
                    setTimeout(() => setLockedToastReward(null), 3000);
                  } else if (!isClaimed) {
                    setSelectedReward(reward);
                  }
                }}
              >
                
                {/* Full Seamless Edge-to-Edge Image Header */}
                <div className="relative h-80 sm:h-[340px] w-full overflow-hidden shrink-0 bg-[#0f111a]">
                  <img
                    src={reward.productImage}
                    alt={reward.name}
                    loading="lazy"
                    width={400}
                    height={400}
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

                  {!reward.isUnlocked && (
                    <div className="space-y-2 mt-1 py-1">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#7c3aed] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (userXp / reward.requiredXp) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 text-left">
                        Progress: <span className="font-bold text-slate-700">{userXp}</span> / <span className="font-bold text-slate-700">{reward.requiredXp} XP</span>
                        <span className="block mt-0.5 text-[#7c3aed] font-extrabold uppercase tracking-wide text-[9px]">
                          Earn {reward.requiredXp - userXp} more XP to unlock!
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Unlocked / Locked Actions */}
                  <div className="pt-3 border-t border-slate-100 mt-auto">
                    {isClaimed ? (
                      <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Claimed & Shipping Dispatched!</span>
                      </div>
                    ) : reward.isUnlocked ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setClaimRewardTarget(reward); }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 text-amber-300" />
                        <span>Claim Swag Reward</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLockedToastReward(reward);
                          setTimeout(() => setLockedToastReward(null), 3000);
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
              <img src={selectedReward.productImage} alt={selectedReward.name} loading="lazy" width={400} height={400} className="w-full h-full object-cover" />
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
                  onClick={() => { setClaimRewardTarget(selectedReward); setSelectedReward(null); }}
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

      {/* ════════ SHIPPING DETAILS MODAL ════════ */}
      {claimRewardTarget && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans cursor-default overflow-y-auto animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setClaimRewardTarget(null); }}
        >
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col justify-between animate-scale-up relative my-auto p-6 space-y-6">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-[#7c3aed] flex items-center justify-center border border-purple-100 mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Claim {claimRewardTarget.name}</h3>
              <p className="text-xs text-slate-500">Please provide your delivery details below to dispatch your swag reward.</p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const fullAddress = `Door No: ${shippingDoorNo}, Street: ${shippingStreet}, Village: ${shippingVillage}, City: ${shippingCity}, State: ${shippingState} - Pincode: ${shippingPincode}`;
                handleClaimReward(claimRewardTarget, {
                  name: shippingName,
                  phone: shippingPhone,
                  address: fullAddress,
                  size: claimRewardTarget.category === 'APPAREL' ? shippingSize : undefined
                });
                setClaimRewardTarget(null);
                setShippingDoorNo('');
                setShippingStreet('');
                setShippingVillage('');
                setShippingCity('');
                setShippingState('');
                setShippingPincode('');
              }}
              className="space-y-4 text-left"
            >
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={shippingName} 
                  onChange={(e) => setShippingName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Contact Number</label>
                <input 
                  type="text" 
                  required 
                  value={shippingPhone} 
                  onChange={(e) => setShippingPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                />
              </div>

              {/* Size selector for Apparel */}
              {claimRewardTarget.category === 'APPAREL' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Size Preference</label>
                  <select 
                    value={shippingSize} 
                    onChange={(e) => setShippingSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                  >
                    <option value="S">Small (S)</option>
                    <option value="M">Medium (M)</option>
                    <option value="L">Large (L)</option>
                    <option value="XL">Extra Large (XL)</option>
                    <option value="XXL">Double Extra Large (XXL)</option>
                  </select>
                </div>
              )}

              {/* Door No & Pincode Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Door Number</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingDoorNo} 
                    onChange={(e) => setShippingDoorNo(e.target.value)}
                    placeholder="e.g. 4-12/A or Room 204"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pincode</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingPincode} 
                    onChange={(e) => setShippingPincode(e.target.value)}
                    placeholder="e.g. 500081"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                  />
                </div>
              </div>

              {/* Street & Village */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Street</label>
                <input 
                  type="text" 
                  required 
                  value={shippingStreet} 
                  onChange={(e) => setShippingStreet(e.target.value)}
                  placeholder="e.g. Landmark Street or Hostel Block B"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Village / Area</label>
                <input 
                  type="text" 
                  required 
                  value={shippingVillage} 
                  onChange={(e) => setShippingVillage(e.target.value)}
                  placeholder="e.g. Madhapur or Campus Campus"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                />
              </div>

              {/* City & State Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">City</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingCity} 
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="e.g. Hyderabad"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">State</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingState} 
                    onChange={(e) => setShippingState(e.target.value)}
                    placeholder="e.g. Telangana"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClaimRewardTarget(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Order</span>
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ CUSTOM TOAST NOTIFICATION ════════ */}
      {lockedToastReward && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up pointer-events-none w-max max-w-[90vw]">
          <div className="flex items-center gap-4 px-5 py-3.5 bg-[#090b14]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 shrink-0 shadow-inner">
              <Lock className="w-5 h-5 text-purple-300" />
            </div>
            <div className="pr-2 text-left">
              <h4 className="font-black text-sm text-slate-50 tracking-wide uppercase">Reward Locked</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Earn {lockedToastReward.requiredXp - userXp} more XP to unlock the {lockedToastReward.name}!
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default RewardsScreen;
