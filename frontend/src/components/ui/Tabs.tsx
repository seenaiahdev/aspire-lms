import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

interface TabsProps {
  id?: string;
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function Tabs({ id, tabs, active, onChange, variant = 'default', className }: TabsProps) {
  if (variant === 'pills') {
    return (
      <div id={id} className={cn('flex gap-2 overflow-x-auto scrollbar-hide', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200',
              active === tab.id
                ? 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-2xs font-bold',
                active === tab.id ? 'bg-white/20' : 'bg-slate-200',
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div id={id} className={cn('flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-hide', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-all duration-200',
              active === tab.id
                ? 'border-primary-600 text-primary-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-2xs font-bold bg-primary-50 text-primary-600">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div id={id} className={cn('flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-hide', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all duration-200',
            active === tab.id
              ? 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 text-white shadow-xs border border-primary-600/50 font-bold'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-2xs font-bold",
              active === tab.id ? "bg-white/20 text-white" : "bg-primary-100 text-primary-600"
            )}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
