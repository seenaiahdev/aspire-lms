import { useState, useRef, useEffect, useMemo } from 'react';
import { Menu, Bell, LogOut, Flame, Zap, User, Settings, ChevronDown, CheckCircle2, AlertCircle, ShieldCheck, ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
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

  const attStats = currentUser.attendanceStats;
  const totalSessions = attStats ? attStats.totalSessions : 0;
  const presentCount = attStats ? attStats.presentCount : 0;
  const absentCount = attStats ? attStats.absentCount : 0;
  // Strictly compute from live mentor records (presentCount / (presentCount + absentCount))
  // Unmarked days or dates with neither present nor absent are considered "No Class".
  const attendancePct = totalSessions > 0
    ? (attStats?.percentage ?? Math.round((presentCount / totalSessions) * 100))
    : 0;
  const latestRecord = attStats?.latestRecord;

  // Calendar popover browsing state
  const now = new Date();
  const [calMonth, setCalMonth] = useState(() => now.getMonth());
  const [calYear, setCalYear] = useState(() => now.getFullYear());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Map student attendance records by date (YYYY-MM-DD)
  const recordsByDate = useMemo(() => {
    const map = new Map<string, any>();
    if (attStats?.records) {
      for (const rec of attStats.records) {
        if (rec.date) {
          map.set(rec.date, rec);
        }
      }
    }
    return map;
  }, [attStats?.records]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const calendarStartOffset = (firstDayOfMonth + 6) % 7; // Monday-first
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const realTodayYear = now.getFullYear();
  const realTodayMonth = now.getMonth();
  const realTodayDate = now.getDate();
  const todayKey = `${realTodayYear}-${String(realTodayMonth + 1).padStart(2, '0')}-${String(realTodayDate).padStart(2, '0')}`;

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const selectedRecord = selectedDateKey ? recordsByDate.get(selectedDateKey) : null;

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
            title={totalSessions === 0 ? "Attendance: No classes held yet (No class consideration)" : `Attendance: ${attendancePct}% (${presentCount} Present / ${absentCount} Absent)`}
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95",
              totalSessions === 0
                ? "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                : attendancePct >= 85
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : attendancePct >= 75
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
            )}
          >
            {totalSessions === 0 ? (
              <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-slate-500" />
            ) : (
              <CheckCircle2 className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0",
                attendancePct >= 85 ? "text-emerald-600" : attendancePct >= 75 ? "text-amber-600" : "text-rose-600"
              )} />
            )}
            <span>{attendancePct}%</span>
            <span className="hidden md:inline font-semibold text-[10px] opacity-75">Att.</span>
          </button>

          {/* Fixed-anchor positioning wrapper (zero horizontal shift or jumping from profile) */}
          <div className={cn(
            "absolute top-full mt-2.5 z-[10001]",
            "right-[-5rem] sm:right-auto sm:left-1/2 sm:-translate-x-1/2",
            attendanceOpen ? "pointer-events-auto" : "pointer-events-none"
          )}>
            {/* Inner Minimal & Compact Card (Smooth scale & opacity transition) */}
            <div className={cn(
              "w-[calc(100vw-2rem)] max-w-[19rem] sm:max-w-[20rem] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06)] p-3.5 transition-[opacity,transform] duration-150 ease-out origin-top",
              attendanceOpen
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 -translate-y-1"
            )}>
              {/* Header: Clean & Minimal */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Attendance</span>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                    totalSessions === 0
                      ? "bg-slate-100 text-slate-600"
                      : attendancePct >= 85
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : attendancePct >= 75
                      ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                      : "bg-rose-50 text-rose-700 border border-rose-200/60"
                  )}>
                    {attendancePct}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setAttendanceOpen(false)}
                  className="w-6 h-6 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Compact 3-Column Metrics */}
              <div className="grid grid-cols-3 bg-slate-50/90 rounded-xl p-1.5 my-2 text-center text-xs divide-x divide-slate-200/60 border border-slate-100">
                <div>
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase">Present</span>
                  <span className="font-extrabold text-emerald-600 text-xs">{presentCount}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase">Absent</span>
                  <span className="font-extrabold text-rose-500 text-xs">{absentCount}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase">Total</span>
                  <span className="font-extrabold text-slate-700 text-xs">{totalSessions}</span>
                </div>
              </div>

              {/* Month Navigator Toolbar */}
              <div className="flex items-center justify-between py-1 px-0.5 mb-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-bold text-slate-700">
                  {monthNames[calMonth]} {calYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day, idx) => (
                  <span key={idx} className="text-[9px] font-bold text-slate-400 py-0.5">
                    {day}
                  </span>
                ))}

                {Array.from({ length: calendarStartOffset }).map((_, offset) => (
                  <div key={`offset-${offset}`} className="w-6 h-6 sm:w-7 sm:h-7" />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const dKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const rec = recordsByDate.get(dKey);
                  const s = (rec?.status || '').toLowerCase().trim();
                  const isPresent = s === 'present' || s === 'attended' || s === 'late';
                  const isAbsent = s === 'absent';
                  const isToday = dKey === todayKey;
                  const isSelected = selectedDateKey === dKey;

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDateKey(selectedDateKey === dKey ? null : dKey);
                      }}
                      title={
                        isPresent
                          ? `${dKey}: Present ${rec.remarks ? `(${rec.remarks})` : ''}`
                          : isAbsent
                          ? `${dKey}: Absent ${rec.remarks ? `(${rec.remarks})` : ''}`
                          : `${dKey}: No Class`
                      }
                      className={cn(
                        "w-6 h-6 sm:w-7 sm:h-7 rounded-lg mx-auto flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer",
                        isPresent
                          ? "bg-emerald-500 text-white font-extrabold shadow-xs shadow-emerald-500/20"
                          : isAbsent
                          ? "bg-rose-500 text-white font-extrabold shadow-xs shadow-rose-500/20"
                          : isToday
                          ? "bg-purple-50 text-[#7c3aed] ring-1 ring-[#7c3aed] font-black"
                          : "text-slate-600 hover:bg-slate-100",
                        isSelected && !isPresent && !isAbsent && "ring-1.5 ring-indigo-500 bg-indigo-50 text-indigo-700"
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Compact Date Detail Preview (Only when a date is selected) */}
              {selectedDateKey && (
                <div className="py-1 px-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] mb-2 flex items-center justify-between">
                  <span className="font-bold text-slate-700 truncate">{selectedDateKey}</span>
                  {selectedRecord ? (
                    <span className={cn(
                      "font-black px-1.5 py-0.5 rounded text-[9px] uppercase",
                      (selectedRecord.status || '').toLowerCase() === 'present'
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    )}>
                      {selectedRecord.status}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">No Class</span>
                  )}
                </div>
              )}

              {/* Minimal Dot Legend */}
              <div className="flex items-center justify-center gap-3.5 pt-1.5 border-t border-slate-100 text-[9px] font-medium text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span>No Class</span>
                </div>
              </div>
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
