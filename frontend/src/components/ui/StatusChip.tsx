import { cn } from '@/lib/utils';

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    pending: { label: 'Pending', cls: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
    submitted: { label: 'Submitted', cls: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
    reviewed: { label: 'Reviewed', cls: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
    overdue: { label: 'Overdue', cls: 'bg-error-100 text-error-700', dot: 'bg-error-500' },
    upcoming: { label: 'Upcoming', cls: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
    ongoing: { label: 'Live', cls: 'bg-error-100 text-error-700', dot: 'bg-error-500 animate-pulse' },
    completed: { label: 'Completed', cls: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
    attempted: { label: 'Attempted', cls: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
    expired: { label: 'Expired', cls: 'bg-ink-100 text-ink-500', dot: 'bg-ink-400' },
    assigned: { label: 'Assigned', cls: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
    feedback: { label: 'Feedback', cls: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
    open: { label: 'Open', cls: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
    applied: { label: 'Applied', cls: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
    closed: { label: 'Closed', cls: 'bg-ink-100 text-ink-500', dot: 'bg-ink-400' },
  };

  const s = map[status] || { label: status, cls: 'bg-ink-100 text-ink-600', dot: 'bg-ink-400' };

  return (
    <span className={cn('chip', s.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    Easy: 'bg-success-100 text-success-700',
    Medium: 'bg-warning-100 text-warning-700',
    Hard: 'bg-error-100 text-error-700',
    Beginner: 'bg-success-100 text-success-700',
    Intermediate: 'bg-warning-100 text-warning-700',
    Advanced: 'bg-error-100 text-error-700',
  };

  return (
    <span className={cn('chip', map[difficulty] || 'bg-ink-100 text-ink-600')}>
      {difficulty}
    </span>
  );
}
