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

  const filtered = problems.filter((p) => difficulty === 'all' ? true : p.difficulty === difficulty);
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

      {/* Daily Challenge Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-600 to-primary-700 p-5 text-white">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-4 h-4 text-secondary-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Daily Challenge</span>
            </div>
            <h3 className="font-bold text-lg mb-1">Binary Tree Maximum Path Sum</h3>
            <p className="text-white/80 text-sm">Solve today's challenge for 50 bonus XP!</p>
          </div>
          <Button 
            className="bg-white text-primary-700 hover:bg-white/90" 
            leftIcon={<Code2 className="w-4 h-4" />}
            onClick={() => navigate('workspace', { id: 'pp1' })}
          >
            Solve Now
          </Button>
        </div>
      </div>

      <Tabs
        variant="pills"
        tabs={[
          { id: 'problems', label: 'Coding Problems' },
          { id: 'mcqs', label: 'MCQs' },
          { id: 'history', label: 'Practice History' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'problems' && (
        <>
          <div className="flex gap-2">
            {['all', 'Easy', 'Medium', 'Hard'].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  'chip transition-colors',
                  difficulty === d ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
                )}
              >
                {d === 'all' ? 'All Levels' : d}
              </button>
            ))}
          </div>

          <Card>
            <div className="divide-y divide-ink-100">
              {filtered.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-ink-50 transition-colors group cursor-pointer">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    p.solved ? 'bg-success-100' : 'bg-ink-100',
                  )}>
                    {p.solved ? <CheckCircle2 className="w-5 h-5 text-success-600" /> : <Code2 className="w-5 h-5 text-ink-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-ink-800 text-sm">{p.title}</h3>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-ink-500">
                      <span>{p.category}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{p.successRate}% success</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{p.points} XP</span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant={p.solved ? 'secondary' : 'primary'} 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => navigate('workspace', { id: p.id, mode: p.solved ? 'review' : 'solve' })}
                  >
                    {p.solved ? 'Review' : 'Solve'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {tab === 'mcqs' && (
        <Card>
          <CardBody className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-ink-400" />
            </div>
            <h3 className="font-bold text-ink-800 mb-1">MCQ Practice</h3>
            <p className="text-sm text-ink-500 mb-4">Test your knowledge with topic-wise MCQs</p>
            <Button>Start MCQ Session</Button>
          </CardBody>
        </Card>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-ink-400" />
                </div>
                <h3 className="font-bold text-ink-800 mb-1">No Submissions Yet</h3>
                <p className="text-sm text-ink-500 mb-4">Start solving problems to see your history here</p>
                <Button onClick={() => setTab('problems')}>Browse Problems</Button>
              </CardBody>
            </Card>
          ) : (
            <>
              {submissions.map((submission, i) => {
                const timeDiff = new Date().getTime() - new Date(submission.timestamp).getTime();
                const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
                const timeAgoText = daysAgo > 0 
                  ? `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago` 
                  : hoursAgo > 0 
                  ? `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`
                  : 'Just now';

                return (
                  <Card key={i}>
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-success-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-ink-800 mb-1">{submission.problemTitle}</h3>
                            <div className="flex items-center gap-3 text-xs text-ink-500">
                              <span className="flex items-center gap-1">
                                <Code2 className="w-3 h-3" />
                                {submission.language.charAt(0).toUpperCase() + submission.language.slice(1)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {timeAgoText}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => navigate('workspace', { id: submission.problemId, mode: 'review' })}
                          >
                            Review in LMS
                          </Button>
                          {submission.sandboxUrl && (
                            <Button 
                              size="sm" 
                              variant="primary"
                              onClick={() => window.open(submission.sandboxUrl, '_blank')}
                              leftIcon={<ExternalLink className="w-3 h-3" />}
                            >
                              Open in VS Code
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Code Preview */}
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-slate-400">solution.{submission.language === 'javascript' ? 'js' : submission.language === 'python' ? 'py' : submission.language === 'java' ? 'java' : 'cpp'}</span>
                          <Badge variant="success" size="sm">Submitted</Badge>
                        </div>
                        <pre className="text-xs text-slate-300 font-mono overflow-x-auto custom-scrollbar max-h-32 overflow-y-auto">
                          {submission.code.split('\n').slice(0, 10).join('\n')}
                          {submission.code.split('\n').length > 10 && '\n...'}
                        </pre>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
