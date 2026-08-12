import { useState, useEffect } from 'react';
import { Code2, CheckCircle2, Clock, Compass, TrendingUp, Flame, Zap, Filter, ExternalLink, Calendar, FolderOpen, Eye, Lock } from 'lucide-react';
import { practiceProblems } from '@/data/mock';
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

  const filtered: typeof problems = []; // Force empty state for new user
  const solved = 0;

  return (
    <div className="space-y-6">
      <div>
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

      <Tabs
        variant="pills"
        tabs={[
          { id: 'problems', label: 'Coding Problems' },
          { id: 'history', label: 'Completed & Submitted' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── Problems Tab ── */}
      {tab === 'problems' && (
        <div className="space-y-4">
          <div className="flex gap-2">
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
                <h3 className="font-extrabold text-slate-900 text-base mb-1">Coding Problems Locked</h3>
                <p className="text-xs font-medium text-slate-500 mb-2">Complete course modules to unlock coding challenges.</p>
              </CardBody>
            </Card>
          ) : (
            <Card className="border border-slate-200/90 shadow-sm overflow-hidden bg-white rounded-2xl">
              <div className="divide-y divide-slate-100">
                {filtered.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 transition-colors group cursor-not-allowed grayscale-[0.2] opacity-60 bg-slate-50">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-slate-100 text-slate-400 border-slate-200">
                      <Code2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-600 text-sm">{p.title}</h3>
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
                      disabled
                      className="font-extrabold transition-all shadow-xs bg-slate-200 text-slate-500 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1" />
                      Locked
                    </Button>
                  </div>
                ))}
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
    </div>
  );
}
