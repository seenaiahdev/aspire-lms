import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  return (
    <div className={cn('group relative inline-flex', className)}>
      {children}
      <div className={cn(
        'absolute left-1/2 -translate-x-1/2 z-50 px-2.5 py-1.5 rounded-lg bg-ink-900 text-white text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none',
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
      )}>
        {content}
        <div className={cn(
          'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-ink-900 rotate-45',
          position === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1',
        )} />
      </div>
    </div>
  );
}
