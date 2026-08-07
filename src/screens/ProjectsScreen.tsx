import { useEffect, useMemo, useState } from 'react';
import {
  FolderGit2, Star, Clock, CheckCircle2, MessageCircle, Download,
  FileText, BookOpen, ArrowRight, Code2, Terminal, ExternalLink, Link2,
} from 'lucide-react';
import { projects } from '@/data/mock';
import { Toast } from '@/components/ui/Toast';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { DifficultyBadge } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { triggerFileDownload } from '@/lib/downloadHelper';
import { cn } from '@/lib/utils';

const VSCODE_WORKSPACE_PATH = 'c:/Users/Seenaiah/Downloads/lms/project';

type ProjectGuide = {
  brief: string;
  techStack: string[];
  fileStructure: { path: string; purpose: string }[];
  functions: string[];
  workflow: { action: string; event: string; calls: string[]; result: string }[];
  buildSteps: string[];
  tips: string[];
};

const projectGuides: Record<string, ProjectGuide> = {
  p1: {
    brief: 'Build a simple login and signup page using HTML, CSS, and JavaScript that shows a welcome message after successful sign in.',
    techStack: ['HTML5', 'CSS3', 'JavaScript'],
    fileStructure: [
      { path: 'index.html', purpose: 'Login and signup form layout' },
      { path: 'style.css', purpose: 'Clean responsive UI styling' },
      { path: 'script.js', purpose: 'Button clicks, validation, and welcome message logic' },
    ],
    functions: [
      'handleLoginClick',
      'handleSignupClick',
      'validateForm',
      'showWelcomeMessage',
      'resetForm',
    ],
    workflow: [
      {
        action: 'User fills login or signup form',
        event: 'oninput',
        calls: ['validateForm()'],
        result: 'Check if required fields are filled correctly.',
      },
      {
        action: 'User clicks Login',
        event: 'onclick on Login button',
        calls: ['handleLoginClick()', 'validateForm()', 'showWelcomeMessage()'],
        result: 'Hide the form and show the welcome message.',
      },
    ],
    buildSteps: [
      'Create a simple login and signup form in HTML.',
      'Style the page with CSS for a clean and responsive layout.',
      'Attach onclick handlers in JavaScript for Login, Signup, and Reset.',
    ],
    tips: [
      'Keep the UI simple so students can focus on the flow.',
      'Show a welcome message clearly after successful submit.',
    ],
  },
  p2: {
    brief: 'Train an image classifier, show predictions, and make the result easy to demo.',
    techStack: ['Python', 'TensorFlow', 'FastAPI', 'React', 'Tailwind CSS'],
    fileStructure: [
      { path: 'src/app/UploadImage.tsx', purpose: 'Upload and preview image file' },
      { path: 'src/app/PredictionCard.tsx', purpose: 'Show predicted label and confidence' },
      { path: 'backend/main.py', purpose: 'API for model inference' },
    ],
    functions: ['handleImageUpload', 'predictImage', 'loadModel', 'formatPrediction'],
    buildSteps: [
      'Prepare dataset and train model.',
      'Wrap inference in FastAPI endpoints.',
      'Connect React frontend to prediction API.',
    ],
    tips: ['Use clear loading spinners during model inference.'],
  },
  p3: {
    brief: 'Document a real-time chat system with clear components, APIs, and trade-offs.',
    techStack: ['System Architecture', 'WebSocket', 'Redis', 'Docker'],
    fileStructure: [
      { path: 'docs/architecture.md', purpose: 'High-level design and diagrams' },
      { path: 'src/server/websocket.ts', purpose: 'Live message handling' },
    ],
    functions: ['handleSendMessage', 'syncMessageDelivery', 'trackPresence'],
    buildSteps: ['Define users and message data structures.', 'Setup WebSocket listeners.'],
    tips: ['Document trade-offs explicitly.'],
  },
};

