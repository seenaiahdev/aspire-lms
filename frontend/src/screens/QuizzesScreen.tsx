import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardCheck, Clock, Star, TrendingUp, Trophy, Play, Award, Compass, AlertTriangle, Info, CheckCircle2, X, ChevronRight, ChevronLeft, HelpCircle, Flag, LogOut, Code2, Lock, Calendar, Loader2 } from 'lucide-react';
import { fetchQuizzes, fetchLeaderboard, fetchQuizAttempts, submitQuizAttempt } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useUnlockResolver } from '@/lib/lessonLinkResolver';
import { useUser } from '@/lib/UserContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { StatusChip, DifficultyBadge } from '@/components/ui/StatusChip';
import { BarChart } from '@/components/ui/Charts';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useNav } from '@/lib/nav';
import { LockedOverlay } from '@/components/ui/LockedOverlay';

export function QuizzesScreen() {
  const { user } = useUser();
  const { navigate } = useNav();
  const { isUnlocked } = useUnlockResolver();
  const [tab, setTab] = useState('upcoming');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [q, att, l] = await Promise.all([
        (user?.enrolledCourses && user?.enrolledCourses.length > 0) ? fetchQuizzes(user.enrolledCourses) : Promise.resolve([]),
        user?.id ? fetchQuizAttempts(user.id) : Promise.resolve([]),
        fetchLeaderboard()
      ]);

      if (q) {
        const mapped = q.map((item: any) => ({
          id: item.id,
          course_id: item.course_id,
          title: item.title,
          questions: item.mcqs && item.mcqs.length > 0 ? item.mcqs.length : (item.total_questions || 10),
          duration: `${item.duration_minutes || 30} mins`,
          durationMinutes: item.duration_minutes || 30,
          maxScore: item.total_marks || 100,
          dueDate: item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No date',
          inner_topic_id: item.inner_topic_id,
          status: 'upcoming',
          mcqs: item.mcqs || []
        }));
        setQuizzes(mapped);
      } else {
        setQuizzes([]);
      }

      setAttempts(att || []);
      setLeaderboard(l || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [user?.enrolledCourses, user?.id]);

  const [lockedToast, setLockedToast] = useState(false);
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
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [autoSubmittedScore, setAutoSubmittedScore] = useState<number | null>(null);
  const [reviewQuizAttempt, setReviewQuizAttempt] = useState<{ quiz: any, attempt: any } | null>(null);
  const isExitingIntentionally = useRef(false);

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
  
  // Grade strictly against the quiz's real MCQ answer keys. Returns a 0-100 percentage.
  const computeScore = (): number => {
    const mcqs = selectedQuiz?.mcqs || [];
    if (!mcqs.length) return 0;
    const correctCount = mcqs.filter((q: any, qIdx: number) => answers[qIdx] === q.correctIndex).length;
    return Math.round((correctCount / mcqs.length) * 100);
  };

  // Convert the in-memory answers map into a positional array (index = question, value = choice).
  const answersToArray = (): number[] =>
    (selectedQuiz?.mcqs || []).map((_: any, i: number) => (answers[i] ?? -1));

  const autoSubmitExam = async () => {
    if (selectedQuiz && user?.id) {
      const calculatedScore = computeScore();

      try {
        isExitingIntentionally.current = true;
        await submitQuizAttempt(user.id, selectedQuiz.id, calculatedScore, answersToArray());
        await loadData();
        setAutoSubmittedScore(calculatedScore);
      } catch (err) {
        console.error('Failed to auto-submit quiz attempt:', err);
      }
    }
    finalizeExam();
  };

  // Keep the latest auto-submit in a ref so proctoring listeners never grade with stale answers.
  const autoSubmitRef = useRef(autoSubmitExam);
  autoSubmitRef.current = autoSubmitExam;

  // Auto-submit when the timer runs out during an active exam.
  useEffect(() => {
    if (isExamStarted && timeLeft === 0) {
      autoSubmitExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExamStarted, timeLeft]);

  // ── Proctoring: strict full-screen + catch every escape route (exit full-screen, tab switch,
  //    minimize, window blur). 3 strikes → auto-submit. Also blocks the context menu and the
  //    common escape/reload keyboard shortcuts while the exam is live. ──
  useEffect(() => {
    if (!isExamStarted) {
      setFullscreenExits(0);
      setShowFullscreenWarning(false);
      return;
    }

    const startedAt = Date.now();
    let lastStrikeAt = 0;
    const inFullscreen = () => !!document.fullscreenElement;

    // Count a strike (leaving fullscreen / hiding the tab). 3 → auto-submit; 1st & 2nd → warning.
    const strike = () => {
      if (isExitingIntentionally.current) return;
      if (Date.now() - startedAt < 1500) return;   // grace while fullscreen first engages
      const now = Date.now();
      if (now - lastStrikeAt < 800) return;         // debounce overlapping events
      lastStrikeAt = now;
      setFullscreenExits((prev) => {
        const next = prev + 1;
        if (next >= 3) autoSubmitRef.current();
        else setShowFullscreenWarning(true);
        return next;
      });
    };

    const onFullscreenChange = () => {
      if (inFullscreen()) {
        setShowFullscreenWarning(false);            // back in fullscreen → clear the block
      } else {
        setShowFullscreenWarning(true);             // left fullscreen → block immediately …
        strike();                                   // … and count it (after grace)
      }
    };
    const onVisibility = () => { if (document.hidden) strike(); };
    // Window blur catches Alt-Tab / app-switch / minimize / Win-key (these fire blur, not
    // visibilitychange). Also force the block up since we're no longer focused/fullscreen.
    const onBlur = () => { setShowFullscreenWarning(true); strike(); };
    const onContextMenu = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      // Block reload/close/new-tab/print/save; let Esc/F11 toggle fullscreen so the exit is detected.
      const k = e.key.toLowerCase();
      if (k === 'f5' || ((e.ctrlKey || e.metaKey) && ['r', 'w', 't', 'n', 'p', 's'].includes(k))) {
        e.preventDefault();
      }
    };

    // STRICT enforcement: keep the fullscreen prompt up whenever the exam isn't in fullscreen —
    // this also covers the case where fullscreen never engaged (so there's no exit event to catch).
    const poll = setInterval(() => {
      if (isExitingIntentionally.current) return;
      if (!inFullscreen() && Date.now() - startedAt >= 1500) setShowFullscreenWarning(true);
    }, 1000);

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      clearInterval(poll);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExamStarted]);

  const handleStartExam = () => {
    isExitingIntentionally.current = false;
    setFullscreenExits(0);
    setShowFullscreenWarning(false);
    setAutoSubmittedScore(null);
    // Timer reflects the quiz's own duration (falls back to 30 min if unset).
    setTimeLeft((selectedQuiz?.durationMinutes || 30) * 60);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setIsExamStarted(true);
  };

  const handleResumeFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
        .then(() => {
          setShowFullscreenWarning(false);
        })
        .catch(() => {});
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < (selectedQuiz?.questions || 20) - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const finalizeExam = () => {
    isExitingIntentionally.current = true;
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

  const handleConfirmExamAction = async () => {
    isExitingIntentionally.current = true;
    if (confirmExamAction === 'submit' && selectedQuiz && user?.id) {
      const calculatedScore = computeScore();

      try {
        await submitQuizAttempt(user.id, selectedQuiz.id, calculatedScore, answersToArray());
        await loadData();
      } catch (err) {
        console.error('Failed to submit quiz attempt:', err);
      }
    }
    finalizeExam();
  };

  const hasQuestions = !!(selectedQuiz?.mcqs && selectedQuiz.mcqs.length > 0);

  // A weekly quiz is single-attempt: once an attempt exists it leaves "Upcoming" for "Completed".
  const attemptFor = (quizId: string) => attempts.find((a) => a.quiz_id === quizId);
  const pendingQuizzes = quizzes.filter((q) => isUnlocked(q.inner_topic_id) && !attemptFor(q.id));
  const completedQuizzes = quizzes.filter((q) => !!attemptFor(q.id));

  return (
    <div className="space-y-6 font-sans pb-12 animate-fade-in">
      <Tabs
        variant="pills"
        tabs={[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'completed', label: 'Completed' },
          { id: 'analytics', label: 'Analytics' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'upcoming' && (
        <>
          {loading ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
              <h3 className="font-extrabold text-slate-900 text-lg mb-1">Loading Quizzes...</h3>
            </div>
          ) : pendingQuizzes.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-1">No quizzes available yet</h3>
              <p className="text-sm font-medium text-slate-500">Check back later for new quizzes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {pendingQuizzes.map((q) => (
                <Card
                  key={q.id}
                  onClick={() => setSelectedQuiz(q)}
                  className="p-6 bg-white border border-slate-200/60 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group shadow-sm transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300"
                >
                  <div>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center border shadow-sm shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100/50">
                          <ClipboardCheck className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-[17px] leading-snug mb-1 transition-colors group-hover:text-indigo-700">{q.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">{q.course || 'Weekly Quiz'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] uppercase tracking-wider font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">Quiz</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 text-[13px] font-semibold text-slate-500 mb-6 pt-5 border-t border-slate-100">
                      <span className="flex items-center gap-1.5"><Compass className="w-4 h-4 text-indigo-400" />{q.questions} questions</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-500" />{q.duration}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-rose-400" />Due {q.dueDate}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedQuiz(q); }}
                    className="w-full py-3.5 px-4 rounded-2xl font-black text-[13px] flex items-center justify-center gap-2 transition-all border cursor-pointer bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-md hover:shadow-indigo-500/20"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Quiz</span>
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'completed' && (
        <div className="space-y-4">
          {completedQuizzes.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-[2rem]">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-800 text-base">No Completed Quizzes</h3>
              <p className="text-xs text-slate-500 mt-1">You haven't completed any quizzes yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {completedQuizzes.map((quiz) => {
                const attempt = attemptFor(quiz.id);
                const percent = attempt?.score ?? 0;
                return (
                  <Card
                    key={quiz.id}
                    onClick={() => setReviewQuizAttempt({ quiz, attempt })}
                    className="p-6 bg-white border border-slate-200/60 rounded-[2rem] shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-300"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                            <ClipboardCheck className="w-5.5 h-5.5 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-[15px] leading-tight mb-0.5">{quiz.title}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Quiz</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border bg-amber-50 text-amber-700 border-amber-100">
                          Not published
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 pt-4 border-t border-slate-100 mt-4">
                        <span>{quiz.questions} questions</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>Completed {attempt?.attempted_at ? new Date(attempt.attempted_at).toLocaleDateString() : 'Recent'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setReviewQuizAttempt({ quiz, attempt }); }}
                      className="mt-5 w-full py-3.5 px-4 rounded-2xl font-black text-[13px] flex items-center justify-center gap-2 transition-all border cursor-pointer bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                    >
                      <Award className="w-4 h-4 text-emerald-500" />
                      <span>View Score</span>
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm p-12 bg-white text-center">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-800 text-base">Analytics Not Available</h3>
          <p className="text-xs text-slate-500 mt-1">Complete quizzes to unlock performance analytics.</p>
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
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Quiz</p>
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
                      Quiz Guidelines
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
                  <h3 className="text-lg font-extrabold text-slate-900 mb-8">Quiz Details</h3>
                  
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

                  {hasQuestions ? (
                    <button
                      onClick={handleStartExam}
                      className="w-full group py-3.5 rounded-xl bg-[#101537] hover:bg-slate-900 text-white font-bold text-sm shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-800"
                    >
                      <span>Start Quiz</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Quiz not available yet</span>
                    </button>
                  )}
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
                      {selectedQuiz.mcqs?.[currentQuestionIdx]?.question}
                    </h2>

                    {selectedQuiz.mcqs && selectedQuiz.mcqs[currentQuestionIdx]?.codeSnippet && (
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto mb-6 shrink-0">
                        <code>{selectedQuiz.mcqs[currentQuestionIdx].codeSnippet}</code>
                      </pre>
                    )}

                    <div className="space-y-3 mb-6 shrink-0">
                      {(selectedQuiz.mcqs?.[currentQuestionIdx]?.options || []).map((opt: string, i: number) => {
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
          {/* 🛡️ Strict full-screen enforcement — rendered INSIDE the exam portal so it sits
              ABOVE the exam (the old Modal was z-50, behind the z-99999 exam, so it was invisible). */}
          {isExamStarted && showFullscreenWarning && (
            <div className="absolute inset-0 z-[100] bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Full Screen Required</h3>
                <p className="text-sm font-semibold text-rose-500">Exit {fullscreenExits} of 3</p>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  This quiz must run in full screen. Leaving full screen or switching tabs 3 times will
                  automatically submit your quiz.
                </p>
                <button
                  type="button"
                  onClick={handleResumeFullscreen}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume in Full Screen</span>
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
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
              <p className="text-xs text-slate-300 font-medium mt-0.5">This quiz is currently locked.</p>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ AUTO-SUBMITTED FEEDBACK MODAL */}
      <Modal open={autoSubmittedScore !== null} onClose={() => setAutoSubmittedScore(null)} size="sm">
        <div className="p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Info className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900">
              Quiz Auto-Submitted
            </h3>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed font-bold">
              Your quiz attempt has been automatically recorded and graded because you exited full screen mode 3 times.
            </p>
            <div className="inline-block px-5 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl mt-2">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Your Score</span>
              <span className="text-2xl font-black text-indigo-600">{autoSubmittedScore}%</span>
            </div>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setAutoSubmittedScore(null)}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* 📊 QUIZ ATTEMPT REVIEW MODAL */}
      <Modal open={reviewQuizAttempt !== null} onClose={() => setReviewQuizAttempt(null)} size="md">
        <div className="p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
              <Award className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
              {reviewQuizAttempt?.quiz?.title}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Attempt Summary
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-sm border-b border-slate-150 pb-3">
              <span className="font-bold text-slate-500">Status</span>
              <Badge variant="success">Completed</Badge>
            </div>
            
            <div className="flex items-center justify-between text-sm border-b border-slate-150 pb-3">
              <span className="font-bold text-slate-500">Attempted Date</span>
              <span className="font-extrabold text-slate-800">
                {reviewQuizAttempt?.attempt?.attempted_at 
                  ? new Date(reviewQuizAttempt.attempt.attempted_at).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-500">Final Grade</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-indigo-600">
                  {reviewQuizAttempt?.attempt?.score}%
                </span>
                <span className="text-xs font-bold text-slate-400">/ 100%</span>
              </div>
            </div>
          </div>

          {/* Detailed answer review stays hidden until the weekly results are officially published. */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-extrabold text-amber-800">Results not published yet</p>
              <p className="text-xs text-amber-700/80 mt-0.5 leading-relaxed">
                Your answers are recorded. The detailed question-by-question review will unlock once the
                official weekly results are published.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setReviewQuizAttempt(null)}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
