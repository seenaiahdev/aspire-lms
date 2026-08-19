import { useState, useEffect } from 'react';
import {
  FileText, Clock, Upload, CheckCircle2, AlertCircle, Star, Paperclip, ArrowRight, X,
  HelpCircle, Code2, Trophy, ArrowLeft, CheckCircle, XCircle, Play, Sparkles, Terminal, Copy, RefreshCw, Check, Compass, RotateCcw, Eye, Lock
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { Modal } from '@/components/ui/Modal';
import { QuizzesScreen } from '@/screens/QuizzesScreen';
import { cn } from '@/lib/utils';

import { assignmentsSteps } from '@/lib/tourSteps';

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

// Comprehensive Course Assessments Data
// Loaded via API

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

import { useUser } from '@/lib/UserContext';
import { fetchAssignments } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export function AssignmentsScreen() {
  const { user } = useUser();
  const { navigate } = useNav();
  const [courseAssignments, setCourseAssignments] = useState<PythonTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user?.batch) {
        setLoading(true);
        try {
          const data = await fetchAssignments(user.batch);
          setCourseAssignments(data || []);
        } catch (error) {
          console.error("Failed to fetch assignments:", error);
          setCourseAssignments([]);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [user?.batch]);

  const [mainPracticeTab, setMainPracticeTab] = useState<'assessments' | 'quizzes'>('assessments');
  const [lockedToast, setLockedToast] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');

  // Currently Selected Task for Pre-Start Quiz Details Modal
  const [selectedDetailTask, setSelectedDetailTask] = useState<PythonTask | null>(null);
  const [showAttemptsOnLeft, setShowAttemptsOnLeft] = useState(false);
  const [selectedAttemptReview, setSelectedAttemptReview] = useState<PythonTaskAttempt | null>(null);

  // Currently Active Practice Task (MCQ Quiz Runner)
  const [activeTask, setActiveTask] = useState<PythonTask | null>(null);

  // MCQ Exam State
  const [currentMCQIndex, setCurrentMCQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizStatus, setQuizStatus] = useState<'taking' | 'results' | 'review'>('taking');
  const [userScore, setUserScore] = useState(0);
  const [confirmQuizAction, setConfirmQuizAction] = useState<'submit' | 'exit' | null>(null);

  // Filter Tasks
  const filteredTasks = courseAssignments.filter((t) => {
    if (filterTab === 'pending') return t.status === 'pending';
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
    setConfirmQuizAction(null);
    window.history.pushState({}, '', '/assignments');
  };

  const openQuizConfirm = (action: 'submit' | 'exit') => {
    setConfirmQuizAction(action);
  };

  const handleConfirmQuizAction = () => {
    if (confirmQuizAction === 'submit') {
      handleNextOrSubmit();
    } else if (confirmQuizAction === 'exit') {
      closeTaskAndReturnToAssignments();
    }
    setConfirmQuizAction(null);
  };

  // Restore active task/details on page refresh or direct URL visit
  useEffect(() => {
    const parsePath = () => {
      const rawPath = window.location.hash.startsWith('#/')
        ? window.location.hash.replace(/^#/, '')
        : window.location.pathname;
      const path = rawPath.replace('/assignments/', '').replace(/^\//, '');
      if (!path) return;

      const parts = path.split('/');
      const slug = parts[0]?.trim();
      const isPractice = parts[1] === 'practice';
      const isReview = parts[2] === 'review';
      const reviewAttemptId = parts[3] ? Number(parts[3]) : undefined;
      const isAttemptsView = parts[1] === 'attempts';
      const match = courseAssignments.find((t) => t.slug === slug || t.id === slug);
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
              onClick={() => openQuizConfirm('exit')}
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
                  <div className="flex items-center justify-between gap-3 shrink-0 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs tracking-[0.24em]">
                        {currentMCQIndex + 1} / {questions.length}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-[0.32em] hidden sm:inline-flex">
                        Question {currentMCQIndex + 1}
                      </span>
                    </div>

                    {/* EXAM MODE BADGE */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.32em]">Exam Mode</span>
                    </div>
                  </div>

                  {/* Question Container (Full-Screen Layout) */}
                  <div className="flex-1 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden pb-6">
                    <div className="shrink-0 mt-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary-500" />
                      <div className="mb-5">
                        <h3 className="font-semibold text-slate-900 text-lg sm:text-xl leading-7">
                          {currentQ.question}
                        </h3>

                        {currentQ.codeSnippet && (
                          <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-sm overflow-x-auto shadow-inner mt-4 border border-slate-800">
                            <code>{currentQ.codeSnippet}</code>
                          </pre>
                        )}
                      </div>

                      {/* Clean List Options */}
                      <div className="flex flex-col gap-3">
                        {currentQ.options.map((optionText, idx) => {
                          const isSelected = userAnswers[currentMCQIndex] === idx;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectOption(idx)}
                              className={`w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200 flex items-center gap-3 ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'}`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className={`text-sm ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>
                                {optionText}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="pt-5 shrink-0 flex flex-col justify-end w-full border-t border-slate-200 mt-auto">
                    <button
                      onClick={() => {
                        if (currentMCQIndex < questions.length - 1) {
                          handleNextOrSubmit();
                        } else {
                          openQuizConfirm('submit');
                        }
                      }}
                      disabled={userAnswers[currentMCQIndex] === -1}
                      className="w-full max-w-sm px-7 py-3 rounded-2xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all tracking-[0.16em] shadow-sm self-end"
                    >
                      {currentMCQIndex < questions.length - 1 ? 'Next Question' : 'Submit Exam'}
                    </button>
                  </div>

                </div>
              ) : quizStatus === 'results' ? (
                /* Results Celebration Card */
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center space-y-5 animate-fade-in max-w-md mx-auto my-auto relative z-20">
                  {userScore >= 70 && <ConfettiBurst />}
                  
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm ${userScore >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {userScore >= 70 ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                  </div>

                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 w-fit mx-auto ${userScore >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {userScore >= 70 ? <Sparkles className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>{userScore >= 70 ? 'Exam Passed' : 'Exam Failed'}</span>
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-semibold text-slate-900 mt-4">{userScore}%</h3>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                      {userScore >= 70 ? 'Solid work. Your answers are on target.' : 'Review your responses and try again for a higher score.'}
                    </p>
                  </div>

                  {userScore >= 70 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.24em]">Reward Earned</p>
                      <p className="text-2xl font-black text-slate-900">+{activeTask.xp} XP</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      onClick={() => setQuizStatus('review')}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200"
                    >
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Review Answers</span>
                    </button>

                    <button
                      onClick={closeTaskAndReturnToAssignments}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
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

          <Modal open={confirmQuizAction !== null} onClose={() => setConfirmQuizAction(null)} size="sm">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${confirmQuizAction === 'submit' ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-700'}`}>
                  {confirmQuizAction === 'submit' ? <CheckCircle2 className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                    {confirmQuizAction === 'submit' ? 'Submit Exam' : 'Exit Practice'}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    {confirmQuizAction === 'submit' ? 'Submit your answers now?' : 'Leave this assessment session?'}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    {confirmQuizAction === 'submit'
                      ? 'Your current answer sheet will be scored and the results screen will open immediately.'
                      : 'You can return to the assignment hub, but this quiz session will be closed for now.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Question</span>
                  <span className="font-semibold text-slate-900">{currentMCQIndex + 1} of {questions.length}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${Math.round(((currentMCQIndex + 1) / Math.max(questions.length, 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmQuizAction(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Continue Assessment
                </button>
                <button
                  type="button"
                  onClick={handleConfirmQuizAction}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition shadow-sm ${confirmQuizAction === 'submit' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {confirmQuizAction === 'submit' ? 'Submit Now' : 'Exit Assessment'}
                </button>
              </div>
            </div>
          </Modal>

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
                      Assessment Overview
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
                      <Compass className="w-5 h-5 text-primary-500" />
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
                      window.history.pushState({}, '', `/assignments/${selectedDetailTask.slug}${next ? '/attempts' : ''}`);
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
                    <span>Retake Assessment</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 text-white fill-white" />
                    <span>Start Assessment</span>
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


  // ════════════════ 3. MAIN ASSIGNMENTS & PRACTICE HUB (CARDS GRID) ════════════════
  return (
    <div className="space-y-6 font-sans animate-fade-in">

      
      {/* Clean Top Header */}
      <div className="space-y-4">
        <div id="tour-assignments-header">
          <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Practice Hub
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Topic-based practice assessments, tests, and module quizzes.
          </p>
        </div>

        {/* 2 MAIN TABS: ASSESSMENTS | QUIZZES (ALIGNED LEFT AT START) */}
        <div id="tour-assignments-tabs" className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 w-fit">
          <button
            type="button"
            onClick={() => setMainPracticeTab('assessments')}
            className={`py-2 px-5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mainPracticeTab === 'assessments'
                ? 'bg-[#7c3aed] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assessments
          </button>
          <button
            type="button"
            onClick={() => setMainPracticeTab('quizzes')}
            className={`py-2 px-5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mainPracticeTab === 'quizzes'
                ? 'bg-[#7c3aed] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quizzes
          </button>
        </div>
      </div>

      {/* RENDER 2ND TAB (QUIZZES) OR 1ST TAB (ASSESSMENTS) */}
      {mainPracticeTab === 'quizzes' ? (
        <QuizzesScreen />
      ) : (
        <>
          {/* Sub-Filter Tabs for Assessments */}
          <div id="tour-assignments-filters" className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 max-w-md">
            {[
              { id: 'all', label: 'All Assessments' },
              { id: 'pending', label: 'Pending' },
              { id: 'completed', label: 'Completed' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTab(t.id as any)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all ${
                  filterTab === t.id
                    ? 'bg-white text-primary-900 shadow-xs border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tasks List Cards */}
          {loading ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
              <h3 className="font-extrabold text-slate-900 text-lg mb-1">Loading Assessments...</h3>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-1">No assignments available yet</h3>
              <p className="text-sm font-medium text-slate-500">You don't have any {filterTab} assessments at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task, index) => {
              const isLocked = false;
              return (
                <Card
                  id={index === 0 ? 'tour-assignments-card-0' : undefined}
                  key={task.id}
                  hover={!isLocked}
                  onClick={() => {
                    if (isLocked) {
                      setLockedToast(true);
                      setTimeout(() => setLockedToast(false), 3000);
                      return;
                    }
                    openDetailTaskWithRoute(task);
                  }}
                  className={cn(
                    "p-5 rounded-3xl border shadow-2xs transition-all duration-300 relative overflow-hidden bg-white border-slate-200/90 group",
                    isLocked ? "cursor-not-allowed opacity-90 grayscale-[15%] bg-slate-50" : "cursor-pointer hover:shadow-md hover:border-primary-500"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-black border",
                        isLocked ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-primary-50 text-primary-700 border-primary-100"
                      )}>
                        MCQ ASSESSMENT
                      </span>

                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {task.category}
                      </span>
                    </div>

                    <span className={cn(
                      "text-xs font-bold px-2.5 py-0.5 rounded-md border",
                      isLocked ? "bg-slate-100 text-slate-400 border-slate-200" : "text-amber-700 bg-amber-50 border-amber-200"
                    )}>
                      +{task.xp} XP
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base mb-1.5 transition-colors text-slate-900 group-hover:text-[#3b52a4]">
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

                    <div className={cn("flex items-center gap-1 font-bold transition-transform", isLocked ? "text-slate-400" : "text-[#3b52a4] group-hover:translate-x-1")}>
                      {isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5 mb-0.5" />
                          <span>Coming Soon</span>
                        </>
                      ) : (
                        <>
                          <span>View Assessment Details</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            </div>
          )}
        </>
      )}

      {/* ════════ CUSTOM TOAST NOTIFICATION ════════ */}
      {lockedToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up pointer-events-none">
          <div className="flex items-center gap-4 px-5 py-3.5 bg-[#090b14]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 shrink-0 shadow-inner">
              <Lock className="w-5 h-5 text-purple-300" />
            </div>
            <div className="pr-2">
              <h4 className="font-black text-sm text-slate-50 tracking-wide uppercase">Coming Soon</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">This assessment is currently locked.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
