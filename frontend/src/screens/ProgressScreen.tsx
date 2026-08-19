import { TrendingUp, Clock, BookOpen, Award, Flame, BarChart3, Calendar, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/lib/UserContext';
import { fetchCoursesByIds, fetchStudentProfile } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { LineChart, DonutChart, BarChart } from '@/components/ui/Charts';

export function ProgressScreen() {
  const { user: currentUser } = useUser();
  const [enrolled, setEnrolled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (currentUser?.enrolled_courses?.length > 0) {
          const coursesData = await fetchCoursesByIds(currentUser.enrolled_courses);
          // Mock progress for now if not available in DB
          setEnrolled(coursesData.map(c => ({ ...c, progress: Math.floor(Math.random() * 60) + 40 })));
        } else {
          setEnrolled([]);
        }

        if (currentUser?.id) {
          const profileData = await fetchStudentProfile(currentUser.id);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading progress data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink-900">Progress</h2>
        <p className="text-ink-500 text-sm mt-1">Track your learning journey and growth</p>
      </div>

      {/* Overall Progress Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-accent-700 p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white/70 text-sm mb-1">Overall Progress</p>
            <p className="text-4xl font-bold font-display mb-2">Level {currentUser.level}</p>
            <p className="text-white/80 text-sm mb-4">{currentUser.xp.toLocaleString()} XP · {currentUser.xp % 500}/500 to next level</p>
            <div className="w-full max-w-xs">
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-white" style={{ width: `${(currentUser.xp % 500) / 500 * 100}%` }} />
              </div>
            </div>
          </div>
          <ProgressRing value={68} size={120} strokeWidth={10} color="stroke-white" trackColor="stroke-white/20" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Learning Hours', value: '142h', sub: 'this semester', icon: Clock, color: 'primary' },
          { label: 'Lessons Completed', value: '248', sub: 'across all courses', icon: BookOpen, color: 'accent' },
          { label: 'Day Streak', value: currentUser.streak, sub: 'personal best: 52', icon: Flame, color: 'error' },
          { label: 'Avg Quiz Score', value: '91%', sub: '+8% vs last month', icon: Award, color: 'success' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Growth */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-ink-900">Weekly Growth</h3>
              <Badge variant="success">+18%</Badge>
            </div>
            <p className="text-xs text-ink-500 mb-6">Learning hours over the past 7 days</p>
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-100 text-sm">Weekly data not available yet</div>
          </CardBody>
        </Card>

        {/* Monthly Attendance */}
        <Card>
          <CardBody>
            <h3 className="font-bold text-ink-900 mb-1">Attendance Trend</h3>
            <p className="text-xs text-ink-500 mb-6">Monthly attendance rate</p>
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-100 text-sm">Attendance data not available yet</div>
          </CardBody>
        </Card>

        {/* Skills */}
        <Card>
          <CardBody>
            <h3 className="font-bold text-ink-900 mb-1">Skill Levels</h3>
            <p className="text-xs text-ink-500 mb-6">Your proficiency across key skills</p>
            <div className="space-y-4">
              {currentUser.skills && currentUser.skills.length > 0 ? currentUser.skills.map((skill: { name: string; level: number }) => (
                <div key={skill.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-ink-700">{skill.name}</span>
                    <span className="text-xs font-bold text-ink-500">{skill.level}%</span>
                  </div>
                  <ProgressBar value={skill.level} color={skill.level >= 80 ? 'bg-success-500' : skill.level >= 60 ? 'bg-primary-500' : 'bg-warning-500'} />
                </div>
              )) : (
                <div className="text-center py-6 text-slate-500 text-sm">No skills added yet</div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Course Completion */}
        <Card>
          <CardBody>
            <h3 className="font-bold text-ink-900 mb-1">Course Completion</h3>
            <p className="text-xs text-ink-500 mb-6">Progress across enrolled courses</p>
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
              ) : enrolled.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-100">No courses enrolled</div>
              ) : enrolled.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-ink-700 truncate">{c.title}</span>
                    <span className="text-xs font-bold text-ink-500 shrink-0 ml-2">{c.progress}%</span>
                  </div>
                  <ProgressBar value={c.progress} color={c.progress >= 80 ? 'bg-success-500' : c.progress >= 40 ? 'bg-primary-500' : 'bg-warning-500'} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
