import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, LogOut, Flame, User, Settings, ChevronDown } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { notifications, currentUser } from '@/data/mock';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export function TopNav() {
  const { setSidebarOpen, navigate, logout, route, notificationsOpen, setNotificationsOpen } = useNav();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    learning: 'My Learning',
    course: 'Course Details',
    lesson: 'Lesson Player',
    live: 'Live Classes',
    classroom: 'Live Classroom',
    assignments: 'Assignments',
    practice: 'Practice Lab',
    quizzes: 'Quizzes',
    projects: 'Projects',
    resources: 'Resources',
    community: 'Community',
    schedule: 'Schedule',
    progress: 'Progress',
    achievements: 'Achievements',
    certificates: 'Certificates',
    placement: 'Placement Hub',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/90 text-slate-900 flex items-center justify-between px-4 lg:px-6 font-sans">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-extrabold text-lg text-slate-900 hidden sm:block">
          {titles[route] || 'Aspire Next'}
        </h1>
      </div>

      {/* Right Action Bar (Streak + Notifications + Profile Dropdown) */}
      <div className="flex items-center gap-3 ml-auto">
        
        {/* 🔥 STREAK BADGE AT TOP */}
        <div 
          onClick={() => navigate('dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-extrabold shadow-sm hover:bg-amber-100 transition-all cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
          <span className="hidden sm:inline">{currentUser.streak} Days Streak</span>
        </div>

        {/* Notifications Bell Button */}
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          title="Notifications"
          className={cn(
            'relative w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors border border-transparent hover:border-slate-200',
            notificationsOpen && 'bg-slate-100 text-[#3b52a4] border-slate-200',
          )}
        >
          <Bell className="w-4.5 h-4.5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-xs">
              {unread}
            </span>
          )}
        </button>

        {/* 👤 USER PROFILE AVATAR WITH DROPDOWN MENU (Profile, Settings, Logout) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-2xl hover:bg-slate-50 border border-slate-200/80 transition-all duration-200 active:scale-95"
          >
            <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" className="ring-2 ring-slate-100" />
            <span className="text-xs font-bold text-slate-700 hidden md:inline truncate max-w-[100px]">{currentUser.name}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', profileOpen && 'rotate-180')} />
          </button>

          {/* Interactive Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 animate-scale-in">
              {/* User info Header */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-extrabold text-slate-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] font-semibold text-slate-500 truncate">{currentUser.email}</p>
              </div>

              {/* Menu Items */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { navigate('profile'); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <User className="w-4 h-4 text-primary-600" />
                  <span>View Profile</span>
                </button>

                <button
                  onClick={() => { navigate('settings'); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => { logout(); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
