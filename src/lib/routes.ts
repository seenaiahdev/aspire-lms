export type Route =
  | 'splash' | 'welcome' | 'login'
  | 'dashboard' | 'learning' | 'milestones' | 'course' | 'lesson' | 'live' | 'classroom' | 'recording'
  | 'assignments' | 'practice' | 'quizzes' | 'projects' | 'resources'
  | 'community' | 'schedule' | 'progress' | 'achievements' | 'certificates'
  | 'placement' | 'notifications' | 'profile' | 'settings' | 'workspace'
  | 'rewards' | 'certifications';

export const navItems: { id: Route; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'learning', label: 'My Learning', icon: 'GraduationCap' },
  { id: 'live', label: 'Live Classes', icon: 'Radio' },
  { id: 'milestones', label: 'Milestones', icon: 'MapPin' },
  { id: 'assignments', label: 'Practice Hub', icon: 'FileText' },
  { id: 'practice', label: 'Practice Lab', icon: 'Code2' },
  { id: 'projects', label: 'Projects', icon: 'FolderGit2' },
  { id: 'resources', label: 'Resources', icon: 'Library' },
  { id: 'schedule', label: 'Events', icon: 'CalendarDays' },
  { id: 'placement', label: 'Placement Hub', icon: 'Briefcase' },
  { id: 'certifications', label: 'Certifications', icon: 'Award' },
  { id: 'rewards', label: 'Rewards', icon: 'Gift' },
];

export const bottomNavItems: { id: Route; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', icon: 'Home' },
  { id: 'learning', label: 'Learning', icon: 'GraduationCap' },
  { id: 'practice', label: 'Practice', icon: 'Code2' },
  { id: 'notifications', label: 'Alerts', icon: 'Bell' },
  { id: 'profile', label: 'Profile', icon: 'User' },
];
