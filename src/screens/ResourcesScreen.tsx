import { useState } from 'react';
import { Library, FileText, Download, Search, BookOpen, Map, FileCode, LayoutTemplate, Clock } from 'lucide-react';
import { resources } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, any> = {
  pdf: FileText, notes: BookOpen, cheatsheet: FileCode, roadmap: Map, template: LayoutTemplate,
};

const typeColors: Record<string, { bg: string; text: string }> = {
  pdf: { bg: 'bg-rose-50', text: 'text-rose-500' },
  notes: { bg: 'bg-[#eff6ff]', text: 'text-[#3b82f6]' },
  cheatsheet: { bg: 'bg-indigo-50', text: 'text-indigo-500' },
  roadmap: { bg: 'bg-amber-50', text: 'text-amber-500' },
  template: { bg: 'bg-emerald-50', text: 'text-emerald-500' },
};

export function ResourcesScreen() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  const filtered = resources.filter((r) => {
    const ms = r.title.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase());
    const mt = type === 'all' ? true : r.type === type;
    return ms && mt;
  });

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Clean Top Header */}
      <div className="pb-2">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Resources
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Download notes, cheat sheets, roadmaps, and templates.
        </p>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search resources..." className="w-full sm:max-w-md" />

      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
        {['all', 'pdf', 'notes', 'cheatsheet', 'roadmap', 'template'].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 capitalize', 
              type === t ? 'bg-[#3b82f6] text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
            )}
          >
            {t === 'all' ? 'All Types' : `${t}s`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((r) => {
          const Icon = typeIcons[r.type] || FileText;
          const color = typeColors[r.type] || typeColors.notes;
          return (
            <Card key={r.id} className="p-5 group border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-slate-100", color.bg)}>
                <Icon className={cn("w-6 h-6", color.text)} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mb-1 line-clamp-1 group-hover:text-[#3b82f6] transition-colors">{r.title}</h3>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider border border-slate-200/80">
                  {r.category}
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{r.type}</span>
              </div>
              
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mb-5 pt-4 border-t border-slate-100">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{r.updatedAt}</span>
                <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5 text-slate-400" />{r.downloads.toLocaleString()}</span>
                <span className="ml-auto text-slate-400">{r.size}</span>
              </div>
              
              <button className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-[#eff6ff] hover:text-[#3b82f6] text-slate-600 text-xs font-extrabold transition-colors flex items-center justify-center gap-2 border border-slate-200 hover:border-blue-200">
                <Download className="w-4 h-4" /> Download Resource
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
