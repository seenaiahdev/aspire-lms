import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  height?: string;
  showValue?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  color = 'bg-primary-500',
  height = 'h-2',
  showValue = false,
}: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full rounded-full bg-ink-100 overflow-hidden', height)}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="text-xs text-ink-500 mt-1">{Math.round(pct)}%</span>
      )}
    </div>
  );
}
