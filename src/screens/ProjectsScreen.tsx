import { useState } from 'react';
import {
  FolderGit2, Star, Clock, CheckCircle2, MessageCircle, Download,
  FileText, BookOpen, ArrowRight, Code2,
} from 'lucide-react';
import { projects } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { StatusChip, DifficultyBadge } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';

export function ProjectsScreen() {
  const [tab, setTab] = useState('assigned');

  const filtered = projects.filter((p) => tab === 'assigned' ? p.status === 'assigned' : tab === 'submitted' ? p.status === 'submitted' : tab === 'feedback' ? p.status === 'feedback' : true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink-900">Projects</h2>
        <p className="text-ink-500 text-sm mt-1">Build real-world projects and get mentor feedback</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned', value: projects.filter(p => p.status === 'assigned').length, icon: Clock, color: 'warning' },
          { label: 'Submitted', value: projects.filter(p => p.status === 'submitted').length, icon: CheckCircle2, color: 'accent' },
          { label: 'With Feedback', value: projects.filter(p => p.status === 'feedback').length, icon: MessageCircle, color: 'primary' },
          { label: 'Avg Grade', value: '89%', icon: Star, color: 'success' },
        ].map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900 font-display">{s.value}</p>
              <p className="text-xs text-ink-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs
        variant="pills"
        tabs={[
          { id: 'assigned', label: 'Assigned' },
          { id: 'submitted', label: 'Submitted' },
          { id: 'feedback', label: 'Mentor Feedback' },
          { id: 'templates', label: 'Templates' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab !== 'templates' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((p) => (
            <Card key={p.id} hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center">
                    <FolderGit2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink-900 text-sm">{p.title}</h3>
                    <p className="text-xs text-ink-500">{p.course}</p>
                  </div>
                </div>
                <DifficultyBadge difficulty={p.difficulty} />
              </div>
              <p className="text-sm text-ink-600 mb-3">{p.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {p.skills.map((s: string) => <Badge key={s} variant="default">{s}</Badge>)}
              </div>
              {p.status === 'feedback' && p.mentorFeedback && (
                <div className="p-3 rounded-xl bg-accent-50 border border-accent-100 mb-4">
                  <p className="text-xs font-semibold text-accent-700 mb-1">Mentor Feedback</p>
                  <p className="text-xs text-accent-700">{p.mentorFeedback}</p>
                  {p.grade && (
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={p.grade} color="bg-accent-500" className="flex-1" />
                      <span className="text-xs font-bold text-accent-700">{p.grade}/100</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Due {p.dueDate}</span>
                <Button size="sm" variant={p.status === 'assigned' ? 'primary' : 'secondary'} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  {p.status === 'assigned' ? 'Start' : p.status === 'submitted' ? 'View' : 'Review'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {['React Starter Kit', 'Node.js API Template', 'ML Project Boilerplate', 'Next.js SaaS Template', 'Python Data Pipeline', 'Docker Dev Setup'].map((t, i) => (
            <Card key={i} hover className="p-5">
              <div className="w-11 h-11 rounded-xl bg-ink-100 flex items-center justify-center mb-3">
                <Code2 className="w-5 h-5 text-ink-500" />
              </div>
              <h3 className="font-bold text-ink-900 text-sm mb-1">{t}</h3>
              <p className="text-xs text-ink-500 mb-4">Production-ready template with best practices built in.</p>
              <Button variant="outline" size="sm" fullWidth leftIcon={<Download className="w-3.5 h-3.5" />}>Download</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
