import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; up: boolean };
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  className?: string;
}

const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-700', icon: 'bg-primary-100 text-primary-600' },
  secondary: { bg: 'bg-secondary-50', text: 'text-secondary-700', icon: 'bg-secondary-100 text-secondary-600' },
  accent: { bg: 'bg-accent-50', text: 'text-accent-700', icon: 'bg-accent-100 text-accent-600' },
  success: { bg: 'bg-success-50', text: 'text-success-700', icon: 'bg-success-100 text-success-600' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-700', icon: 'bg-warning-100 text-warning-600' },
  error: { bg: 'bg-error-50', text: 'text-error-700', icon: 'bg-error-100 text-error-600' },
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'primary',
  className,
}: StatCardProps) {
  const c = colorClasses[color];

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-ink-900 mt-1 font-display">{value}</p>
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.icon)}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 mt-3">
          <span className={cn(
            'text-xs font-semibold flex items-center gap-0.5',
            trend.up ? 'text-success-600' : 'text-error-600',
          )}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-xs text-ink-400">vs last week</span>
        </div>
      )}
    </div>
  );
}
