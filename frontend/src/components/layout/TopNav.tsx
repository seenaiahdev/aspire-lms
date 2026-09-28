import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, LogOut, Flame, Zap, User, Settings, ChevronDown, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { useUser } from '@/lib/UserContext';
import { useNotifications } from '@/lib/NotificationsContext';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export function TopNav() {
  const { user: currentUser } = useUser();
  const { setSidebarOpen, navigate, logout, route, notificationsOpen, setNotificationsOpen } = useNav();
  const [profileOpen, setProfileOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const { unreadCount: unread } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside (but not when clicking on tour overlay/tooltips)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on Joyride overlay, spotlight, or tooltip
      if (target.closest('[class*="joyride"]') || target.closest('.__floater') || target.closest('[role="tooltip"]')) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (attendanceRef.current && !attendanceRef.current.contains(target)) {
        setAttendanceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Allow OnboardingTour to explicitly open/close the dropdown without toggling it
  useEffect(() => {
    const handleOpenProfile = () => setProfileOpen(true);
    const handleCloseProfile = () => setProfileOpen(false);
    window.addEventListener('tour:openProfile', handleOpenProfile);
    window.addEventListener('tour:closeProfile', handleCloseProfile);
    return () => {
      window.removeEventListener('tour:openProfile', handleOpenProfile);
      window.removeEventListener('tour:closeProfile', handleCloseProfile);
    };
  }, []);

  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    learning: 'My Learning',
    course: 'Course Details',
    lesson: 'Lesson Player',
    live: 'Live Classes',
    classroom: 'Live Classroom',
    recording: 'Recorded Masterclass',
    milestones: 'Milestones Roadmap',
    assignments: 'Daily Assessment',
    'daily-assessment': 'Daily Assessment',
    'weekly-assessment': 'Weekly Assessment',
    practice: 'Practice Lab',
    quizzes: 'Weekly Assessment',
    projects: 'Projects',
    resources: 'Resources',
    community: 'Community',
    schedule: 'Events',
    progress: 'Progress',
    achievements: 'Achievements',
    certificates: 'Certificates',
    certifications: 'Certifications',
    rewards: 'Rewards',
    placement: 'Placement Hub',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
  };

  const attendancePct = currentUser.attendancePercentage ?? (currentUser.attendance !== undefined ? currentUser.attendance : 100);
  const attStats = currentUser.attendanceStats;
  const totalSessions = attStats ? attStats.totalSessions : (currentUser.attendance ? 1 : 0);
  const presentCount = attStats ? attStats.presentCount : (attendancePct >= 85 ? totalSessions : 0);
  const absentCount = attStats ? attStats.absentCount : Math.max(0, totalSessions - presentCount);
  const latestRecord = attStats?.latestRecord;

  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200/90 text-slate-900 flex items-center justify-between px-4 lg:px-6 font-sans">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 truncate max-w-[110px] sm:max-w-xs md:max-w-none">
          {titles[route] || 'AspireLMS'}
        </h1>
      </div>

      {/* Right Action Bar (Streak + XP + Notifications + Profile Dropdown) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 ml-auto">
        
        {/* 🔥 STREAK BADGE (Numeric) */}
        <div 
          id="tour-streak"
          onClick={() => navigate('dashboard')}
          title="Daily Streak"
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-extrabold shadow-sm hover:bg-amber-100 transition-all cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500" />
          <span>{currentUser.streak}</span>
        </div>

        {/* ⚡ XP POINTS BADGE */}
        <div 
          onClick={() => navigate('rewards')}
          title="Total Student XP"
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-[#7c3aed] text-xs font-extrabold shadow-sm hover:bg-purple-100 transition-all cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7c3aed] fill-[#7c3aed]" />
          <span>{currentUser.xp || 0} <span className="hidden sm:inline">XP</span></span>
        </div>

        {/* 🎯 MENTOR-VERIFIED ATTENDANCE BADGE */}
        <div className="relative" ref={attendanceRef}>
          <button 
            id="tour-attendance"
            onClick={() => setAttendanceOpen(!attendanceOpen)}
            title={`Attendance: ${attendancePct}% (Mentor Verified)`}
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95",
              attendancePct >= 85
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : attendancePct >= 75
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
            )}
          >
            <CheckCircle2 className={cn(
              "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0",
              attendancePct >= 85 ? "text-emerald-600" : attendancePct >= 75 ? "text-amber-600" : "text-rose-600"
            )} />
            <span>{attendancePct}%</span>
            <span className="hidden md:inline font-semibold text-[10px] opacity-75">Att.</span>
          </button>

          {/* Interactive Popover Menu */}
          <div className={cn(
            "absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-[10001] transition-all duration-200 origin-top",
            attendanceOpen ? "opacity-100 scale-100 pointer-events-auto animate-scale-in" : "opacity-0 scale-95 pointer-events-none"
          )}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs",
                  attendancePct >= 85 ? "bg-emerald-100 text-emerald-700" : attendancePct >= 75 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                )}>
                  {attendancePct}%
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Live Class Attendance</h4>
                  <span className="text-[10px] font-semibold text-slate-500">Verified by Mentors</span>
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                attendancePct >= 85
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : attendancePct >= 75
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                {attendancePct >= 85 ? 'Eligible' : attendancePct >= 75 ? 'Warning' : 'Low'}
              </span>
            </div>

            {/* Metric Breakdown */}
            <div className="grid grid-cols-3 gap-2 my-3 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-500">Present</span>
                <span className="text-xs font-black text-emerald-600">{presentCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-500">Absent</span>
                <span className="text-xs font-black text-rose-600">{absentCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-500">Total</span>
                <span className="text-xs font-black text-slate-700">{totalSessions}</span>
              </div>
            </div>

            {/* Placement requirement status */}
            <div className={cn(
              "p-2.5 rounded-xl text-[11px] font-medium mb-3 flex items-start gap-2",
              attendancePct >= 85 ? "bg-emerald-50/80 text-emerald-900" : "bg-amber-50/90 text-amber-900"
            )}>
              {attendancePct >= 85 ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>You meet the <strong>85% attendance criteria</strong> required for placement opportunities & certificates.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Aspire requires <strong>85% attendance</strong> for placements. Attend upcoming sessions to raise your score.</span>
                </>
              )}
            </div>

            {/* Latest verification note */}
            {latestRecord && (
              <div className="text-[10px] text-slate-500 pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Latest: <strong>{latestRecord.date}</strong></span>
                <span className={cn(
                  "font-bold uppercase tracking-wider",
                  latestRecord.status?.toLowerCase() === 'present' ? "text-emerald-600" : "text-rose-600"
                )}>
                  {latestRecord.status} {latestRecord.remarks ? `• ${latestRecord.remarks}` : ''}
                </span>
              </div>
            )}

            {/* Direct navigation buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAttendanceOpen(false); navigate('live'); }}
                className="flex-1 py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] text-[11px] font-bold transition-colors text-center cursor-pointer"
              >
                Live Classes
              </button>
              <button
                onClick={() => { setAttendanceOpen(false); navigate('progress'); }}
                className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors text-center cursor-pointer"
              >
                View Progress
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Bell Button */}
        <button
          id="tour-notifications"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          title="Notifications"
          className={cn(
            'relative w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors border border-transparent hover:border-slate-200',
            notificationsOpen && 'bg-slate-100 text-primary-600 border-slate-200',
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
        <div className="relative" ref={dropdownRef} id="tour-profile">
          <button
            id="tour-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-2xl hover:bg-slate-50 border border-slate-200/80 transition-all duration-200 active:scale-95"
          >
            <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" className="ring-2 ring-slate-100" />
            <div className="hidden md:flex flex-col items-start text-left min-w-0 pr-1">
              <span className="text-xs font-bold text-slate-700 truncate max-w-[120px] leading-tight">{currentUser.name}</span>
              <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase leading-none mt-0.5">{currentUser.registrationId || 'NO-ID'}</span>
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', profileOpen && 'rotate-180')} />
          </button>

          {/* Interactive Dropdown Menu — always in DOM for tour targets, hidden via CSS */}
            <div className={cn(
              "absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-[10001] transition-all duration-200 origin-top-right",
              profileOpen ? "opacity-100 scale-100 pointer-events-auto animate-scale-in" : "opacity-0 scale-95 pointer-events-none"
            )}>
              {/* User info Header */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-extrabold text-slate-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] font-semibold text-slate-500 truncate">{currentUser.email}</p>
              </div>

              {/* Menu Items */}
              <div className="p-1.5 space-y-0.5">
                <button
                  id="tour-profile-view"
                  onClick={() => { navigate('profile'); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <User className="w-4 h-4 text-primary-600" />
                  <span>View Profile</span>
                </button>

                <button
                  id="tour-profile-settings"
                  onClick={() => { navigate('settings'); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  id="tour-profile-logout"
                  onClick={() => { logout(); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
        </div>

      </div>
    </header>
  );
}
