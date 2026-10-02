import React from 'react';
import { Crown } from 'lucide-react';

interface RewardsHeroBannerProps {
  onStartPreparing?: () => void;
}

export const RewardsHeroBanner: React.FC<RewardsHeroBannerProps> = ({ onStartPreparing }) => {
  return (
    <div
      id="tour-rewards-header"
      className="relative w-full overflow-hidden rounded-[28px] sm:rounded-[32px] border border-purple-100/70 shadow-[0_20px_50px_rgba(40,30,90,0.06)]"
      style={{
        background: 'linear-gradient(110deg, #FFFFFF 0%, #FAF9FF 45%, #F3F0FF 100%)',
      }}
    >
      {/* Soft atmospheric background accents behind the composition */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft lavender radial glow behind product */}
        <div
          className="absolute -top-10 right-[5%] w-[420px] h-[420px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(233, 213, 255, 0.45) 0%, rgba(243, 232, 255, 0.15) 55%, transparent 75%)',
            filter: 'blur(50px)',
          }}
        />
        {/* Subtle curved background shape */}
        <div
          className="absolute -bottom-24 right-[12%] w-[380px] h-[380px] rounded-full opacity-35"
          style={{
            background: 'radial-gradient(circle, rgba(196, 181, 253, 0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 lg:gap-8 px-6 sm:px-8 lg:px-10 xl:px-12 py-5 sm:py-6 lg:py-7">

        {/* ════════ LEFT COLUMN: CONTENT (Approx 52%) ════════ */}
        <div className="w-full md:w-[54%] lg:w-[52%] space-y-2.5 sm:space-y-3 text-left">
          
          {/* Top Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[rgba(124,58,237,0.12)] bg-[rgba(124,58,237,0.08)] backdrop-blur-xs w-fit">
            <Crown className="w-3.5 h-3.5 text-[#6738E8]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6738E8]">
              MEGA EXAM • GRAND REWARD
            </span>
          </div>

          {/* Main Headline */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] font-black tracking-tight leading-[1.08]">
              <span className="block text-[#14213D]">Study Hard.</span>
              <span className="relative inline-block mt-0.5">
                <span
                  style={{
                    background: 'linear-gradient(135deg, #6D3CF5 0%, #4F6FF5 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Unlock Bigger Dreams.
                </span>
                
                {/* Hand-drawn style purple curved underline */}
                <svg
                  className="absolute -bottom-1.5 sm:-bottom-2 left-0 w-full h-2 sm:h-2.5 text-[#6D3CF5]"
                  viewBox="0 0 260 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 8.5C55 2.5 185 2 257 8"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Description */}
            <p className="text-[#64748B] text-xs sm:text-[13px] lg:text-[14px] font-normal leading-[1.5] max-w-[560px] pt-1 sm:pt-1.5">
              Ace the Mega Exam and get a chance to win an all-new MacBook. Because your effort deserves something extraordinary.
            </p>
          </div>

        </div>

        {/* ════════ RIGHT COLUMN: 3D REWARD COMPOSITION (Approx 48%) ════════ */}
        <div className="w-full md:w-[46%] lg:w-[48%] flex items-center justify-center md:justify-end">
          <div className="relative w-full max-w-[360px] sm:max-w-[390px] lg:max-w-[430px] aspect-[506/335] rounded-3xl overflow-hidden">
            <img
              src="/rewards/hero-macbook-composition-feathered@2x.png"
              alt="Apple MacBook Reward on platform with books, gift, plant, and 'Your Reward Awaits!'"
              className="w-full h-full object-contain object-center select-none pointer-events-none"
              style={{
                maskImage: 'radial-gradient(ellipse 95% 92% at 50% 50%, black 75%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 95% 92% at 50% 50%, black 75%, transparent 100%)',
              }}
              loading="eager"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default RewardsHeroBanner;
