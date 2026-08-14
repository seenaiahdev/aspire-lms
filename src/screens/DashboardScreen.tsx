import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Play, Code2, Clock, Check, ChevronLeft, ChevronRight as ChevronRightIcon, BookMarked,
  ArrowLeft, ArrowRight, CheckCircle2, Video, Terminal, BookOpenText, Award, Layers, Sparkles, FileText, CheckCircle, Trophy, TrendingUp, CalendarDays, Radio, CalendarX
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { liveClasses } from '@/data/mock';
import { useUser } from '@/lib/UserContext';
import { cn } from '@/lib/utils';
import { OnboardingTour } from '@/components/ui/OnboardingTour';
import { dashboardSteps } from '@/lib/tourSteps';

// Struct for Daily 2-3 Python Topics
interface PythonTopic {
  id: number;
  slug: string;
  title: string;
  category: string;
  duration: string;
  description: string;
  fullExplanation: string;
  codeSnippet: string;
  keyObjectives: string[];
  status: 'completed' | 'in_progress' | 'upcoming';
}

// Mock Data mapping date numbers (1 to 31) to 2-3 Python Topics
const pythonDailyTopicsMock: Record<number, PythonTopic[]> = {
  1: [
    {
      id: 101,
      slug: 'environment-setup',
      title: 'Python 3.12 Installation & Environment Setup',
      category: 'Environment',
      duration: '30 mins',
      description: 'Setting up VS Code, virtualenv, and running your first print("Hello World")',
      fullExplanation: `Python 3.12 introduces faster execution speeds and improved error messages. In this lesson, we walk through setting up your local development environment using VS Code, configuring Python virtual environments (venv), and executing Python scripts in the terminal.`,
      codeSnippet: `# Python 3.12 - Hello World & System Check
import sys

print("Hello, AspireNext Learner!")
print(f"Python Version: {sys.version}")

# Creating a virtual environment in terminal:
# python -m venv venv
# source venv/bin/activate  # On macOS/Linux
# venv\\Scripts\\activate   # On Windows`,
      keyObjectives: [
        'Install Python 3.12 interpreter on your operating system',
        'Configure VS Code Python extension and linter',
        'Understand virtual environments and dependency isolation',
      ],
      status: 'completed',
    },
    {
      id: 102,
      slug: 'primitive-data-types',
      title: 'Variables, Primitive Data Types & Dynamic Typing',
      category: 'Basics',
      duration: '45 mins',
      description: 'Understanding integers, floats, booleans, and string immutability in memory',
      fullExplanation: `Python is dynamically typed, meaning variable types are determined at runtime. We will cover Python's fundamental primitives: integers (int), floating-point numbers (float), strings (str), and booleans (bool). Learn how memory allocation works with id() and type().`,
      codeSnippet: `# Python Primitive Data Types
student_name = "Aarav Sharma"  # str
age = 22                        # int
gpa = 3.92                      # float
is_enrolled = True              # bool

print(f"Student: {student_name}, Type: {type(student_name)}")
print(f"Memory Address ID: {id(student_name)}")`,
      keyObjectives: [
        'Differentiate between int, float, str, and bool data types',
        'Understand dynamic typing vs static typing',
        'Learn variable naming conventions (PEP 8 snake_case)',
      ],
      status: 'completed',
    },
  ],
  7: [ // TODAY (AUG 7)
    {
      id: 701,
      slug: 'args-and-kwargs',
      title: 'Python *args and **kwargs Variable Arguments',
      category: 'Functions',
      duration: '45 mins',
      description: 'Accepting dynamic positional and keyword arguments in reusable functions',
      fullExplanation: `In Python, *args and **kwargs allow functions to accept an arbitrary number of positional and keyword arguments. This lesson explains tuple unpacking for *args, dictionary unpacking for **kwargs, and building flexible API utility wrappers.`,
      codeSnippet: `# Flexible Functions with *args and **kwargs

def calculate_student_score(student_name, *scores, **details):
    total = sum(scores)
    average = total / len(scores) if scores else 0
    
    print(f"--- Score Card for {student_name} ---")
    print(f"Total XP: {total} | Average: {average:.2f}")
    
    for key, value in details.items():
        print(f"  {key.title()}: {value}")

calculate_student_score("Aarav Sharma", 95, 88, 92, cohort="Python Dev", level=24)`,
      keyObjectives: [
        'Understand *args tuple parameter unpacking',
        'Understand **kwargs dictionary parameter unpacking',
        'Combine positional, default, *args, and **kwargs parameters cleanly',
      ],
      status: 'completed',
    },
    {
      id: 702,
      slug: 'lambda-expressions',
      title: 'Lambda Expressions & Anonymous Functions',
      category: 'Functional',
      duration: '40 mins',
      description: 'Writing inline lambda functions with map(), filter(), and sorted() key',
      fullExplanation: `Lambda expressions are small, 1-line anonymous functions defined using the lambda keyword. Learn how to use lambda functions alongside built-in higher-order functions like map(), filter(), and sorted() for concise data manipulation.`,
      codeSnippet: `# Lambda Functions & Higher-Order Methods
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Filter even numbers using lambda
evens = list(filter(lambda x: x % 2 == 0, numbers))

# Map squares using lambda
squares = list(map(lambda x: x ** 2, evens))

print(f"Evens: {evens}")
print(f"Squares of evens: {squares}")`,
      keyObjectives: [
        'Syntax and structure of 1-line lambda functions',
        'Combine lambda with filter() and map() for functional processing',
        'Use lambda functions as custom sorting keys in sorted()',
      ],
      status: 'in_progress',
    },
    {
      id: 703,
      slug: 'classes-and-init',
      title: 'Object-Oriented Programming: Classes & __init__',
      category: 'OOP',
      duration: '60 mins',
      description: 'Creating blueprint classes, instance attributes, methods, and self keyword',
      fullExplanation: `Object-Oriented Programming (OOP) organizes code into reusable objects containing data (attributes) and behavior (methods). In this lesson, we construct Python classes, define the __init__ constructor, and master the self reference keyword.`,
      codeSnippet: `# Python OOP Class Definition
class Student:
    def __init__(self, name: str, course: str, xp: int = 0):
        self.name = name
        self.course = course
        self.xp = xp

    def complete_lesson(self, xp_reward: int):
        self.xp += xp_reward
        print(f"🎉 {self.name} completed a lesson! Total XP: {self.xp}")

student_1 = Student("Aarav Sharma", "Python Full-Stack", 12450)
student_1.complete_lesson(150)`,
      keyObjectives: [
        'Define Python classes with the class keyword',
        'Master the __init__ constructor method and self parameter',
        'Instantiate objects and access instance methods',
      ],
      status: 'upcoming',
    },
  ],
  8: [
    {
      id: 801,
      slug: 'class-inheritance',
      title: 'Class Inheritance & Super() Method',
      category: 'OOP',
      duration: '50 mins',
      description: 'Single and multiple inheritance, method overriding, and super().__init__()',
      fullExplanation: `Inheritance allows a child class to inherit attributes and methods from a parent class. Learn single and multiple inheritance patterns, method overriding, and invoking parent constructors using super().__init__().`,
      codeSnippet: `class User:
    def __init__(self, email, role):
        self.email = email
        self.role = role

class Mentor(User):
    def __init__(self, email, specialty):
        super().__init__(email, role="Mentor")
        self.specialty = specialty

mentor = Mentor("sara@aspirenext.edu", "Python AI")
print(f"Role: {mentor.role}, Specialty: {mentor.specialty}")`,
      keyObjectives: [
        'Inherit features from base parent classes',
        'Invoke parent methods using super()',
        'Override parent methods for specialized behavior',
      ],
      status: 'upcoming',
    },
    {
      id: 802,
      slug: 'encapsulation-private',
      title: 'Encapsulation & Private Attributes (_private)',
      category: 'OOP',
      duration: '40 mins',
      description: 'Property getters/setters with @property decorator and data hiding',
      fullExplanation: `Encapsulation restricts direct access to an object's internal state. Learn Python conventions for private attributes (_protected and __private) and construct elegant getters and setters using the @property decorator.`,
      codeSnippet: `class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self._balance = balance

    @property
    def balance(self):
        return self._balance`,
      keyObjectives: [
        'Protect internal state with single/double underscores',
        'Implement clean getters and setters with @property',
        'Prevent invalid attribute mutations',
      ],
      status: 'upcoming',
    },
  ],
};

