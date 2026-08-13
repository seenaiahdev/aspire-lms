import type { Step } from 'react-joyride';

// ═══════════════════════════════════════════════════
// DASHBOARD TOUR
// ═══════════════════════════════════════════════════
export const dashboardSteps: Step[] = [
  {
    target: '#tour-sidebar',
    title: 'Navigation Menu',
    content: 'This is your main navigation. Jump between your Dashboard, Courses, Practice Labs, and Settings here.',
    skipBeacon: true,
    placement: 'right',
  },
  {
    target: '#tour-schedule',
    title: 'Your Daily Schedule',
    content: 'Check here every day for your learning tasks and curriculum schedule. You can use the calendar to look ahead or back.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-live-classes',
    title: 'Live & Upcoming Sessions',
    content: 'Join your live instructor-led sessions directly from here. We will notify you when a class is about to start.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-class-card-0',
    title: 'Live Now',
    content: 'Jump directly into your active classroom and start learning in real-time with your instructor.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-class-card-1',
    title: 'Upcoming Classes',
    content: 'View your next scheduled session. You can even set reminders so you never miss it!',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-stats',
    title: 'Dashboard Insights',
    content: 'This panel gives you a quick overview of your entire learning journey.',
    placement: 'left',
    skipBeacon: true,
  },
  {
    target: '#tour-stat-card-0',
    title: 'Quick Access: Live',
    content: 'Instantly navigate to the live classroom portal from here at any time.',
    placement: 'left',
    skipBeacon: true,
  },
  {
    target: '#tour-stat-card-1',
    title: 'Overall Progress',
    content: 'Monitor your completion percentage across your enrolled courses.',
    placement: 'left',
    skipBeacon: true,
  },
  {
    target: '#tour-stat-card-2',
    title: 'Modules Finished',
    content: 'See exactly how many specific modules you have completed so far.',
    placement: 'left',
    skipBeacon: true,
  },
  {
    target: '#tour-stat-card-3',
    title: 'Upcoming Events',
    content: 'Check out webinars, hackathons, and special events happening soon.',
    placement: 'left',
    skipBeacon: true,
  },
  {
    target: '#tour-streak',
    title: 'Learning Streak',
    content: 'Keep up your daily streak! Completing tasks and attending classes every day keeps your fire burning.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-notifications',
    title: 'Stay Updated',
    content: 'Any new announcements, class reminders, or platform updates will appear right here.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-profile',
    title: 'Your Profile & Settings',
    content: 'Here you can View Profile to check your details, open Settings to customize preferences, or Logout when you\'re done for the day.',
    placement: 'bottom-end',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// MY LEARNING TOUR
// ═══════════════════════════════════════════════════
export const learningSteps: Step[] = [
  {
    target: '#tour-learning-header',
    title: 'My Learning Hub',
    content: 'Welcome to your learning center! All your enrolled courses and study materials are organized right here.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-learning-search',
    title: 'Search Courses',
    content: 'Quickly find any course by typing its name or keyword. Filtering becomes easy as your catalog grows.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-learning-filters',
    title: 'Category Filters',
    content: 'Switch between Courses, Soft Skills, Aptitude, Portfolio, Resume, and LinkedIn categories to narrow your view.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-learning-course-0',
    title: 'Your Enrolled Course',
    content: 'Each card shows the course thumbnail, instructor, your progress percentage, and a quick "Go to Course" button.',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// LIVE CLASSES TOUR
// ═══════════════════════════════════════════════════
export const liveClassesSteps: Step[] = [
  {
    target: '#tour-live-header',
    title: 'Live Classes',
    content: 'This is your live classroom hub. View all upcoming, active, and past instructor-led sessions.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-live-tabs',
    title: 'Session Filters',
    content: 'Toggle between Upcoming classes you need to attend and Completed sessions you can rewatch.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-live-card-0',
    title: 'Session Card',
    content: 'Each card shows the class title, instructor, scheduled time, and a button to join or watch the recording.',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// PRACTICE HUB (ASSIGNMENTS) TOUR
// ═══════════════════════════════════════════════════
export const assignmentsSteps: Step[] = [
  {
    target: '#tour-assignments-header',
    title: 'Practice Hub',
    content: 'Sharpen your skills with assessments and quizzes. Each one rewards you with XP upon completion!',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-assignments-tabs',
    title: 'Assessment Types',
    content: 'Switch between Assessments (coding challenges & MCQs) and Quizzes (quick knowledge checks).',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-assignments-filters',
    title: 'Status Filters',
    content: 'Filter by All, Pending, or Completed to quickly find what needs your attention.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-assignments-card-0',
    title: 'Assessment Card',
    content: 'See the assessment name, XP reward, estimated time, and your attempt count. Click to start!',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// PRACTICE LAB TOUR
// ═══════════════════════════════════════════════════
export const practiceSteps: Step[] = [
  {
    target: '#tour-practice-header',
    title: 'Practice Lab',
    content: 'Solve coding problems to build muscle memory. Track your submissions and improve your problem-solving skills.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-practice-tabs',
    title: 'Problems & Submissions',
    content: 'Browse available problems or review your past submissions and their results.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-practice-difficulty',
    title: 'Difficulty Levels',
    content: 'Filter problems by Easy, Medium, or Hard to match your current skill level.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-practice-card-0',
    title: 'Problem Card',
    content: 'Each problem shows its category, difficulty tag, and status. Click to open the coding workspace.',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// PROJECTS TOUR
// ═══════════════════════════════════════════════════
export const projectsSteps: Step[] = [
  {
    target: '#tour-projects-header',
    title: 'Hands-On Projects',
    content: 'Apply your skills with real-world projects. Build, deploy, and add them to your portfolio!',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-projects-filters',
    title: 'Project Filters',
    content: 'Filter projects by difficulty level and technology stack to find the right challenge for you.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-projects-card-0',
    title: 'Project Card',
    content: 'View the project brief, required tech stack, estimated time, and start building right away.',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// RESOURCES TOUR
// ═══════════════════════════════════════════════════
export const resourcesSteps: Step[] = [
  {
    target: '#tour-resources-header',
    title: 'Study Resources',
    content: 'Access all your study materials — PDFs, notes, cheat sheets, roadmaps, and templates in one place.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-resources-search',
    title: 'Search Materials',
    content: 'Quickly search through your entire resource library by name or keyword.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-resources-filters',
    title: 'Resource Types',
    content: 'Filter by PDF Guides, Notes, Cheat Sheets, Roadmaps, or Templates to find exactly what you need.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-resources-card-0',
    title: 'Resource Card',
    content: 'Each card shows the resource type, download count, and a one-click download button.',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// EVENTS (SCHEDULE) TOUR
// ═══════════════════════════════════════════════════
export const scheduleSteps: Step[] = [
  {
    target: '#tour-schedule-header',
    title: 'Events & Schedule',
    content: 'View all your upcoming events, classes, exams, and assignments on an interactive calendar.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-schedule-calendar',
    title: 'Calendar View',
    content: 'Navigate through months and click any date to see what\'s scheduled for that day.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-schedule-filters',
    title: 'Event Type Filters',
    content: 'Filter by Live Classes, Assignments, Exams, Events, or Tasks to focus on what matters most.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-schedule-timeline',
    title: 'Daily Timeline',
    content: 'See a detailed timeline of all events scheduled for the selected date.',
    placement: 'top',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// PLACEMENT HUB TOUR
// ═══════════════════════════════════════════════════
export const placementSteps: Step[] = [
  {
    target: '#tour-placement-header',
    title: 'Placement Hub',
    content: 'Discover job opportunities from top companies. Apply directly and track your applications.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-placement-search',
    title: 'Search Opportunities',
    content: 'Search jobs by company name, role, or technology stack to find the perfect fit.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-placement-tabs',
    title: 'Application Status',
    content: 'View All Jobs, your Applied positions, or your Saved favorites in one place.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-placement-card-0',
    title: 'Job Opportunity',
    content: 'Each card shows the company, role, salary range, location, and required tech stack. Click to view full details.',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// CERTIFICATIONS TOUR
// ═══════════════════════════════════════════════════
export const certificationsSteps: Step[] = [
  {
    target: '#tour-certs-header',
    title: 'Your Certifications',
    content: 'View and download your earned course certificates. Each one is verifiable with a unique ID.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-certs-card-0',
    title: 'Certificate Card',
    content: 'See your certificate progress, verification ID, and download it instantly as a professional PDF.',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// REWARDS TOUR
// ═══════════════════════════════════════════════════
export const rewardsSteps: Step[] = [
  {
    target: '#tour-rewards-header',
    title: 'Rewards Store',
    content: 'Earn XP by completing lessons and challenges. Spend your points on exclusive rewards and swag!',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-rewards-balance',
    title: 'Your XP Balance',
    content: 'This shows your current XP points. Keep learning to earn more and unlock exciting rewards.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '#tour-rewards-card-0',
    title: 'Reward Item',
    content: 'Browse physical swag, vouchers, and digital rewards. Click to claim when you have enough XP!',
    placement: 'bottom',
    skipBeacon: true,
  },
];

// ═══════════════════════════════════════════════════
// MILESTONES TOUR (same screen as Learning)
// ═══════════════════════════════════════════════════
export const milestonesSteps: Step[] = [
  {
    target: '#tour-learning-header',
    title: 'Milestones & Roadmap',
    content: 'Track your learning milestones and see the roadmap ahead. Each milestone marks a key achievement.',
    placement: 'bottom',
    skipBeacon: true,
  },
];
