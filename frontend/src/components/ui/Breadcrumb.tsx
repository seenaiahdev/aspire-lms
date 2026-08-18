import { cn } from '@/lib/utils';

interface BreadcrumbProps {
  items: { label: string; href?: string; onClick?: () => void }[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-2 text-sm', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-ink-300">/</span>}
          {item.onClick || item.href ? (
            <button
              onClick={item.onClick}
              className="text-ink-500 hover:text-primary-600 transition-colors font-medium"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-ink-800 font-semibold">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