const getDefaultTopicsForDate = (dayNum: number): PythonTopic[] => {
  return [
    { 
      id: dayNum * 100 + 1, 
      slug: `topic-${dayNum}-1`,
      title: `Python Topic ${dayNum}.1: Core Concepts & Syntax`, 
      category: 'Core Python', 
      duration: '45 mins', 
      description: `Structured Python programming lesson & hands-on lab exercise for Day ${dayNum}`, 
      fullExplanation: `Detailed concept walkthrough covering topic ${dayNum}.1 with step-by-step code samples and exercise challenges.`,
      codeSnippet: `# Day ${dayNum} Practice Exercise\ndef practice_task():\n    print("Executing Day ${dayNum} Python Task")\n\npractice_task()`,
      keyObjectives: [`Understand Day ${dayNum} core syntax`, `Execute practice exercises`, `Complete coding challenge`],
      status: 'upcoming' 
    },
    { 
      id: dayNum * 100 + 2, 
      slug: `topic-${dayNum}-2`,
      title: `Python Topic ${dayNum}.2: Hands-on Coding Problem`, 
      category: 'Lab Practice', 
      duration: '40 mins', 
      description: `Solve algorithm challenges and submit code solution for review`, 
      fullExplanation: `Hands-on coding lab focusing on algorithm design, debugging, and solution submission.`,
      codeSnippet: `# Day ${dayNum} Lab Challenge\ndef solution(data):\n    return [x for x in data if x % 2 == 0]`,
      keyObjectives: [`Implement algorithm logic`, `Pass automated test cases`, `Review code complexity`],
      status: 'upcoming' 
    },
  ];
};

