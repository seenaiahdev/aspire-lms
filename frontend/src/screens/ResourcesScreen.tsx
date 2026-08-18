import { useState } from 'react';

import { resourcesSteps } from '@/lib/tourSteps';
import { FileText, Download, BookOpen, Map, FileCode, LayoutTemplate, Clock, CheckCircle, Lock } from 'lucide-react';
import { resources as initialResources } from '@/data/mock';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { triggerFileDownload } from '@/lib/downloadHelper';
import { LockedOverlay } from '@/components/ui/LockedOverlay';

const typeIcons: Record<string, any> = {
  pdf: FileText,
  notes: BookOpen,
  cheatsheet: FileCode,
  roadmap: Map,
  template: LayoutTemplate,
};

const typeColors: Record<string, { bg: string; text: string }> = {
  pdf: { bg: 'bg-rose-50', text: 'text-rose-500' },
  notes: { bg: 'bg-[#eff6ff]', text: 'text-[#3b82f6]' },
  cheatsheet: { bg: 'bg-indigo-50', text: 'text-indigo-500' },
  roadmap: { bg: 'bg-amber-50', text: 'text-amber-500' },
  template: { bg: 'bg-emerald-50', text: 'text-emerald-500' },
};

const typeLabels: Record<string, string> = {
  all: 'All Types',
  pdf: 'PDF Guides',
  notes: 'Notes',
  cheatsheet: 'Cheat Sheets',
  roadmap: 'Roadmaps',
  template: 'Templates',
};

export function ResourcesScreen() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [resourcesList, setResourcesList] = useState(initialResources);
  const [lockedToast, setLockedToast] = useState(false);

  const handleDownload = (id: string, title: string) => {
    triggerFileDownload(id, title);
  };

  const filtered = resourcesList.filter((r) => {
    const ms =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase());
    const mt = type === 'all' ? true : r.type === type;
    return ms && mt;
  });

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">

      {/* ════════ CUSTOM TOAST NOTIFICATION ════════ */}
      {lockedToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up pointer-events-none">
          <div className="flex items-center gap-4 px-5 py-3.5 bg-[#090b14]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 shrink-0 shadow-inner">
              <Lock className="w-5 h-5 text-purple-300" />
            </div>
            <div className="pr-2">
              <h4 className="font-black text-sm text-slate-50 tracking-wide uppercase">Coming Soon</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">This content is currently locked.</p>
            </div>
          </div>
        </div>
      )}

      {/* Clean Top Header */}
      <div id="tour-resources-header" className="pb-2">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Resources
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Download cheat sheets, roadmaps, study notes, and templates directly to your device.
        </p>
      </div>

      <SearchInput
        id="tour-resources-search"
        value={search}
        onChange={setSearch}
        placeholder="Search resources by title or category..."
        className="w-full sm:max-w-md"
      />

      <div id="tour-resources-filters" className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
        {['all', 'pdf', 'notes', 'cheatsheet', 'roadmap', 'template'].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 capitalize',
              type === t
                ? 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            )}
          >
            {typeLabels[t] || t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((r, index) => {
          const Icon = typeIcons[r.type] || FileText;
          const color = typeColors[r.type] || typeColors.notes;
          return (
            <Card
              key={r.id}
              id={index === 0 ? 'tour-resources-card-0' : undefined}
              onClick={() => handleDownload(r.id, r.title)}
              className="p-5 group border border-slate-200/90 shadow-sm bg-white flex flex-col justify-between relative overflow-hidden cursor-pointer hover:border-slate-350 hover:shadow-md transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-100',
                      color.bg
                    )}
                  >
                    <Icon className={cn('w-6 h-6', color.text)} />
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider border border-slate-200/80">
                    {r.category}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mb-1 line-clamp-1">
                  {r.title}
                </h3>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">
                  {r.type}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mb-5 pt-4 border-t border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {r.updatedAt}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    {r.downloads.toLocaleString()}
                  </span>
                  <span className="ml-auto text-slate-400">{r.size}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(r.id, r.title);
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-100 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
