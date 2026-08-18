import { useEffect, useState } from 'react';
import { Search, ArrowRight, Home, GraduationCap, Radio, FileText, Code2, ClipboardCheck, FolderGit2, Library, Users, CalendarDays, TrendingUp, Trophy, Award, Briefcase, Bell, User, Settings } from 'lucide-react';
import { useNav } from '@/lib/nav';
import type { Route } from '@/lib/routes';

const commands: { id: Route; label: string; icon: any; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, group: 'Navigation' },
  { id: 'learning', label: 'My Learning', icon: GraduationCap, group: 'Navigation' },
  { id: 'live', label: 'Live Classes', icon: Radio, group: 'Navigation' },
  { id: 'assignments', label: 'Assignments', icon: FileText, group: 'Navigation' },
  { id: 'practice', label: 'Practice Lab', icon: Code2, group: 'Navigation' },
  { id: 'quizzes', label: 'Quizzes', icon: ClipboardCheck, group: 'Navigation' },
  { id: 'projects', label: 'Projects', icon: FolderGit2, group: 'Navigation' },
  { id: 'resources', label: 'Resources', icon: Library, group: 'Navigation' },
  { id: 'community', label: 'Community', icon: Users, group: 'Navigation' },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays, group: 'Navigation' },
  { id: 'progress', label: 'Progress', icon: TrendingUp, group: 'Navigation' },
  { id: 'achievements', label: 'Achievements', icon: Trophy, group: 'Navigation' },
  { id: 'certificates', label: 'Certificates', icon: Award, group: 'Navigation' },
  { id: 'certifications', label: 'Certifications', icon: Award, group: 'Navigation' },
  { id: 'rewards', label: 'Rewards', icon: Trophy, group: 'Navigation' },
  { id: 'placement', label: 'Placement Hub', icon: Briefcase, group: 'Navigation' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'Account' },
  { id: 'profile', label: 'Profile', icon: User, group: 'Account' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'Account' },
];

export function CommandPalette() {
  const { commandOpen, setCommandOpen, navigate } = useNav();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === 'Escape' && commandOpen) setCommandOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (!commandOpen) {
      setQuery('');
      setSelected(0);
    }
  }, [commandOpen]);

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  const groups = [...new Set(filtered.map((c) => c.group))];

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={() => setCommandOpen(false)} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-soft-lg animate-scale-in overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-ink-100">
          <Search className="w-5 h-5 text-ink-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
              if (e.key === 'Enter' && filtered[selected]) { navigate(filtered[selected].id); setCommandOpen(false); }
            }}
            placeholder="Search pages, courses, lessons..."
            className="flex-1 py-4 text-sm bg-transparent focus:outline-none placeholder-ink-400"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-ink-100 text-2xs font-mono font-semibold text-ink-500">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-400">No results found</div>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <p className="px-3 py-1.5 text-2xs font-bold text-ink-400 uppercase tracking-wider">{group}</p>
                {filtered.filter((c) => c.group === group).map((cmd) => {
                  const idx = filtered.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => { navigate(cmd.id); setCommandOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        idx === selected ? 'bg-primary-50 text-primary-700' : 'text-ink-600 hover:bg-ink-50'
                      }`}
                    >
                      <cmd.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">{cmd.label}</span>
                      {idx === selected && <ArrowRight className="w-4 h-4 text-primary-400" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
