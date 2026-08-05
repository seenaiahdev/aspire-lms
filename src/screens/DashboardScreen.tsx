import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Play, Code2, Clock, Check, ChevronLeft, ChevronRight as ChevronRightIcon, BookMarked,
  ArrowLeft, ArrowRight, CheckCircle2, Video, Terminal, BookOpenText, Award, Layers, Sparkles, FileText, CheckCircle, Target, Trophy, TrendingUp
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { currentUser } from '@/data/mock';

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
  const { navigate } = useNav();

  // Month & Date Calendar State
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(7); // August (0-indexed: 7 = Aug)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1).getDay();
  const calendarStartOffset = (firstDayOfMonth + 6) % 7; // Monday-first grid

  // Selected Date State (Defaults to Today - Aug 7)
  const [selectedDateNum, setSelectedDateNum] = useState<number>(7);

  // Toggle state to view full month calendar grid overlay
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  // Active Selected Topic State for Full-Screen Lesson Screen
  const [activeTopic, setActiveTopic] = useState<PythonTopic | null>(null);

  // View Mode inside Topic Screen: 'video' | 'theory'
  const [topicViewMode, setTopicViewMode] = useState<'video' | 'theory'>('video');

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
  const openTopicWithRoute = (topic: PythonTopic) => {
    setActiveTopic(topic);
  };

  const closeTopicAndReturnToDashboard = () => {
    setActiveTopic(null);
  };

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
              onClick={() => setTopicViewMode('video')}
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
              onClick={() => setTopicViewMode('theory')}
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
                  onClick={() => setTopicViewMode('theory')}
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
                      <Code className="w-4 h-4 text-primary-600" />
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
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="font-sans animate-fade-in space-y-6">

      {/* Greeting Header */}
      <div className="flex items-center gap-2 px-1">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0c0f26] tracking-tight">
          {getGreeting()}, {currentUser.name.split(' ')[0]} <span className="inline-block animate-[wave_2.5s_ease-in-out_infinite] origin-[70%_70%]">👋</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ════════ LEFT SIDE (8 COLS): YOUR SCHEDULE & TOPICS FEED ════════ */}
        <div className="lg:col-span-8 border border-slate-200/80 shadow-2xs rounded-3xl overflow-visible bg-white p-6 sm:p-8 space-y-6">
          
          {/* Top Header Row: "Your Schedule" & "Calendar" Button with Floating Popover */}
          <div className="flex items-center justify-between relative z-20">
            <h2 className="font-bold text-slate-900 text-xl sm:text-2xl tracking-tight">Your Schedule</h2>

            <div className="relative">
              <button
                onClick={() => setShowFullCalendar(!showFullCalendar)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 text-[#3b52a4] font-semibold text-sm transition-all duration-150 active:scale-95 border border-indigo-100/80 shadow-sm"
              >
                <CalendarIcon className="w-4.5 h-4.5 text-[#3b52a4]" />
                <span>Calendar</span>
              </button>

              {/* ════════ FLOATING CALENDAR POPOVER POPUP ════════ */}
              {showFullCalendar && (
                <div className="absolute right-0 top-12 z-50 min-w-[22rem] max-w-[24rem] bg-white rounded-[2rem] p-5 shadow-2xl border border-slate-200/90 space-y-4 animate-scale-in">
                  
                  {/* Header Month Switcher: < Aug 2026 > */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <button
                      onClick={() => {
                        if (currentMonthIndex === 0) {
                          setCurrentMonthIndex(11);
                          setCurrentYear((prev) => prev - 1);
                        } else {
                          setCurrentMonthIndex((prev) => prev - 1);
                        }
                      }}
                      className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                      type="button"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="font-bold text-slate-900 text-sm">{monthNames[currentMonthIndex]} {currentYear}</span>

                    <button
                      onClick={() => {
                        if (currentMonthIndex === 11) {
                          setCurrentMonthIndex(0);
                          setCurrentYear((prev) => prev + 1);
                        } else {
                          setCurrentMonthIndex((prev) => prev + 1);
                        }
                      }}
                      className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                      type="button"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                      <span key={i} className="text-xs font-semibold text-slate-600 py-1">{d}</span>
                    ))}
                    
                    {Array.from({ length: calendarStartOffset }, (_, offset) => (
                      <div key={`offset-${offset}`} className="w-9 h-9" />
                    ))}

                    {/* Circular Date Grid Buttons */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((num) => {
                      const isSelected = num === selectedDateNum;
                      const isToday = num === 7;

                      return (
                        <button
                          key={num}
                          onClick={() => { setSelectedDateNum(num); setShowFullCalendar(false); }}
                          className={`aspect-square w-9 rounded-full mx-auto flex items-center justify-center text-xs font-semibold transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-[#3b52a4] text-white font-bold shadow-md scale-105'
                              : isToday
                              ? 'bg-indigo-50 text-[#3b52a4] border-2 border-[#3b52a4] font-bold'
                              : 'border border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  {/* Date Status Legend */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-900">Date Status Legend</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#3b52a4]" />
                        <span>Selected Date</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-indigo-50 border border-[#3b52a4]" />
                        <span>Current Date</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-slate-200 bg-slate-50" />
                        <span>Holiday</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* Date Navigator Row: < Friday, August 7, 2026 Today > */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100/80">
            <button
              onClick={() => setSelectedDateNum(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-slate-900 text-base sm:text-lg">
                {['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'][(selectedDateNum - 1) % 7]}, {monthNames[currentMonthIndex]} {selectedDateNum}, {currentYear}
              </span>

              {selectedDateNum === 7 && (
                <span className="bg-indigo-50 text-[#3b52a4] font-semibold px-3 py-1 rounded-full text-xs border border-indigo-100/80 shadow-2xs">
                  Today
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedDateNum(prev => Math.min(31, prev + 1))}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
              title="Next Day"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ════════ SELECTED DATE TOPICS FEED ════════ */}
          <div className="pt-2 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4.5 h-4.5 text-[#3b52a4]" />
                <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
                  Topics for {monthNames[currentMonthIndex]} {selectedDateNum}
                </h3>
              </div>

              <span className="bg-slate-100 text-slate-600 font-medium px-2.5 py-0.5 rounded-full text-xs border border-slate-200/60">
                Day {selectedDateNum} of 31
              </span>
            </div>

            {/* 2 Interactive Python Topic Cards (Grid Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentTopics.map((topic, index) => {
                const isCompleted = completedTopicIds.includes(topic.id);
                return (
                  <div 
                    key={topic.id}
                    onClick={() => openTopicWithRoute(topic)}
                    className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer group flex flex-col justify-between ${
                      isCompleted 
                        ? 'bg-slate-50/80 border-slate-200/80' 
                        : 'bg-white border-slate-200/80 hover:border-[#3b52a4]/50 shadow-2xs hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTopicCompleted(topic.id);
                            }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                              isCompleted 
                                ? 'bg-[#3b52a4] text-white' 
                                : 'bg-white border border-slate-300 text-transparent hover:border-[#3b52a4]'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                          
                          <span className="text-[11px] font-semibold text-[#3b52a4] bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/60">
                            Topic {index + 1}
                          </span>

                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {topic.category}
                          </span>
                        </div>

                        <span className="text-xs font-normal text-slate-400 flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {topic.duration}
                        </span>
                      </div>

                      <h4 className={`font-semibold text-base mb-1.5 transition-colors group-hover:text-[#3b52a4] ${
                        isCompleted ? 'text-slate-500' : 'text-slate-900'
                      }`}>
                        {topic.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal mb-3">
                        {topic.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#3b52a4] group-hover:text-[#101537] transition-colors inline-flex items-center gap-1.5">
                        Open Lesson View
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>


        {/* ════════ RIGHT SIDE (4 COLS): VERTICALLY STACKED STAT CARDS ════════ */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Live Classes Card */}
          <div 
            onClick={() => navigate('live')}
            className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-red-200 hover:shadow-md transition-all flex items-center justify-between cursor-pointer group relative overflow-hidden"
          >
            {/* Subtle red ambient glow in the background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl group-hover:bg-red-100 transition-colors duration-500" />
            
            <div className="flex items-center gap-4 relative z-10">
              {/* Icon Container with Ping Effect */}
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center shrink-0 relative">
                <div className="absolute inset-0 bg-red-400 rounded-xl animate-ping opacity-20" />
                <Video className="w-5 h-5 relative z-10" />
              </div>
              
              <div>
                <p className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-0.5">Happening Now</p>
                <p className="text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors">Join Live Classes</p>
              </div>
            </div>

            {/* Interactive Arrow */}
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-red-50 border border-transparent group-hover:border-red-100 transition-colors relative z-10">
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Card 1: Overall Progress Bar */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#3b52a4] border border-indigo-100 flex items-center justify-center font-bold shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Overall Progress</p>
                <p className="text-base font-bold text-slate-900">72% Completed</p>
              </div>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#3b52a4] rounded-full transition-all duration-500" style={{ width: '72%' }} />
            </div>
          </div>

          {/* Card 2: Modules Finished */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#3b52a4] border border-indigo-100 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Modules Completed</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">4 of 6 Finished <span className="text-xs text-emerald-600 font-medium ml-1">(+2 this week)</span></p>
            </div>
          </div>

          {/* Card 3: Skill Mastery Level */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Skill Level</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">Level 24 <span className="text-xs text-[#3b52a4] font-medium ml-1">(12,450 XP)</span></p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
