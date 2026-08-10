import { useState } from 'react';
import { 
  Play, Pause, Volume2, Maximize2, Settings, ArrowLeft, Calendar, Clock, 
  Users, Download, FileText, Bookmark, MessageCircle, Send, CheckCircle2, 
  SkipBack, SkipForward, Radio, Share2, Sparkles, ShieldCheck, Lock
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { liveClasses, currentUser } from '@/data/mock';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function RecordingScreen() {
  const { navigate, params } = useNav();
  const recording = liveClasses.find((c) => c.id === params.id) || liveClasses.find((c) => c.status === 'completed') || liveClasses[3];
  
  const [isLocked, setIsLocked] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [questions, setQuestions] = useState([
    { name: 'Karan Patel', avatar: 'https://i.pravatar.cc/200?img=15', msg: 'At 32:10, why did we partition database tables by region instead of user ID?', time: '2h ago', likes: 12 },
    { name: 'Rohan Mehta', avatar: recording.instructor.avatar, msg: 'Great question! Region-based partitioning minimizes cross-datacenter roundtrip latency.', time: '1h ago', mentor: true, likes: 24 },
  ]);

  const handleAddQuestion = () => {
    if (!qaInput.trim()) return;
    setQuestions((prev) => [
      ...prev,
      { name: 'Aarav Sharma', avatar: 'https://i.pravatar.cc/200?img=12', msg: qaInput, time: 'Just now', likes: 0 }
    ]);
    setQaInput('');
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-16">
      
      {/* Sleek Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('live', { tab: 'completed' })} 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7c3aed] hover:text-[#6d28d9] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Live Classes</span>
            </button>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-bold text-slate-500">{recording.course}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">{recording.title}</h1>
            <span className="px-3 py-1 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-200 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
              RECORDED MASTERCLASS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 border shadow-2xs active:scale-95",
              isBookmarked ? "bg-purple-50 text-[#7c3aed] border-purple-200 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Bookmark className={cn("w-4 h-4", isBookmarked ? "fill-[#7c3aed] text-[#7c3aed]" : "")} />
            <span>{isBookmarked ? "Saved to Library" : "Save Lesson"}</span>
          </button>
          
          <button className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-extrabold transition-all shadow-2xs flex items-center gap-2 active:scale-95">
            <Share2 className="w-4 h-4 text-slate-500" /> Share
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Area: Main Video Player */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ULTRA-PREMIUM MODERN VIDEO PLAYER CONTAINER */}
          <div className="relative aspect-video w-full rounded-[2.2rem] overflow-hidden bg-[#090b14] shadow-2xl border border-slate-800/80 shrink-0 group">
            
            {/* Brand Purple Glass Lock Overlay */}
            {isLocked && (
              <div className="absolute inset-0 bg-[#090b14]/85 backdrop-blur-md flex items-center justify-center z-40 p-4 sm:p-6 select-none animate-fade-in">
                <div className="w-full max-w-sm rounded-[2rem] bg-white border border-slate-200/80 p-6 sm:p-7 text-center shadow-2xl space-y-5 animate-scale-in">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-155 flex items-center justify-center text-[#7c3aed] mx-auto shadow-2xs">
                    <Lock className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl leading-tight">Recording Locked</h3>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed mt-2">
                      Please complete your active practice lab assignments or unlock this unit to watch this recorded class.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => setIsLocked(false)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Unlock Unit
                    </button>
                    <button
                      onClick={() => navigate('practice')}
                      className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-extrabold transition-all border border-slate-200 active:scale-95 cursor-pointer"
                    >
                      Go to Practice Lab
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Ambient Background & Image */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0e122b] to-[#1c1236]" />
            <img 
              src={recording.thumbnail} 
              alt={recording.title} 
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090b14] via-[#090b14]/20 to-[#090b14]/70" />

            {/* Top Video Overlay Bar */}
            <div className="absolute top-0 left-0 right-0 p-5 flex items-start justify-between z-30 bg-gradient-to-b from-[#090b14]/90 via-[#090b14]/40 to-transparent">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-slate-900/90 text-white text-[10px] font-black tracking-widest border border-slate-700/80 shadow-md uppercase backdrop-blur-md">
                  4K ULTRA HD · RECORDED
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-200 text-[10px] font-extrabold border border-purple-500/30 backdrop-blur-md">
                  90 MIN LECTURE
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 flex items-center justify-center text-white transition-all shadow-md active:scale-95"
                >
                  <Bookmark className={cn("w-4 h-4", isBookmarked ? "fill-purple-400 text-purple-400" : "")} />
                </button>
                <button className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 flex items-center justify-center text-white transition-all shadow-md active:scale-95">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Center Circular Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <button
                onClick={() => setPlaying(!playing)}
                className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center group/play hover:bg-white/25 transition-all shadow-2xl border border-white/20 active:scale-95 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-2xl group-hover/play:scale-110 transition-transform">
                  {playing ? <Pause className="w-6 h-6 fill-slate-950 text-slate-950" /> : <Play className="w-6 h-6 fill-slate-950 text-slate-950 ml-0.5" />}
                </div>
              </button>
            </div>

            {/* Bottom Scrubber & Controls Dock Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-30 bg-gradient-to-t from-[#090b14] via-[#090b14]/90 to-transparent space-y-3">
              
              {/* Timeline Scrubber Bar with Timestamps at Both Ends */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/90 font-mono font-extrabold shrink-0">24:18</span>
                
                {/* White Progress Bar with Seeker Handle Dot */}
                <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer group/bar relative">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-[#7c3aed] relative" style={{ width: '28%' }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg border-2 border-slate-950 cursor-pointer scale-110" />
                  </div>
                </div>

                <span className="text-xs text-white/70 font-mono font-bold shrink-0">{recording.duration}</span>
              </div>

              {/* Controls Dock Bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3.5">
                  <button className="text-white/80 hover:text-white transition-colors p-1" title="Rewind 10s">
                    <SkipBack className="w-4 h-4 fill-white/80" />
                  </button>

                  <button 
                    onClick={() => setPlaying(!playing)} 
                    className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    {playing ? <Pause className="w-4 h-4 fill-slate-950 text-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 text-slate-950 ml-0.5" />}
                  </button>

                  <button className="text-white/80 hover:text-white transition-colors p-1" title="Forward 10s">
                    <SkipForward className="w-4 h-4 fill-white/80" />
                  </button>

                  <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                    <button className="text-white/80 hover:text-white transition-colors p-1">
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-purple-200 bg-purple-500/20 px-2.5 py-0.5 rounded-md border border-purple-500/30">
                    1.0x
                  </span>
                  <button className="text-white/80 hover:text-white transition-colors p-1">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Masterclass Summary Header Info */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900 text-lg">{recording.title}</h2>
              <span className="text-xs font-extrabold text-[#7c3aed] bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                {recording.course}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Recorded live session with {recording.instructor.name}. Covers distributed architecture, database partitioning, and real-world system scalability patterns.
            </p>
          </div>

        </div>

        {/* Right Sidebar: Instructor Card + Overview, Resources & Discussion Panel */}
        <div className="space-y-5">
          
          {/* Instructor Profile Card */}
          <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardBody className="p-5 space-y-4">
              <div className="flex items-center gap-3.5">
                <Avatar src={recording.instructor.avatar} name={recording.instructor.name} size="md" className="ring-2 ring-purple-500/20" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{recording.instructor.name}</h3>
                  <p className="text-xs font-bold text-[#7c3aed]">{recording.instructor.title}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                  <Calendar className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>{recording.scheduledAt}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                  <Users className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>{recording.participants} Attendees</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Overview, Resources & Discussion Panel in Right Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4">
            
            {/* Sidebar Tabs Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 text-center">
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'resources', label: 'Resources', icon: Download },
                { id: 'qa', label: `Q&A (${questions.length})`, icon: MessageCircle },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "py-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95",
                    tab === t.id
                      ? "bg-white text-[#7c3aed] shadow-xs border border-purple-100"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <t.icon className="w-3 h-3" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Tab 1: Overview & Takeaways */}
            {tab === 'overview' && (
              <div className="space-y-4 text-xs font-medium text-slate-700">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs mb-1">About the Session</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Full-length recorded session breaking down production deployment patterns and cloud architecture.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
                  <h4 className="font-extrabold text-[#7c3aed] text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#7c3aed]" /> Key Takeaways
                  </h4>
                  <ul className="space-y-1.5 text-slate-800 text-[11px] font-semibold">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#7c3aed] shrink-0" />
                      <span>Distributed partitioning & scaling</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#7c3aed] shrink-0" />
                      <span>Multi-region DB replication & cache</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#7c3aed] shrink-0" />
                      <span>Async worker queues & fault tolerance</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 2: Resources & Downloads */}
            {tab === 'resources' && (
              <div className="space-y-2.5">
                {[
                  { name: `Presentation Slides.pdf`, size: '14.2 MB', icon: FileText },
                  { name: 'Source Code & Architecture.zip', size: '28.5 MB', icon: Download },
                  { name: 'Architecture Cheat Sheet.pdf', size: '5.1 MB', icon: FileText },
                ].map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-200 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#7c3aed] flex items-center justify-center border border-purple-100 shrink-0">
                        <res.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{res.name}</p>
                        <p className="text-[9px] font-medium text-slate-400">{res.size}</p>
                      </div>
                    </div>

                    <button className="p-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white shrink-0 transition-all active:scale-95 shadow-2xs" title="Download">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Q&A & Discussion */}
            {tab === 'qa' && (
              <div className="space-y-3">
                <div className="flex gap-1.5">
                  <input 
                    value={qaInput}
                    onChange={(e) => setQaInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-[#7c3aed]"
                    placeholder="Ask a question..."
                  />
                  <button 
                    onClick={handleAddQuestion}
                    className="px-3.5 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[11px] font-extrabold transition-all flex items-center gap-1 shadow-xs active:scale-95 shrink-0"
                  >
                    <Send className="w-3 h-3" /> Post
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {questions.map((q, i) => (
                    <div key={i} className={cn("p-3 rounded-xl border text-[11px]", q.mentor ? "bg-purple-50/60 border-purple-200" : "bg-slate-50/60 border-slate-200/80")}>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar src={q.avatar} name={q.name} size="xs" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">{q.name}</span>
                            {q.mentor && (
                              <span className="px-1.5 py-0.2 rounded bg-[#7c3aed] text-white text-[8px] font-black uppercase">Instructor</span>
                            )}
                          </div>
                          <span className="text-[9px] font-medium text-slate-400">{q.time}</span>
                        </div>
                      </div>
                      <p className="font-semibold text-slate-700 leading-snug pl-6">{q.msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
