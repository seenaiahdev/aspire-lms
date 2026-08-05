import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  rightSlot?: ReactNode;
}

export function AccordionItem({ title, children, defaultOpen, rightSlot }: AccordionItemProps) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <div className="border-b border-ink-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={cn(
              'w-4 h-4 text-ink-400 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
          <span className="font-semibold text-ink-800 group-hover:text-primary-600 transition-colors">
            {title}
          </span>
        </div>
        {rightSlot}
      </button>
      <div className={cn(
        'grid transition-all duration-300 ease-out',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}>
        <div className="overflow-hidden">
          <div className="pb-4 pl-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
