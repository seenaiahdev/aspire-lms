import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase, MapPin, Clock, CheckCircle2, ArrowRight, XCircle, Search, Users, Calendar, Banknote, X, Check, Building2, ShieldCheck, Zap, Lock, ExternalLink
} from 'lucide-react';
import { fetchJobs, fetchPlacementResources, submitJobApplication, fetchJobApplications } from '@/lib/api';
import { useUser } from '@/lib/UserContext';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { Toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

import { placementSteps } from '@/lib/tourSteps';

export function PlacementScreen() {
  const { user } = useUser();
  const [activeFilter, setActiveFilter] = useState<'open' | 'applied' | 'closed' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [prepList, setPrepList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lockedToast, setLockedToast] = useState(false);

  const [applyJobTarget, setApplyJobTarget] = useState<any | null>(null);
  const [applicantName, setApplicantName] = useState(user?.name || '');
  const [applicantPhone, setApplicantPhone] = useState(user?.mobile || '');
  const [applicantResumeLink, setApplicantResumeLink] = useState('');
  const [applicantCoverLetter, setApplicantCoverLetter] = useState('');
  const [applicantAgreed, setApplicantAgreed] = useState(false);

  useEffect(() => {
    if (user) {
      setApplicantName(user.name || '');
      setApplicantPhone(user.mobile || '');
    }
  }, [user]);

  useEffect(() => {
    const loadJobsAndResources = async () => {
      setIsLoading(true);
      try {
        const [jobsData, dbApps, prepData] = await Promise.all([
          fetchJobs(user?.batchCategory || 'Weekday', user?.batchCode || ''),
          user?.id ? fetchJobApplications(user.id).catch(dbErr => {
            console.error('Failed to fetch job applications from DB:', dbErr);
            return [];
          }) : Promise.resolve([]),
          fetchPlacementResources()
        ]);
        
        let appliedJobIds: string[] = dbApps.map((a: any) => a.job_id);

        const savedApplied = localStorage.getItem('aspire_applied_jobs');
        const localAppliedMap = savedApplied ? JSON.parse(savedApplied) : {};
        const localAppliedIds = Object.keys(localAppliedMap);

        const mergedJobs = jobsData.map((job: any) => {
          if (appliedJobIds.includes(job.id) || localAppliedIds.includes(job.id)) {
            return { ...job, status: 'applied' as const };
          }
          return job;
        });

        setJobsList(mergedJobs);
        setPrepList(prepData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.batchCategory) {
      loadJobsAndResources();
    }  }, [user?.batchCategory, user?.batchCode, user?.id]);

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

  const filteredPrep = prepList.filter((r) => {
    return (
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.snippet.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleApplyJob = async (jobId: string, applicationDetails: any) => {
    setJobsList((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: 'applied' as const } : j))
    );

    const savedApplied = localStorage.getItem('aspire_applied_jobs');
    const appliedMap = savedApplied ? JSON.parse(savedApplied) : {};
    appliedMap[jobId] = {
      appliedAt: new Date().toISOString(),
      ...applicationDetails
    };
    localStorage.setItem('aspire_applied_jobs', JSON.stringify(appliedMap));

    if (user?.id) {
      try {
        await submitJobApplication({
          student_id: user.id,
          job_id: jobId,
          full_name: applicationDetails.name,
          contact_number: applicationDetails.phone,
          resume_link: applicationDetails.resumeLink,
          cover_letter: applicationDetails.coverLetter
        });
      } catch (dbErr) {
        console.error('Failed to submit job application to Supabase:', dbErr);
      }
    }

    const targetJob = jobsList.find(j => j.id === jobId);
    if (targetJob) {
      setSelectedJob((prev: any) => prev?.id === jobId ? { ...prev, status: 'applied' } : prev);
      setToastMessage(`Application submitted successfully for ${targetJob.role} at ${targetJob.company}.`);
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
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {filteredJobs.map((job, index) => {
               const isLocked = job.isLocked;
               const isOpen = job.status === 'open';
               const isApplied = job.status === 'applied';
               const isClosed = job.status === 'closed';

               return (
                 <Card
                   key={job.id}
                   id={index === 0 ? 'tour-placement-card-0' : undefined}
                   className={cn(
                     "group p-6 bg-white border border-slate-200/90 rounded-[1.8rem] shadow-sm flex flex-col justify-between h-full cursor-pointer hover:shadow-md transition-all duration-300",
                     isLocked 
                       ? "opacity-90 grayscale-[20%] border-slate-200/60 bg-slate-50/50 cursor-not-allowed"
                       : "hover:border-slate-350 hover:bg-white"
                   )}
                   onClick={() => {
                     if (isLocked) {
                       setLockedToast(true);
                       setTimeout(() => setLockedToast(false), 3000);
                     } else {
                       setSelectedJob(job);
                     }
                   }}
                 >
                   {/* Top: Logo (Hover), Company, Status */}
                   <div>
                     <div className="flex justify-between items-start mb-3">
                       <div className="flex flex-col">
                         <div className="h-0 opacity-0 overflow-hidden group-hover:h-8 group-hover:opacity-100 group-hover:mb-2 transition-all duration-300">
                           <img
                             src={job.logo}
                             alt={job.company}
                             loading="lazy"
                             className="h-8 object-contain rounded-md"
                           />
                         </div>
                         <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{job.company}</span>
                       </div>
                       
                       {isLocked ? (
                         <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-200 flex items-center gap-1">
                           <Lock className="w-3 h-3" /> Locked
                         </span>
                       ) : isOpen ? (
                         <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                           Apply Now
                         </span>
                       ) : isApplied ? (
                         <span className="px-2.5 py-1 rounded-full bg-purple-50 text-[#7c3aed] text-[10px] font-black uppercase tracking-wider border border-purple-100">
                           Applied
                         </span>
                       ) : (
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
                        <span className="truncate">Apply by Sep 30, 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: View Details Button */}
                  <div className="pt-4 border-t border-slate-100 mt-auto flex justify-end">
                    {isApplied ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-200 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Applied</span>
                      </button>
                    ) : isClosed ? (
                      <button 
                        disabled
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Closed</span>
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Apply Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                  <img src={selectedJob.logo} alt={selectedJob.company} loading="lazy" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{selectedJob.company}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      selectedJob.status === 'open' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      selectedJob.status === 'applied' ? "bg-purple-50 text-[#7c3aed] border-purple-100" :
                      "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {selectedJob.status === 'open' ? 'Apply Now' : selectedJob.status === 'applied' ? 'Applied' : 'Closed'}
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
                    <span key={skill} className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 text-xs font-extrabold flex items-center shadow-2xs">
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
                  onClick={() => setApplyJobTarget(selectedJob)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
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

      {/* ════════ JOB APPLICATION FORM MODAL ════════ */}
      {applyJobTarget && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans cursor-default overflow-y-auto animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setApplyJobTarget(null); }}
        >
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col justify-between animate-scale-up relative my-auto p-6 space-y-6">
            
            <div className="text-center space-y-2">
              {applyJobTarget.logo ? (
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center p-2 mx-auto shadow-sm overflow-hidden shrink-0">
                  <img src={applyJobTarget.logo} alt={applyJobTarget.company} loading="lazy" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-50 text-[#7c3aed] flex items-center justify-center border border-purple-100 mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Apply to {applyJobTarget.company}</h3>
              <p className="text-xs text-slate-500">Role: <span className="font-bold text-slate-700">{applyJobTarget.role}</span> ({applyJobTarget.type})</p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleApplyJob(applyJobTarget.id, {
                  name: applicantName,
                  phone: applicantPhone,
                  resumeLink: applicantResumeLink,
                  coverLetter: applicantCoverLetter,
                  agreed: applicantAgreed
                });
                setApplyJobTarget(null);
                setSelectedJob(null); // Close sidebar too
                setApplicantResumeLink('');
                setApplicantCoverLetter('');
                setApplicantAgreed(false);
              }}
              className="space-y-4 text-left"
            >
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={applicantName} 
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                />
              </div>

              {/* Contact Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Contact Number</label>
                <input 
                  type="text" 
                  required 
                  value={applicantPhone} 
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  placeholder="Enter contact number"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                />
              </div>

              {/* Resume Google Drive Link */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#7c3aed] uppercase tracking-wider block">Resume Google Drive Link</label>
                <input 
                  type="url" 
                  required 
                  value={applicantResumeLink} 
                  onChange={(e) => setApplicantResumeLink(e.target.value)}
                  placeholder="e.g. https://drive.google.com/..."
                  className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed] bg-purple-50/20"
                />
              </div>

              {/* Statement / Message */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Why are you a good fit? (Optional)</label>
                <textarea 
                  rows={3}
                  value={applicantCoverLetter} 
                  onChange={(e) => setApplicantCoverLetter(e.target.value)}
                  placeholder="Tell the recruiter about your projects, skills, or experience..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                />
              </div>

              {/* Confirm checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input 
                  type="checkbox" 
                  id="applicantAgreed"
                  required
                  checked={applicantAgreed} 
                  onChange={(e) => setApplicantAgreed(e.target.checked)}
                  className="w-4 h-4 text-[#7c3aed] focus:ring-[#7c3aed] border-slate-200 rounded mt-0.5"
                />
                <label htmlFor="applicantAgreed" className="text-[11px] font-medium text-slate-500 leading-snug cursor-pointer select-none">
                  I agree to share my student profile, attendance records, project submissions, and grades with the recruiters at {applyJobTarget.company}.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplyJobTarget(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] hover:brightness-110 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Application</span>
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ CUSTOM TOAST NOTIFICATION ════════ */}
      {lockedToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up pointer-events-none">
          <div className="flex items-center gap-4 px-5 py-3.5 bg-[#090b14]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 shrink-0 shadow-inner">
              <Lock className="w-5 h-5 text-purple-300" />
            </div>
            <div className="pr-2">
              <h4 className="font-black text-sm text-slate-50 tracking-wide uppercase">Placement Hub Locked</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Job applications will unlock in Stage 4.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