export function DashboardScreen() {
  const { user: currentUser } = useUser();
  const { navigate } = useNav();

  // Real-time System Today Date
  const today = useMemo(() => new Date(), []);
  const realTodayYear = today.getFullYear();
  const realTodayMonth = today.getMonth();
  const realTodayDate = today.getDate();

  // Browsing Calendar Month & Year State (Popover View)
  const [currentYear, setCurrentYear] = useState<number>(realTodayYear);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(realTodayMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1).getDay();
  const calendarStartOffset = (firstDayOfMonth + 6) % 7; // Monday-first grid

  // Selected Date State (Defaults to Real-Time System Today Date)
  const [selectedYear, setSelectedYear] = useState<number>(realTodayYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(realTodayMonth);
  const [selectedDateNum, setSelectedDateNum] = useState<number>(realTodayDate);

  const selectedDateObject = useMemo(
    () => new Date(selectedYear, selectedMonthIndex, selectedDateNum),
    [selectedYear, selectedMonthIndex, selectedDateNum]
  );

  const dayName = selectedDateObject.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = selectedDateObject.toLocaleDateString('en-US', { month: 'long' });
  const formattedDateString = `${dayName}, ${monthName} ${selectedDateNum}, ${selectedYear}`;
  const isSelectedDateToday =
    selectedDateNum === realTodayDate &&
    selectedMonthIndex === realTodayMonth &&
    selectedYear === realTodayYear;

  const goToPreviousDay = () => {
    const prev = new Date(selectedYear, selectedMonthIndex, selectedDateNum - 1);
    setSelectedYear(prev.getFullYear());
    setSelectedMonthIndex(prev.getMonth());
    setSelectedDateNum(prev.getDate());
    setCurrentYear(prev.getFullYear());
    setCurrentMonthIndex(prev.getMonth());
  };

  const goToNextDay = () => {
    const next = new Date(selectedYear, selectedMonthIndex, selectedDateNum + 1);
    setSelectedYear(next.getFullYear());
    setSelectedMonthIndex(next.getMonth());
    setSelectedDateNum(next.getDate());
    setCurrentYear(next.getFullYear());
    setCurrentMonthIndex(next.getMonth());
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonthIndex(now.getMonth());
    setSelectedDateNum(now.getDate());
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
  };

  // Toggle state to view full month calendar grid overlay
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  // Active Selected Topic State for Full-Screen Lesson Screen
  const [activeTopic, setActiveTopic] = useState<PythonTopic | null>(null);

  // View Mode inside Topic Screen: 'video' | 'theory'
  const [topicViewMode, setTopicViewMode] = useState<'video' | 'theory'>(() => {
    return (localStorage.getItem('aspire_topic_view_mode') as 'video' | 'theory') || 'video';
  });

  const handleTopicViewModeChange = (mode: 'video' | 'theory') => {
    setTopicViewMode(mode);
    localStorage.setItem('aspire_topic_view_mode', mode);
  };

  // Dynamic Topics for Selected Date
  const currentTopics = pythonDailyTopicsMock[selectedDateNum] || getDefaultTopicsForDate(selectedDateNum);

  // Track topic completed checkmarks locally
  const [completedTopicIds, setCompletedTopicIds] = useState<number[]>([101, 102, 201, 202, 301, 401, 402, 501, 601, 701]);

  const toggleTopicCompleted = (topicId: number) => {
    setCompletedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const [copiedCode, setCopiedCode] = useState(false);
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ════════ DYNAMIC ROUTING & URL SYNC FOR TOPICS ════════
  const findTopicBySlug = useCallback((slug: string): PythonTopic | null => {
    if (!slug) return null;
    for (const dateKey in pythonDailyTopicsMock) {
      const topics = pythonDailyTopicsMock[Number(dateKey)];
      const found = topics.find((t) => t.slug === slug);
      if (found) return found;
    }
    for (let day = 1; day <= 31; day++) {
      const topics = getDefaultTopicsForDate(day);
      const found = topics.find((t) => t.slug === slug);
      if (found) return found;
    }
    return null;
  }, []);

  const openTopicWithRoute = (topic: PythonTopic) => {
    setActiveTopic(topic);
    window.history.pushState({}, '', `/dashboard/${topic.slug}`);
  };

  const closeTopicAndReturnToDashboard = () => {
    setActiveTopic(null);
    window.history.pushState({}, '', '/dashboard');
  };

  useEffect(() => {
    const syncTopicFromUrl = () => {
      const pathname = window.location.pathname.replace(/^\//, '');
      const parts = pathname.split('/');
      if (parts[0] === 'dashboard' && parts[1]) {
        const topicSlug = parts[1];
        const matched = findTopicBySlug(topicSlug);
        if (matched) {
          setActiveTopic(matched);
          return;
        }
      }
      if (parts[0] === 'dashboard' && !parts[1]) {
        setActiveTopic(null);
      }
    };

    syncTopicFromUrl();
    window.addEventListener('popstate', syncTopicFromUrl);
    return () => window.removeEventListener('popstate', syncTopicFromUrl);
  }, [findTopicBySlug]);

  // ════════════════ SOLID FULL-SCREEN TOPIC LESSON CANVAS ════════════════
  if (activeTopic) {
    const isCompleted = completedTopicIds.includes(activeTopic.id);

    return (
      <div className="fixed inset-0 z-[9999] bg-[#f8fafc] text-slate-900 overflow-y-auto p-4 sm:p-6 lg:p-8 font-sans animate-fade-in flex flex-col justify-between">
        
        {/* Full-Screen Top Header Bar */}
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-200/80 shrink-0 relative z-10">
          
          {/* Back Button */}
          <button
            onClick={closeTopicAndReturnToDashboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-extrabold transition-all active:scale-95 shrink-0 border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-primary-600" />
            <span>Exit to Dashboard</span>
          </button>

          {/* Topic Title & Category Badge */}
          <div className="flex items-center gap-3 text-center sm:text-left min-w-0">
            <span className="px-3 py-1 rounded-xl bg-primary-50 text-primary-800 border border-primary-200 text-xs font-extrabold shrink-0">
              {activeTopic.category}
            </span>
            <h2 className="font-extrabold text-slate-900 text-base sm:text-xl tracking-tight truncate">
              {activeTopic.title}
            </h2>
          </div>

          {/* Complete Toggle Button */}
          <button
            onClick={() => toggleTopicCompleted(activeTopic.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 shrink-0 shadow-sm ${
              isCompleted
                ? 'bg-success-100 text-success-800 border border-success-300'
                : 'bg-gradient-to-r from-primary-700 to-primary-500 text-white hover:shadow-md'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? 'Completed ✓' : 'Mark as Complete'}</span>
          </button>
        </div>


        {/* 2 SELECTABLE MODE OPTIONS (VIDEO & THEORY) */}
        <div className="w-full max-w-7xl mx-auto my-6 flex-1 flex flex-col space-y-6 relative z-10">
          
          <div className="flex items-center justify-center sm:justify-start gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs max-w-md">
            
            {/* Option 1: Video Mode Button */}
            <button
              onClick={() => handleTopicViewModeChange('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all ${
                topicViewMode === 'video'
                  ? 'bg-gradient-to-r from-primary-700 to-primary-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Video className={`w-4 h-4 shrink-0 ${topicViewMode === 'video' ? 'text-white' : 'text-primary-600'}`} />
              <span>Video Lecture</span>
            </button>

            {/* Option 2: Theory Mode Button */}
            <button
              onClick={() => handleTopicViewModeChange('theory')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all ${
                topicViewMode === 'theory'
                  ? 'bg-gradient-to-r from-primary-700 to-primary-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpenText className={`w-4 h-4 shrink-0 ${topicViewMode === 'theory' ? 'text-white' : 'text-primary-600'}`} />
              <span>Theory & Concept Notes</span>
            </button>

          </div>


          {/* MODE CONTENT SWITCH */}
          {topicViewMode === 'video' ? (
            /* ════════ OPTION 1: VIDEO LECTURE MODE ════════ */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
              
              {/* Video Player (8 Cols) */}
              <div className="lg:col-span-8 bg-white rounded-3xl overflow-hidden shadow-md border border-slate-200/80">
                <div className="relative aspect-video w-full flex items-center justify-center bg-slate-950">
                  <iframe
                    src="https://www.youtube.com/embed/_uQrJ0TkZlc?autoplay=1&rel=0&modestbranding=1"
                    title="Introduction to Python - Full Course for Beginners"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>

                <div className="p-4 bg-slate-50 flex items-center justify-between text-xs border-t border-slate-200/80">
                  <div className="flex items-center gap-2 text-primary-900">
                    <Video className="w-4 h-4 text-primary-600" />
                    <span className="font-extrabold">Online Video: Python for Beginners (Full Intro Course)</span>
                  </div>
                  <span className="text-slate-500 font-mono">HD Streaming · {activeTopic.duration}</span>
                </div>
              </div>

              {/* Video Overview & Quick Notes (4 Cols) */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-primary-900 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-primary-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Video Summary</h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {activeTopic.description}
                </p>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Video Topics Covered</h4>
                  <ul className="space-y-2">
                    {activeTopic.keyObjectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                        <CheckCircle className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleTopicViewModeChange('theory')}
                  className="w-full mt-4 bg-primary-50 hover:bg-primary-100 text-primary-900 font-bold text-xs py-3 rounded-xl border border-primary-200 transition-all text-center"
                >
                  Switch to Full Theory & Code →
                </button>
              </div>

            </div>
          ) : (
            /* ════════ OPTION 2: UNIFIED 21ST.DEV WHITE GLASS CARD THEORY MODE ════════ */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fade-in">
              
              {/* Theory Explanation & Objectives (7 Cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-6 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <BookOpenText className="w-5 h-5 text-primary-600" />
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Detailed Concept Notes</h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {activeTopic.fullExplanation}
                  </p>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Key Learning Outcomes</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeTopic.keyObjectives.map((obj, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                          <Check className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-primary-50/70 border border-primary-200/80 flex items-center justify-between text-xs font-bold text-primary-900 mt-4">
                  <span>Estimated Reading Time: 15 Mins</span>
                  <button 
                    onClick={() => toggleTopicCompleted(activeTopic.id)}
                    className="hover:underline text-primary-700"
                  >
                    {isCompleted ? 'Completed ✓' : 'Mark Completed'}
                  </button>
                </div>
              </div>

              {/* Code Snippet & Playground (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-primary-600" />
                      <h3 className="font-extrabold text-slate-900 text-sm">Python Code Example</h3>
                    </div>

                    <button
                      onClick={() => handleCopyCode(activeTopic.codeSnippet)}
                      className="px-3.5 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-900 border border-primary-200 text-xs font-bold transition-all active:scale-95 shrink-0"
                    >
                      {copiedCode ? 'Copied! ✓' : 'Copy Code'}
                    </button>
                  </div>

                  {/* Code Editor Playground Box */}
                  <pre className="text-xs text-primary-200 overflow-x-auto p-4 bg-[#0c0f26] rounded-2xl leading-relaxed border border-slate-800 shadow-inner font-mono">
                    <code>{activeTopic.codeSnippet}</code>
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>Language: Python 3.12</span>
                  <span className="text-primary-700 font-bold">AspireNext IDE</span>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    );
  }


  // ════════════════ DASHBOARD (2-COLUMN GRID: SCHEDULE ON LEFT, STATS ON RIGHT) ════════════════
  
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      return `${dateStr}, ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const { setSidebarOpen } = useNav();

  const handleDashboardStepChange = (index: number, type: string) => {
    // Open sidebar for step 0, close for others
    setSidebarOpen(index === 0);
    // Auto-open the profile dropdown for step 12 (the final Profile Menu step)
    if (index === 12) {
      setTimeout(() => window.dispatchEvent(new Event('tour:openProfile')), 100);
    } else {
      setTimeout(() => window.dispatchEvent(new Event('tour:closeProfile')), 100);
    }
  };

  return (
    <div className="font-sans space-y-6">
      <OnboardingTour tourId="dashboard" steps={dashboardSteps} onStepChange={handleDashboardStepChange} />

      {/* Greeting Header */}
      <div className="flex items-center gap-2 px-1">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0c0f26] tracking-tight">
          {getGreeting()}, {currentUser.name.split(' ')[0]}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ════════ LEFT SIDE (8 COLS): DAILY TASKS & CURRICULUM SCHEDULE ════════ */}
        <div className="lg:col-span-8 border border-slate-200/80 shadow-sm rounded-[2rem] overflow-visible bg-white p-6 sm:p-7 space-y-6">
          
          {/* Top Header Row: "Your Schedule" & "Calendar" Button with Floating Popover */}
          <div id="tour-schedule" className="flex items-center justify-between relative z-20">
            <div>
              <h2 className="font-extrabold text-slate-900 text-xl sm:text-2xl tracking-tight flex items-center gap-2">
                <span>Your Schedule</span>
                <CalendarDays className="w-5.5 h-5.5 text-[#7c3aed] shrink-0" />
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">Your daily updated learning schedule and live classes.</p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFullCalendar(!showFullCalendar)}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] font-extrabold text-xs sm:text-sm transition-all duration-150 active:scale-95 border border-purple-100 shadow-2xs"
              >
                <CalendarIcon className="w-4.5 h-4.5 text-[#7c3aed]" />
                <span>Calendar</span>
              </button>

              {/* ════════ FLOATING CALENDAR POPOVER POPUP (COMPACT FIT TO SCREEN) ════════ */}
              {showFullCalendar && (
                <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-[1.5rem] p-4 shadow-2xl border border-slate-200/90 space-y-3 animate-scale-in">
                  
                  {/* Header Month Switcher: < Aug 2026 > */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <button
                      onClick={() => {
                        if (currentMonthIndex === 0) {
                          setCurrentMonthIndex(11);
                          setCurrentYear((prev) => prev - 1);
                        } else {
                          setCurrentMonthIndex((prev) => prev - 1);
                        }
                      }}
                      className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                      type="button"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="font-extrabold text-slate-900 text-xs">{monthNames[currentMonthIndex]} {currentYear}</span>

                    <button
                      onClick={() => {
                        if (currentMonthIndex === 11) {
                          setCurrentMonthIndex(0);
                          setCurrentYear((prev) => prev + 1);
                        } else {
                          setCurrentMonthIndex((prev) => prev + 1);
                        }
                      }}
                      className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                      type="button"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                      <span key={i} className="text-[10px] font-extrabold text-slate-500 py-0.5">{d}</span>
                    ))}
                    
                    {Array.from({ length: calendarStartOffset }, (_, offset) => (
                      <div key={`offset-${offset}`} className="w-7 h-7" />
                    ))}

                    {/* Circular Date Grid Buttons */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((num) => {
                      const isSelected =
                        num === selectedDateNum &&
                        currentMonthIndex === selectedMonthIndex &&
                        currentYear === selectedYear;

                      const isToday =
                        num === realTodayDate &&
                        currentMonthIndex === realTodayMonth &&
                        currentYear === realTodayYear;

                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setSelectedDateNum(num);
                            setSelectedMonthIndex(currentMonthIndex);
                            setSelectedYear(currentYear);
                            setShowFullCalendar(false);
                          }}
                          className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-[#7c3aed] text-white font-bold shadow-xs scale-105'
                              : isToday
                              ? 'bg-purple-50 text-[#7c3aed] border border-[#7c3aed] font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  {/* Date Status Legend */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" />
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-50 border border-[#7c3aed]" />
                      <span>Today</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-slate-50" />
                      <span>Holiday</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Date Navigator Row */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <button
              onClick={goToPreviousDay}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              title="Previous Day"
              type="button"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-slate-900 text-base sm:text-lg">
                {formattedDateString}
              </span>

              {isSelectedDateToday ? (
                <span className="bg-purple-50 text-[#7c3aed] font-extrabold px-3 py-1 rounded-full text-xs border border-purple-100 shadow-2xs">
                  Today
                </span>
              ) : (
                <button
                  type="button"
                  onClick={goToToday}
                  className="bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-[#7c3aed] font-extrabold px-3 py-1 rounded-full text-xs transition-colors"
                >
                  Go to Today
                </button>
              )}
            </div>

            <button
              onClick={goToNextDay}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              title="Next Day"
              type="button"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ════════ SCHEDULE CLASSES FEED (EXACTLY 2 CARDS: LIVE & UPCOMING WITH DIRECT ROUTING) ════════ */}
          <div id="tour-live-classes" className="space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4.5 h-4.5 text-[#7c3aed]" />
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Tasks & Classes for {monthNames[currentMonthIndex]} {selectedDateNum}
                </h3>
              </div>

              <span className="bg-purple-50 text-[#7c3aed] font-extrabold px-3 py-1 rounded-full text-xs border border-purple-100">
                {isSelectedDateToday ? '2 Sessions' : '0 Sessions'}
              </span>
            </div>

            {!isSelectedDateToday ? (
              /* CLEAN MODERN EMPTY STATE WHEN NO SESSIONS ARE SCHEDULED FOR THE SELECTED DATE */
              <div className="py-10 px-6 bg-white border border-slate-200/90 rounded-[1.5rem] text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] shadow-xs">
                  <CalendarX className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">Not Yet Scheduled</h4>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 max-w-sm">
                    No live sessions or tasks scheduled for {monthNames[currentMonthIndex]} {selectedDateNum}. Switch to Today or view the full schedule.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {liveClasses.filter(c => c.status === 'ongoing' || c.status === 'upcoming').slice(0, 2).map((cls, idx) => (
                  <div 
                    key={cls.id}
                    id={`tour-class-card-${idx}`}
                    onClick={() => navigate(cls.status === 'ongoing' ? 'classroom' : 'live', cls.status === 'ongoing' ? { id: cls.id } : { tab: 'upcoming' })}
                    className={cn(
                      "p-5 rounded-[1.5rem] bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden",
                      cls.status === 'ongoing' ? "border border-purple-200/90 hover:border-[#7c3aed] ring-1 ring-purple-100" : "border border-slate-200/90 hover:border-[#7c3aed]/60"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        {cls.status === 'ongoing' ? (
                          <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                            </span>
                            <span>LIVE NOW</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#7c3aed]" />
                            <span>UPCOMING CLASS</span>
                          </span>
                        )}

                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatTime(cls.scheduledAt)}{cls.status === 'ongoing' ? ` · ${cls.duration}` : ''}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-slate-900 mb-1 group-hover:text-[#7c3aed] transition-colors leading-snug">
                        {cls.title}
                      </h4>
                      <p className="text-xs font-bold text-slate-500 mb-4">{cls.course} · {cls.instructor.name}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#7c3aed] group-hover:text-[#6d28d9] transition-colors inline-flex items-center gap-1.5">
                        {cls.status === 'ongoing' ? 'Join Live Class' : 'View & Set Reminder'}
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>


        {/* ════════ RIGHT SIDE (4 COLS): VERTICALLY STACKED STAT CARDS ════════ */}
        <div id="tour-stats" className="lg:col-span-4 space-y-4">
          
          {/* Live Classes Card */}
          <div 
            id="tour-stat-card-0"
            onClick={() => navigate('live')}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-200 hover:shadow-md transition-all flex items-center justify-between cursor-pointer group relative overflow-hidden"
          >
            {/* Subtle purple ambient glow in the background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl group-hover:bg-purple-100 transition-colors duration-500" />
            
            <div className="flex items-center gap-4 relative z-10">
              {/* Icon Container with Ping Effect */}
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 relative">
                <div className="absolute inset-0 bg-purple-400 rounded-2xl animate-ping opacity-20" />
                <Video className="w-5 h-5 relative z-10" />
              </div>
              
              <div>
                <p className="text-[11px] font-black text-[#7c3aed] uppercase tracking-widest mb-0.5">Happening Now</p>
                <p className="text-base font-bold text-slate-900 group-hover:text-[#7c3aed] transition-colors">Join Live Classes</p>
              </div>
            </div>

            {/* Interactive Arrow */}
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-purple-50 border border-transparent group-hover:border-purple-100 transition-colors relative z-10">
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#7c3aed] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Card 1: Overall Progress Bar */}
          <div id="tour-stat-card-1" className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center font-bold shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Overall Progress</p>
                <p className="text-base font-extrabold text-slate-900">0% Completed</p>
              </div>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#7c3aed] rounded-full transition-all duration-500" style={{ width: '0%' }} />
            </div>
          </div>

          {/* Card 2: Modules Finished */}
          <div id="tour-stat-card-2" className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Modules Completed</p>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">0 of 1 Finished</p>
            </div>
          </div>

          {/* Card 3: Schedule Tab Quick Access */}
          <div 
            id="tour-stat-card-3"
            onClick={() => navigate('schedule')}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-200 hover:shadow-md transition-all flex items-center justify-between cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center font-bold shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Events</p>
                <p className="text-base font-extrabold text-slate-900 group-hover:text-[#7c3aed] transition-colors mt-0.5">View Upcoming Events</p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-purple-50 border border-transparent group-hover:border-purple-100 transition-colors relative z-10">
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#7c3aed] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
