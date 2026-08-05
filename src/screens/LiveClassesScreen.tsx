import { useState } from 'react';
import { Radio, Calendar, Users, Play, ArrowRight, Clock, Video, MessageCircle, FileText, Hand, Users2, BarChart3, Download } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { liveClasses } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';

export function LiveClassesScreen() {
  const { navigate } = useNav();
  const [tab, setTab] = useState('upcoming');

  const filtered = liveClasses.filter((c) =>
    tab === 'upcoming' ? c.status === 'upcoming' || c.status === 'ongoing' :
    tab === 'completed' ? c.status === 'completed' : true
  );

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">Live Classes</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Join live sessions and watch recorded lectures.</p>
        </div>
      </div>

      <Tabs
        variant="pills"
        tabs={[
          { id: 'upcoming', label: 'Upcoming & Live', badge: liveClasses.filter(c => c.status === 'ongoing').length },
          { id: 'completed', label: 'Recordings', badge: liveClasses.filter(c => c.status === 'completed').length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((cls) => (
          <Card key={cls.id} className="overflow-hidden group border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
            <div 
              className="relative h-44 overflow-hidden cursor-pointer"
              onClick={() => cls.status === 'ongoing' && navigate('classroom', { id: cls.id })}
            >
              <img src={cls.thumbnail} alt={cls.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {cls.status === 'ongoing' && (
                <div className="absolute top-3 left-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    LIVE NOW
                  </div>
                </div>
              )}
              {cls.status === 'completed' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
                    <Play className="w-6 h-6 text-[#3b82f6] ml-1" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-extrabold text-lg leading-snug mb-1">{cls.title}</p>
                <p className="text-white/80 text-xs font-semibold">{cls.course}</p>
              </div>
            </div>
            
            <CardBody className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={cls.instructor.avatar} name={cls.instructor.name} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{cls.instructor.name}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{cls.instructor.title}</p>
                </div>
                <StatusChip status={cls.status} />
              </div>
              
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mb-5 pt-4 border-t border-slate-100">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />{cls.scheduledAt}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{cls.duration}</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" />{cls.participants}</span>
              </div>
              
              {cls.status === 'ongoing' ? (
                <button 
                  onClick={() => navigate('classroom', { id: cls.id })} 
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] hover:brightness-110 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                >
                  <Radio className="w-4 h-4" /> Join Live Class
                </button>
              ) : cls.status === 'completed' ? (
                <button className="w-full py-3 rounded-xl bg-slate-50 hover:bg-[#eff6ff] text-slate-600 hover:text-[#3b82f6] text-xs font-extrabold transition-all flex items-center justify-center gap-2 border border-slate-200">
                  <Play className="w-4 h-4" /> Watch Recording
                </button>
              ) : (
                <button className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-extrabold transition-all flex items-center justify-center gap-2 border border-slate-200">
                  <Calendar className="w-4 h-4" /> Set Reminder
                </button>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function LiveClassroomScreen() {
  const { navigate, params } = useNav();
  const cls = liveClasses.find((c) => c.id === params.id) || liveClasses[0];
  const [tab, setTab] = useState('chat');

  return (
    <div className="space-y-4 font-sans animate-fade-in h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              LIVE NOW
            </span>
            <span className="text-xs font-bold text-slate-500">{cls.participants} watching</span>
          </div>
          <h2 className="font-extrabold text-2xl text-slate-900 tracking-tight">{cls.title}</h2>
        </div>
        <button 
          onClick={() => navigate('live')}
          className="px-6 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition-colors border border-rose-200"
        >
          Leave Class
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Video & Participants Column */}
        <div className="lg:col-span-2 flex flex-col gap-5 min-h-0">
          {/* Main Video View */}
          <div className="relative rounded-[2rem] overflow-hidden bg-black shadow-xl flex-1 border border-slate-200">
            <img src={cls.thumbnail} alt={cls.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white text-base font-extrabold">{cls.instructor.name}</p>
                  <p className="text-white/80 text-xs font-semibold mt-0.5">Speaking now...</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
                  <Hand className="w-5 h-5" />
                </button>
                <button className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Participant Strip */}
          <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Users2 className="w-4 h-4 text-[#3b82f6]" />
              <h3 className="font-extrabold text-slate-900 text-sm">Participants ({cls.participants})</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Avatar key={i} src={`https://i.pravatar.cc/200?img=${i + 20}`} name={`Student ${i + 1}`} size="sm" className="ring-2 ring-white shadow-sm" />
              ))}
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-extrabold text-[10px] flex items-center justify-center ring-2 ring-white shadow-sm">
                +{cls.participants - 10}
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel (Chat, Polls, Notes) */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <Tabs
            variant="underline"
            tabs={[
              { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
              { id: 'polls', label: 'Polls', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
            ]}
            active={tab}
            onChange={setTab}
          />
          
          <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
            {tab === 'chat' && (
              <div className="space-y-4">
                {[
                  { name: 'Ishita', avatar: 'https://i.pravatar.cc/200?img=20', msg: 'Great explanation!', time: '2m' },
                  { name: 'Karan', avatar: 'https://i.pravatar.cc/200?img=15', msg: 'Can you show that example again?', time: '5m' },
                  { name: 'Dr. Priya', avatar: cls.instructor.avatar, msg: 'Sure! Let me go back to that slide.', time: '4m', mentor: true },
                  { name: 'Neha', avatar: 'https://i.pravatar.cc/200?img=31', msg: 'This is so helpful, thank you!', time: '3m' },
                ].map((c, i) => (
                  <div key={i} className={cn("flex gap-3", c.mentor ? "bg-[#eff6ff] p-3 rounded-2xl border border-blue-100" : "")}>
                    <Avatar src={c.avatar} name={c.name} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-extrabold text-slate-900">{c.name}</span>
                        {c.mentor && <span className="px-1.5 py-0.5 rounded bg-[#3b82f6] text-white text-[9px] font-black uppercase tracking-wider">Instructor</span>}
                        <span className="text-[10px] font-semibold text-slate-400 ml-auto">{c.time}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed">{c.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'polls' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-sm font-extrabold text-slate-900 mb-4">Which topic should we cover next?</p>
                  <div className="space-y-2">
                    {['Advanced Hooks', 'Context API', 'Performance Optimization'].map((opt, i) => (
                      <div key={i} className="relative overflow-hidden rounded-xl bg-white border border-slate-200 p-3 hover:border-[#3b82f6] transition-colors cursor-pointer group">
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 group-hover:text-[#3b82f6]">{opt}</span>
                          <span className="text-xs font-black text-slate-400">{[42, 28, 30][i]}%</span>
                        </div>
                        {/* Fake Progress Bar */}
                        <div className="absolute top-0 left-0 bottom-0 bg-blue-50/50" style={{ width: `${[42, 28, 30][i]}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === 'notes' && (
              <textarea 
                className="w-full h-full text-sm font-medium text-slate-700 focus:outline-none resize-none bg-transparent placeholder:text-slate-400 leading-relaxed" 
                placeholder="Take notes during the class..." 
                defaultValue="Key points:
- useCallback for memoizing functions
- useMemo for memoizing values
- Use React.memo for component memoization" 
              />
            )}
          </div>

          {tab === 'chat' && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex gap-2">
                <input className="flex-1 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#3b82f6] transition-colors" placeholder="Send a message..." />
                <button className="px-5 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-extrabold transition-colors shadow-sm">
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
