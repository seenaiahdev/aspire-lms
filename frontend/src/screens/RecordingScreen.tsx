import { useState, useEffect } from 'react';
import { 
  Play, Pause, Volume2, Maximize2, Settings, ArrowLeft, Calendar, Clock, 
  Users, Download, FileText, Bookmark, MessageCircle, Send, CheckCircle2, 
  SkipBack, SkipForward, Radio, Share2, Sparkles, ShieldCheck, Lock
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { fetchRecordingById } from '@/lib/api';
import { useUser } from '@/lib/UserContext';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

function toEmbedVideoUrl(raw?: string): string {
  const u = String(raw || '').trim();
  if (!u) return '';
  const gd = u.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return u;
}

function isDirectMediaUrl(raw?: string): boolean {
  const u = String(raw || '').trim();
  if (!u) return false;
  if (/drive\.google\.com|youtube\.com|youtu\.be|vimeo\.com/.test(u)) return false;
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(u) || /supabase\.co\/storage\//.test(u);
}

export function RecordingScreen() {
  const { user: currentUser } = useUser();
  const { navigate, params } = useNav();
  
  const [recording, setRecording] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isLocked, setIsLocked] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    const loadRecording = async () => {
      setIsLoading(true);
      try {
        const data = await fetchRecordingById(params.id);
        if (data) {
          setRecording(data);
          const instName = typeof data.instructor === 'object' ? data.instructor?.name : (data.instructor || 'Instructor');
          setQuestions([
            { name: 'Karan Patel', avatar: 'https://i.pravatar.cc/200?img=15', msg: 'At 32:10, why did we partition database tables by region instead of user ID?', time: '2h ago', likes: 12 },
            { name: instName, avatar: data.instructor?.avatar || '', msg: 'Great question! Region-based partitioning minimizes cross-datacenter roundtrip latency.', time: '1h ago', mentor: true, likes: 24 },
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) {
      loadRecording();
    } else {
      setIsLoading(false);
    }
  }, [params.id]);

  const handleAddQuestion = () => {
    if (!qaInput.trim()) return;
    setQuestions((prev) => [
      ...prev,
      { name: 'Aarav Sharma', avatar: 'https://i.pravatar.cc/200?img=12', msg: qaInput, time: 'Just now', likes: 0 }
    ]);
    setQaInput('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 animate-fade-in">
        <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
          <Radio className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="font-extrabold text-slate-800 text-base">Recording Not Found</h3>
        <p className="text-xs font-medium text-slate-500 mt-1">The requested recording could not be found.</p>
        <button 
          onClick={() => navigate('live', { tab: 'completed' })}
          className="mt-4 px-5 py-2.5 rounded-xl bg-purple-50 text-[#7c3aed] font-extrabold text-xs"
        >
          Back to Live Classes
        </button>
      </div>
    );
  }

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
            
            {/* Real Video Player: Direct Media or Embed Iframe */}
            {recording.video_url ? (
              isDirectMediaUrl(recording.video_url) ? (
                <video
                  key={recording.video_url}
                  src={recording.video_url}
                  poster={recording.thumbnail}
                  controls
                  controlsList="nodownload"
                  className="absolute inset-0 w-full h-full z-10 bg-black object-contain"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full z-10 overflow-hidden bg-black">
                  <iframe
                    key={recording.video_url}
                    src={toEmbedVideoUrl(recording.video_url)}
                    title={recording.title || 'Recorded Class'}
                    className="absolute -top-[56px] left-0 w-full h-[calc(100%+56px)] border-0"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                  <div className="absolute top-0 right-0 w-28 h-16 z-20 pointer-events-auto" />
                </div>
              )
            ) : (
              <>
                {/* Ambient Background & Thumbnail */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0e122b] to-[#1c1236]" />
                <img 
                  src={recording.thumbnail} 
                  alt={recording.title} 
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090b14] via-[#090b14]/20 to-[#090b14]/70" />
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="px-5 py-2.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-purple-300" />
                    <span className="text-white font-extrabold text-sm tracking-wide">Recording Processing</span>
                  </div>
                </div>
              </>
            )}
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
              Recorded live session with {recording.instructor?.name || 'Instructor'}. Covers distributed architecture, database partitioning, and real-world system scalability patterns.
            </p>
          </div>

        </div>

        {/* Right Sidebar: Instructor Card + Overview, Resources & Discussion Panel */}
        <div className="space-y-5">
          
          {/* Instructor Profile Card */}
          <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
            <CardBody className="p-5 space-y-4">
              <div className="flex items-center gap-3.5">
                <Avatar src={recording.instructor?.avatar} name={recording.instructor?.name || 'Instructor'} size="md" className="ring-2 ring-purple-500/20" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{recording.instructor?.name || 'Instructor'}</h3>
                  <p className="text-xs font-bold text-[#7c3aed]">{recording.instructor?.title || 'Technical Trainer'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                  <Calendar className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>{recording.scheduledAt || 'Completed'}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50">
                  <Users className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>{recording.participants || 42} Attendees</span>
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
