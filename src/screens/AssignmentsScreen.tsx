import { useState, useEffect } from 'react';
import {
  FileText, Clock, Upload, CheckCircle2, AlertCircle, Star, Paperclip, ArrowRight, X,
  HelpCircle, Code2, Trophy, ArrowLeft, CheckCircle, XCircle, Play, Sparkles, Terminal, Copy, RefreshCw, Check, Target, RotateCcw, Eye
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// Struct for MCQ Questions
interface MCQQuestion {
  id: number;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// Struct for Python Tasks
interface PythonTaskAttempt {
  id: number;
  label: string;
  score: number;
  status: 'Passed' | 'Failed';
  date: string;
  reviewSummary: string;
}

interface PythonTask {
  id: string;
  slug: string;
  type: 'mcq' | 'coding';
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  xp: number;
  timeEstimate: string;
  description: string;
  status: 'pending' | 'completed';
  attemptsCount: number;
  passedCount: number;
  failedCount: number;
  bestScorePercentage: number;
  attemptHistory?: PythonTaskAttempt[];
  mcqQuestions?: MCQQuestion[];
  codingProblem?: {
    instructions: string;
    starterCode: string;
    testCases: { input: string; expected: string }[];
  };
}

// Comprehensive Python MCQ & Coding Assignments Mock Data
const pythonAssignments: PythonTask[] = [
  {
    id: '1',
    slug: 'variables-in-python-quiz',
    type: 'mcq',
    title: 'Variables in Python Practice Quiz',
    category: 'Variables & Types',
    difficulty: 'Beginner',
    xp: 100,
    timeEstimate: '8 mins',
    description: 'Test your knowledge on Python variable declaration, memory allocation, type casting, and variable swapping.',
    status: 'pending',
    attemptsCount: 2,
    passedCount: 1,
    failedCount: 1,
    bestScorePercentage: 100,
    attemptHistory: [
      {
        id: 1,
        label: 'Attempt 1',
        score: 60,
        status: 'Failed',
        date: '2025-09-03',
        reviewSummary: 'Missed variable naming rules and the second swap question. Review tuple unpacking and reserved keywords.',
      },
      {
        id: 2,
        label: 'Attempt 2',
        score: 100,
        status: 'Passed',
        date: '2025-09-05',
        reviewSummary: 'Perfect attempt. All questions answered correctly.',
      },
    ],
    mcqQuestions: [
      {
        id: 1,
        question: 'Which of the following is a valid variable declaration in Python?',
        options: ['1st_student = "Aarav"', 'student-name = "Aarav"', '_student_name = "Aarav"', 'class = "Aarav"'],
        correctIndex: 2,
        explanation: 'Variable names in Python can start with an underscore or letter, but cannot start with numbers, contain hyphens, or use reserved keywords like class.',
      },
      {
        id: 2,
        question: 'What is the output of swapping variables using tuple unpacking in Python?',
        codeSnippet: `a = 10\nb = 20\na, b = b, a\nprint(a, b)`,
        options: ['10 20', '20 10', '10 10', '20 20'],
        correctIndex: 1,
        explanation: 'Python allows 1-line variable swapping using tuple unpacking (a, b = b, a), which results in a = 20 and b = 10.',
      },
      {
        id: 3,
        question: 'What will type(x) and type(y) evaluate to in the code below?',
        codeSnippet: `x = 5\ny = "5"`,
        options: ['<class "int"> and <class "str">', '<class "str"> and <class "int">', '<class "int"> and <class "int">', '<class "float"> and <class "str">'],
        correctIndex: 0,
        explanation: 'x is an integer primitive (int) while y is wrapped in quotes, making it a string (str).',
      },
      {
        id: 4,
        question: 'What happens when you try to concatenate a string and an integer directly?',
        codeSnippet: `age = 22\nprint("Age: " + age)`,
        options: ['Prints "Age: 22"', 'Prints "Age: age"', 'Raises TypeError', 'Prints None'],
        correctIndex: 2,
        explanation: 'In Python, string concatenation with + requires explicit type casting with str(age), otherwise a TypeError is raised.',
      },
    ],
  },
  {
    id: '2',
    slug: 'python-loops-coding',
    type: 'coding',
    title: 'Control Flow & Loop Logic Practice Lab',
    category: 'Control Flow',
    difficulty: 'Beginner',
    xp: 150,
    timeEstimate: '15 mins',
    description: 'Write a Python function to filter even numbers and calculate their squares using list comprehensions.',
    status: 'pending',
    attemptsCount: 1,
    passedCount: 1,
    failedCount: 0,
    bestScorePercentage: 100,
    attemptHistory: [
      {
        id: 1,
        label: 'Attempt 1',
        score: 100,
        status: 'Passed',
        date: '2025-09-12',
        reviewSummary: 'The code correctly filtered even numbers and returned their squares. Great use of list comprehension.',
      },
    ],
    codingProblem: {
      instructions: 'Write a Python function `filter_even_squares(numbers)` that takes a list of integers and returns a new list containing the squares of all even numbers.',
      starterCode: `# Python Coding Task: Filter & Square Even Numbers
def filter_even_squares(numbers):
    # Your code here
    pass

# Test execution
sample = [1, 2, 3, 4, 5, 6]
print(filter_even_squares(sample))  # Expected: [4, 16, 36]`,
      testCases: [
        { input: '[1, 2, 3, 4, 5, 6]', expected: '[4, 16, 36]' },
        { input: '[10, 15, 20]', expected: '[100, 400]' },
      ],
    },
  },
  {
    id: '3',
    slug: 'python-functions-scope-quiz',
    type: 'mcq',
    title: 'Functions, Scopes & Lambda Expressions Quiz',
    category: 'Functions',
    difficulty: 'Intermediate',
    xp: 120,
    timeEstimate: '10 mins',
    description: 'Master function parameters, local vs global scope rules, and 1-line anonymous lambda functions.',
    status: 'pending',
    attemptsCount: 0,
    passedCount: 0,
    failedCount: 0,
    bestScorePercentage: 0,
    mcqQuestions: [
      {
        id: 1,
        question: 'What will be printed by the following code?',
        codeSnippet: `square = lambda x: x ** 2\nprint(square(5))`,
        options: ['10', '25', '52', 'TypeError'],
        correctIndex: 1,
        explanation: 'The lambda function computes 5 ** 2 which equals 25.',
      },
      {
        id: 2,
        question: 'What data structure does *args pack positional arguments into inside a function?',
        options: ['List', 'Dictionary', 'Tuple', 'Set'],
        correctIndex: 2,
        explanation: '*args gathers variable positional arguments into an immutable Tuple.',
      },
      {
        id: 3,
        question: 'What keyword is used inside a function to modify a variable declared outside the function scope?',
        options: ['extern', 'global', 'public', 'static'],
        correctIndex: 1,
        explanation: 'The `global` keyword explicitly grants permission to modify variables defined in the global namespace.',
      },
    ],
  },
  {
    id: '4',
    slug: 'python-oop-coding',
    type: 'coding',
    title: 'Object-Oriented Programming (OOP) Class Design',
    category: 'OOP',
    difficulty: 'Intermediate',
    xp: 200,
    timeEstimate: '20 mins',
    description: 'Implement a Student class with encapsulated attributes, XP reward methods, and docstrings.',
    status: 'pending',
    attemptsCount: 0,
    passedCount: 0,
    failedCount: 0,
    bestScorePercentage: 0,
    codingProblem: {
      instructions: 'Create a `Student` class with `__init__(self, name, xp=0)`, a method `add_xp(self, points)`, and a property `level` that returns `xp // 100`.',
      starterCode: `class Student:
    def __init__(self, name, xp=0):
        self.name = name
        self.xp = xp

    def add_xp(self, points):
        self.xp += points

    @property
    def level(self):
        return self.xp // 100

# Test
s = Student("Aarav", 250)
print(f"Name: {s.name}, Level: {s.level}")`,
      testCases: [
        { input: 'Student("Aarav", 250).level', expected: '2' },
      ],
    },
  },
];

// ════════════════ CUSTOM CONFETTI ANIMATION ════════════════
const ConfettiBurst = () => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
    const newParticles = Array.from({ length: 120 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // viewport width %
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.2, // fast burst
      duration: Math.random() * 1.5 + 2,
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      drift: Math.random() * 100 - 50,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg) translateX(var(--drift)); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm"
            style={{
              left: `${p.x}%`,
              top: '-10%',
              width: `${p.size}px`,
              height: `${p.size * 1.5}px`,
              backgroundColor: p.color,
              animation: `confetti-fall ${p.duration}s ease-in forwards`,
              animationDelay: `${p.delay}s`,
              '--drift': `${p.drift}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
};

export function AssignmentsScreen() {
  const { navigate } = useNav();
  const [filterTab, setFilterTab] = useState<'all' | 'mcq' | 'coding' | 'completed'>('all');

  // Currently Selected Task for Pre-Start Quiz Details Modal
  const [selectedDetailTask, setSelectedDetailTask] = useState<PythonTask | null>(null);
  const [showAttemptsOnLeft, setShowAttemptsOnLeft] = useState(false);
  const [selectedAttemptReview, setSelectedAttemptReview] = useState<PythonTaskAttempt | null>(null);

  // Currently Active Practice Task (MCQ or Coding Runner)
  const [activeTask, setActiveTask] = useState<PythonTask | null>(null);

  // MCQ Exam State
  const [currentMCQIndex, setCurrentMCQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizStatus, setQuizStatus] = useState<'taking' | 'results' | 'review'>('taking');
  const [userScore, setUserScore] = useState(0);

  // Coding Practice State
  const [userCode, setUserCode] = useState('');
  const [codeTested, setCodeTested] = useState(false);

  // Filter Tasks
  const filteredTasks = pythonAssignments.filter((t) => {
    if (filterTab === 'mcq') return t.type === 'mcq';
    if (filterTab === 'coding') return t.type === 'coding';
    if (filterTab === 'completed') return t.status === 'completed';
    return true;
  });

  // Open Task Overview with Dynamic URL Routing (e.g. /assignments/variables-in-python-quiz)
  const openDetailTaskWithRoute = (task: PythonTask) => {
    setSelectedDetailTask(task);
    window.history.pushState({}, '', `/assignments/${task.slug}`);
  };

  // Open Active Practice Screen (e.g. /assignments/variables-in-python-quiz/practice)
  const openTaskWithRoute = (task: PythonTask) => {
    setActiveTask(task);
    setCurrentMCQIndex(0);
    setUserAnswers(task.mcqQuestions ? new Array(task.mcqQuestions.length).fill(-1) : []);
    setQuizStatus('taking');
    setUserScore(0);
    if (task.codingProblem) {
      setUserCode(task.codingProblem.starterCode);
    }
    setCodeTested(false);
    window.history.pushState({}, '', `/assignments/${task.slug}/practice`);
  };

  const openReviewForAttempt = (task: PythonTask, attempt: PythonTaskAttempt) => {
    setSelectedDetailTask(task);
    setActiveTask(task);
    setCurrentMCQIndex(0);
    setSelectedAttemptReview(attempt);

    if (task.mcqQuestions) {
      const reviewAnswers = task.mcqQuestions.map((question, index) => {
        if (attempt.status === 'Passed') return question.correctIndex;
        if (index === 0) return (question.correctIndex + 1) % question.options.length;
        return question.correctIndex;
      });
      setUserAnswers(reviewAnswers);
    } else {
      setUserAnswers([]);
    }

    setQuizStatus('review');
    setUserScore(attempt.score);
    if (task.codingProblem) {
      setUserCode(task.codingProblem.starterCode);
    }
    setCodeTested(false);
    window.history.pushState({}, '', `/assignments/${task.slug}/practice/review/${attempt.id}`);
  };

  const closeReviewToDetail = () => {
    setActiveTask(null);
    setQuizStatus('taking');
    setSelectedAttemptReview(null);
    if (selectedDetailTask) {
      window.history.pushState({}, '', `/assignments/${selectedDetailTask.slug}${showAttemptsOnLeft ? '/attempts' : ''}`);
    } else {
      window.history.pushState({}, '', '/assignments');
    }
  };

  const closeTaskAndReturnToAssignments = () => {
    setActiveTask(null);
    setSelectedDetailTask(null);
    window.history.pushState({}, '', '/assignments');
  };

  // Restore active task/details on page refresh or direct URL visit
  useEffect(() => {
    const parsePath = () => {
      const path = window.location.pathname.replace('/assignments/', '').replace(/^\//, '');
      if (!path) return;

      const parts = path.split('/');
      const slug = parts[0]?.trim();
      const isPractice = parts[1] === 'practice';
      const isReview = parts[2] === 'review';
      const reviewAttemptId = parts[3] ? Number(parts[3]) : undefined;
      const isAttemptsView = parts[1] === 'attempts';
      const match = pythonAssignments.find((t) => t.slug === slug || t.id === slug);
      if (match) {
        setSelectedDetailTask(match);
        setShowAttemptsOnLeft(isAttemptsView);
        if (isPractice) {
          setActiveTask(match);
          setCurrentMCQIndex(0);
          setQuizStatus(isReview ? 'review' : 'taking');
          if (match.mcqQuestions) {
            if (isReview && reviewAttemptId !== undefined) {
              const attempt = match.attemptHistory?.find((a) => a.id === reviewAttemptId);
              if (attempt) {
                setSelectedAttemptReview(attempt);
                const reviewAnswers = match.mcqQuestions.map((question, index) => {
                  if (attempt.status === 'Passed') return question.correctIndex;
                  if (index === 0) return (question.correctIndex + 1) % question.options.length;
                  return question.correctIndex;
                });
                setUserAnswers(reviewAnswers);
                setUserScore(attempt.score);
              } else {
                setUserAnswers(new Array(match.mcqQuestions.length).fill(-1));
                setUserScore(0);
              }
            } else {
              setUserAnswers(new Array(match.mcqQuestions.length).fill(-1));
              setUserScore(0);
            }
          } else {
            setUserAnswers([]);
            setUserScore(0);
          }
          if (match.codingProblem) {
            setUserCode(match.codingProblem.starterCode);
          }
          setCodeTested(false);
        }
      }
    };

    parsePath();
    window.addEventListener('popstate', parsePath);
    return () => window.removeEventListener('popstate', parsePath);
  }, []);

  // Handle MCQ 1-by-1 Option Selection & Submit
  const handleSelectOption = (idx: number) => {
    if (quizStatus === 'taking') {
      const newAnswers = [...userAnswers];
      newAnswers[currentMCQIndex] = idx;
      setUserAnswers(newAnswers);
    }
  };

  const handleNextOrSubmit = () => {
    if (!activeTask?.mcqQuestions) return;
    
    if (currentMCQIndex < activeTask.mcqQuestions.length - 1) {
      setCurrentMCQIndex((prev) => prev + 1);
    } else {
      // Calculate Score
      let correctCount = 0;
      activeTask.mcqQuestions.forEach((q, i) => {
        if (userAnswers[i] === q.correctIndex) {
          correctCount++;
        }
      });
      const score = Math.round((correctCount / activeTask.mcqQuestions.length) * 100);
      setUserScore(score); // Storing % score
      setQuizStatus('results');
      activeTask.status = 'completed';
    }
  };

  // ════════════════ 21ST.DEV INTERACTIVE 1-BY-1 MCQ PRACTICE SCREEN ════════════════
  if (activeTask) {
    const questions = activeTask.mcqQuestions || [];
    const currentQ = questions[currentMCQIndex];

    return (
      <div className="fixed inset-0 z-[9999] bg-slate-50 text-slate-900 h-screen overflow-hidden p-3 sm:p-6 font-sans animate-fade-in flex flex-col justify-between">
        
        {/* Full-Screen Top Header Bar */}
        {quizStatus === 'taking' && (
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4 pb-2 shrink-0 relative z-10">
            <button
              onClick={closeTaskAndReturnToAssignments}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all active:scale-95 shrink-0 border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-primary-500" />
              <span>Exit Practice</span>
            </button>

            <div className="flex items-center gap-2 text-center min-w-0">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-[#3b52a4] border border-indigo-100 text-[11px] font-extrabold shrink-0">
                {activeTask.category}
              </span>
              <h2 className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                {activeTask.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                +{activeTask.xp} XP
              </span>
            </div>
          </div>
        )}


        {/* PRACTICE SCREEN BODY (100% STATIC HEIGHT - ZERO SCROLLBARS) */}
        <div className="w-full max-w-5xl mx-auto my-auto flex-1 flex flex-col justify-between space-y-2.5 relative z-10 overflow-hidden py-1">

          {/* ════════ TYPE 1: MCQ EXAM ════════ */}
          {activeTask.type === 'mcq' && (
            <>
              {quizStatus === 'taking' && currentQ ? (
                <div className="space-y-6 flex-1 flex flex-col justify-between overflow-hidden max-w-5xl mx-auto w-full px-2 sm:px-8 py-2">
                  
                  {/* Sleek Premium Question Counter Bar */}
                  <div className="flex items-center justify-between gap-2 shrink-0 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-lg bg-[#3b52a4]/10 text-[#3b52a4] flex items-center justify-center font-black text-xs">
                        {currentMCQIndex + 1} / {questions.length}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:inline-block">
                        Question {currentMCQIndex + 1}
                      </span>
                    </div>

                    {/* EXAM MODE BADGE */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50">
                       <Clock className="w-3.5 h-3.5 text-slate-400" />
                       <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Exam Mode</span>
                    </div>
                  </div>

                  {/* Question Container (Full-Screen Layout) */}
                  <div className="flex-1 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden pb-8">
                    
                    <div className="shrink-0 mt-4 bg-white p-6 sm:p-8 sm:pb-10 rounded-3xl border border-slate-200/70 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#3b52a4]" />
                      
                      <div className="mb-6">
                        <h3 className="font-bold text-slate-800 text-lg sm:text-xl leading-relaxed">
                          {currentQ.question}
                        </h3>

                        {currentQ.codeSnippet && (
                          <pre className="p-5 rounded-xl bg-[#0d1117] text-slate-300 font-mono text-sm overflow-x-auto shadow-inner mt-5 border border-slate-800">
                            <code>{currentQ.codeSnippet}</code>
                          </pre>
                        )}
                      </div>

                      {/* Clean List Options */}
                      <div className="flex flex-col gap-3">
                        {currentQ.options.map((optionText, idx) => {
                          const isSelected = userAnswers[currentMCQIndex] === idx;
                          
                          return (
                            <div
                              key={idx}
                              onClick={() => handleSelectOption(idx)}
                              className="group flex items-center gap-3 transition-all duration-200 cursor-pointer py-2 w-fit pr-8"
                            >
                              <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 flex items-center justify-center ${
                                isSelected ? 'border-[#3b52a4] bg-[#3b52a4]' : 'border-slate-300 group-hover:border-slate-400'
                              }`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              </div>
                              <span className={`text-base transition-colors ${isSelected ? 'text-[#3b52a4] font-bold' : 'text-slate-700 font-medium group-hover:text-slate-900'}`}>{optionText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Action Controls */}
                  <div className="pt-6 shrink-0 bg-transparent flex flex-col justify-end w-full border-t border-slate-100 mt-auto">
                    <button
                      onClick={handleNextOrSubmit}
                      disabled={userAnswers[currentMCQIndex] === -1}
                      className="px-10 py-4 rounded-xl bg-[#3b52a4] text-white font-extrabold text-sm hover:bg-[#2a3780] disabled:bg-slate-200 disabled:text-slate-400 transition-all uppercase tracking-widest shadow-sm self-end"
                    >
                      {currentMCQIndex < questions.length - 1 ? 'Next Question' : 'Submit Exam'}
                    </button>
                  </div>

                </div>
              ) : quizStatus === 'results' ? (
                /* Results Celebration Card */
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center space-y-5 animate-fade-in max-w-md mx-auto my-auto relative z-20">
                  {userScore >= 70 && <ConfettiBurst />}
                  
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm ${userScore >= 70 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                    {userScore >= 70 ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                  </div>

                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 w-fit mx-auto ${userScore >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {userScore >= 70 ? <Sparkles className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>{userScore >= 70 ? 'Exam Passed!' : 'Exam Failed'}</span>
                    </span>
                    <h3 className="text-4xl font-black text-slate-900 mt-4">{userScore}%</h3>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                      {userScore >= 70 ? 'Amazing job! You really know your stuff.' : 'Keep practicing! Review your answers below.'}
                    </p>
                  </div>

                  {userScore >= 70 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
                      <p className="text-xs font-semibold text-slate-500">Reward Earned</p>
                      <p className="text-2xl font-black text-[#3b52a4]">+{activeTask.xp} XP</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      onClick={() => setQuizStatus('review')}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Review Answers</span>
                    </button>

                    <button
                      onClick={closeTaskAndReturnToAssignments}
                      className="w-full bg-[#3b52a4] hover:bg-[#2a3780] text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4 text-indigo-100" />
                      <span>Return to Hub</span>
                    </button>
                  </div>
                </div>
              ) : quizStatus === 'review' ? (
                /* ════════ REVIEW MODE ════════ */
                <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col h-full overflow-hidden pt-4 sm:pt-8 animate-fade-in">
                  
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-primary-500" /> Exam Review
                    </h2>
                    <button
                      onClick={closeReviewToDetail}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2 rounded-lg transition-all"
                    >
                      Close Review
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden space-y-8 pt-6 pb-20">
                    {questions.map((q, qIndex) => {
                      const userAnswer = userAnswers[qIndex];
                      const isCorrect = userAnswer === q.correctIndex;

                      return (
                        <div key={q.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-2 h-full ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                          <div className="flex items-start justify-between gap-4">
                             <h3 className="font-semibold text-slate-800 text-lg leading-relaxed flex-1">
                               <span className="text-slate-400 font-bold mr-2">{qIndex + 1}.</span> {q.question}
                             </h3>
                             <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {isCorrect ? 'Correct' : 'Incorrect'}
                             </span>
                          </div>

                          {q.codeSnippet && (
                            <pre className="p-5 rounded-2xl bg-slate-900 text-slate-50 font-mono text-sm overflow-x-auto shadow-inner mt-2">
                              <code>{q.codeSnippet}</code>
                            </pre>
                          )}

                          <div className="flex flex-col gap-2 mt-4">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = userAnswer === optIdx;
                              const isActualCorrect = q.correctIndex === optIdx;
                              
                              let boxStyle = "border-slate-200 text-slate-600 bg-slate-50 opacity-60";
                              
                              if (isActualCorrect) {
                                boxStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold border-2";
                              } else if (isSelected && !isActualCorrect) {
                                boxStyle = "border-red-500 bg-red-50 text-red-900 font-semibold border-2";
                              }

                              return (
                                <div key={optIdx} className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${boxStyle}`}>
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isActualCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : (isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300')}`}>
                                     {isActualCorrect && <Check className="w-3 h-3" strokeWidth={4} />}
                                     {isSelected && !isActualCorrect && <X className="w-3 h-3" strokeWidth={4} />}
                                  </div>
                                  <span className="text-sm">{opt}</span>
                                  
                                  {isSelected && <span className="ml-auto text-[10px] uppercase font-bold tracking-widest opacity-60 bg-white/50 px-2 py-0.5 rounded">Your Answer</span>}
                                  {isActualCorrect && !isSelected && <span className="ml-auto text-[10px] uppercase font-bold tracking-widest opacity-60 bg-white/50 px-2 py-0.5 rounded">Correct Answer</span>}
                                </div>
                              )
                            })}
                          </div>

                          <div className="mt-4 p-5 rounded-2xl bg-indigo-50 border border-indigo-100 text-sm text-slate-800">
                             <p className="font-extrabold text-[#3b52a4] uppercase tracking-widest text-[10px] mb-1">Explanation</p>
                             <p className="font-medium">{q.explanation}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}


          {/* ════════ TYPE 2: CODING LAB PRACTICE TASK ════════ */}
          {activeTask.type === 'coding' && activeTask.codingProblem && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch animate-fade-in">
              
              {/* Task Instructions (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-teal-800 pb-3 border-b border-slate-100">
                    <Code2 className="w-5 h-5 text-teal-600" />
                    <h3 className="font-extrabold text-slate-900 text-base">Coding Lab Challenge</h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                    {activeTask.codingProblem.instructions}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Test Cases</h4>
                  {activeTask.codingProblem.testCases.map((tc, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
                      <p className="text-slate-500">Input: <span className="text-slate-800 font-bold">{tc.input}</span></p>
                      <p className="text-slate-500">Expected: <span className="text-teal-700 font-bold">{tc.expected}</span></p>
                    </div>
                  ))}
                </div>

              </div>

              {/* Code Playground Input (7 Cols) */}
              <div className="lg:col-span-7 bg-[#08172b] rounded-3xl p-6 border border-slate-800 text-white font-mono space-y-4 shadow-2xl flex flex-col justify-between">
                
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-bold text-teal-100">Python 3 Code Sandbox</span>
                    </div>

                    <button
                      onClick={() => setUserCode(activeTask.codingProblem!.starterCode)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-all flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>

                  <textarea
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    rows={12}
                    className="w-full flex-1 p-4 rounded-2xl bg-[#031124] text-teal-300 font-mono text-xs border border-slate-800 focus:outline-none focus:border-teal-500 leading-relaxed resize-none"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  {codeTested && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>All test cases passed! +{activeTask.xp} XP awarded!</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setCodeTested(true);
                      activeTask.status = 'completed';
                    }}
                    className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-extrabold text-xs py-3.5 rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Test Cases & Submit Solution</span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    );
  }


  // ════════════════ 2. QUIZ OVERVIEW SUB-PAGE (STATIC & BRAND-ALIGNED) ════════════════
  if (selectedDetailTask) {
    return (
      <div className="font-sans animate-fade-in max-w-6xl mx-auto space-y-6">
        
        {/* 1. Slim Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={closeTaskAndReturnToAssignments}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-all active:scale-95 border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assignments</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-primary-600 border border-indigo-100 text-xs font-extrabold uppercase tracking-widest">
              {selectedDetailTask.category}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-extrabold uppercase tracking-widest">
              {selectedDetailTask.difficulty}
            </span>
          </div>
        </div>

        {/* 2. Main 2-Column SaaS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: Hero & Metrics or Attempt Cards */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {showAttemptsOnLeft ? (
              <div className="space-y-4">
                {selectedDetailTask.attemptHistory?.length ? (
                  selectedDetailTask.attemptHistory.map((attempt) => (
                    <div key={attempt.id} className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.32em] font-bold text-slate-400 mb-2">{attempt.label}</p>
                          <h3 className="font-extrabold text-slate-900 text-lg">{attempt.date}</h3>
                          <p className="mt-2 text-sm text-slate-500">Score: {attempt.score}%</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${attempt.status === 'Passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {attempt.status}
                        </span>
                      </div>

                      <p className="mt-4 text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {attempt.reviewSummary}
                      </p>

                      <div className="mt-6 flex items-center justify-between gap-4">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">Try review</div>
                        <button
                          type="button"
                          onClick={() => openReviewForAttempt(selectedDetailTask, attempt)}
                          className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-slate-50 border border-slate-200 p-8 text-sm text-slate-500">
                    No attempt cards are available yet for this assignment.
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="p-8 sm:p-10 rounded-3xl bg-primary-500 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <span className="text-xs font-extrabold text-white/80 uppercase tracking-widest flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4" />
                      Quiz Overview
                    </span>
                    
                    <h2 className="font-extrabold text-white text-3xl sm:text-4xl tracking-tight leading-tight mb-4">
                      {selectedDetailTask.title}
                    </h2>
                    
                    <p className="text-sm sm:text-base text-white/90 font-medium leading-relaxed max-w-xl mb-8">
                      {selectedDetailTask.description}
                    </p>

                    <div className="flex items-center gap-3">
                      <span className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-amber-950 text-sm font-black flex items-center gap-2 shadow-lg shadow-amber-500/20">
                        <Trophy className="w-4 h-4 text-amber-900" />
                        +{selectedDetailTask.xp} XP Reward
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-sm flex flex-col items-start gap-2 group hover:border-primary-200 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Duration</p>
                      <p className="text-base font-black text-primary-900">{selectedDetailTask.timeEstimate}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-sm flex flex-col items-start gap-2 group hover:border-primary-200 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <HelpCircle className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Questions</p>
                      <p className="text-base font-black text-primary-900">{selectedDetailTask.mcqQuestions?.length || 4}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-sm flex flex-col items-start gap-2 group hover:border-amber-200 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Reward</p>
                      <p className="text-base font-black text-amber-600">+{selectedDetailTask.xp} XP</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-3xl bg-white border border-slate-200/60 shadow-sm flex flex-col items-start gap-2 group hover:border-primary-200 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Target className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Pass Mark</p>
                      <p className="text-base font-black text-primary-900">70%</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Action & History Panel */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/60 shadow-md p-6 flex flex-col gap-6 sticky top-24 min-h-[380px]">
            
            {/* Performance History (Moved to top of right panel) */}
            <div className="flex-1">
              <h3 className="font-extrabold text-sm text-primary-900 uppercase tracking-widest mb-5 flex items-center justify-between">
                Performance
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                  {selectedDetailTask.attemptsCount} Attempts
                </span>
              </h3>
              
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showAttemptsOnLeft;
                    setShowAttemptsOnLeft(next);
                    if (selectedDetailTask) {
                      window.location.hash = `#/assignments/${selectedDetailTask.slug}${next ? '/attempts' : ''}`;
                    }
                  }}
                  className={`w-full text-left flex items-center justify-between p-4 rounded-2xl transition-all ${showAttemptsOnLeft ? 'bg-primary-50 border border-primary-200 shadow-sm' : 'bg-slate-50 border border-slate-100 hover:shadow-sm'}`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-500">Total Written</span>
                    <p className="font-black text-xl text-slate-800">{selectedDetailTask.attemptsCount}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-[0.22em] font-bold ${showAttemptsOnLeft ? 'text-primary-700' : 'text-slate-400'}`}>
                    {showAttemptsOnLeft ? 'Close' : 'View'}
                  </span>
                </button>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-success-50 border border-success-100 relative overflow-hidden">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-success-700">Passed</span>
                    {selectedDetailTask.bestScorePercentage > 0 && (
                      <span className="text-[10px] font-black text-success-600">BEST: {selectedDetailTask.bestScorePercentage}%</span>
                    )}
                  </div>
                  <span className="font-black text-xl text-success-700">{selectedDetailTask.passedCount}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Failed</span>
                  <span className="font-black text-xl text-slate-800">{selectedDetailTask.failedCount}</span>
                </div>
              </div>
            </div>

            {/* CTA Button (Anchored to the absolute bottom) */}
            <div className="mt-auto pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  const taskToLaunch = selectedDetailTask;
                  setSelectedDetailTask(null);
                  openTaskWithRoute(taskToLaunch);
                }}
                className="w-full py-4 px-6 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-black text-base shadow-xl shadow-primary-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                {selectedDetailTask.attemptsCount > 0 ? (
                  <>
                    <RotateCcw className="w-5 h-5 text-white group-hover:-rotate-180 transition-transform duration-500" />
                    <span>Retake Practice Quiz</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 text-white fill-white" />
                    <span>Start Practice Quiz</span>
                  </>
                )}
                <ArrowRight className="w-5 h-5 ml-2 opacity-70 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>
        </div>

      </div>
    );
  }


  // ════════════════ 3. MAIN ASSIGNMENTS HUB (CARDS GRID) ════════════════
  return (
    <div className="space-y-6 font-sans animate-fade-in">
      
      {/* Clean Top Header */}
      <div className="pb-2">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Assignments & Topic Quizzes
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Click any assessment to open topic-based practice quizzes and coding labs.
        </p>
      </div>




      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 max-w-lg">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'mcq', label: 'MCQ Quizzes' },
          { id: 'coding', label: 'Coding Labs' },
          { id: 'completed', label: 'Completed' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterTab(t.id as any)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all ${
              filterTab === t.id
                ? 'bg-white text-[#101537] shadow-xs border border-slate-200/60 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>


      {/* Tasks List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => {
          const isMCQ = task.type === 'mcq';
          const isDone = task.status === 'completed';

          return (
            <Card
              key={task.id}
              hover
              onClick={() => openDetailTaskWithRoute(task)}
              className="p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#3b52a4] transition-all duration-300 group cursor-pointer bg-white"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                    isMCQ ? 'bg-indigo-50 text-[#3b52a4] border-indigo-100' : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {isMCQ ? 'MCQ QUIZ (1 BY 1)' : 'CODING LAB'}
                  </span>

                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {task.category}
                  </span>
                </div>

                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  +{task.xp} XP
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base mb-1.5 group-hover:text-[#3b52a4] transition-colors">
                {task.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                {task.description}
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {task.timeEstimate}
                  </span>
                  {task.attemptsCount > 0 && (
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {task.attemptsCount} Attempts
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 font-bold text-[#3b52a4] group-hover:translate-x-1 transition-transform">
                  <span>View Quiz Details</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
