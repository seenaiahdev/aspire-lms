import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  color?: string;
  trackColor?: string;
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  className,
  showLabel = true,
  color = 'stroke-[#7c3aed]',
  trackColor = 'stroke-slate-100',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const strokeColor = color.includes('stroke-') ? color : color.replace(/\btext-/, 'stroke-');
  const strokeTrack = trackColor.includes('stroke-') ? trackColor : trackColor.replace(/\btext-/, 'stroke-');

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={strokeTrack}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn(strokeColor, 'transition-all duration-700 ease-out')}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-bold text-ink-700">
          {value}%
        </span>
      )}
    </div>
  );
}
