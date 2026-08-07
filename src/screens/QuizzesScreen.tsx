import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardCheck, Clock, Star, TrendingUp, Trophy, Play, Award, Compass, AlertTriangle, Info, CheckCircle2, X, ChevronRight, ChevronLeft, HelpCircle, Flag, LogOut, Code2 } from 'lucide-react';
import { quizzes, leaderboard } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { StatusChip, DifficultyBadge } from '@/components/ui/StatusChip';
import { BarChart } from '@/components/ui/Charts';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useNav } from '@/lib/nav';

export function QuizzesScreen() {
  const { navigate } = useNav();
  const [tab, setTab] = useState('upcoming');
  const [selectedQuiz, setSelectedQuiz] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('preExamQuiz');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  // New state for the active exam
  const [isExamStarted, setIsExamStarted] = useState(() => {
    return localStorage.getItem('isExamStarted') === 'true';
  });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [reviewMarked, setReviewMarked] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [confirmExamAction, setConfirmExamAction] = useState<'submit' | 'exit' | null>(null);

  useEffect(() => {
    let timer: any;
    if (isExamStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExamStarted, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (selectedQuiz) {
      localStorage.setItem('preExamQuiz', JSON.stringify(selectedQuiz));
      localStorage.setItem('isExamStarted', String(isExamStarted));
    } else {
      localStorage.removeItem('preExamQuiz');
      localStorage.removeItem('isExamStarted');
      setIsExamStarted(false);
      setCurrentQuestionIdx(0);
      setAnswers({});
      setReviewMarked({});
    }
  }, [selectedQuiz, isExamStarted]);

  const handleStartExam = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setIsExamStarted(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < (selectedQuiz?.questions || 20) - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const finalizeExam = () => {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    setIsExamStarted(false);
    setConfirmExamAction(null);
    setSelectedQuiz(null);
  };

  const handleExitExam = () => {
    setConfirmExamAction('exit');
  };

  const openExamConfirm = (action: 'submit' | 'exit') => {
    setConfirmExamAction(action);
  };

  const handleConfirmExamAction = () => {
    if (confirmExamAction === 'submit' || confirmExamAction === 'exit') {
      finalizeExam();
    }
  };

  // Mock Question Data
  const mockOptions = [
    "It allows side-effects in function components.",
    "It optimizes rendering performance by caching values.",
    "It directly manipulates the physical DOM elements.",
    "It creates a local state variable and a setter function."
  ];

  return (
    <div className="space-y-6 font-sans pb-12 animate-fade-in">
      <Tabs
        variant="pills"
        tabs={[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'results', label: 'Previous Results' },
          { id: 'analytics', label: 'Analytics' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'upcoming' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {quizzes.filter(q => q.status === 'upcoming').map((q) => (
            <Card key={q.id} className="p-6 bg-white border border-slate-200/90 shadow-sm hover:shadow-lg transition-all rounded-[2rem] flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-100 shrink-0">
                      <ClipboardCheck className="w-6 h-6 text-[#7c3aed]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg leading-snug">{q.title}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{q.course}</p>
                    </div>
                  </div>
                  <DifficultyBadge difficulty={q.difficulty} />
                </div>
                
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="flex items-center gap-1.5"><Compass className="w-4 h-4 text-slate-400" />{q.questions} questions</span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" />{q.duration}</span>
                  <span>•</span>
                  <span>Due {q.dueDate}</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedQuiz(q)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Assessment</span>
              </button>
            </Card>
          ))}
        </div>
      )}

      {tab === 'results' && (
        <div className="space-y-4">
          {quizzes.filter(q => q.status === 'attempted').map((q) => (
            <Card key={q.id} className="p-5 bg-white border border-slate-200/90 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <Award className="w-7 h-7 text-[#7c3aed]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-slate-900 text-base">{q.title}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">{q.course} • {q.dueDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{q.score}<span className="text-sm font-bold text-slate-400">/{q.maxScore}</span></p>
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-[#7c3aed] text-[10px] font-black uppercase mt-1 inline-block">
                    {(q.score ?? 0) >= 90 ? 'Excellent' : (q.score ?? 0) >= 70 ? 'Good' : 'Pass'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'analytics' && (
        <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm p-6 bg-white">
          <CardBody>
            <h3 className="font-extrabold text-slate-900 mb-1 text-lg">Quiz Performance Over Time</h3>
            <p className="text-xs font-semibold text-slate-500 mb-8">Your scores across recent quizzes</p>
            <BarChart
              data={[
                { label: 'Q1', value: 78 },
                { label: 'Q2', value: 88 },
                { label: 'Q3', value: 94 },
                { label: 'Q4', value: 85 },
                { label: 'Q5', value: 92 },
                { label: 'Q6', value: 96 },
              ]}
              height={200}
              color="bg-gradient-to-t from-[#6d28d9] to-[#7c3aed]"
            />
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900">88.8</p>
                <p className="text-xs font-bold text-slate-500">Average Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">+18%</p>
                <p className="text-xs font-bold text-slate-500">Improvement</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900">96</p>
                <p className="text-xs font-bold text-slate-500">Best Score</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ════════ FULL PAGE QUIZ TAKEOVER PORTAL ════════ */}
      {selectedQuiz && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-50 flex flex-col animate-fade-in font-sans h-[100dvh] w-screen overflow-hidden">
          
          {/* Top Navbar */}
          <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-12 shrink-0 shadow-sm z-50 relative">
            {!isExamStarted ? (
              <button 
                onClick={() => setSelectedQuiz(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
              >
                <X className="w-5 h-5" />
                <span>Cancel & Return</span>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{selectedQuiz.title}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Assessment</p>
                </div>
              </div>
            )}
            
            {!isExamStarted ? (
              <div />
            ) : (
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time Remaining</span>
                  <span className={cn("font-black text-sm tabular-nums", timeLeft < 300 ? "text-rose-600 animate-pulse" : "text-slate-900")}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-black text-rose-700 tracking-widest uppercase">Recording</span>
                </div>
              </div>
            )}
          </div>

          {!isExamStarted ? (
            /* ════════ PRE-EXAM VIEW (SLEEK PROFESSIONAL UI) ════════ */
            <div className="flex-1 flex overflow-hidden bg-slate-50/50 items-center justify-center p-6 sm:p-10">
              
              <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 flex flex-col lg:flex-row overflow-hidden relative">
                
                {/* LEFT SIDE - Info & Rules */}
                <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center">
                  <div className="mb-10">
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                      {selectedQuiz.title}
                    </h1>
                    <p className="text-slate-500 font-medium text-base leading-relaxed">
                      {selectedQuiz.course} • Validate your expertise, earn certification points, and advance your career.
                    </p>
                  </div>

                  <div className="space-y-7 pt-8 border-t border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Assessment Guidelines
                    </h3>
                    
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 text-rose-500 border border-rose-100/50">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Strict Environment</h4>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                          Runs in strict full-screen mode. <strong className="text-rose-600 font-bold">Max 3 exits allowed</strong> before auto-submission.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-500 border border-emerald-100/50">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">No Negative Marking</h4>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                          Attempt all questions without penalty. Progress saves automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE - Stats & Action */}
                <div className="w-full lg:w-[380px] bg-slate-50/50 p-8 sm:p-12 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col justify-center shrink-0">
                  <h3 className="text-lg font-extrabold text-slate-900 mb-8">Assessment Details</h3>
                  
                  <div className="space-y-6 mb-10">
                    <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-3 text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold text-sm">Duration</span>
                      </div>
                      <span className="font-bold text-slate-900">{selectedQuiz.duration}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-3 text-slate-500">
                        <Compass className="w-4 h-4" />
                        <span className="font-semibold text-sm">Questions</span>
                      </div>
                      <span className="font-bold text-slate-900">{selectedQuiz.questions}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-slate-500">
                        <Award className="w-4 h-4" />
                        <span className="font-semibold text-sm">Max Points</span>
                      </div>
                      <span className="font-bold text-slate-900">5</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleStartExam}
                    className="w-full group py-3.5 rounded-xl bg-[#101537] hover:bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-800"
                  >
                    <span>Start Assessment</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            </div>
          ) : (
            /* ════════ ACTIVE EXAM VIEW (MCQ) ════════ */
            <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 z-10">
                <div 
                  className="h-full bg-[#7c3aed] transition-all duration-300"
                  style={{ width: `${((Object.keys(answers).length) / selectedQuiz.questions) * 100}%` }}
                />
              </div>

              <div className="flex-1 w-full max-w-[1600px] mx-auto flex overflow-hidden">
                
                {/* LEFT PANEL - Question Area */}
                <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
                  
                  <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <span className="px-3 py-1 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-100 text-[11px] font-black tracking-widest uppercase">
                        Question {currentQuestionIdx + 1} of {selectedQuiz.questions}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug mb-6 shrink-0">
                      {currentQuestionIdx % 2 === 0 
                        ? "What is the primary purpose of the `useState` hook in React applications?"
                        : "Which of the following is true regarding React's `useEffect` hook dependencies array?"}
                    </h2>

                    <div className="space-y-3 mb-6 shrink-0">
                      {mockOptions.map((opt, i) => {
                        const isSelected = answers[currentQuestionIdx] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setAnswers(prev => ({ ...prev, [currentQuestionIdx]: i }))}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-[1rem] border-2 transition-all flex items-center gap-4 group text-sm",
                              isSelected
                                ? "bg-purple-50/70 border-[#7c3aed] shadow-sm" 
                                : "bg-white border-slate-200 hover:border-[#7c3aed]/40 hover:bg-slate-50"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                              isSelected ? "border-[#7c3aed] bg-[#7c3aed]" : "border-slate-300 group-hover:border-[#7c3aed]/40"
                            )}>
                              {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className={cn(
                              "font-bold",
                              isSelected ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                            )}>
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-between shrink-0 border-t border-slate-200 pt-6">
                      <button 
                        onClick={() => setReviewMarked(prev => ({ ...prev, [currentQuestionIdx]: !prev[currentQuestionIdx] }))}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border",
                          reviewMarked[currentQuestionIdx]
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                        )}
                      >
                        <Flag className={cn("w-3.5 h-3.5", reviewMarked[currentQuestionIdx] ? "fill-amber-500 text-amber-500" : "")} />
                        <span>{reviewMarked[currentQuestionIdx] ? "Marked for Review" : "Mark for Review"}</span>
                      </button>

                      <button 
                        onClick={handleNextQuestion}
                        disabled={currentQuestionIdx === (selectedQuiz?.questions || 20) - 1}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Save & Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* RIGHT PANEL - Question Palette */}
                <div className="w-64 lg:w-72 bg-white border-l border-slate-200 flex flex-col shrink-0">
                  <div className="p-4 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-sm mb-3">Question Palette</h3>
                    
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-[#7c3aed]" />
                        <span>Answered</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                        <span>Review</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 bg-white" />
                        <span>Unanswered</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm border border-[#7c3aed] bg-purple-50" />
                        <span>Current</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: selectedQuiz?.questions || 20 }).map((_, i) => {
                        const isAnswered = answers[i] !== undefined;
                        const isReview = reviewMarked[i];
                        const isCurrent = currentQuestionIdx === i;
                        
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentQuestionIdx(i)}
                            className={cn(
                              "aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all relative overflow-hidden",
                              isCurrent ? "border-2 border-[#7c3aed] bg-purple-50 text-[#7c3aed]" : "border border-slate-200 hover:border-slate-400",
                              isAnswered ? "bg-[#7c3aed] text-white border-transparent" : "bg-white text-slate-600",
                              !isAnswered && isReview ? "bg-amber-100 text-amber-800 border-amber-300" : ""
                            )}
                          >
                            <span className="relative z-10">{i + 1}</span>
                            {/* Review Indicator mark if also answered */}
                            {isAnswered && isReview && (
                              <div className="absolute top-0 right-0 w-0 h-0 border-t-[10px] border-r-[10px] border-t-amber-400 border-r-transparent rounded-tr-sm" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2.5 shrink-0">
                    <button 
                      onClick={() => openExamConfirm('submit')}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit</span>
                    </button>
                    
                    <button 
                      onClick={handleExitExam}
                      className="w-full py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Exit Exam</span>
                    </button>
                  </div>
                </div>

              </div>

              <Modal open={confirmExamAction !== null} onClose={() => setConfirmExamAction(null)} size="sm">
                <div className="p-6 sm:p-8">
                  <div className="space-y-2 text-center sm:text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                      {confirmExamAction === 'submit' ? 'Submit' : 'Exit'}
                    </p>
                    <h3 className="text-2xl font-semibold text-slate-900">
                      {confirmExamAction === 'submit' ? 'Submit exam?' : 'Exit exam?'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500">
                      {currentQuestionIdx + 1}/{selectedQuiz?.questions || 20} answered
                    </p>
                  </div>

                  <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmExamAction(null)}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmExamAction}
                      className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-all shadow-sm ${confirmExamAction === 'submit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                    >
                      {confirmExamAction === 'submit' ? 'Submit' : 'Exit'}
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
