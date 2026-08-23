import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ id, value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-ink-50 border border-ink-100 rounded-xl text-sm text-ink-900 placeholder-ink-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-500/10"
      />
    </div>
  );
}
