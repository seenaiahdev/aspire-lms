import { useState, useEffect } from 'react';
import { Code2, CheckCircle2, Clock, Compass, TrendingUp, Flame, Zap, Filter, ExternalLink, Calendar } from 'lucide-react';
import { practiceProblems } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { DifficultyBadge } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import { useNav } from '@/lib/nav';

interface Submission {
  problemId: string;
  problemTitle: string;
  language: string;
  code?: string;
  sandboxUrl?: string;
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

  const filtered = problems.filter((p) => !p.solved && (difficulty === 'all' ? true : p.difficulty === difficulty));
  const solved = problems.filter((p) => p.solved).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink-900">Practice Lab</h2>
        <p className="text-ink-500 text-sm mt-1">Sharpen your skills with coding problems and challenges</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Solved', value: solved, total: problems.length, icon: CheckCircle2, color: 'success' },
          { label: 'Current Streak', value: '7 days', icon: Flame, color: 'error' },
          { label: 'Total Points', value: problems.filter(p => p.solved).reduce((s, p) => s + p.points, 0), icon: Zap, color: 'warning' },
          { label: 'Success Rate', value: problems.length > 0 ? `${Math.round((solved / problems.length) * 100)}%` : '0%', icon: TrendingUp, color: 'accent' },
        ].map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900 font-display">{s.value}{s.total ? `/${s.total}` : ''}</p>
              <p className="text-xs text-ink-500">{s.label}</p>
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
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4 border border-purple-100">
                  <CheckCircle2 className="w-8 h-8 text-[#7c3aed]" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1">All Problems Completed! 🎉</h3>
                <p className="text-xs font-medium text-slate-500 mb-4">You have solved all available coding problems in this section.</p>
                <Button className="bg-[#7c3aed] text-white" onClick={() => setTab('history')}>View Submitted Problems</Button>
              </CardBody>
            </Card>
          ) : (
            <Card className="border border-slate-200/90 shadow-sm overflow-hidden bg-white rounded-2xl">
              <div className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-slate-100 text-slate-400 border-slate-200">
                      <Code2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#7c3aed] transition-colors">{p.title}</h3>
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
                      className="font-extrabold transition-all shadow-xs bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white hover:brightness-110"
                      onClick={() => navigate('workspace', { id: p.id, mode: 'solve' })}
                    >
                      Solve
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {problems.filter(p => p.solved).length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4 border border-purple-100">
                  <CheckCircle2 className="w-8 h-8 text-[#7c3aed]" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1">No Completed Problems Yet</h3>
                <p className="text-xs font-medium text-slate-500 mb-4">Start solving coding problems to see your submitted solutions here.</p>
                <Button className="bg-[#7c3aed] text-white font-extrabold" onClick={() => setTab('problems')}>Solve Problems</Button>
              </CardBody>
            </Card>
          ) : (
            <Card className="border border-slate-200/90 shadow-sm overflow-hidden bg-white rounded-2xl">
              <div className="divide-y divide-slate-100">
                {problems.filter(p => p.solved).map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-purple-50 text-[#7c3aed] border-purple-100">
                      <CheckCircle2 className="w-5 h-5 text-[#7c3aed]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#7c3aed] transition-colors">{p.title}</h3>
                        <DifficultyBadge difficulty={p.difficulty} />
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                          Submitted
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                        <span>{p.category}</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-slate-400" />{p.successRate}% success</span>
                        <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" />{p.points} XP</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="font-extrabold transition-all shadow-xs bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-200"
                      onClick={() => navigate('workspace', { id: p.id, mode: 'review' })}
                    >
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
