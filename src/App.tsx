import { NavProvider, useNav } from '@/lib/nav';
import { TourProvider } from '@/lib/TourContext';
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

const authRoutes = ['splash', 'welcome', 'login'];

function Router() {
  const { route } = useNav();

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
      <TourProvider>
        <Router />
      </TourProvider>
    </NavProvider>
  );
}

export default App;
