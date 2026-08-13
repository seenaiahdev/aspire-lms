import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase, MapPin, Clock, CheckCircle2, ArrowRight, XCircle, Search, Sparkles, Users, Calendar, Banknote, X, Check, Building2, ShieldCheck, Zap, Lock
} from 'lucide-react';
import { jobOpportunities } from '@/data/mock';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { Toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

import { placementSteps } from '@/lib/tourSteps';

function TechStackSvg({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const n = name.toLowerCase();

  if (n.includes('react')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="20" fill="#61dafb" />
        <g fill="none" stroke="#61dafb" strokeWidth="10">
          <ellipse cx="64" cy="64" rx="48" ry="16" />
          <ellipse cx="64" cy="64" rx="48" ry="16" transform="rotate(60 64 64)" />
          <ellipse cx="64" cy="64" rx="48" ry="16" transform="rotate(120 64 64)" />
        </g>
      </svg>
    );
  }

  if (n.includes('typescript') || n.includes('ts')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <rect width="128" height="128" rx="24" fill="#3178C6" />
        <path fill="#fff" d="M36 36h56v14H52v42H36V36zm36 32h24v14H72v-14z" />
      </svg>
    );
  }

  if (n.includes('js') || n.includes('javascript')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <rect width="128" height="128" rx="24" fill="#F7DF1E" />
        <path fill="#000" d="M96.6 92.9c-1.6 3-3.4 5.5-7 7.2-3.6 1.7-7.4 1.3-9.8.7-1.2-.3-2.4-1-3.4-2.3l7.2-4.3c.6 1 1.1 1.6 2 1.9 1 .3 2 .1 2.8-.8.8-.9 1.1-2.3.6-3.9l-10.1-27c-.5-1.4-1.4-2.5-3.2-2.5-1.4 0-2.4.5-3.2 1.6L66 84.6c-.5 1.1-.6 2-.2 2.7.5.8 1.4 1.3 2.8 1.5 1.4.2 2.8-.1 3.9-.9 1-.8 1.6-2 1.6-3.3V64h11v28.9zM54.3 92.9c-1.6 3-3.4 5.5-7 7.2-3.6 1.7-7.4 1.3-9.8.7-1.2-.3-2.4-1-3.4-2.3l7.2-4.3c.6 1 1.1 1.6 2 1.9 1 .3 2 .1 2.8-.8.8-.9 1.1-2.3.6-3.9l-10.1-27c-.5-1.4-1.4-2.5-3.2-2.5-1.4 0-2.4.5-3.2 1.6L23.7 84.6c-.5 1.1-.6 2-.2 2.7.5.8 1.4 1.3 2.8 1.5 1.4.2 2.8-.1 3.9-.9 1-.8 1.6-2 1.6-3.3V64h11v28.9z" />
      </svg>
    );
  }

  if (n.includes('tailwind')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <path fill="#06B6D4" d="M30 48c18 0 28-9 30-24h18c-5 28-26 32-48 32-7 0-14-.9-20-2.5V48zm0 32c18 0 28-9 30-24h18c-5 28-26 32-48 32-7 0-14-.9-20-2.5V80z" />
      </svg>
    );
  }

  if (n.includes('python')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <path fill="#3776AB" d="M42 15c-1-1-4-2-8-2H26c-5 0-8 3-8 8v14c0 5 4 8 8 8h6c3 0 5 2 5 5v10c0 5-3 8-8 8H26c-5 0-8 4-8 8v14c0 5 3 8 8 8h10c4 0 7-1 8-2 0 0 3-2 3-7v-9c0-8 7-14 15-14h14c8 0 15-6 15-14V39c0-8-7-14-15-14H59c-8 0-15 6-15 14v6c0 4-3 7-7 7H42z" />
        <circle cx="38" cy="32" r="6" fill="#ffd43b" />
      </svg>
    );
  }

  if (n.includes('tensorflow') || n.includes('scikit') || n.includes('ml')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <path fill="#FF6F00" d="M28 30h40v14H43v50H28V30zM60 84h40V70H65V36H60v48z" />
      </svg>
    );
  }

  if (n.includes('node')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <path fill="#339933" d="M64 10L15 36v56l49 26 49-26V36L64 10zm0 18l30 16v38L64 96 34 82V44l30-16z" />
      </svg>
    );
  }

  if (n.includes('aws') || n.includes('cloud')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <path fill="#FF9900" d="M32 64c0-18 14-32 32-32s32 14 32 32H32z" />
        <path fill="#232F3E" d="M24 70h80c0 22-18 40-40 40S24 92 24 70z" />
      </svg>
    );
  }

  if (n.includes('postgres') || n.includes('sql')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="56" fill="#336791" />
        <path fill="#fff" d="M44 82c0-22 18-40 40-40v20c-11 0-20 9-20 20H44z" />
      </svg>
    );
  }

  if (n.includes('docker') || n.includes('container')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <path fill="#2496ED" d="M22 76h84v18H22z" />
        <path fill="#2496ED" d="M38 40h14v16H38zm18 0h14v16H74z" />
      </svg>
    );
  }

  if (n.includes('html') || n.includes('html5')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <path fill="#E34F26" d="M24 10h80l-8 84L64 118 32 94 24 10z" />
        <path fill="#fff" d="M64 88l21-10 2-24H64V44h20l-1 16-14 5v10l22 6-2 22-32 9-32-9-2-22 22-6V59H44V44h20v12z" />
      </svg>
    );
  }

  if (n.includes('redis')) {
    return (
      <svg className={className} viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="54" fill="#DC382D" />
        <path fill="#fff" d="M36 42h56v14H36V42zm0 20h56v14H36V62zm0 20h40v14H36V82z" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 128 128">
      <rect width="128" height="128" rx="28" fill="#64748b" />
      <path fill="#fff" d="M38 56h52v8H38zm0 16h38v8H38z" />
    </svg>
  );
}

