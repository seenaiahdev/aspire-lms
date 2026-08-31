import { useState, useEffect, useCallback } from 'react';
import { Code2, CheckCircle2, Clock, Compass, TrendingUp, Flame, Zap, Filter, ExternalLink, Calendar, FolderOpen, Eye, Lock, Loader2 } from 'lucide-react';
import { fetchPracticeProblems, fetchUserSubmissions } from '@/lib/api';
import { useUser } from '@/lib/UserContext';
import { useUnlockResolver } from '@/lib/lessonLinkResolver';

import { practiceSteps } from '@/lib/tourSteps';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { DifficultyBadge } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { cn } from '@/lib/utils';
import { useNav } from '@/lib/nav';
import { supabase } from '@/lib/supabase';

interface Submission {
  problemId: string;
  problemTitle: string;
  language: string;
  code?: string;
  sandboxUrl?: string;
  storageUrl?: string;
  projectName?: string;
  fileCount?: number;
  timestamp: string;
  projectUrl?: string;
}

export function PracticeScreen() {
  const { user } = useUser();
  const { isUnlocked } = useUnlockResolver();
  const { navigate, params } = useNav();
  const [tab, setTab] = useState(() => params.tab || 'problems');

  useEffect(() => {
    if (params.tab) {
      setTab(params.tab);
    }
  }, [params.tab]);
  const [difficulty, setDifficulty] = useState('all');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockedToast, setLockedToast] = useState(false);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const courseId = user?.enrolledCourses?.[0];
      
      let submissionsError: any = null;
      const [dbProblems, submissionsResult] = await Promise.all([
        fetchPracticeProblems(courseId),
        user?.id 
          ? fetchUserSubmissions(user.id).catch(err => {
              submissionsError = err;
              return null;
            })
          : Promise.resolve(null)
      ]);
      
      let dbSubmissions: Submission[] = [];
      let fetchedFromDb = false;
      
      if (user?.id) {
        if (submissionsError) {
          console.warn('Failed to fetch submissions from Supabase, relying on localStorage:', submissionsError);
        } else {
          dbSubmissions = (submissionsResult || []).map((s: any) => ({
            problemId: s.problem_id,
            problemTitle: (dbProblems || []).find((p: any) => p.id === s.problem_id)?.title || s.project_name || 'Practice Solution',
            language: s.language,
            code: s.code,
            sandboxUrl: s.sandbox_url,
            storageUrl: s.storage_url,
            projectName: s.project_name,
            fileCount: s.file_count,
            timestamp: s.submitted_at || s.created_at || new Date().toISOString()
          }));
          fetchedFromDb = true;
        }
      }

      // Merge with local storage fallback only if database fetch failed
      const mergedSubmissions = [...dbSubmissions];
      if (!fetchedFromDb) {
        (dbProblems || []).forEach((problem: any) => {
          const savedSubmission = localStorage.getItem(`submission_${problem.id}`);
          if (savedSubmission) {
            try {
              const data = JSON.parse(savedSubmission);
              const exists = mergedSubmissions.some(s => s.problemId === problem.id);
              if (!exists) {
                mergedSubmissions.push({
                  problemId: problem.id,
                  problemTitle: problem.title,
                  ...data,
                });
              }
            } catch (e) {
              console.error('Failed to parse submission:', e);
            }
          }
        });
      }

      mergedSubmissions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setSubmissions(mergedSubmissions);

      const updatedProblems = (dbProblems || []).map((p: any) => {
        const hasSubmission = mergedSubmissions.some(s => s.problemId === p.id);
        return hasSubmission ? { ...p, solved: true } : p;
      });

      setProblems(updatedProblems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.enrolledCourses?.[0]]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('practice_screen_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practice_submissions',
          filter: `student_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time database submission update received:', payload);
          loadData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadData]);

  const filtered = problems.filter(p => {
    const matchesDifficulty = difficulty === 'all' || p.difficulty === difficulty;
    return matchesDifficulty && isUnlocked(p.inner_topic_id) && !p.solved;
  });
  const solved = problems.filter(p => p.solved).length;

  return (
    <div className="space-y-6">

      <div id="tour-practice-header">
        <h2 className="font-display font-bold text-2xl text-ink-900">Practice Lab</h2>
        <p className="text-ink-500 text-sm mt-1">Sharpen your skills with coding problems and challenges</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Solved Problems', value: `${solved}`, icon: CheckCircle2 },
          { label: 'Current Streak', value: `${user?.streak || 0} Days`, icon: Flame },
          { label: 'Total Points', value: `${user?.xp || 0} XP`, icon: Zap },
        ].map((s, i) => (
          <Card key={i} className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
              <s.icon className="w-5.5 h-5.5 text-[#7c3aed]" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{s.value}</p>
              <p className="text-xs font-extrabold text-[#7c3aed]">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div id="tour-practice-tabs">
        <Tabs
          variant="pills"
          tabs={[
            { id: 'problems', label: 'Coding Problems' },
            { id: 'history', label: 'Completed & Submitted' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* ── Problems Tab ── */}
      {tab === 'problems' && (
        <div className="space-y-4">
          <div id="tour-practice-difficulty" className="flex gap-2">
            {['all', 'Easy', 'Medium', 'Hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer',
                  difficulty === d
                    ? 'bg-[#7c3aed] text-white border-transparent shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-purple-200 hover:text-[#7c3aed]'
                )}
              >
                {d === 'all' ? 'All Levels' : d}
              </button>
            ))}
          </div>

          {loading ? (
            <Card>
              <CardBody className="text-center py-12">
                <Loader2 className="w-10 h-10 text-[#7c3aed] animate-spin mx-auto mb-4" />
                <h3 className="font-extrabold text-slate-900 text-base mb-1">Loading Problems...</h3>
              </CardBody>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1">No Practice problems available yet</h3>
                <p className="text-xs font-medium text-slate-500 mb-2">Try changing your difficulty filter or check back later.</p>
              </CardBody>
            </Card>
          ) : (
            <Card className="border border-slate-200/90 shadow-sm overflow-hidden bg-white rounded-2xl">
              <div className="divide-y divide-slate-100">
                {filtered.map((p, index) => {
                  const isLocked = false; // All unlocked
                  return (
                  <div 
                    key={p.id} 
                    id={index === 0 ? 'tour-practice-card-0' : undefined} 
                    onClick={() => {
                      if (isLocked) {
                        setLockedToast(true);
                        setTimeout(() => setLockedToast(false), 3000);
                        return;
                      }
                      navigate('workspace', { id: p.id });
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 transition-colors group",
                      isLocked ? "cursor-not-allowed opacity-90 grayscale-[15%] bg-slate-50" : "cursor-pointer bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", isLocked ? "bg-slate-200 text-slate-400 border-slate-300" : "bg-purple-50 text-[#7c3aed] border-purple-100")}>
                      <Code2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn("font-bold text-sm", isLocked ? "text-slate-500" : "text-slate-900 group-hover:text-[#7c3aed]")}>{p.title}</h3>
                        <DifficultyBadge difficulty={p.difficulty} />
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                        <span>{p.category}</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-slate-400" />{p.successRate}% success</span>
                        <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" />{p.points} XP</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        if (isLocked) { e.stopPropagation(); setLockedToast(true); setTimeout(() => setLockedToast(false), 3000); }
                      }}
                      className={cn("font-extrabold transition-all shadow-xs", isLocked ? "bg-slate-200 text-slate-500 hover:bg-slate-200 cursor-not-allowed" : "")}
                    >
                      {isLocked ? <><Lock className="w-3.5 h-3.5 mr-1 mb-0.5" /> Coming Soon</> : "Solve"}
                    </Button>
                  </div>
                )})}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── History Tab ── */}
      {tab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          {submissions.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4 border border-purple-100">
                  <CheckCircle2 className="w-8 h-8 text-[#7c3aed]" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1">No Completed Problems Yet</h3>
                <p className="text-xs font-medium text-slate-500 mb-2">Start solving coding problems to see your submitted solutions here.</p>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.map((sub) => (
                <Card
                  key={sub.problemId}
                  onClick={() => navigate('workspace', { id: sub.problemId, mode: 'review' })}
                  className="p-5 border border-slate-200/90 bg-white hover:border-slate-300 transition-all rounded-[2rem] cursor-pointer group shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                      <Code2 className="w-6 h-6 text-[#7c3aed]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate leading-snug group-hover:text-[#7c3aed] transition-colors">
                          {sub.problemTitle}
                        </h4>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold">
                          Solved
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 mt-1">
                        Project Name: {sub.projectName || 'Practice Solution'}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                          {sub.fileCount ?? 1} file{sub.fileCount !== 1 ? 's' : ''}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(sub.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono truncate max-w-[150px] sm:max-w-xs">
                      {sub.storageUrl?.split('/').pop() || 'local'}
                    </span>
                    <Button
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('workspace', { id: sub.problemId, mode: 'review' });
                      }}
                      className="bg-purple-50 text-[#7c3aed] hover:bg-purple-100 border border-purple-100 text-[10px] font-bold px-3 py-1"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Solution
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
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
              <p className="text-xs text-slate-300 font-medium mt-0.5">This problem is currently locked.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
