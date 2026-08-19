import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Award, Download, Share2, ShieldCheck, Lock, Unlock, CheckCircle2, Clock, Sparkles, BookOpen, ExternalLink, RefreshCw, X, Check, FileCheck, Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { triggerFileDownload } from '@/lib/downloadHelper';
import { useNav } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/UserContext';
import { fetchCertificates } from '@/lib/api';
import aspireLogo from '@/assests/Aspire_logo.jpg';

import { certificationsSteps } from '@/lib/tourSteps';

export interface CourseCertificate {
  id: string;
  courseTitle: string;
  categoryLabel: string;
  instructorName: string;
  instructorRole: string;
  progress: number; // 0 to 100
  issuedDate?: string;
  verifyId?: string;
  certificateBg: string;
}

function CircularProgressLock({ progress, size = 76 }: { progress: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {/* SVG Circular Progress Ring */}
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-purple-500/20"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-[#7c3aed] transition-all duration-700 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      {/* Center Lock Icon */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-full border border-purple-400/40 m-1 shadow-md">
        <Lock className="w-6 h-6 text-purple-300 drop-shadow-sm" />
      </div>
    </div>
  );
}

export function CertificatesScreen() {
  const { navigate } = useNav();
  const { user } = useUser();
  const [certs, setCerts] = useState<CourseCertificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<CourseCertificate | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchCertificates(user.id);
        setCerts(data as CourseCertificate[]);
      } catch (error) {
        console.error('Failed to fetch certificates:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user.id]);

  const activeCerts = certs.filter(c => c.id === 'c1');
  const unlockedCount = activeCerts.filter(c => c.progress >= 100).length;
  const lockedCount = activeCerts.filter(c => c.progress < 100).length;
  const avgProgress = activeCerts.length > 0 ? Math.round(activeCerts.reduce((acc, c) => acc + c.progress, 0) / activeCerts.length) : 0;

  const handleDownload = (cert: CourseCertificate) => {
    triggerFileDownload(`AspireNext Certificate - ${cert.courseTitle}`);
    setToastMessage(`Downloading official AspireNext PDF certificate for ${cert.courseTitle}... 📜`);
  };

  const handleShare = (cert: CourseCertificate) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`https://aspirenext.edu/verify/${cert.verifyId || cert.id}`);
    }
    setToastMessage(`AspireNext certificate link copied to clipboard! Share on LinkedIn & Resume. 🚀`);
  };

  return (
    <div className="space-y-6 font-sans pb-12 animate-fade-in">

      
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} position="top-right" />
      )}

      {/* Clean Top Header */}
      <div id="tour-certs-header" className="pb-2">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          AspireNext Course Certificates
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Certificates automatically unlock when you complete 100% of the course modules in My Learning. Click any certificate to preview your official AspireNext accreditation.
        </p>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Unlocked */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
            <Award className="w-5.5 h-5.5 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{unlockedCount} / {activeCerts.length}</p>
            <p className="text-xs font-extrabold text-[#7c3aed]">Unlocked Certificates</p>
          </div>
        </Card>

        {/* Locked In Progress */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
            <Lock className="w-5.5 h-5.5 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{lockedCount}</p>
            <p className="text-xs font-extrabold text-[#7c3aed]">Locked (In Progress)</p>
          </div>
        </Card>

        {/* Avg Course Progress */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
            <Sparkles className="w-5.5 h-5.5 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{avgProgress}%</p>
            <p className="text-xs font-extrabold text-[#7c3aed]">Overall Completion</p>
          </div>
        </Card>

      </div>


      {/* ════════ CERTIFICATE CARDS GRID ════════ */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
      ) : certs.length === 0 ? (
        <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">No certificates earned yet</div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {certs.map((cert, index) => {
          const isUnlocked = cert.progress >= 100;

          return (
            <Card
              key={cert.id}
              id={index === 0 ? 'tour-certs-card-0' : undefined}
              className={cn(
                "relative overflow-hidden rounded-[2rem] bg-white border border-slate-200/90 shadow-sm transition-all duration-300 flex flex-col justify-between group min-h-[380px]",
                cert.id === 'c1' ? "hover:shadow-xl cursor-pointer" : ""
              )}
              onClick={cert.id === 'c1' ? () => setSelectedCert(cert) : undefined}
            >
              
              {/* ── CARD CONTENT (BLURRED IF LOCKED) ── */}
              <div className={cn("flex flex-col h-full justify-between transition-all duration-500", !isUnlocked && "blur-[3px] opacity-40 select-none pointer-events-none")}>
                
                {/* Certificate Background Image Preview */}
                <div className="relative h-48 w-full bg-slate-900 overflow-hidden shrink-0">
                  <img
                    src={cert.certificateBg}
                    alt={cert.courseTitle}
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-3 border-2 border-amber-400/40 rounded-xl pointer-events-none z-10 flex flex-col justify-between p-3">
                    <div className="flex justify-between items-center text-amber-300/70 text-[9px] font-black uppercase tracking-widest">
                      <span>ASPIRE NEXT</span>
                      <span>OFFICIAL ACCREDITATION</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-300/70 text-[9px] font-black uppercase tracking-widest">
                      <span>VERIFIED CREDENTIAL</span>
                      <span>2026</span>
                    </div>
                  </div>

                  <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between bg-gradient-to-t from-black/90 via-black/40 to-black/20 text-white">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-white" /> OFFICIAL DIPLOMA
                      </span>
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 drop-shadow-md" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-extrabold text-purple-300 tracking-wider">CERTIFICATE OF COMPLETION</p>
                      <h3 className="font-extrabold text-base text-white leading-tight line-clamp-2">
                        {cert.courseTitle}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-300">Issued: {cert.issuedDate || 'August 05, 2026'}</p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black text-[#7c3aed] uppercase bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        {cert.categoryLabel}
                      </span>
                      <span className="text-xs font-extrabold text-slate-500">
                        100% Completed
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">
                      {cert.courseTitle}
                    </h3>

                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Instructor: {cert.instructorName}
                    </p>
                  </div>

                  {/* Unlocked Buttons */}
                  <div className="pt-3 border-t border-slate-100 mt-auto flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(cert); }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(cert); }}
                      className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-100 font-extrabold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* ── FULL CARD BLURRED OVERLAY WHEN LOCKED (DEAD CENTER OF ENTIRE CARD) ── */}
              {!isUnlocked && (
                <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center text-white space-y-3.5 animate-fade-in">
                  
                  {/* SVG Circular Progress Ring with Lock Icon in Center */}
                  <CircularProgressLock progress={cert.progress} size={80} />

                  <div className="max-w-xs space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[11px] font-black uppercase tracking-wider">
                      <span>LOCKED CERTIFICATE</span>
                      <span className="text-white">({cert.progress}%)</span>
                    </div>

                    <h4 className="font-extrabold text-sm sm:text-base text-white leading-snug line-clamp-2">
                      {cert.courseTitle}
                    </h4>

                    {cert.id === 'c1' && (
                      <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                        Complete 100% course in My Learning to unlock certificate
                      </p>
                    )}
                  </div>

                  {cert.id === 'c1' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedCert(cert); }}
                      className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-purple-200" />
                      <span>Preview Locked Certificate</span>
                    </button>
                  )}

                </div>
              )}

            </Card>
          );
        })}
      </div>
      )}


      {/* ════════ RESPONSIVE OFFICIAL ASPIRE NEXT CERTIFICATE MODAL ════════ */}
      {selectedCert && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-sans cursor-default overflow-y-auto animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCert(null); }}
        >
          <div className="w-full max-w-2xl lg:max-w-3xl max-h-[92vh] bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col justify-between animate-scale-up relative my-auto">
            
            {/* Sticky Close Button */}
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 z-50 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Scrollable Document Area */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-[#fcfcfd] scrollbar-thin">
              
              {/* Responsive Double Brand Purple Ornate Border Frame */}
              <div className="border-[4px] sm:border-[6px] border-[#7c3aed] p-3 sm:p-6 rounded-xl sm:rounded-[1.25rem] bg-white shadow-inner">
                <div className="border border-dashed border-purple-300 p-4 sm:p-6 rounded-lg sm:rounded-xl relative">
                  
                  {/* Top Header: AspireNext Logo & Title */}
                  <div className="flex flex-col items-center text-center space-y-1.5 pb-4 sm:pb-5 border-b border-slate-100">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-[#7c3aed] p-0.5 shadow-md bg-white">
                      <img src={aspireLogo} alt="AspireNext Logo" className="w-full h-full object-cover rounded-full" />
                    </div>

                    <div>
                      <h2 className="font-black text-base sm:text-xl md:text-2xl text-slate-900 tracking-wider uppercase">
                        ASPIRE NEXT ACADEMY
                      </h2>
                      <p className="text-[9px] sm:text-[11px] font-black text-[#7c3aed] uppercase tracking-[0.2em] sm:tracking-[0.25em] mt-0.5">
                        INSTITUTE OF ADVANCED SOFTWARE ENGINEERING & AI
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="py-4 sm:py-6 text-center space-y-2.5 sm:space-y-3.5">
                    <span className="text-[10px] sm:text-xs font-black text-[#7c3aed] uppercase tracking-[0.25em]">
                      CERTIFICATE OF COMPLETION
                    </span>

                    <p className="text-[11px] sm:text-xs font-medium text-slate-500 italic">
                      This official accreditation is proudly awarded to
                    </p>

                    <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight text-gradient bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] bg-clip-text text-transparent py-0.5">
                      Aarav Sharma
                    </h1>

                    <p className="text-[11px] sm:text-xs font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
                      for successfully completing 100% of the coursework, practical projects, and assessment milestones for the professional track:
                    </p>

                    <h3 className="text-sm sm:text-lg md:text-xl font-extrabold text-slate-900 max-w-lg mx-auto leading-snug">
                      "{selectedCert.courseTitle}"
                    </h3>
                  </div>

                  {/* Signatures & Gold Seal Footer */}
                  <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-row items-center justify-between gap-2 sm:gap-4">
                    
                    {/* Instructor Signature */}
                    <div className="text-left">
                      <p className="font-serif italic text-xs sm:text-base text-slate-800 font-bold truncate max-w-[120px] sm:max-w-none">{selectedCert.instructorName}</p>
                      <div className="w-20 sm:w-28 h-0.5 bg-slate-300 my-1" />
                      <p className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">{selectedCert.instructorRole}</p>
                      <p className="text-[8px] sm:text-[10px] font-bold text-slate-500">Lead Instructor</p>
                    </div>

                    {/* Brand Official Seal Badge */}
                    <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] p-0.5 shadow-md flex items-center justify-center text-white text-center shrink-0 border border-white">
                      <div className="w-full h-full rounded-full border border-dashed border-white/40 flex flex-col items-center justify-center p-0.5">
                        <Award className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-tighter leading-none mt-0.5">VERIFIED</span>
                        <span className="text-[5px] sm:text-[6px] font-bold uppercase tracking-tighter">ASPIRE NEXT</span>
                      </div>
                    </div>

                    {/* Director Signature */}
                    <div className="text-right">
                      <p className="font-serif italic text-xs sm:text-base text-slate-800 font-bold">B.Kamalakar</p>
                      <div className="w-20 sm:w-28 h-0.5 bg-slate-300 my-1 ml-auto" />
                      <p className="text-[8px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Director of Academics</p>
                      <p className="text-[8px] sm:text-[10px] font-bold text-slate-500">AspireNext Academy</p>
                    </div>

                  </div>

                  {/* Verification Footer Bar */}
                  <div className="mt-4 sm:mt-5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400">
                    <span className="truncate">ID: {selectedCert.verifyId || 'CERT-AN-2026'}</span>
                    <span className="truncate">Verify: aspirenext.edu/verify</span>
                  </div>

                </div>
              </div>

              {/* ── LOCKED WATERMARK OVERLAY (IF PROGRESS < 100%) ── */}
              {selectedCert.progress < 100 && (
                <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-sm p-4 sm:p-8 flex flex-col items-center justify-center text-center text-white space-y-3 sm:space-y-4 animate-fade-in">
                  <CircularProgressLock progress={selectedCert.progress} size={72} />

                  <div className="max-w-md space-y-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                      CERTIFICATE LOCKED ({selectedCert.progress}% / 100%)
                    </span>
                    <h3 className="font-extrabold text-base sm:text-xl text-white">
                      Complete Course to Claim Certificate
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-medium">
                      You are currently at <strong>{selectedCert.progress}% progress</strong> for "{selectedCert.courseTitle}". Finish all course lessons to unlock your official signed AspireNext diploma.
                    </p>
                  </div>

                  <button
                    onClick={() => { setSelectedCert(null); navigate('learning'); }}
                    className="mt-1 py-2.5 px-5 sm:py-3 sm:px-6 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Go to My Learning ({selectedCert.progress}% done)</span>
                  </button>
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setSelectedCert(null)}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-xs transition-colors"
              >
                Close Preview
              </button>

              {selectedCert.progress >= 100 && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => handleDownload(selectedCert)}
                    className="py-2.5 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    onClick={() => handleShare(selectedCert)}
                    className="py-2.5 px-3 sm:px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-100 font-extrabold text-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Share</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