export function PlacementScreen() {
  const [activeFilter, setActiveFilter] = useState<'open' | 'applied' | 'closed' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobsList, setJobsList] = useState<typeof jobOpportunities>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalCount = jobsList.length;
  const appliedCount = jobsList.filter((j) => j.status === 'applied').length;
  const openCount = jobsList.filter((j) => j.status === 'open').length;
  const closedCount = jobsList.filter((j) => j.status === 'closed').length;

  const filteredJobs = jobsList.filter((j) => {
    const matchesFilter = activeFilter === 'all' ? true : j.status === activeFilter;
    const matchesSearch =
      j.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleApplyJob = (jobId: string) => {
    setJobsList((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: 'applied' as const } : j))
    );
    const targetJob = jobsList.find(j => j.id === jobId);
    if (targetJob) {
      setSelectedJob((prev: any) => prev?.id === jobId ? { ...prev, status: 'applied' } : prev);
      setToastMessage(`Application submitted successfully for ${targetJob.role} at ${targetJob.company}! 🎉`);
    }
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">

      
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} position="top-right" />
      )}

      {/* Header Banner */}
      <div id="tour-placement-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-[2rem] bg-white border border-slate-200/90 shadow-xs">
        <div>
          <span className="inline-block px-3 py-1 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider mb-2">
            CAREER & PLACEMENT PORTAL
          </span>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Job Opportunities & Applications
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Explore available engineering roles, submit direct applications, and track closed positions.
          </p>
        </div>

        <SearchInput
          id="tour-placement-search"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search jobs, roles, location..."
          className="w-full sm:w-80"
        />
      </div>


      {/* 4 Primary Job Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Open Jobs */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Clock className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{openCount}</p>
            <p className="text-xs font-extrabold text-emerald-600">Open Jobs</p>
          </div>
        </Card>

        {/* Applied Jobs */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
            <CheckCircle2 className="w-5.5 h-5.5 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{appliedCount}</p>
            <p className="text-xs font-extrabold text-[#7c3aed]">Applied Jobs</p>
          </div>
        </Card>

        {/* Closed Jobs */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
            <XCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{closedCount}</p>
            <p className="text-xs font-extrabold text-slate-500">Closed Jobs</p>
          </div>
        </Card>

        {/* Total Jobs */}
        <Card className="p-4 bg-white border border-slate-200/90 shadow-2xs rounded-2xl flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
            <Briefcase className="w-5.5 h-5.5 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{totalCount}</p>
            <p className="text-xs font-extrabold text-slate-500">Total Jobs</p>
          </div>
        </Card>

      </div>


      {/* Filter Tabs Row (4 Tabs: Open, Applied, Closed, All) */}
      <div className="border-b border-slate-200/80 pb-3">
        <Tabs
          id="tour-placement-tabs"
          variant="pills"
          tabs={[
            { id: 'open', label: `Open Jobs (${openCount})` },
            { id: 'applied', label: `Applied Jobs (${appliedCount})` },
            { id: 'closed', label: `Closed Jobs (${closedCount})` },
            { id: 'all', label: `All Jobs (${totalCount})` },
          ]}
          active={activeFilter}
          onChange={(id) => setActiveFilter(id as any)}
        />
      </div>


      {/* Job Opportunities Square Cards Grid */}
      <div>
        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {filteredJobs.map((job, index) => {
              const isOpen = job.status === 'open';
              const isApplied = job.status === 'applied';
              const isClosed = job.status === 'closed';

              return (
                <Card
                  key={job.id}
                  id={index === 0 ? 'tour-placement-card-0' : undefined}
                  className="group p-6 bg-white border border-slate-200/90 rounded-[1.8rem] shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between h-full cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                >
                  {/* Top: Logo (Hover), Company, Status */}
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <div className="h-0 opacity-0 overflow-hidden group-hover:h-8 group-hover:opacity-100 group-hover:mb-2 transition-all duration-300">
                          <img
                            src={job.logo}
                            alt={job.company}
                            className="h-8 object-contain rounded-md"
                          />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{job.company}</span>
                      </div>
                      
                      {isOpen && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-100">
                          Hiring in Progress
                        </span>
                      )}
                      {isApplied && (
                        <span className="px-2.5 py-1 rounded-full bg-purple-50 text-[#7c3aed] text-[10px] font-black uppercase tracking-wider border border-purple-100">
                          Applied
                        </span>
                      )}
                      {isClosed && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider border border-rose-100">
                          Closed
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-[#7c3aed] mb-5 leading-snug transition-colors">
                      {job.role}
                    </h3>

                    {/* 2x2 Grid details */}
                    <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs font-semibold text-slate-600 mb-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#7c3aed] shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-[#7c3aed] shrink-0" />
                        <span className="truncate">{job.salary}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#7c3aed] shrink-0" />
                        <span className="truncate">Openings: 3</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#7c3aed] shrink-0" />
                        <span className="truncate">Apply by 2025-11-20</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: View Details Button */}
                  <div className="pt-4 border-t border-slate-100 mt-auto flex justify-end">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-[2rem] border border-slate-200 space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Placement Hub Locked</h3>
            <p className="text-xs font-medium text-slate-500">Complete your courses and certifications to unlock job opportunities.</p>
          </div>
        )}
      </div>

      {/* ════════ JOB DETAILS & APPLY MODAL OVERLAY ════════ */}
      {selectedJob && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fade-in cursor-default"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedJob(null); }}
        >
          <div className="w-full max-w-xl bg-white h-[100dvh] shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-left font-sans">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-sm">
                  <img src={selectedJob.logo} alt={selectedJob.company} className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{selectedJob.company}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      selectedJob.status === 'open' ? "bg-amber-50 text-amber-700 border-amber-100" :
                      selectedJob.status === 'applied' ? "bg-purple-50 text-[#7c3aed] border-purple-100" :
                      "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {selectedJob.status === 'open' ? 'Hiring in Progress' : selectedJob.status === 'applied' ? 'Applied' : 'Closed'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-xl text-slate-900 mt-1 leading-tight">
                    {selectedJob.role}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* Meta Grid Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Location</p>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5">{selectedJob.location}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Package</p>
                  <p className="text-xs font-extrabold text-[#7c3aed] mt-0.5">{selectedJob.salary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Openings</p>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5">3 Positions</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Deadline</p>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5">Nov 20, 2025</p>
                </div>
              </div>

              {/* Role Overview */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Role Description & Overview</h4>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {selectedJob.company} is hiring a {selectedJob.role} to join our high-impact engineering team. 
                  You will design, develop, and optimize core features, collaborate with senior architects, and ship scalable production code.
                </p>
              </div>

              {/* Key Responsibilities */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Key Responsibilities</h4>
                <ul className="space-y-2 text-xs font-semibold text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                    <span>Architect and maintain clean, scalable web components and API integrations.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                    <span>Write automated unit/integration tests and participate in technical peer code reviews.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                    <span>Collaborate closely with UI/UX designers, product managers, and backend engineers.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                    <span>Optimize web performance, rendering latency, and SEO metrics.</span>
                  </li>
                </ul>
              </div>

              {/* Required Skills & Tech Stack */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Required Tech Stack & Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.skills.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                      <TechStackSvg name={skill} className="w-4 h-4" />
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Company Perks */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border border-purple-100/80 space-y-2">
                <div className="flex items-center gap-2 text-[#7c3aed] font-extrabold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Company Perks & Benefits</span>
                </div>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Competitive ESOP packages, health insurance coverage, remote work options, learning allowance, and hardware equipment.
                </p>
              </div>

            </div>

            {/* Modal Bottom CTA Bar */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center gap-3">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-xs transition-colors"
              >
                Close
              </button>

              {selectedJob.status === 'open' ? (
                <button
                  onClick={() => handleApplyJob(selectedJob.id)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Apply</span>
                </button>
              ) : selectedJob.status === 'applied' ? (
                <button
                  disabled
                  className="flex-1 py-3 px-6 rounded-2xl bg-purple-50 text-[#7c3aed] border border-purple-200 font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#7c3aed]" />
                  <span>Application Submitted</span>
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 py-3 px-6 rounded-2xl bg-slate-200 text-slate-500 font-extrabold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Applications Closed</span>
                </button>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
