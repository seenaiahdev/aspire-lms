import { NavProvider, useNav } from '@/lib/nav';
import { TourProvider } from '@/lib/TourContext';
import { UserProvider } from '@/lib/UserContext';
import { NotificationsProvider } from '@/lib/NotificationsContext';
import { AppShell } from '@/components/layout/AppShell';

import { SplashScreen } from '@/screens/auth/SplashScreen';
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';


import { DashboardScreen } from '@/screens/DashboardScreen';
import { LearningScreen } from '@/screens/LearningScreen';
import { CourseScreen } from '@/screens/CourseScreen';
import { LessonScreen } from '@/screens/LessonScreen';
import { LiveClassesScreen, LiveClassroomScreen } from '@/screens/LiveClassesScreen';
import { RecordingScreen } from '@/screens/RecordingScreen';
import { AssignmentsScreen } from '@/screens/AssignmentsScreen';
import { PracticeScreen } from '@/screens/PracticeScreen';
import { WorkspaceScreen } from '@/screens/WorkspaceScreen';
import { QuizzesScreen } from '@/screens/QuizzesScreen';
import { ProjectsScreen } from '@/screens/ProjectsScreen';
import { ResourcesScreen } from '@/screens/ResourcesScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { ScheduleScreen } from '@/screens/ScheduleScreen';
import { ProgressScreen } from '@/screens/ProgressScreen';
import { AchievementsScreen } from '@/screens/AchievementsScreen';
import { CertificatesScreen } from '@/screens/CertificatesScreen';
import { RewardsScreen } from '@/screens/RewardsScreen';
import { CertificationsScreen } from '@/screens/CertificationsScreen';
import { PlacementScreen } from '@/screens/PlacementScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';

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
      {(() => {
        switch (route) {
          case 'dashboard': return <DashboardScreen />;
          case 'learning': return <LearningScreen />;
          case 'milestones': return <LearningScreen />;
          case 'course': return <CourseScreen />;
          case 'lesson': return <LessonScreen />;
          case 'live': return <LiveClassesScreen />;
          case 'classroom': return <LiveClassroomScreen />;
          case 'recording': return <RecordingScreen />;
          case 'assignments': return <AssignmentsScreen />;
          case 'practice': return <PracticeScreen />;
          case 'workspace': return <WorkspaceScreen />;
          case 'quizzes': return <QuizzesScreen />;
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
