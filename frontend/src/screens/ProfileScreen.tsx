import { useState, useEffect } from 'react';
import { GraduationCap, Mail, MapPin, Calendar, Star, Award, Zap, Flame, TrendingUp, Github, Linkedin, Globe, Edit, ChevronRight } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { fetchBadges, fetchUserSubmissions, fetchAssignmentAttempts } from '@/lib/api';
import { useNav } from '@/lib/nav';
import { Card, CardBody } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import * as Icons from 'lucide-react';
import { cn, formatBatchDisplay } from '@/lib/utils';

const badgeMedalStyles: Record<string, { bg: string; border: string; glow: string; icon: string }> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 via-indigo-600 to-indigo-800',
    border: 'border-2 border-white ring-1 ring-indigo-400',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.4)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-600',
    border: 'border-2 border-white ring-1 ring-orange-400',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.5)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)] animate-pulse'
  },
  rose: {
    bg: 'bg-gradient-to-br from-red-500 via-rose-600 to-rose-800',
    border: 'border-2 border-white ring-1 ring-rose-400',
    glow: 'shadow-[0_0_10px_rgba(244,63,94,0.45)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  emerald: {
    bg: 'bg-gradient-to-br from-teal-400 via-emerald-500 to-emerald-700',
    border: 'border-2 border-white ring-1 ring-emerald-400',
    glow: 'shadow-[0_0_10px_rgba(16,185,129,0.45)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  purple: {
    bg: 'bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-800',
    border: 'border-2 border-white ring-1 ring-purple-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.55)]',
    icon: 'text-yellow-300 drop-shadow-[0_1px_4px_rgba(253,224,71,0.5)]'
  },
  sky: {
    bg: 'bg-gradient-to-br from-sky-400 via-blue-500 to-blue-700',
    border: 'border-2 border-white ring-1 ring-sky-300',
    glow: 'shadow-[0_0_8px_rgba(56,189,248,0.4)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600',
    border: 'border-2 border-white ring-1 ring-blue-300',
    glow: 'shadow-[0_0_8px_rgba(6,182,212,0.4)]',
    icon: 'text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.4)]'
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900',
    border: 'border-2 border-white ring-1 ring-amber-300',
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.5)]',
    icon: 'text-amber-400 drop-shadow-[0_1px_4px_rgba(251,191,36,0.5)]'
  }
};

function evaluateBadgeCriteria(
  badge: any,
  user: any,
  submissions: any[],
  assignmentSubmissions: any[]
): boolean {
  if (!badge.criteria) return false;
  const criteria = badge.criteria.toLowerCase();

  // 1. Streak-based criteria
  if (criteria.includes('streak')) {
    const match = criteria.match(/\d+/);
    const requiredStreak = match ? parseInt(match[0], 10) : 10;
    return (user.streak || 0) >= requiredStreak;
  }

  // 2. Score/Assessment-based criteria
  if (criteria.includes('score') || criteria.includes('assessment') || criteria.includes('quiz') || criteria.includes('test')) {
    const scoreMatch = criteria.match(/(\d+)%/);
    const requiredScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 70;
    
    const hasMatchingAttempt = (assignmentSubmissions || []).some(
      (a) => (a.grade || 0) >= requiredScore
    );
    return hasMatchingAttempt;
  }

  // 3. Coding/Practice Problem-based criteria
  if (criteria.includes('problem') || criteria.includes('coding') || criteria.includes('solve') || criteria.includes('project')) {
    const match = criteria.match(/\d+/);
    const requiredCount = match ? parseInt(match[0], 10) : 5;
    const uniqueSolved = new Set((submissions || []).filter(s => s.status === 'solved' || s.language === 'project').map(s => s.problem_id)).size;
    return uniqueSolved >= requiredCount;
  }

  // 4. Course Completion / Progress criteria
  if (criteria.includes('completion') || criteria.includes('progress') || criteria.includes('complete')) {
    const match = criteria.match(/\d+/);
    const requiredProgress = match ? parseInt(match[0], 10) : 100;
    return (user.progress || 0) >= requiredProgress;
  }

  // 5. Daily Attendance criteria
  if (criteria.includes('attendance') || criteria.includes('attend')) {
    const match = criteria.match(/\d+/);
    const requiredAttendance = match ? parseInt(match[0], 10) : 75;
    return (user.attendance || 0) >= requiredAttendance;
  }

  // 6. XP/Points criteria
  if (criteria.includes('xp') || criteria.includes('points')) {
    const match = criteria.match(/\d+/);
    const requiredXP = match ? parseInt(match[0], 10) : 100;
    const totalXP = user.xp || 0;
    return totalXP >= requiredXP;
  }

  // Fallback: if criteria doesn't match any keywords, check if the student has any activity (XP > 0)
  return (user.xp || 0) > 0;
}

