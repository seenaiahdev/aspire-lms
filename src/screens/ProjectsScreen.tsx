import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  FolderGit2, Star, Clock, CheckCircle2, MessageCircle, Download,
  FileText, BookOpen, ArrowRight, Code2, Terminal, ExternalLink, Link2,
  Upload, FolderOpen, Eye, Lock,
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
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { FileExplorerViewer, saveBundleToStorage, loadBundleFromStorage, type ProjectFile } from '@/components/practice/FileExplorerViewer';

import { projectsSteps } from '@/lib/tourSteps';

const SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.DS_Store', 'venv', '.venv'];
const SINGLE_FILE_EXTS = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.cs', '.go', '.rb', '.php', '.kt', '.swift', '.rs', '.html', '.css', '.txt', '.md'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

  // Interactive File Explorer Modal state
  const [showExplorer, setShowExplorer] = useState(false);
  const [explorerUrl, setExplorerUrl] = useState<string>('');

  // Upload processing state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [processingFileName, setProcessingFileName] = useState('');

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileList = useCallback(async (files: File[], targetProjectId: string) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadProgress(15);
    setUploadStatusText('Scanning project files...');

    const firstItem = files[0];
    const nameCandidate = firstItem?.webkitRelativePath?.split('/')[0] || firstItem?.name || 'Project Solution';
    setProcessingFileName(nameCandidate);

    const projectFiles: ProjectFile[] = [];
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
      html: 'html', css: 'css', json: 'json', md: 'markdown', txt: 'text',
      go: 'go', rb: 'ruby', php: 'php', kt: 'kotlin', swift: 'swift',
      rs: 'rust',
    };

    const readers = files.map((file) =>
      new Promise<void>((resolve) => {
        const relativePath = file.webkitRelativePath
          ? file.webkitRelativePath.split('/').slice(1).join('/')
          : file.name;
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

        const isCodeExt = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css', 'json', 'md', 'txt', 'go', 'rb', 'php', 'kt', 'swift', 'rs'].includes(ext);

        if (file.size < 1024 * 200 && isCodeExt) {
          const reader = new FileReader();
          reader.onload = (e) => {
            projectFiles.push({
              path: relativePath,
              name: file.name,
              content: (e.target?.result as string) ?? '',
              size: file.size,
              language: langMap[ext] ?? 'text',
            });
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsText(file);
        } else {
          projectFiles.push({
            path: relativePath,
            name: file.name,
            content: `// Binary or large file (${(file.size / 1024).toFixed(1)} KB) — preview omitted`,
            size: file.size,
            language: 'text',
          });
          resolve();
        }
      })
    );

    await Promise.all(readers);

    setUploadProgress(50);
    setUploadStatusText(`Packaging ${projectFiles.length} file${projectFiles.length !== 1 ? 's' : ''}...`);
    await new Promise((r) => setTimeout(r, 350));

    setUploadProgress(85);
    setUploadStatusText('Generating database link & saving submission...');
    await new Promise((r) => setTimeout(r, 450));

    const totalSize = projectFiles.reduce((s, f) => s + f.size, 0);
    const projectName = nameCandidate;

    const storageUrl = saveBundleToStorage({
      projectName,
      totalFiles: projectFiles.length,
      totalSize,
      uploadedAt: new Date().toISOString(),
      storageUrl: '',
      files: projectFiles,
    });

    const updatedDriveLinks = { ...driveLinks, [targetProjectId]: storageUrl };
    setDriveLinks(updatedDriveLinks);
    localStorage.setItem('projectDriveLinks', JSON.stringify(updatedDriveLinks));

    const updatedProjects = projectsState.map((p: any) =>
      p.id === targetProjectId ? { ...p, status: 'submitted' } : p
    );
    setProjectsState(updatedProjects);
    localStorage.setItem('projectsState', JSON.stringify(updatedProjects));

    setUploadProgress(100);
    setIsProcessing(false);
    setSubTab('submitted');
    setToastVisible(true);
  }, [driveLinks, projectsState]);

  const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, projectId: string) => {
    if (!e.target.files?.length) return;
    const fileArray = Array.from(e.target.files).filter((f) => {
      const parts = (f.webkitRelativePath || f.name).split('/');
      return !parts.some((p) => SKIP_DIRS.includes(p));
    });
    processFileList(fileArray, projectId);
  }, [processFileList]);

  const handleSingleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, projectId: string) => {
    if (!e.target.files?.length) return;
    processFileList(Array.from(e.target.files), projectId);
  }, [processFileList]);

  const handleDrop = useCallback((e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files?.length) return;
    const fileArray = Array.from(e.dataTransfer.files).filter((f) => {
      const parts = (f.webkitRelativePath || f.name).split('/');
      return !parts.some((p) => SKIP_DIRS.includes(p));
    });
    processFileList(fileArray, projectId);
  }, [processFileList]);

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
    return []; // For now, all projects tabs are empty
  }, [categoryProjects, mainCategory, subTab]);

  const assignedCount = 0;
  const submittedCount = 0;
  const feedbackCount = 0;

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

  const isSaved = selectedProject ? Boolean(driveLinks[selectedProject.id]) : false;

  const openProjectDetail = (projectId: string) => {
    setSelectedProjectId(projectId);
    window.history.pushState({}, '', `/projects/${projectId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeProjectDetail = () => {
    setSelectedProjectId(null);
    window.history.pushState({}, '', '/projects');
  };

  if (selectedProject && selectedGuide) {
    return (
      <div className="space-y-6 pb-12 animate-fade-in font-sans">
        {showExplorer && explorerUrl && (
          <FileExplorerViewer
            storageUrl={explorerUrl}
            onClose={() => setShowExplorer(false)}
          />
        )}
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

        {/* Hidden inputs */}
        <input ref={folderInputRef} type="file"
          /* @ts-ignore */
          webkitdirectory="" directory="" multiple
          className="hidden" onChange={(e) => handleFolderInput(e, selectedProject.id)}
        />
        <input ref={fileInputRef} type="file"
          accept={SINGLE_FILE_EXTS.join(',')}
          className="hidden" onChange={(e) => handleSingleFileInput(e, selectedProject.id)}
        />

        {/* Project Solution Submission Area */}
        <Card className="p-6 sm:p-8 border border-slate-200/90 shadow-sm rounded-[2rem] bg-white">
          {driveLinks[selectedProject.id] ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-[#7c3aed]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">Project Solution Submitted</h3>
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase">
                      Submitted
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Your project code bundle is stored and ready for mentor review.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  onClick={() => {
                    setExplorerUrl(driveLinks[selectedProject.id]);
                    setShowExplorer(true);
                  }}
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs"
                  leftIcon={<Eye className="w-4 h-4" />}
                >
                  View Submitted Files
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Submit Your Project Solution</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload your completed single code file or full project folder.
                </p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => handleDrop(e, selectedProject.id)}
                onClick={() => folderInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-[#7c3aed] bg-purple-50/30 scale-[1.01]'
                    : 'border-slate-300 bg-slate-50/50 hover:border-[#7c3aed]/60 hover:bg-purple-50/5'
                }`}
              >
                {isProcessing ? (
                  <div className="space-y-4 py-4 max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto shadow-2xs">
                      <div className="w-7 h-7 border-3 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Uploading Project...</p>
                      {processingFileName && (
                        <p className="text-xs font-semibold text-[#7c3aed] mt-0.5 font-mono truncate">
                          {processingFileName}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1 font-medium">{uploadStatusText}</p>
                    </div>
                    <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#7c3aed] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 font-mono">{uploadProgress}% complete</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-all bg-white border border-slate-200 shadow-3xs ${
                      isDragging ? 'border-[#7c3aed]/50 text-[#7c3aed]' : 'text-[#7c3aed]'
                    }`}>
                      <Upload className="w-7 h-7 text-[#7c3aed]" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {isDragging ? 'Drop project here!' : 'Drag & Drop your project file or folder'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Accepts single code files (.py, .js, .java, etc.) or full project folders</p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          folderInputRef.current?.click();
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Browse File / Folder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12 animate-fade-in">

      {showExplorer && explorerUrl && (
        <FileExplorerViewer
          storageUrl={explorerUrl}
          onClose={() => setShowExplorer(false)}
        />
      )}
      
      {/* Header */}
      <div className="pb-2" id="tour-projects-header">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Projects Workflow
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Inspect project briefs, build industry solutions, and submit drive links for mentor reviews.
        </p>
      </div>



      {/* ════════ 1. TOP-LEVEL CATEGORY TABS ════════ */}
      <div id="tour-projects-filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
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
              filtered.map((p, index) => (
                <Card 
                  key={p.id} 
                  id={index === 0 ? 'tour-projects-card-0' : undefined}
                  className="group p-6 cursor-not-allowed rounded-[2rem] border border-slate-200/90 bg-white shadow-sm flex flex-col justify-between relative overflow-hidden"
                >
                  <LockedOverlay title={p.title} type="LOCKED PROJECT" />
                  <div>
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <FolderGit2 className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base leading-snug">{p.title}</h3>
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
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition-all">
                        <span>Open Brief</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
            <Card key={i} className="p-6 bg-white border border-slate-200/90 rounded-[2rem] shadow-sm flex flex-col justify-between relative overflow-hidden cursor-not-allowed">
              <LockedOverlay title={t.title} type="LOCKED TEMPLATE" />
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
                disabled
                leftIcon={<Lock className="w-4 h-4" />}
                className="bg-slate-200 text-slate-500 font-extrabold text-xs shadow-xs cursor-not-allowed"
              >
                Locked
              </Button>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
