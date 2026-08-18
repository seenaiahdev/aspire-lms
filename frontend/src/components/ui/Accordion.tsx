import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  rightSlot?: ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function AccordionItem({ title, children, defaultOpen, rightSlot, isOpen, onToggle }: AccordionItemProps) {
  const [internalOpen, setInternalOpen] = useState(!!defaultOpen);

  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : internalOpen;
  const toggle = isControlled ? onToggle : () => setInternalOpen(!internalOpen);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between py-4 text-left group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
          <span className="font-extrabold text-[15px] text-slate-800 group-hover:text-purple-600 transition-colors">
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
