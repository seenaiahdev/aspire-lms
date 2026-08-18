import React from 'react';
import { Lock } from 'lucide-react';

function CircularProgressLock({ progress = 0, size = 76 }: { progress?: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-purple-500/20"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
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
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-full border border-purple-400/40 m-1 shadow-md">
        <Lock className="w-6 h-6 text-purple-300 drop-shadow-sm" />
      </div>
    </div>
  );
}

interface LockedOverlayProps {
  title?: string;
  type?: string;
  message?: string;
}

export function LockedOverlay({ type = 'LOCKED' }: LockedOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center text-white space-y-3.5 animate-fade-in rounded-[inherit]">
      <CircularProgressLock progress={0} size={70} />
      
      <div className="max-w-xs space-y-1.5 flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[11px] font-black uppercase tracking-wider">
          <span>{type}</span>
        </div>
      </div>
    </div>
  );
}
