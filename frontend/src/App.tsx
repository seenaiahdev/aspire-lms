import { lazy, Suspense } from 'react';
import { NavProvider, useNav } from '@/lib/nav';
import { TourProvider } from '@/lib/TourContext';
import { UserProvider } from '@/lib/UserContext';
import { NotificationsProvider } from '@/lib/NotificationsContext';
import { AppShell } from '@/components/layout/AppShell';

// Auth screens stay eager — they are the entry point and must render instantly.
import { SplashScreen } from '@/screens/auth/SplashScreen';
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';

// App screens are code-split: each becomes its own chunk loaded on first navigation, so a
// student landing on the dashboard no longer downloads all 25 screens up front. Screens use
// named exports, so map each to `default` for React.lazy.
const DashboardScreen = lazy(() => import('@/screens/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const LearningScreen = lazy(() => import('@/screens/LearningScreen').then(m => ({ default: m.LearningScreen })));
const CourseScreen = lazy(() => import('@/screens/CourseScreen').then(m => ({ default: m.CourseScreen })));
const LessonScreen = lazy(() => import('@/screens/LessonScreen').then(m => ({ default: m.LessonScreen })));
const LiveClassesScreen = lazy(() => import('@/screens/LiveClassesScreen').then(m => ({ default: m.LiveClassesScreen })));
const LiveClassroomScreen = lazy(() => import('@/screens/LiveClassesScreen').then(m => ({ default: m.LiveClassroomScreen })));
const RecordingScreen = lazy(() => import('@/screens/RecordingScreen').then(m => ({ default: m.RecordingScreen })));
const AssignmentsScreen = lazy(() => import('@/screens/AssignmentsScreen').then(m => ({ default: m.AssignmentsScreen })));
const PracticeScreen = lazy(() => import('@/screens/PracticeScreen').then(m => ({ default: m.PracticeScreen })));
const WorkspaceScreen = lazy(() => import('@/screens/WorkspaceScreen').then(m => ({ default: m.WorkspaceScreen })));
const QuizzesScreen = lazy(() => import('@/screens/QuizzesScreen').then(m => ({ default: m.QuizzesScreen })));
const ProjectsScreen = lazy(() => import('@/screens/ProjectsScreen').then(m => ({ default: m.ProjectsScreen })));
const ResourcesScreen = lazy(() => import('@/screens/ResourcesScreen').then(m => ({ default: m.ResourcesScreen })));
const CommunityScreen = lazy(() => import('@/screens/CommunityScreen').then(m => ({ default: m.CommunityScreen })));
const ScheduleScreen = lazy(() => import('@/screens/ScheduleScreen').then(m => ({ default: m.ScheduleScreen })));
const ProgressScreen = lazy(() => import('@/screens/ProgressScreen').then(m => ({ default: m.ProgressScreen })));
const AchievementsScreen = lazy(() => import('@/screens/AchievementsScreen').then(m => ({ default: m.AchievementsScreen })));
const CertificatesScreen = lazy(() => import('@/screens/CertificatesScreen').then(m => ({ default: m.CertificatesScreen })));
const RewardsScreen = lazy(() => import('@/screens/RewardsScreen').then(m => ({ default: m.RewardsScreen })));
const PlacementScreen = lazy(() => import('@/screens/PlacementScreen').then(m => ({ default: m.PlacementScreen })));
const NotificationsScreen = lazy(() => import('@/screens/NotificationsScreen').then(m => ({ default: m.NotificationsScreen })));
const ProfileScreen = lazy(() => import('@/screens/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const SettingsScreen = lazy(() => import('@/screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));

import { useUser } from '@/lib/UserContext';
import aspireLogo from '@/assests/Aspire_logo.jpg';

const authRoutes = ['splash', 'welcome', 'login'];

function SplashLoader() {
  return (
    <div 
      className="min-h-screen relative flex items-center justify-center overflow-hidden font-sans select-none"
      style={{ background: 'radial-gradient(ellipse at 25% 30%, #321d72 0%, #47269f 45%, #0c0f26 100%)' }}
    >
      {/* 3D Ambient Glows */}
      <div 
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-30 blur-[140px]"
        style={{ background: 'rgba(117,64,255,0.4)' }} 
      />
      <div 
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-30 blur-[150px]"
        style={{ background: 'rgba(95,50,215,0.35)' }} 
      />
      <div 
        className="absolute top-[40%] left-[35%] w-[400px] h-[400px] rounded-full pointer-events-none opacity-20 blur-[130px]"
        style={{ background: 'rgba(149,100,255,0.28)' }} 
      />

      <div className="relative z-10 flex flex-col items-center gap-6">

        {/* Logo icon box with spinning ring loader */}
        <div className="relative flex items-center justify-center">
          <div 
            className="absolute -inset-3.5 rounded-[2.2rem] border-2 border-transparent border-t-primary-400 border-r-primary-500 animate-spin" 
          />
          <div className="relative w-24 h-24 rounded-full bg-white shadow-2xl flex items-center justify-center overflow-hidden animate-scale-in border-2 border-white p-0">
            <img
              src={aspireLogo}
              alt="AspireLMS Logo"
              className="w-full h-full object-cover scale-110"
            />
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center animate-fade-up">
          <h1 className="font-bold text-4xl text-white tracking-tight">
            Aspire<span className="text-primary-400">Next</span>
          </h1>
          <p className="text-primary-100/80 text-sm mt-1.5 tracking-wide font-normal">Learn. Practice. Achieve.</p>
        </div>

        {/* Loader Dots */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

      </div>

    </div>
  );
}

function Router() {
  const { route } = useNav();
  const { loading } = useUser();

  if (loading && !authRoutes.includes(route)) {
    return <SplashLoader />;
  }

  if (authRoutes.includes(route)) {
    switch (route) {
      case 'splash': return <SplashScreen />;
      case 'welcome': return <WelcomeScreen />;
      case 'login': return <LoginScreen />;
      default: return <SplashScreen />;
    }
  }

  return (
    <AppShell>
      <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-transparent border-t-primary-500 border-r-primary-500 animate-spin" /></div>}>
      {(() => {
        switch (route) {
          case 'dashboard': return <DashboardScreen />;
          case 'learning': return <LearningScreen />;
          case 'milestones': return <LearningScreen />;
          case 'course': return <CourseScreen />;
          case 'lesson': return <LessonScreen />;
          case 'live': return <LiveClassesScreen />;
          case 'recordings': return <LiveClassesScreen />;
          case 'classroom': return <LiveClassroomScreen />;
          case 'recording': return <RecordingScreen />;
          case 'assignments': return <AssignmentsScreen />;
          case 'practice': return <PracticeScreen />;
          case 'workspace': return <WorkspaceScreen />;
          case 'quizzes': return <AssignmentsScreen />;
          case 'projects': return <ProjectsScreen />;
          case 'resources': return <ResourcesScreen />;
          case 'community': return <CommunityScreen />;
          case 'schedule': return <ScheduleScreen />;
          case 'progress': return <ProgressScreen />;
          case 'achievements': return <AchievementsScreen />;
          case 'certificates': return <CertificatesScreen />;
          case 'rewards': return <RewardsScreen />;
          case 'certifications': return <CertificatesScreen />;
          case 'placement': return <PlacementScreen />;
          case 'notifications': return <NotificationsScreen />;
          case 'profile': return <ProfileScreen />;
          case 'settings': return <SettingsScreen />;
          default: return <DashboardScreen />;
        }
      })()}
      </Suspense>
    </AppShell>
  );
}

function App() {
  return (
    <NavProvider>
      <UserProvider>
        <NotificationsProvider>
          <TourProvider>
            <Router />
          </TourProvider>
        </NotificationsProvider>
      </UserProvider>
    </NavProvider>
  );
}

export default App;
