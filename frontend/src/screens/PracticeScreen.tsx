import { useState, useEffect } from 'react';
import { Code2, CheckCircle2, Clock, Compass, TrendingUp, Flame, Zap, Filter, ExternalLink, Calendar, FolderOpen, Eye, Lock } from 'lucide-react';
import { practiceProblems } from '@/data/mock';

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
  const { navigate } = useNav();
  const [tab, setTab] = useState('problems');
  const [difficulty, setDifficulty] = useState('all');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [problems, setProblems] = useState(practiceProblems);
  const [lockedToast, setLockedToast] = useState(false);

  // Load submissions from localStorage
  useEffect(() => {
    const loadedSubmissions: Submission[] = [];
    
    problems.forEach((problem) => {
      const savedSubmission = localStorage.getItem(`submission_${problem.id}`);
      if (savedSubmission) {
        try {
          const data = JSON.parse(savedSubmission);
          loadedSubmissions.push({
            problemId: problem.id,
            problemTitle: problem.title,
            ...data,
          });
        } catch (e) {
          console.error('Failed to parse submission:', e);
        }
      }
    });

    loadedSubmissions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setSubmissions(loadedSubmissions);

    // Update solved status based on localStorage
    const updatedProblems = problems.map(p => {
      const hasSubmission = loadedSubmissions.some(s => s.problemId === p.id);
      return hasSubmission ? { ...p, solved: true } : p;
    });
    setProblems(updatedProblems);
  }, []);

  const filtered = problems.filter(p => difficulty === 'all' || p.difficulty === difficulty);
  const solved = 0;

  return (
    <div className="space-y-6">

      <div id="tour-practice-header">
        <h2 className="font-display font-bold text-2xl text-ink-900">Practice Lab</h2>
        <p className="text-ink-500 text-sm mt-1">Sharpen your skills with coding problems and challenges</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Solved Problems', value: `0`, icon: CheckCircle2 },
          { label: 'Current Streak', value: '0 Days', icon: Flame },
          { label: 'Total Points', value: `0 XP`, icon: Zap },
          { label: 'Success Rate', value: '0%', icon: TrendingUp },
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

          {filtered.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1">No Problems Found</h3>
                <p className="text-xs font-medium text-slate-500 mb-2">Try changing your difficulty filter.</p>
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
        <div className="space-y-4">
          <Card>
            <CardBody className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <CheckCircle2 className="w-8 h-8 text-[#7c3aed]" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">No Completed Problems Yet</h3>
              <p className="text-xs font-medium text-slate-500 mb-2">Start solving coding problems to see your submitted solutions here.</p>
            </CardBody>
          </Card>
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
