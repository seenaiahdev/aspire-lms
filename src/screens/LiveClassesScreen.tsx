import { useState } from 'react';

import { liveClassesSteps } from '@/lib/tourSteps';
import { 
  Radio, Calendar, Users, Play, Pause, ArrowRight, ChevronRight, Clock, Video, MessageCircle, 
  FileText, Hand, Users2, BarChart3, Download, Mic, MicOff, VideoOff, 
  Monitor, PhoneOff, Send, Volume2, Maximize2, HelpCircle, BellRing, CheckCircle2, X, Bell,
  SkipBack, SkipForward, Bookmark, CalendarX, Lock
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { useUser } from '@/lib/UserContext';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { StatusChip } from '@/components/ui/StatusChip';
import { cn } from '@/lib/utils';
import { liveClasses } from '@/data/mock';

export function LiveClassesScreen() {
  const { navigate, params } = useNav();
  const [tab, setTab] = useState(() => {
    return params.tab || localStorage.getItem('aspire_live_tab') || 'upcoming';
  });
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    localStorage.setItem('aspire_live_tab', newTab);
  };
  const [activeRecording, setActiveRecording] = useState<any | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(true);

  const handleToggleReminder = (cls: any) => {
    const isCurrentlySet = reminders[cls.id];
    setReminders((prev) => ({ ...prev, [cls.id]: !isCurrentlySet }));
    
    if (!isCurrentlySet) {
      setToastMessage({
        title: 'Success!',
        desc: `You'll be notified when ${cls.title} starts.`,
      });
    } else {
      setToastMessage({
        title: 'Notification Removed',
        desc: `You will no longer receive reminders for this class.`,
      });
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const filtered = liveClasses.filter((c) =>
    tab === 'upcoming' ? c.status === 'upcoming' || c.status === 'ongoing' :
    tab === 'completed' ? c.status === 'completed' : true
  );

  const displayList = tab === 'upcoming' ? filtered.slice(0, 2) : filtered;

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12 relative">

      <div id="tour-live-header" className="flex items-center justify-between pb-2">
        <div>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">Live Classes</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Join live sessions and watch recorded lectures.</p>
        </div>
      </div>

      <Tabs
        id="tour-live-tabs"
        variant="pills"
        tabs={[
          { id: 'upcoming', label: 'Upcoming & Live', badge: liveClasses.filter(c => c.status === 'ongoing').length },
          { id: 'completed', label: 'Recordings', badge: liveClasses.filter(c => c.status === 'completed').length },
        ]}
        active={tab}
        onChange={handleTabChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {displayList.length === 0 ? (
          <div className="col-span-full py-16 px-6 bg-white border border-slate-200/90 rounded-[2rem] text-center flex flex-col items-center justify-center space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] shadow-xs">
              <CalendarX className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">Not Yet Scheduled</h3>
              <p className="text-slate-500 text-xs sm:text-sm max-w-md font-medium mt-1">
                There are currently no live or upcoming sessions scheduled for this section. Check back soon for new masterclasses!
              </p>
            </div>
          </div>
        ) : (
          displayList.map((cls, index) => {
            const isReminderSet = reminders[cls.id];
            return (
              <Card key={cls.id} id={index === 0 ? 'tour-live-card-0' : undefined} className="relative overflow-hidden group border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 bg-white">
                {cls.status === 'completed' && (
                  <div 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="absolute inset-0 bg-[#090b14]/75 backdrop-blur-md z-30 flex flex-col items-center justify-center select-none cursor-not-allowed rounded-2xl p-4 text-center"
                  >
                    <div className="space-y-3">
                      <div className="w-14 h-14 rounded-full border border-slate-700/80 bg-[#0c0f1d] flex items-center justify-center shadow-2xl mx-auto">
                        <Lock className="w-5 h-5 text-slate-400 stroke-[1.8]" />
                      </div>
                      <div className="inline-block px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 text-[10px] font-black uppercase tracking-widest">
                        COMING SOON
                      </div>
                    </div>
                  </div>
                )}
                <div 
                  className={cn(
                    "relative h-44 overflow-hidden",
                    cls.status === 'completed' ? "cursor-not-allowed" : "cursor-pointer"
                  )}
                  onClick={(e) => {
                    if (cls.status === 'completed') {
                      e.preventDefault();
                      e.stopPropagation();
                    } else if (cls.status === 'ongoing') {
                      navigate('classroom', { id: cls.id });
                    }
                  }}
                >
                  <img src={cls.thumbnail} alt={cls.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  
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
                    <>
                      {/* Top Right Locked Status badge */}
                      <div className="absolute top-3 right-3 bg-slate-900/95 border border-slate-700/80 px-2.5 py-1 rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-md">
                        <Lock className="w-3.5 h-3.5 text-purple-300" />
                        <span className="text-[9px] font-black text-purple-250 tracking-wider uppercase">Locked</span>
                      </div>
                      {/* Circular lock icon overlay in center of thumbnail */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-[#0c0f1d]/90 border border-slate-700/85 flex items-center justify-center shadow-2xl">
                          <Lock className="w-5 h-5 text-slate-400 stroke-[1.8]" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <p className="text-white font-extrabold text-base sm:text-lg leading-tight mb-0.5 drop-shadow-md">{cls.title}</p>
                    <p className="text-white/80 text-xs font-semibold drop-shadow-sm">{cls.course}</p>
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
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                  >
                    <Radio className="w-4 h-4" /> Join Live Class
                  </button>
                ) : cls.status === 'completed' ? (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="w-full py-3 rounded-xl bg-purple-50/40 text-[#7c3aed]/40 text-xs font-extrabold flex items-center justify-center gap-2 border border-purple-100/30 cursor-not-allowed select-none"
                    disabled
                  >
                    <Lock className="w-4 h-4 text-[#7c3aed]/40" /> Watch Recording (Locked)
                  </button>
                ) : (
                  <button 
                    onClick={() => handleToggleReminder(cls)}
                    className={cn(
                      "w-full py-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 border shadow-2xs active:scale-95",
                      isReminderSet 
                        ? "bg-purple-50 text-[#7c3aed] border-purple-200 hover:bg-purple-100" 
                        : "bg-slate-50 hover:bg-purple-50/50 text-slate-700 hover:text-[#7c3aed] border-slate-200 hover:border-purple-200"
                    )}
                  >
                    {isReminderSet ? (
                      <>
                        <BellRing className="w-4 h-4 text-[#7c3aed] animate-pulse" />
                        <span>Reminder Set (Notified 🔔)</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-[#7c3aed]" />
                        <span>Set Reminder</span>
                      </>
                    )}
                  </button>
                )}
              </CardBody>
            </Card>
          );
        })
      )}
    </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-3 right-6 z-[100] animate-fade-in max-w-sm sm:max-w-md font-sans">
          <div className="bg-[#e6f4ea] border border-[#ceead6] rounded-[1.25rem] px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm flex items-start gap-3 backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 text-[#137333] stroke-[2.2] shrink-0 mt-0.5" />
            <div className="flex-1 pr-1 min-w-0">
              <h4 className="font-bold text-base sm:text-lg text-[#137333] tracking-tight leading-tight">{toastMessage.title}</h4>
              <p className="text-xs sm:text-sm font-normal text-[#137333] leading-snug mt-1">{toastMessage.desc}</p>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-[#137333]/80 hover:text-[#137333] p-0.5 -mt-0.5 -mr-1 transition-colors shrink-0"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LiveClassroomScreen() {
  const { navigate, params } = useNav();
  const { user } = useUser();
  const cls = liveClasses.find((c) => c.id === params.id) || liveClasses[0];
  const [tab, setTab] = useState('chat');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatMessages, setChatMessages] = useState<{name: string, avatar: string, msg: string, time: string, mentor?: boolean}[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [votedPollOption, setVotedPollOption] = useState<number | null>(null);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { name: user.name, avatar: user.avatar, msg: newMessage, time: 'Just now' }
    ]);
    setNewMessage('');
  };

  return (
    <div className="space-y-4 font-sans animate-fade-in h-[calc(100vh-5.5rem)] flex flex-col pb-2">
      {/* Top Classroom Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('live')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
            title="Back to Live Classes"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> DEMO PREVIEW
              </span>
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Users2 className="w-3.5 h-3.5" /> Simulated Environment
              </span>
            </div>
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-tight">
              {cls.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => navigate('live')}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition-all border border-rose-200 flex items-center gap-1.5 active:scale-95"
          >
            <PhoneOff className="w-4 h-4" /> Leave Class
          </button>
        </div>
      </div>

      {/* Main Classroom Layout (Video Stage + Interactive Chat/Polls Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        
        {/* Left Area: Live Video Stage & Participant Strip */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          
          {/* Main Video View Container */}
          <div className="relative rounded-[2.2rem] overflow-hidden bg-[#0c0f1d] shadow-2xl flex-1 border border-slate-800 flex items-center justify-center group">
            
            {/* Tech Background Image Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-[#101537] to-[#1e1438]" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-10 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

            {/* Waiting State Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 p-6">
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center relative shadow-2xl">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                <Video className="w-8 h-8 text-slate-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-white">Interactive Classroom Demo</h3>
                <p className="text-sm font-semibold text-slate-400 mt-2 max-w-md mx-auto">
                  This is a preview of the Aspire Next live classroom interface. Actual sessions are broadcast here according to your batch schedule, featuring a live video stream.
                </p>
              </div>
            </div>

            {/* Video Top Bar Overlay (Instructor Info) */}
            <div className="absolute top-0 left-0 right-0 p-4 sm:p-5 flex items-center justify-between z-20 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
              <div className="flex items-center gap-3">
                <Avatar src={cls.instructor.avatar} name={cls.instructor.name} size="sm" className="ring-2 ring-purple-400/50 grayscale opacity-75" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white/80 text-sm font-black">{cls.instructor.name}</p>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-black uppercase tracking-wider">
                      HOST
                    </span>
                  </div>
                  <p className="text-purple-400 text-xs font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" /> Simulated Host
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Stream Controls Dock Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
              <div className="flex items-center justify-between">
                
                {/* Control Action Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 opacity-50 pointer-events-none">
                  <button className="p-3 rounded-2xl font-extrabold text-xs flex items-center justify-center border backdrop-blur-md bg-slate-900/80 text-white border-slate-700/80">
                    <MicOff className="w-5 h-5" />
                  </button>
                  <button className="p-3 rounded-2xl font-extrabold text-xs flex items-center justify-center border backdrop-blur-md bg-slate-900/80 text-white border-slate-700/80">
                    <VideoOff className="w-5 h-5" />
                  </button>
                  <button className="px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 border backdrop-blur-md bg-slate-900/80 text-white border-slate-700/80">
                    <Hand className="w-5 h-5" />
                    <span className="hidden sm:inline">Raise Hand</span>
                  </button>
                </div>



              </div>
            </div>

          </div>

          {/* Participant Avatar Strip */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-[#7c3aed]" />
              <h3 className="font-extrabold text-slate-900 text-xs">Active Students (Demo)</h3>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 italic">Simulation active</span>
            </div>
          </div>

        </div>

        {/* Right Area: Interactive Side Panel (Chat, Polls, Notes) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
          
          {/* Panel Tabs Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-1">
              {[
                { id: 'chat', label: 'Chat', icon: MessageCircle, count: chatMessages.length },
                { id: 'notes', label: 'Notes', icon: FileText },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all",
                    tab === t.id
                      ? "bg-white text-[#7c3aed] border border-purple-100 shadow-2xs"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                  {t.count && (
                    <span className="px-1.5 py-0.2 rounded-full bg-purple-50 text-[#7c3aed] text-[10px] font-black">
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Wrapper to overlay lock on scroll and input area */}
          <div className="flex-1 relative flex flex-col min-h-0">
            
            {/* Tab Scroll Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 filter blur-[1.5px] pointer-events-none">
              {tab === 'chat' && (
                <div className="space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-10">
                      <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400">No messages yet. Be the first to say hello!</p>
                    </div>
                  )}
                  {chatMessages.map((c, i) => (
                    <div key={i} className={cn("flex gap-2.5 p-2.5 rounded-xl transition-colors", c.mentor ? "bg-purple-50/70 border border-purple-100" : "hover:bg-slate-50")}>
                      <Avatar src={c.avatar} name={c.name} size="sm" className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black text-slate-900">{c.name}</span>
                          {c.mentor && (
                            <span className="px-1.5 py-0.2 rounded bg-[#7c3aed] text-white text-[9px] font-black uppercase tracking-wider">
                              INSTRUCTOR
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-400 ml-auto shrink-0">{c.time}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed break-words">{c.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'notes' && (
                <div className="flex flex-col h-full space-y-2">
                  <textarea 
                    className="w-full flex-1 min-h-[160px] text-xs font-semibold text-slate-800 focus:outline-none resize-none bg-transparent placeholder:text-slate-400 leading-relaxed" 
                    placeholder="Take notes during the live class..." 
                    defaultValue={``} 
                  />
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">All notes saved locally</span>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Message Sending Input */}
            {tab === 'chat' && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0 filter blur-[1.5px] pointer-events-none">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <input 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#7c3aed] transition-colors" 
                    placeholder="Ask a question or type a message..." 
                  />
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* Premium Lock Overlay */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[3px] flex flex-col items-center justify-center p-6 text-center z-30 select-none">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-100 shadow-md shadow-purple-500/5 mb-3.5 animate-slide-up">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 tracking-wide uppercase">Workspace Locked</h4>
              <p className="text-xs font-semibold text-slate-500 mt-2 max-w-[220px] leading-relaxed mx-auto">
                Classroom chat and personal notes will activate dynamically once a live class starts.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