export function ProjectsScreen() {
  const [mainCategory, setMainCategory] = useState<'mini' | 'major' | 'capstone' | 'templates'>('mini');
  const [subTab, setSubTab] = useState<'assigned' | 'submitted' | 'feedback'>('assigned');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [driveLinks, setDriveLinks] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('projectDriveLinks') || '{}');
    } catch {
      return {};
    }
  });

  const [projectsState, setProjectsState] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('projectsState');
      const parsed = raw ? JSON.parse(raw) : projects;
      return parsed;
    } catch {
      return projects;
    }
  });

  const [toastVisible, setToastVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const [draftLink, setDraftLink] = useState('');

  // Synchronize effective projects list with driveLinks
  const effectiveProjects = useMemo(() => {
    return projectsState.map((p: any) => {
      const hasLink = Boolean(driveLinks[p.id]);
      if (hasLink && p.status === 'assigned') {
        return { ...p, status: 'submitted' as const };
      }
      return p;
    });
  }, [projectsState, driveLinks]);

  useEffect(() => {
    localStorage.setItem('projectDriveLinks', JSON.stringify(driveLinks));
  }, [driveLinks]);

  useEffect(() => {
    try {
      localStorage.setItem('projectsState', JSON.stringify(projectsState));
    } catch {}
  }, [projectsState]);

  // Category & Sub-Tab Filtering
  const categoryProjects = useMemo(() => {
    if (mainCategory === 'templates') return [];
    return effectiveProjects.filter((p: any) => (p.projectType || 'mini') === mainCategory);
  }, [effectiveProjects, mainCategory]);

  const filtered = useMemo(() => {
    if (mainCategory === 'templates') return [];
    return categoryProjects.filter((p: any) => {
      if (subTab === 'assigned') return p.status === 'assigned';
      if (subTab === 'submitted') return p.status === 'submitted' || p.status === 'completed';
      if (subTab === 'feedback') return p.status === 'feedback';
      return true;
    });
  }, [categoryProjects, mainCategory, subTab]);

  const assignedCount = categoryProjects.filter((p: any) => p.status === 'assigned').length;
  const submittedCount = categoryProjects.filter((p: any) => p.status === 'submitted' || p.status === 'completed').length;
  const feedbackCount = categoryProjects.filter((p: any) => p.status === 'feedback').length;

  const selectedProject = useMemo(
    () => effectiveProjects.find((p: any) => p.id === selectedProjectId) || null,
    [selectedProjectId, effectiveProjects]
  );
  const selectedGuide = selectedProject ? (projectGuides[selectedProject.id] || {
    brief: selectedProject.description,
    techStack: selectedProject.skills,
    fileStructure: [{ path: 'src/App.tsx', purpose: 'Main component layout' }],
    functions: ['renderApp', 'handleSubmit'],
    workflow: [{ action: 'User opens app', event: 'onload', calls: ['renderApp()'], result: 'Render page view' }],
    buildSteps: ['Setup project repository', 'Build core feature logic', 'Submit drive link'],
    tips: ['Test code thoroughly before submitting drive link.']
  }) : undefined;

  useEffect(() => {
    const syncProjectRoute = () => {
      const [baseRoute, projectId] = window.location.pathname.replace(/^\//, '').split('/');
      if (baseRoute !== 'projects' || !projectId) {
        setSelectedProjectId(null);
        return;
      }
      const matched = effectiveProjects.find((p: any) => p.id === projectId);
      if (matched) {
        setSelectedProjectId(matched.id);
      }
    };

    syncProjectRoute();
    window.addEventListener('popstate', syncProjectRoute);
    return () => window.removeEventListener('popstate', syncProjectRoute);
  }, [effectiveProjects]);

  useEffect(() => {
    if (selectedProject) {
      setDraftLink(driveLinks[selectedProject.id] || '');
    } else {
      setDraftLink('');
    }
  }, [selectedProject, driveLinks]);

  const isSaved = selectedProject ? Boolean(driveLinks[selectedProject.id]) : false;

  const isValidLink = (() => {
    const v = draftLink.trim();
    if (!v) return false;
    try {
      const u = new URL(v);
      return Boolean(u.protocol && u.hostname);
    } catch {
      return false;
    }
  })();

  const openProjectDetail = (projectId: string) => {
    setSelectedProjectId(projectId);
    window.history.pushState({}, '', `/projects/${projectId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeProjectDetail = () => {
    setSelectedProjectId(null);
    window.history.pushState({}, '', '/projects');
  };

  const saveDriveLink = () => {
    if (!selectedProject) return;
    const trimmed = draftLink.trim();
    try {
      new URL(trimmed);
      const updatedDriveLinks = { ...driveLinks, [selectedProject.id]: trimmed };
      setDriveLinks(updatedDriveLinks);
      localStorage.setItem('projectDriveLinks', JSON.stringify(updatedDriveLinks));

      const updatedProjects = projectsState.map((p: any) =>
        p.id === selectedProject.id ? { ...p, status: 'submitted' } : p
      );
      setProjectsState(updatedProjects);
      localStorage.setItem('projectsState', JSON.stringify(updatedProjects));

      setSubTab('submitted');
      setToastVisible(true);
      setTouched(false);
    } catch {
      setTouched(true);
    }
  };

  if (selectedProject && selectedGuide) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in font-sans">
        {toastVisible && (
          <Toast message="Project submitted — we'll notify you when feedback arrives." onClose={() => setToastVisible(false)} position="top-right" />
        )}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={closeProjectDetail}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to projects
          </button>

          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={selectedProject.difficulty} />
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 capitalize shadow-2xs">
              {selectedProject.status}
            </span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="px-3 py-1 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider">
                {selectedProject.projectType || 'mini'} project
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{selectedProject.title}</h2>
              <p className="text-sm text-slate-500 leading-relaxed">{selectedGuide.brief}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {(selectedGuide.techStack || []).map((item) => (
                  <span key={item} className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Course</p>
                <p className="mt-1 text-xs font-bold text-slate-900 leading-snug">{selectedProject.course}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Due Date</p>
                <p className="mt-1 text-xs font-bold text-slate-900 leading-snug">{selectedProject.dueDate}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</p>
                <p className="mt-1 text-xs font-bold text-[#7c3aed] capitalize leading-snug">{selectedProject.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════ DETAILED PROJECT BRIEF & SPECIFICATIONS ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Brief Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Overview & Requirements */}
            <Card className="p-6 sm:p-7 border border-slate-200/90 shadow-sm rounded-[2rem] bg-white space-y-5">
              <div>
                <div className="flex items-center gap-2 text-[#7c3aed] text-xs font-black uppercase tracking-wider mb-1">
                  <FileText className="w-4 h-4" />
                  <span>PROJECT BRIEF & OBJECTIVES</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Project Overview</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2">
                  {selectedGuide.brief} Develop a production-ready solution adhering to industry coding standards, modular component organization, and clean user experience.
                </p>
              </div>

              {/* Requirements Checklist */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Key Functional Requirements</h4>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Responsive UI & Modern Layout</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">Ensure seamless experience across mobile, tablet, and desktop viewports.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Input Validation & State Handling</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">Implement validation rules, error feedback, and loading states for async actions.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Clean Code & Version Control</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">Submit clean code with meaningful commit messages and proper file structuring.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Implementation Steps */}
              {selectedGuide.buildSteps && selectedGuide.buildSteps.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Recommended Implementation Steps</h4>
                  <div className="space-y-2">
                    {selectedGuide.buildSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs font-medium text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-[#7c3aed] font-black text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

          </div>

          {/* Sidebar Info (1 Col): Evaluation Rubric & Tips */}
          <div className="space-y-6">
            
            {/* Evaluation Rubric */}
            <Card className="p-6 border border-slate-200/90 shadow-sm rounded-[2rem] bg-white space-y-4">
              <div className="flex items-center gap-2 text-[#7c3aed] text-xs font-black uppercase tracking-wider">
                <Star className="w-4 h-4" />
                <span>EVALUATION RUBRIC</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800">UI/UX & Responsiveness</span>
                    <span className="text-[#7c3aed]">35%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#7c3aed] rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800">Functionality & Logic</span>
                    <span className="text-[#7c3aed]">35%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#7c3aed] rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800">Code Quality & Cleanliness</span>
                    <span className="text-[#7c3aed]">30%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#7c3aed] rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Pro Tips */}
            {selectedGuide.tips && selectedGuide.tips.length > 0 && (
              <Card className="p-6 border border-amber-200/80 shadow-2xs rounded-[2rem] bg-amber-50/50 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>MENTOR PRO TIPS</span>
                </div>
                <ul className="space-y-2 text-xs font-medium text-amber-900/90 leading-relaxed list-disc list-inside">
                  {selectedGuide.tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </Card>
            )}

          </div>

        </div>

        {/* Submission Link Bar */}
        <Card className="p-6 border border-slate-200/90 shadow-sm rounded-[2rem] bg-white">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Project Submission Link</p>
              <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                <Link2 className="w-4 h-4 text-[#7c3aed]" />
                <span>Paste your Google Drive or GitHub repository link below.</span>
              </div>
            </div>

            <div className="min-w-0 w-full lg:w-[320px]">
              <input
                value={draftLink}
                onChange={(e) => { setDraftLink(e.target.value); setTouched(true); }}
                placeholder="https://drive.google.com/..."
                readOnly={isSaved}
                disabled={isSaved}
                className={cn(
                  "w-full rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition border",
                  isSaved 
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : isValidLink 
                    ? 'border-emerald-300 bg-emerald-50/50 text-slate-900' 
                    : 'border-slate-200 focus:border-[#7c3aed] bg-white'
                )}
              />
            </div>
            {isSaved ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-extrabold text-xs shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Submitted & Saved</span>
              </div>
            ) : (
              <Button onClick={saveDriveLink} disabled={!isValidLink} className="bg-[#7c3aed] text-white font-extrabold text-xs" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Submit Project
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12 animate-fade-in">
      
      {/* Header */}
      <div className="pb-2">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Projects Workflow
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Inspect project briefs, build industry solutions, and submit drive links for mentor reviews.
        </p>
      </div>



      {/* ════════ 1. TOP-LEVEL CATEGORY TABS ════════ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {[
          { id: 'mini', label: 'Mini Projects' },
          { id: 'major', label: 'Major Projects' },
          { id: 'capstone', label: 'Capstone Projects' },
          { id: 'templates', label: 'Templates' },
        ].map((cat) => {
          const isActive = mainCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setMainCategory(cat.id as any)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-xs font-black tracking-wide transition-all duration-200 cursor-pointer shadow-2xs border shrink-0",
                isActive
                  ? "bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#8b5cf6] text-white border-transparent shadow-md scale-[1.02]"
                  : "bg-white hover:bg-purple-50/50 text-slate-600 hover:text-[#7c3aed] border-slate-200 hover:border-purple-200"
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ════════ 2. SUB-TABS (ASSIGNED / SUBMITTED / MENTOR FEEDBACK) ════════ */}
      {mainCategory !== 'templates' && (
        <div className="space-y-6">
          <Tabs
            variant="pills"
            tabs={[
              { id: 'assigned', label: `Assigned (${assignedCount})` },
              { id: 'submitted', label: `Submitted (${submittedCount})` },
              { id: 'feedback', label: `Mentor Feedback (${feedbackCount})` },
            ]}
            active={subTab}
            onChange={(val) => setSubTab(val as any)}
          />

          {/* PROJECTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.length === 0 ? (
              <div className="col-span-full">
                <Card className="p-12 text-center bg-white border border-slate-200 rounded-[2rem]">
                  <FolderGit2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-extrabold text-slate-800 text-base">No Projects Found</h3>
                  <p className="text-xs text-slate-500 mt-1">There are no {subTab} projects in this category currently.</p>
                </Card>
              </div>
            ) : (
              filtered.map((p) => (
                <Card 
                  key={p.id} 
                  hover 
                  className="group p-6 cursor-pointer rounded-[2rem] border border-slate-200/90 bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  onClick={() => openProjectDetail(p.id)}
                >
                  <div>
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                          <FolderGit2 className="w-6 h-6 text-[#7c3aed]" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-[#7c3aed] transition-colors">{p.title}</h3>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">{p.course}</p>
                        </div>
                      </div>
                      <DifficultyBadge difficulty={p.difficulty} />
                    </div>

                    <p className="text-xs font-medium text-slate-600 mb-4 leading-relaxed line-clamp-2">{p.description}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.skills.map((s: string) => (
                        <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Mentor Feedback Banner */}
                    {p.status === 'feedback' && p.mentorFeedback && (
                      <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 mb-4">
                        <p className="text-xs font-extrabold text-[#7c3aed] mb-1">Mentor Feedback</p>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">{p.mentorFeedback}</p>
                        {p.grade && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#7c3aed] rounded-full" style={{ width: `${p.grade}%` }} />
                            </div>
                            <span className="text-xs font-extrabold text-[#7c3aed]">{p.grade}/100</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-auto">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Due {p.dueDate}
                    </span>
                    <button className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition-all">
                      <span>Open Brief</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ════════ 3. TEMPLATES TAB ════════ */}
      {mainCategory === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
          {[
            { title: 'React 19 & Vite Starter Kit', desc: 'Production-ready React 19 boilerplate with Tailwind CSS, Lucide icons, and TypeScript.' },
            { title: 'Node.js & Express REST API Template', desc: 'Pre-configured Express API starter with JWT auth, Zod validation, and Prisma ORM.' },
            { title: 'ML & PyTorch Model Boilerplate', desc: 'Clean PyTorch training pipeline with Jupyter notebooks, dataset loaders, and FastAPI.' },
            { title: 'Next.js SaaS Full-Stack Template', desc: 'Next.js Server Components starter with Stripe checkout and Supabase database.' },
            { title: 'Python Data Science Pipeline', desc: 'Pandas, NumPy, and Scikit-Learn data cleaning and visualization notebook setup.' },
            { title: 'Docker Microservices Dev Setup', desc: 'Multi-container Docker Compose configuration for React, Node, Redis, and PostgreSQL.' }
          ].map((t, i) => (
            <Card key={i} className="p-6 bg-white border border-slate-200/90 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-4">
                  <Code2 className="w-6 h-6 text-[#7c3aed]" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1.5">{t.title}</h3>
                <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6">{t.desc}</p>
              </div>
              <Button
                size="sm"
                fullWidth
                leftIcon={<Download className="w-4 h-4" />}
                className="bg-[#7c3aed] text-white font-extrabold text-xs shadow-xs"
                onClick={() => {
                  triggerFileDownload(t.title);
                  setToastVisible(true);
                }}
              >
                Download Starter Kit
              </Button>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
