import { GraduationCap, X, Settings, LogOut, ChevronRight } from 'lucide-react';
import { navItems, type Route } from '@/lib/routes';
import { useNav } from '@/lib/nav';
import { currentUser } from '@/data/mock';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

import aspireLogo from '@/assests/Aspire_logo.jpg';

function MilestoneRoadmapIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.5 2C4.57 2 3 3.57 3 5.5c0 2.62 3.5 7 3.5 7s3.5-4.38 3.5-7C10 3.57 8.43 2 6.5 2zm0 4.8a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z" />
      <ellipse cx="6.5" cy="13" rx="2" ry="0.8" opacity="0.4" />
      <path
        d="M10 8.5c3 0 5.5 1.5 5.5 4.5S13 17 13 19s2 3 5 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="2.5 2.5"
        strokeLinecap="round"
      />
      <path d="M16 19.5l4 2.5-1.5-4.5-2.5 2z" />
    </svg>
  );
}

export function Sidebar() {
  const { route, navigate, logout, sidebarOpen, setSidebarOpen } = useNav();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 
        HOVER-BASED EXPANDABLE SIDEBAR
        Un-hovered: w-20 (80px compact)
        On Hover: w-72 (288px full expanded width)
      */}
      <aside className={cn(
        'group/sidebar fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen bg-white text-slate-700 border-r border-slate-200 flex flex-col transition-all duration-300 ease-out font-sans shadow-2xl shadow-slate-200/50 overflow-hidden',
        sidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-72',
      )}>
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0 bg-white">
          <button onClick={() => navigate('dashboard')} className="flex items-center gap-3 group">
            {/* White Circular Logo Container */}
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center p-1.5 border border-slate-200 group-hover:scale-105 transition-transform shrink-0">
              <img src={aspireLogo} alt="AspireNext Logo" className="w-full h-full object-contain" />
            </div>
            
            {/* Logo Text */}
            <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap min-w-0">
              <span className="font-black text-[1.1rem] text-slate-900 tracking-tight leading-none block">AspireLMS</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wide block mt-0.5">Enterprise EdTech</span>
            </div>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-hide">
          <div className="px-4 mb-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden lg:block overflow-hidden">
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Learning Hub</span>
          </div>

          {navItems.map((item) => {
            const Icon = (Icons as any)[item.icon] as Icons.LucideIcon;
            const active = route === item.id || (item.id === 'learning' && (route === 'course' || route === 'lesson'));
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                title={item.label}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm transition-all duration-200 group relative font-bold',
                  active
                    ? 'bg-[#eff6ff] text-[#3b82f6]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                {item.id === 'milestones' ? (
                  <MilestoneRoadmapIcon className={cn('w-5 h-5 shrink-0 transition-colors', active ? 'text-[#3b82f6]' : 'text-slate-400 group-hover:scale-110')} />
                ) : (
                  <Icon className={cn('w-5 h-5 shrink-0 transition-colors', active ? 'text-[#3b82f6]' : 'text-slate-400 group-hover:scale-110')} />
                )}
                
                <span className="flex-1 text-left opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap truncate">
                  {item.label}
                </span>

                {active && (
                  <ChevronRight className="w-4 h-4 text-[#3b82f6] shrink-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Controls */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-white">
          <button
            onClick={() => logout()}
            title="Logout"
            className="w-full flex items-center justify-center gap-3 py-3 px-3.5 rounded-2xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-extrabold text-sm transition-all active:scale-[0.98] overflow-hidden"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="hidden group-hover/sidebar:inline opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