export function ProfileScreen() {
  const { user } = useUser();
  const { navigate } = useNav();
  const [badges, setBadges] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const activeActivity: any[] = [];

  useEffect(() => {
    const loadData = async () => {
      try {
        const [badgesData, subsData, attemptsData] = await Promise.all([
          fetchBadges(),
          user?.id ? fetchUserSubmissions(user.id) : Promise.resolve([]),
          user?.id ? fetchAssignmentAttempts(user.id) : Promise.resolve([])
        ]);
        setBadges(badgesData || []);
        setSubmissions(subsData || []);
        setAttempts(attemptsData || []);
      } catch (err) {
        console.error('Failed to fetch badges data:', err);
      }
    };
    loadData();
  }, [user?.id]);

  const totalXP = user.xp || 0;
  const displayBatch = formatBatchDisplay(user.batchCode, user.registrationId);
  const displayRegNo = user.registrationId || 'A26S0002';

  const earnedBadges = badges.map((badge) => {
    const earned = evaluateBadgeCriteria(badge, user, submissions, attempts);
    return {
      ...badge,
      earned,
    };
  }).filter(b => b.earned);

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">

      {/* Profile Header Block */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white shadow-xl border border-purple-400/30">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 blur-3xl translate-x-1/3 -translate-y-1/3" />
        
        <div className="relative z-10 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 text-center sm:text-left">
            <div className="relative shrink-0">
              <div className="p-1.5 bg-white/20 rounded-full backdrop-blur-md shadow-2xl">
                <Avatar src={user.avatar} name={user.name} size="xl" className="w-28 h-28 sm:w-32 sm:h-32 shadow-inner border-4 border-white" />
              </div>
              <div className="absolute -bottom-2 right-2 px-3 py-1 rounded-full bg-amber-400 border-4 border-white shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform cursor-default">
                <span className="text-[11px] font-black text-amber-950 tracking-wider">LVL {user.level}</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="font-extrabold text-3xl sm:text-4xl tracking-tight mb-1">{user.name}</h1>
                <p className="text-purple-100 font-semibold text-sm">
                  {user.program}
                  {user.college && ` • ${user.college}`}
                  {user.startYear && user.endYear && ` (${user.startYear} - ${user.endYear})`}
                </p>
              </div>
              <p className="text-white/80 text-sm max-w-lg leading-relaxed font-medium mx-auto sm:mx-0">
                {user.bio}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs font-semibold text-purple-100 pt-2">
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm"><Mail className="w-3.5 h-3.5" />{user.email}</span>
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm"><Calendar className="w-3.5 h-3.5" />Joined {user.joinedDate}</span>
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm"><MapPin className="w-3.5 h-3.5" />Hyderabad, India</span>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('settings')}
              className="bg-white text-[#7c3aed] hover:bg-purple-50 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2 shrink-0 border border-white/50 cursor-pointer"
            >
              <Edit className="w-4 h-4" /> Edit Profile
            </button>
          </div>
 
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/20">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center hover:bg-white/20 transition-colors cursor-default">
              <p className="text-3xl font-black tracking-tight">{displayBatch}</p>
              <p className="text-[11px] font-bold text-purple-200 uppercase tracking-widest mt-1">Batch</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center hover:bg-white/20 transition-colors cursor-default">
              <p className="text-2xl sm:text-3xl font-black tracking-tight truncate px-1">
                {displayRegNo}
              </p>
              <p className="text-[11px] font-bold text-purple-200 uppercase tracking-widest mt-1">Reg No</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center hover:bg-white/20 transition-colors cursor-default">
              <p className="text-3xl font-black tracking-tight">{(user.gpa ?? user.rank ?? 0).toFixed(2)}</p>
              <p className="text-[11px] font-bold text-purple-200 uppercase tracking-widest mt-1">GPA</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center hover:bg-white/20 transition-colors cursor-default">
              <p className="text-3xl font-black tracking-tight">{user.status || 'Active'}</p>
              <p className="text-[11px] font-bold text-purple-200 uppercase tracking-widest mt-1">Status</p>
            </div>
          </div>
        </div>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Skills Arsenal */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardBody className="p-6">
              <h3 className="font-extrabold text-lg text-slate-900 mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Technical Arsenal
              </h3>
              
              {user.skills.length === 0 ? (
                <div className="text-center py-10 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Zap className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-650">No skills added yet</p>
                  <p className="text-xs text-slate-450 max-w-xs mx-auto">Go to settings to add technical skills and showcase your competency levels.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {user.skills.map((skill: { name: string; level: number }) => (
                    <div key={skill.name} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-slate-700 group-hover:text-[#7c3aed] transition-colors">{skill.name}</span>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{skill.level}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", skill.level >= 80 ? 'bg-emerald-500' : skill.level >= 60 ? 'bg-[#7c3aed]' : 'bg-amber-500')} 
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
 
          {/* Activity Timeline */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardBody className="p-6">
              <h3 className="font-extrabold text-lg text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Recent Activity
              </h3>
              
              {activeActivity.length === 0 ? (
                <div className="text-center py-10 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <TrendingUp className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-650">No recent activities</p>
                  <p className="text-xs text-slate-450 max-w-xs mx-auto">Your practice submissions, assignments, and class attendance milestones will build up here.</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {activeActivity.map((act, i) => {
                    const Icon = (Icons as any)[act.icon] as Icons.LucideIcon;
                    return (
                      <div key={act.id} className="flex gap-4 relative pb-6 group cursor-default">
                        {i < activeActivity.length - 1 && <div className="absolute top-10 bottom-0 left-6 w-0.5 bg-slate-100 group-hover:bg-purple-100 transition-colors" />}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-purple-50 border border-slate-200 group-hover:border-purple-200 flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                            <Icon className="w-5 h-5 text-slate-400 group-hover:text-[#7c3aed] transition-colors" />
                          </div>
                        </div>
                        <div className="flex-1 pt-1.5">
                          <p className="text-sm font-semibold text-slate-600 leading-snug">
                            <span className="font-extrabold text-slate-900">{act.action}</span>{' '}
                            <span className="text-[#7c3aed] font-bold">{act.target}</span>
                          </p>
                          {act.course && <p className="text-xs font-semibold text-slate-400 mt-0.5">{act.course}</p>}
                          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                            {act.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
 
        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          
          {/* Level Progress Widget */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white p-6 text-center">
            <div className="relative inline-block mb-4">
              <ProgressRing value={user.progress} size={120} strokeWidth={10} showLabel={false} color="stroke-[#7c3aed]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                <span className="text-3xl font-black text-slate-900 -mt-1">{user.progress}%</span>
              </div>
            </div>
            
            <p className="text-xs font-bold text-slate-500 mb-6 bg-slate-50 py-2 rounded-xl border border-slate-100">
              You have completed <span className="text-[#7c3aed] font-black">{user.progress}%</span> of your course modules.
            </p>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-rose-50 border border-rose-100">
                <Flame className="w-5 h-5 text-rose-500" />
                <span className="text-xs font-black text-rose-700">Active</span>
              </div>
              <div className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-amber-50 border border-amber-100">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-black text-amber-700">{user.streak}%</span>
              </div>
              <div className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-black text-emerald-700">{user.rank.toFixed(2)}</span>
              </div>
            </div>
          </Card>
 
          {/* Badges Collection */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white">
            <CardBody className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Badges
                </h3>
                <button onClick={() => navigate('achievements')} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              
              {earnedBadges.length === 0 ? (
                <div className="text-center py-6 space-y-2 border border-dashed border-slate-250 rounded-2xl bg-slate-50/50">
                  <Award className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wide">No badges unlocked yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {earnedBadges.slice(0, 4).map((badge) => {
                    const Icon = ((Icons as any)[badge.icon] || (Icons as any)[badge.icon?.charAt(0).toUpperCase() + badge.icon?.slice(1)] || Icons.Award) as Icons.LucideIcon;
                    const styleKey = badge.color || 'blue';
                    const medalStyle = badgeMedalStyles[styleKey] || badgeMedalStyles.blue;

                    return (
                      <div key={badge.id} className="flex flex-col items-center text-center group cursor-default">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-transform relative shrink-0",
                          medalStyle.bg,
                          medalStyle.border,
                          medalStyle.glow,
                          "group-hover:scale-110"
                        )}>
                          {/* Reflective shine */}
                          <div className="absolute top-0.5 left-1.5 w-3.5 h-1.5 bg-white/20 rounded-full blur-[0.5px] rotate-[-15deg] pointer-events-none" />
                          <Icon className={cn("w-6 h-6", medalStyle.icon)} />
                        </div>
                        <span className="text-[9px] font-black text-slate-650 uppercase tracking-wider leading-tight px-1 line-clamp-1">{badge.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
 
          {/* Connected Socials */}
          <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white">
            <CardBody className="p-6">
              <h3 className="font-extrabold text-slate-900 mb-5 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#7c3aed]" /> Social Links
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Github, label: 'GitHub', value: user.socials?.find(s => s.label === 'GitHub')?.value || 'Not connected', color: 'text-slate-800' },
                  { icon: Linkedin, label: 'LinkedIn', value: user.socials?.find(s => s.label === 'LinkedIn')?.value || 'Not connected', color: 'text-blue-600' },
                  { icon: Globe, label: 'Portfolio', value: user.socials?.find(s => s.label === 'Portfolio')?.value || 'Not connected', color: 'text-emerald-600' },
                ].map((s, i) => {
                  const isConnected = s.value && s.value !== 'Not connected';
                  return (
                    <div 
                      key={i} 
                      onClick={() => isConnected && window.open(s.value, '_blank')}
                      className={cn(
                        "flex items-center gap-4 p-3.5 rounded-2xl border transition-all",
                        isConnected 
                          ? "border-slate-100 hover:border-purple-200 hover:bg-purple-50/50 cursor-pointer group" 
                          : "border-slate-100 bg-slate-50/50 cursor-default"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/60 shadow-2xs",
                        isConnected ? "bg-slate-50 group-hover:bg-white" : "bg-slate-100"
                      )}>
                        <s.icon className={cn("w-5 h-5", isConnected ? s.color : "text-slate-400")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-bold text-slate-900 transition-colors", isConnected && "group-hover:text-[#7c3aed]")}>{s.label}</p>
                        <p className={cn("text-xs font-semibold mt-0.5", isConnected ? "text-emerald-600 flex items-center gap-1" : "text-slate-400")}>
                          {isConnected ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              Connected
                            </>
                          ) : 'Not connected'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
 
        </div>
      </div>
    </div>
  );
}
