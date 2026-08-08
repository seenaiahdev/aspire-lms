import { useState, useEffect } from 'react';
import { Code2, CheckCircle2, Clock, Compass, TrendingUp, Flame, Zap, Filter, ExternalLink, Calendar, FolderOpen, Eye } from 'lucide-react';
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

  const filtered = problems.filter((p) => !p.solved && (difficulty === 'all' ? true : p.difficulty === difficulty));
  const solved = problems.filter((p) => p.solved).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink-900">Practice Lab</h2>
        <p className="text-ink-500 text-sm mt-1">Sharpen your skills with coding problems and challenges</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Solved Problems', value: `${solved} / ${problems.length}`, icon: CheckCircle2 },
          { label: 'Current Streak', value: '7 Days', icon: Flame },
          { label: 'Total Points', value: `${problems.filter(p => p.solved).reduce((s, p) => s + p.points, 0)} XP`, icon: Zap },
          { label: 'Success Rate', value: problems.length > 0 ? `${Math.round((solved / problems.length) * 100)}%` : '0%', icon: TrendingUp },
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
                <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4 border border-purple-100">
                  <CheckCircle2 className="w-8 h-8 text-[#7c3aed]" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1">All Problems Completed!</h3>
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

      {/* ── History Tab ── */}
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
            <Card className="border border-slate-200/90 shadow-sm bg-white rounded-2xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {problems.filter(p => p.solved).map((p) => {
                  let submissionData: any = null;
                  try {
                    const raw = localStorage.getItem(`submission_${p.id}`);
                    if (raw) submissionData = JSON.parse(raw);
                  } catch {}

                  const isProjectUpload = !!submissionData?.storageUrl;
                  const timeDiff = submissionData?.timestamp
                    ? new Date().getTime() - new Date(submissionData.timestamp).getTime()
                    : null;
                  const daysAgo = timeDiff ? Math.floor(timeDiff / (1000 * 60 * 60 * 24)) : null;
                  const hoursAgo = timeDiff ? Math.floor(timeDiff / (1000 * 60 * 60)) : null;
                  const timeAgoText = daysAgo != null
                    ? daysAgo > 0
                      ? `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`
                      : hoursAgo && hoursAgo > 0
                      ? `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`
                      : 'Just now'
                    : null;

                  return (
                    <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-purple-50 text-[#7c3aed] border-purple-100">
                        {isProjectUpload
                          ? <FolderOpen className="w-5 h-5 text-[#7c3aed]" />
                          : <CheckCircle2 className="w-5 h-5 text-[#7c3aed]" />
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm">{p.title}</h3>
                          <DifficultyBadge difficulty={p.difficulty} />
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border bg-purple-50 text-[#7c3aed] border-purple-100">
                            {isProjectUpload ? 'Uploaded' : 'Submitted'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 flex-wrap">
                          <span>{p.category}</span>
                          {isProjectUpload && submissionData?.fileCount && (
                            <span className="flex items-center gap-1">
                              <FolderOpen className="w-3 h-3 text-slate-400" />
                              {submissionData.fileCount} file{submissionData.fileCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          {timeAgoText && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {timeAgoText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button — always navigates to workspace review */}
                      <Button
                        size="sm"
                        className="font-extrabold shrink-0 bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-xs"
                        onClick={() => navigate('workspace', { id: p.id, mode: 'review' })}
                        leftIcon={isProjectUpload ? <Eye className="w-3.5 h-3.5" /> : undefined}
                      >
                        {isProjectUpload ? 'View' : 'Review'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
