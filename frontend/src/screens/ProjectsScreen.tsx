import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  FolderGit2, Star, Clock, CheckCircle2, MessageCircle, Download,
  FileText, BookOpen, ArrowRight, Code2, Terminal, ExternalLink, Link2,
  Upload, FolderOpen, Eye, Lock, LayoutGrid, List, ChevronRight,
} from 'lucide-react';
import { fetchProjects, submitPracticeProblem, fetchUserSubmissions } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useInfiniteScroll, PAGE_SIZE } from '@/lib/useInfiniteScroll';
import { uploadSubmissionBundle } from '@/lib/submissionStorage';
import { useUser } from '@/lib/UserContext';
import { useUnlockResolver } from '@/lib/lessonLinkResolver';
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
import { useNav } from '@/lib/nav';

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
  workflow?: { action: string; event: string; calls: string[]; result: string }[];
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

function formatProjectDescription(description: string): string {
  if (!description) return '';
  const trimmed = description.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.text || parsed.description || description;
    } catch {
      return description;
    }
  }
  return description;
}

export function ProjectsScreen() {
  const { user } = useUser();
  const { isUnlocked, isEntityUnlocked } = useUnlockResolver();
  const { params, navigate } = useNav();
  const [mainCategory, setMainCategory] = useState<'mini' | 'major' | 'capstone'>('mini');
  const [subTab, setSubTab] = useState<'assigned' | 'submitted' | 'feedback'>('assigned');
  const [lockedToast, setLockedToast] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Automatically switch tab based on route params
  useEffect(() => {
    if (params.tab && ['mini', 'major', 'capstone'].includes(params.tab)) {
      setMainCategory(params.tab as any);
    }
  }, [params.tab]);

  const [driveLinks, setDriveLinks] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('projectDriveLinks') || '{}');
    } catch {
      return {};
    }
  });

  const [projectsState, setProjectsState] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [toastVisible, setToastVisible] = useState(false);

  // Fetch projects and submissions from Supabase
  const loadProjectsAndSubmissions = useCallback(async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const courseId = user?.enrolledCourses?.[0];
      const [projectsData, submissionsData] = await Promise.all([
        user?.batchCode
          ? fetchProjects(user.batchCode, user.batchCategory, courseId)
          : Promise.resolve([]),
        user?.id ? fetchUserSubmissions(user.id) : Promise.resolve([]),
      ]);

      setProjectsState(projectsData || []);

      // Database is the single source of truth: construct links strictly from fresh submissions
      const freshLinks: Record<string, string> = {};
      (submissionsData || []).forEach((s: any) => {
        if (s.problem_id) {
          freshLinks[s.problem_id] = s.storage_url || 'submitted';
        }
      });

      setDriveLinks(freshLinks);
      try {
        localStorage.setItem('projectDriveLinks', JSON.stringify(freshLinks));
      } catch {}
    } catch (err) {
      console.error('Error loading projects/submissions:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [user?.id, user?.batchCode, user?.batchCategory, user?.enrolledCourses?.[0]]);

  useEffect(() => {
    if (user?.batchCode || user?.id) {
      loadProjectsAndSubmissions(true);
    } else {
      setIsLoading(false);
    }
  }, [loadProjectsAndSubmissions, user?.batchCode, user?.id, user?.enrolledCourses?.[0]]);

  // Real-time Supabase subscription for project submissions (catches INSERT, UPDATE, and DELETE)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`projects_screen_rt_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practice_submissions',
          filter: `student_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time project submission update received:', payload);
          loadProjectsAndSubmissions(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadProjectsAndSubmissions]);



  // Interactive File Explorer Modal state
  const [showExplorer, setShowExplorer] = useState(false);
  const [explorerUrl, setExplorerUrl] = useState<string>('');

  // Upload processing state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [processingFileName, setProcessingFileName] = useState('');
  const [showBrowseDropdown, setShowBrowseDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!showBrowseDropdown) return;
    const close = () => setShowBrowseDropdown(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showBrowseDropdown]);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFileList = useCallback(async (files: File[], targetProjectId: string) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    // Guard: Prevent uploading massive node_modules folder (which freezes the browser and exceeds storage limits)
    const hasTooManyFiles = files.length > 500 || files.some((f) => {
      const pathLower = (f.webkitRelativePath || '').toLowerCase();
      return pathLower.includes('node_modules') || pathLower.includes('/.git/') || pathLower.startsWith('.git/');
    });

    if (hasTooManyFiles) {
      setErrorMessage("Please select only your source folder (e.g. 'src') or exclude 'node_modules' / '.git' directories.");
      setIsProcessing(false);
      return;
    }

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
      sql: 'sql', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml',
      sh: 'shell', bash: 'shell', bat: 'bat', ps1: 'powershell', svg: 'xml',
      ini: 'ini', env: 'text', example: 'text'
    };

    const readers = files.map((file) =>
      new Promise<void>((resolve) => {
        const relativePath = file.webkitRelativePath
          ? file.webkitRelativePath.split('/').slice(1).join('/')
          : file.name;
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const nameLower = file.name.toLowerCase();

        const isCodeExt = [
          'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'cs', 'html', 'css', 'json', 'md', 'txt', 'go', 'rb', 'php', 'kt', 'swift', 'rs',
          'sql', 'yaml', 'yml', 'toml', 'xml', 'sh', 'bash', 'bat', 'ps1', 'svg', 'ini', 'env', 'example', 'gitignore', 'gitattributes', 'dockerignore', 'dockerfile', 'procfile'
        ].includes(ext) || nameLower.startsWith('.env') || nameLower === 'dockerfile' || nameLower === 'license' || nameLower === 'procfile';

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

    const bundle = {
      projectName,
      totalFiles: projectFiles.length,
      totalSize,
      uploadedAt: new Date().toISOString(),
      storageUrl: '',
      files: projectFiles,
    };

    // Local copy for instant review.
    const localUrl = saveBundleToStorage(bundle);

    // Upload to Supabase Storage + record a tiny row so mentors/admins can review (low DB cost).
    let remoteUrl: string | null = null;
    if (user && user.id) {
      setUploadStatusText('Uploading to review storage...');
      remoteUrl = await uploadSubmissionBundle(bundle, user.id, targetProjectId, 'project');
      try {
        await submitPracticeProblem(
          user.id, targetProjectId, 'project',
          undefined, undefined, remoteUrl || localUrl, projectName, projectFiles.length, totalSize
        );
      } catch (dbErr) {
        console.warn('Failed to save project submission to Supabase:', dbErr);
      }
    }

    const updatedDriveLinks = { ...driveLinks, [targetProjectId]: remoteUrl || localUrl };
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
  }, [driveLinks, projectsState, user]);

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
    return projectsState
      // Only surface projects belonging to lessons that are unlocked in Milestones for this student.
      .filter((p: any) => isEntityUnlocked(p))
      .map((p: any) => {
        const projectType = (p.project_type || p.type || 'mini').toLowerCase();
        const hasLink = Boolean(driveLinks[p.id]);

        let status = 'assigned';
        if (hasLink) {
          status = 'submitted';
        }
        if (String(p.status || '').toLowerCase() === 'feedback') {
          status = 'feedback';
        }
        const rawSkills = p.tech_stack || p.skills;
        const skillsArray = Array.isArray(rawSkills) 
          ? rawSkills 
          : typeof rawSkills === 'string' 
            ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [];

        return {
          ...p,
          projectType,
          status,
          course: p.course || p.category || 'General Curriculum',
          skills: skillsArray
        };
      });
  }, [projectsState, driveLinks, isUnlocked, isEntityUnlocked]);

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
    return effectiveProjects.filter((p: any) => (p.projectType || 'mini') === mainCategory);
  }, [effectiveProjects, mainCategory]);

  const filtered = useMemo(() => {
    return categoryProjects.filter((p: any) => p.status === subTab);
  }, [categoryProjects, subTab]);

  const assignedCount = categoryProjects.filter((p: any) => p.status === 'assigned').length;
  const submittedCount = categoryProjects.filter((p: any) => p.status === 'submitted').length;
  const feedbackCount = categoryProjects.filter((p: any) => p.status === 'feedback').length;

  // If the active tab was 'submitted' but the project submission was deleted, switch back to 'assigned'
  useEffect(() => {
    if (subTab === 'submitted' && submittedCount === 0 && assignedCount > 0) {
      setSubTab('assigned');
    }
  }, [subTab, submittedCount, assignedCount]);

  // Card vs. list ("rectangle") view + render windowing (show 10, +10 on scroll).
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() =>
    (localStorage.getItem('aspire_projects_view') as 'card' | 'list') || 'card');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [mainCategory, subTab]);
  const shown = filtered.slice(0, visibleCount);
  const projectsHasMore = visibleCount < filtered.length;
  const projectsSentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasMore: projectsHasMore,
    loading: false,
    onLoadMore: () => setVisibleCount((v) => v + PAGE_SIZE),
  });
  const setView = (m: 'card' | 'list') => { setViewMode(m); localStorage.setItem('aspire_projects_view', m); };

  const selectedProject = useMemo(
    () => {
      if (!selectedProjectId) return null;
      const p = effectiveProjects.find((p: any) => p.id === selectedProjectId) ||
                projectsState.find((p: any) => p.id === selectedProjectId);
      if (!p) return null;
      const projectType = (p.project_type || p.type || 'mini').toLowerCase();
      const hasLink = Boolean(driveLinks[p.id]);

      let status = 'assigned';
      if (hasLink) {
        status = 'submitted';
      }
      if (String(p.status || '').toLowerCase() === 'feedback') {
        status = 'feedback';
      }
      const rawSkills = p.tech_stack || p.skills;
      const skillsArray = Array.isArray(rawSkills) 
        ? rawSkills 
        : typeof rawSkills === 'string' 
          ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

      return {
        ...p,
        projectType,
        status,
        course: p.course || p.category || 'General Curriculum',
        skills: skillsArray
      };
    },
    [selectedProjectId, effectiveProjects, projectsState, driveLinks]
  );
  const selectedGuide = selectedProject ? (projectGuides[selectedProject.id] || {
    brief: formatProjectDescription(selectedProject.description),
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
      if (baseRoute !== 'projects') return;
      const targetId = params.id || projectId;
      if (!targetId) {
        setSelectedProjectId(null);
        return;
      }
      const matched = effectiveProjects.find((p: any) => p.id === targetId) ||
                      projectsState.find((p: any) => p.id === targetId);
      if (matched) {
        setSelectedProjectId(matched.id);
        const pType = (matched.project_type || matched.type || matched.projectType || 'mini').toLowerCase();
        if (pType === 'mini' || pType === 'major' || pType === 'capstone') {
          setMainCategory(pType as any);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    syncProjectRoute();
    window.addEventListener('popstate', syncProjectRoute);
    return () => window.removeEventListener('popstate', syncProjectRoute);
  }, [effectiveProjects, projectsState, params.id]);

  const isSaved = selectedProject ? Boolean(driveLinks[selectedProject.id]) : false;

  const openProjectDetail = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigate('projects', { tab: mainCategory, id: projectId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeProjectDetail = () => {
    setSelectedProjectId(null);
    navigate('projects', { tab: mainCategory });
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
                onClick={() => fileInputRef.current?.click()}
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
                      {errorMessage && (
                        <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px] font-bold leading-normal max-w-sm mx-auto">
                          ⚠️ {errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center relative">
                      <div className="inline-block relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBrowseDropdown(!showBrowseDropdown);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Browse File / Folder
                        </button>
                        {showBrowseDropdown && (
                          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-40 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-[100] animate-fade-in text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowBrowseDropdown(false);
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2"
                            >
                              <Upload className="w-3.5 h-3.5 text-slate-400" />
                              Upload File
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowBrowseDropdown(false);
                                folderInputRef.current?.click();
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 border-t border-slate-100"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                              Upload Folder
                            </button>
                          </div>
                        )}
                      </div>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
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
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
            <button onClick={() => setView('card')} title="Card view"
              className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", viewMode === 'card' ? "bg-white text-[#7c3aed] shadow-sm" : "text-slate-400 hover:text-slate-600")}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} title="List view"
              className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", viewMode === 'list' ? "bg-white text-[#7c3aed] shadow-sm" : "text-slate-400 hover:text-slate-600")}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PROJECTS LIST / GRID */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div>
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-[2rem]">
              <FolderGit2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-800 text-base">No Projects Found</h3>
              <p className="text-xs text-slate-500 mt-1">There are no {subTab} projects in this category currently.</p>
            </Card>
          </div>
        ) : viewMode === 'list' ? (
          /* ── COMPACT LIST ("RECTANGLE") VIEW ── */
          <div className="space-y-3">
            {shown.map((p) => (
              <div
                key={p.id}
                id={`project-card-${p.id}`}
                onClick={() => { setSelectedProjectId(p.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-purple-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] shrink-0">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-[#7c3aed] transition-colors line-clamp-1">{p.title}</h3>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">{p.status}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1">{p.course}</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 text-slate-400 group-hover:text-[#7c3aed]">
                  <span className="text-xs font-extrabold">View</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {shown.map((p, index) => {
              const isLocked = false; // All unlocked
              return (
                <Card 
                  key={p.id} 
                  id={`project-card-${p.id}`}
                  data-tour={index === 0 ? 'tour-projects-card-0' : undefined}
                  onClick={() => {
                    if (isLocked) {
                      setLockedToast(true);
                      setTimeout(() => setLockedToast(false), 3000);
                    } else {
                      setSelectedProjectId(p.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    "group p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between relative overflow-hidden transition-all",
                    isLocked 
                      ? "cursor-not-allowed border-slate-200/60 bg-slate-50/50 opacity-90 grayscale-[15%]" 
                      : "cursor-pointer border-slate-200/90 bg-white hover:border-slate-300"
                  )}
                >
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
                  </div>

                  <p className="text-xs font-medium text-slate-600 mb-4 leading-relaxed line-clamp-2">{formatProjectDescription(p.description)}</p>
                  
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
                    {isLocked ? (
                      <button className="px-4 py-2.5 rounded-xl bg-slate-200/50 text-slate-500 font-extrabold text-xs flex items-center gap-1.5 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Coming Soon</span>
                      </button>
                    ) : (
                      <button className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition-all">
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
          </div>
        )}
        {projectsHasMore && (
          <div ref={projectsSentinelRef} className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* ════════ CUSTOM TOAST NOTIFICATION ════════ */}
      {lockedToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-up pointer-events-none">
          <div className="flex items-center gap-4 px-5 py-3.5 bg-[#090b14]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40 shrink-0 shadow-inner">
              <Lock className="w-5 h-5 text-purple-300" />
            </div>
            <div className="pr-2">
              <h4 className="font-black text-sm text-slate-50 tracking-wide uppercase">Coming Soon</h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">This content is currently locked.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
