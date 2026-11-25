import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  FolderGit2, Star, Clock, CheckCircle2, MessageCircle, Download,
  FileText, BookOpen, ArrowRight, Code2, Terminal, ExternalLink, Link2,
  Eye, Lock, LayoutGrid, List, ChevronRight, GitBranch, Globe, AlertCircle,
} from 'lucide-react';
import { fetchProjects, fetchProjectDetails, extractBatchDueDate, submitPracticeProblem, fetchUserSubmissions } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useInfiniteScroll, PAGE_SIZE } from '@/lib/useInfiniteScroll';
import { useUser } from '@/lib/UserContext';
import { usePreload } from '@/lib/PreloadContext';
import { useUnlockResolver } from '@/lib/lessonLinkResolver';
import { Toast } from '@/components/ui/Toast';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { DifficultyBadge } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { triggerFileDownload } from '@/lib/downloadHelper';
import { cn, isDueDatePassed } from '@/lib/utils';
import { LockedOverlay } from '@/components/ui/LockedOverlay';
import { ErrorState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { FileExplorerViewer } from '@/components/practice/FileExplorerViewer';
import { GitHubRepoViewer } from '@/components/practice/GitHubRepoViewer';
import {
  parseGitHubRepoUrl,
  isValidHttpUrl,
  isGitHubSubmissionUrl,
  verifyPublicGitHubRepo,
  type GitHubRepoMeta,
} from '@/lib/githubApi';
import { useNav } from '@/lib/nav';
import { ProjectOverviewRenderer } from '@/components/projects/ProjectOverviewRenderer';

import { projectsSteps } from '@/lib/tourSteps';

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

function formatProjectDescription(description?: string, overview?: string): string {
  if (overview && typeof overview === 'string' && overview.trim()) {
    return overview.trim();
  }
  if (!description) return 'Hands-on practical development project.';
  const trimmed = description.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const extracted = parsed.text || parsed.description || parsed.overview || parsed.summary || '';
      if (typeof extracted === 'string' && extracted.trim()) {
        return extracted.trim();
      }
      return 'Hands-on practical development project.';
    } catch {
      return 'Hands-on practical development project.';
    }
  }
  return description;
}

function formatDisplayDueDate(rawDueDate?: string | null): string {
  if (!rawDueDate) return 'No deadline';
  const str = String(rawDueDate).trim();
  if (!str || str === 'null' || str === 'undefined') return 'No deadline';
  if (str.startsWith('{') && str.endsWith('}')) return 'No deadline';

  const clean = str.replace(/^(due|by)\s+/i, '').trim();
  if (!clean || clean.toLowerCase() === 'no deadline') return 'No deadline';

  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const dateObj = new Date(year, month, day);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  return clean;
}

function parseProjectDetails(p: any, batchCode?: string, batchCategory?: string) {
  if (!p) return null;

  let descObj: any = {};
  if (p.description && typeof p.description === 'string') {
    const trimmed = p.description.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        descObj = JSON.parse(trimmed);
      } catch {}
    }
  }

  const overview =
    p.overview ||
    descObj.overview ||
    descObj.text ||
    descObj.description ||
    (typeof p.description === 'string' && !p.description.trim().startsWith('{') ? p.description : '') ||
    '';

  const shortDescription =
    descObj.text ||
    descObj.short_description ||
    descObj.summary ||
    (typeof p.description === 'string' && !p.description.trim().startsWith('{') ? p.description : '') ||
    (overview ? overview.split('. ')[0] + '.' : '');

  const rawDue = p.due_date || descObj.due_date || descObj.dueDate || p.dueDate || '';
  const resolvedBatchDue = extractBatchDueDate(rawDue, batchCode, batchCategory);
  const dueDate = resolvedBatchDue !== null ? (resolvedBatchDue || '') : (typeof rawDue === 'string' && !rawDue.trim().startsWith('{') ? rawDue : '');

  let rawReqs = p.requirements || descObj.requirements || [];
  if (typeof rawReqs === 'string') {
    try { rawReqs = JSON.parse(rawReqs); } catch { rawReqs = []; }
  }
  const requirements = Array.isArray(rawReqs)
    ? rawReqs.map((r: any) => {
        if (typeof r === 'string') return { title: r, desc: '' };
        return {
          title: r?.title || r?.name || r?.label || '',
          desc: r?.desc || r?.description || ''
        };
      }).filter((r: any) => r.title)
    : [];

  let rawSteps = p.steps || descObj.steps || [];
  if (typeof rawSteps === 'string') {
    try { rawSteps = JSON.parse(rawSteps); } catch { rawSteps = []; }
  }
  const steps = Array.isArray(rawSteps)
    ? rawSteps.map((s: any) => (typeof s === 'string' ? s : (s?.title || s?.text || s?.step || ''))).filter(Boolean)
    : [];

  let rawRubric = p.rubric || descObj.rubric || [];
  if (typeof rawRubric === 'string') {
    try { rawRubric = JSON.parse(rawRubric); } catch { rawRubric = []; }
  }
  const rubric = Array.isArray(rawRubric)
    ? rawRubric.map((item: any) => {
        if (typeof item === 'string') return { label: item, weight: '25%', percent: 25 };
        const label = item?.label || item?.title || item?.criterion || 'Criterion';
        const rawWeight = item?.weight || item?.percentage || '25%';
        const percent = typeof rawWeight === 'number'
          ? rawWeight
          : parseInt(String(rawWeight).replace(/\D/g, ''), 10) || 25;
        const weight = typeof rawWeight === 'number' ? `${rawWeight}%` : (String(rawWeight).includes('%') ? rawWeight : `${rawWeight}%`);
        return { label, weight, percent };
      }).filter((r: any) => r.label)
    : [];

  let rawTips = p.mentor_tip || descObj.mentorTip || descObj.mentor_tip || descObj.tips || [];
  let tips: string[] = [];
  if (typeof rawTips === 'string') {
    const trimmed = rawTips.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try { tips = JSON.parse(trimmed); } catch { tips = [trimmed]; }
    } else if (trimmed) {
      tips = [trimmed];
    }
  } else if (Array.isArray(rawTips)) {
    tips = rawTips.map((t: any) => (typeof t === 'string' ? t : (t?.tip || t?.text || ''))).filter(Boolean);
  }

  const templateUrl = p.template_url || descObj.templateUrl || descObj.template_url || '';
  const guidelines = p.guidelines || descObj.guidelines || '';

  const rawSkills = p.tech_stack || descObj.techStack || descObj.tech_stack || p.skills || [];
  const skills = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === 'string'
      ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

  const courseName = p.course || descObj.courseName || p.course_name || p.category || 'General Curriculum';

  return {
    overview,
    shortDescription,
    dueDate,
    requirements,
    steps,
    rubric,
    tips,
    templateUrl,
    guidelines,
    skills,
    courseName
  };
}

export function ProjectsScreen() {
  const { user } = useUser();
  const { isUnlocked, isEntityUnlocked, ready: resolverReady } = useUnlockResolver();
  const { params, navigate } = useNav();
  const [mainCategory, setMainCategory] = useState<'mini' | 'major' | 'capstone'>(() => {
    if (params.tab && ['mini', 'major', 'capstone'].includes(params.tab)) {
      return params.tab as any;
    }
    try {
      const saved = localStorage.getItem('aspire_projects_main_category');
      if (saved && ['mini', 'major', 'capstone'].includes(saved)) return saved as any;
    } catch {}
    return 'mini';
  });

  const handleMainCategoryChange = (cat: 'mini' | 'major' | 'capstone') => {
    setMainCategory(cat);
    try {
      localStorage.setItem('aspire_projects_main_category', cat);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', cat);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const [subTab, setSubTab] = useState<'assigned' | 'submitted' | 'feedback'>(() => {
    if (params.subTab && ['assigned', 'submitted', 'feedback'].includes(params.subTab)) {
      return params.subTab as any;
    }
    try {
      const saved = localStorage.getItem('aspire_projects_subtab');
      if (saved === 'assigned' || saved === 'submitted' || saved === 'feedback') return saved;
    } catch {}
    return 'assigned';
  });

  const handleSubTabChange = (t: 'assigned' | 'submitted' | 'feedback') => {
    setSubTab(t);
    try {
      localStorage.setItem('aspire_projects_subtab', t);
      const url = new URL(window.location.href);
      url.searchParams.set('subTab', t);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const [lockedToast, setLockedToast] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Automatically switch tab and select project based on route params
  useEffect(() => {
    if (params.tab && ['mini', 'major', 'capstone'].includes(params.tab)) {
      setMainCategory(params.tab as any);
    }
    if (params.id) {
      setSelectedProjectId(params.id);
    }
  }, [params.tab, params.id]);

  const [driveLinks, setDriveLinks] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('projectDriveLinks') || '{}');
    } catch {
      return {};
    }
  });

  const preload = usePreload();
  const [projectsState, setProjectsState] = useState<any[]>(() => {
    if (preload.projects && preload.projects.length > 0) {
      return preload.projects;
    }
    // Initialise from localStorage cache for instant display while fresh data loads
    try {
      const cached = localStorage.getItem('aspire_projects_cache') || localStorage.getItem('projectsState');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (preload.projects && preload.projects.length > 0) return false;
    try {
      const cached = localStorage.getItem('aspire_projects_cache') || localStorage.getItem('projectsState');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });
  const [hasLoadedOnce, setHasLoadedOnce] = useState(() => {
    if (preload.projects && preload.projects.length > 0) return true;
    try {
      const cached = localStorage.getItem('aspire_projects_cache') || localStorage.getItem('projectsState');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return true;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    if (preload.projects && preload.projects.length > 0 && projectsState.length === 0) {
      setProjectsState(preload.projects);
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [preload.projects, projectsState.length]);

  const [toastVisible, setToastVisible] = useState(false);

  // Fetch projects and submissions from Supabase
  const loadProjectsAndSubmissions = useCallback(async (showLoading: boolean = true, retryCount: number = 0) => {
    if (showLoading && projectsState.length === 0) setIsLoading(true);
    setFetchError(null);
    try {
      const batchCode = user?.batchCode || (user as any)?.batch || 'A26W1';
      const batchCategory = user?.batchCategory || (batchCode.toUpperCase().includes('S') ? 'Weekend Batch' : 'Weekday Batch');
      const enrolledCourses = user?.enrolledCourses && user.enrolledCourses.length > 0
        ? user.enrolledCourses
        : ['crs-1786624019154-w'];
      const courseId = enrolledCourses[0];
      const studentId = user?.id && user.id !== 'guest' ? user.id : undefined;

      const [projectsData, submissionsData] = await Promise.all([
        fetchProjects(batchCode, batchCategory, courseId, enrolledCourses),
        studentId ? fetchUserSubmissions(studentId) : Promise.resolve([]),
      ]);

      const projects = projectsData || [];
      if (projects.length > 0) {
        setProjectsState(projects);
        try {
          localStorage.setItem('aspire_projects_cache', JSON.stringify(projects));
          localStorage.setItem('projectsState', JSON.stringify(projects));
        } catch {}
      } else {
        // If query returned 0 items, preserve cached data rather than showing an empty screen
        setProjectsState((prev) => {
          if (prev.length > 0) return prev;
          try {
            const cached = localStorage.getItem('aspire_projects_cache') || localStorage.getItem('projectsState');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
          } catch {}
          return [];
        });
      }

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
    } catch (err: any) {
      console.error('Error loading projects/submissions:', err);
      if (retryCount >= 2) {
        setFetchError('Unable to connect to the project repository. Please check your internet connection.');
      }

      // On failure, use localStorage fallback if state is empty
      setProjectsState((prev) => {
        if (prev.length > 0) return prev;
        try {
          const cached = localStorage.getItem('aspire_projects_cache') || localStorage.getItem('projectsState');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {}
        return [];
      });

      // Auto-retry on network hiccup recovery
      if (retryCount < 2) {
        setTimeout(() => loadProjectsAndSubmissions(false, retryCount + 1), 2500);
      }
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [user?.id, user?.batchCode, (user as any)?.batch, user?.batchCategory, user?.enrolledCourses, projectsState.length]);

  useEffect(() => {
    // Synchronize preloaded projects and ensure student submissions are hydrated
    if (preload.projects && preload.projects.length > 0) {
      if (projectsState.length === 0) {
        setProjectsState(preload.projects);
      }
      setIsLoading(false);
      setHasLoadedOnce(true);

      const studentId = user?.id && user.id !== 'guest' ? user.id : undefined;
      if (studentId && Object.keys(driveLinks).length === 0) {
        fetchUserSubmissions(studentId).then((subs) => {
          const freshLinks: Record<string, string> = {};
          (subs || []).forEach((s: any) => {
            if (s.problem_id) freshLinks[s.problem_id] = s.storage_url || 'submitted';
          });
          setDriveLinks(freshLinks);
        }).catch(() => {});
      }
      return;
    }
    loadProjectsAndSubmissions(projectsState.length === 0);
  }, [loadProjectsAndSubmissions, user?.batchCode, user?.id, preload.projects]);

  // Real-time Supabase subscription for projects table (catches admin creates, edits, and deletes)
  useEffect(() => {
    const channel = supabase
      .channel(`projects_screen_projects_rt_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('Real-time projects table update received:', payload);
          loadProjectsAndSubmissions(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjectsAndSubmissions]);

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



  // Interactive Submission Preview Modal state (GitHub Repo Viewer or Legacy Storage Viewer)
  const [showExplorer, setShowExplorer] = useState(false);
  const [explorerUrl, setExplorerUrl] = useState<string>('');
  const [explorerTitle, setExplorerTitle] = useState<string>('');

  // Optional Live Demo URL map persisted locally per project
  const [demoLinks, setDemoLinks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('projectDemoLinks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // GitHub Repository Submission form state
  const [githubInput, setGithubInput] = useState('');
  const [demoInput, setDemoInput] = useState('');
  const [repoCheckStatus, setRepoCheckStatus] = useState<'idle' | 'checking' | 'verified' | 'rate_limited' | 'error'>('idle');
  const [repoMeta, setRepoMeta] = useState<GitHubRepoMeta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset form inputs when switching projects
  useEffect(() => {
    setGithubInput('');
    setDemoInput('');
    setRepoCheckStatus('idle');
    setRepoMeta(null);
    setErrorMessage(null);
  }, [selectedProjectId]);

  // Live non-blocking GitHub repo verification on URL change (debounced)
  useEffect(() => {
    const parsed = parseGitHubRepoUrl(githubInput);
    if (!parsed) {
      setRepoCheckStatus('idle');
      setRepoMeta(null);
      return;
    }

    let alive = true;
    const timer = setTimeout(async () => {
      setRepoCheckStatus('checking');
      const result = await verifyPublicGitHubRepo(parsed.owner, parsed.repo);
      if (!alive) return;

      setRepoMeta(result);
      if (result.status === 'verified') {
        setRepoCheckStatus('verified');
        setErrorMessage(null);
      } else if (result.status === 'private_or_missing') {
        setRepoCheckStatus('error');
        setErrorMessage(result.error || 'Repository not found or is private. Please set it to Public.');
      } else {
        // Rate limited or transient network issue: graceful fallback so campus Wi-Fi never blocks
        setRepoCheckStatus('rate_limited');
        setErrorMessage(null);
      }
    }, 450);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [githubInput]);

  const handleGitHubSubmit = useCallback(async (e: React.FormEvent, targetProjectId: string) => {
    e.preventDefault();
    if (driveLinks[targetProjectId]) return; // One-time lock guard
    setErrorMessage(null);

    const parsed = parseGitHubRepoUrl(githubInput);
    if (!parsed) {
      setErrorMessage('Please enter a valid GitHub repository URL (e.g. https://github.com/username/project-repo).');
      return;
    }

    const trimmedDemo = demoInput.trim();
    if (trimmedDemo && !isValidHttpUrl(trimmedDemo)) {
      setErrorMessage('Live Demo URL must start with http:// or https://.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Run or reuse live repo verification (gracefully allows submission on rate_limited/network_error)
      const meta = repoMeta?.normalizedUrl === parsed.normalizedUrl
        ? repoMeta
        : await verifyPublicGitHubRepo(parsed.owner, parsed.repo);

      if (meta.status === 'private_or_missing') {
        setRepoCheckStatus('error');
        setErrorMessage(meta.error || 'Repository not found or is private. Please ensure it is Public.');
        setIsSubmitting(false);
        return;
      }

      const repoLabel = `${parsed.owner}/${parsed.repo}`;
      const detectedLang = meta.language || 'github';

      // Save zero-storage URL + metadata (~200B row in practice_submissions, 0B in Storage bucket)
      if (user && user.id) {
        try {
          await submitPracticeProblem(
            user.id,
            targetProjectId,
            detectedLang,
            undefined,
            trimmedDemo || undefined,
            parsed.normalizedUrl,
            repoLabel,
            1,
            0
          );
        } catch (dbErr) {
          console.warn('Failed to save GitHub project submission to Supabase:', dbErr);
        }
      }

      const updatedDriveLinks = { ...driveLinks, [targetProjectId]: parsed.normalizedUrl };
      setDriveLinks(updatedDriveLinks);
      try {
        localStorage.setItem('projectDriveLinks', JSON.stringify(updatedDriveLinks));
      } catch {}

      if (trimmedDemo) {
        const updatedDemoLinks = { ...demoLinks, [targetProjectId]: trimmedDemo };
        setDemoLinks(updatedDemoLinks);
        try {
          localStorage.setItem('projectDemoLinks', JSON.stringify(updatedDemoLinks));
        } catch {}
      }

      const updatedProjects = projectsState.map((p: any) =>
        p.id === targetProjectId ? { ...p, status: 'submitted' } : p
      );
      setProjectsState(updatedProjects);
      try {
        localStorage.setItem('projectsState', JSON.stringify(updatedProjects));
      } catch {}

      setSubTab('submitted');
      setToastVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [driveLinks, demoLinks, githubInput, demoInput, repoMeta, projectsState, user]);

  // Synchronize effective projects list with driveLinks
  const effectiveProjects = useMemo(() => {
    const locksPending = !user?.locksLoaded && (!user?.unlockedLessonIds || user.unlockedLessonIds.length === 0);
    const batchCategory = user?.batchCategory || (user?.batchCode?.toUpperCase().includes('S') ? 'Weekend Batch' : 'Weekday Batch');

    return projectsState
      // Only surface projects belonging to lessons that are unlocked in Milestones for this student.
      // While unlock resolver or milestone locks are still initializing, don't drop all cached projects to 0!
      .filter((p: any) => {
        // Filter out empty draft templates with no content, "Untitled Project", or untitled placeholders
        const title = String(p.title || '').trim().toLowerCase();
        if (!title || title === 'untitled project' || title === 'untitled') return false;

        const rawDesc = String(p.description || '').trim();
        if (rawDesc.startsWith('{')) {
          try {
            const parsed = JSON.parse(rawDesc);
            const hasContent = Boolean(
              (parsed.text && parsed.text.trim()) ||
              (parsed.overview && parsed.overview.trim()) ||
              (parsed.description && parsed.description.trim()) ||
              (Array.isArray(parsed.requirements) && parsed.requirements.length > 0) ||
              (Array.isArray(parsed.steps) && parsed.steps.length > 0)
            );
            if (!hasContent) return false;
          } catch {
            // Malformed JSON draft, filter out if no title
          }
        }

        if (!resolverReady || locksPending) return true;
        // Direct match with student's unlocked milestone lesson IDs
        if (p.inner_topic_id && user?.unlockedLessonIds?.includes(p.inner_topic_id)) return true;
        // Resolver Scheme A -> Scheme B bridge fallback
        return isEntityUnlocked(p) || (p.inner_topic_id ? isUnlocked(p.inner_topic_id) : false);
      })
      .map((p: any) => {
        const details = parseProjectDetails(p, user?.batchCode, batchCategory);
        const projectType = (p.project_type || p.type || 'mini').toLowerCase();
        const hasLink = Boolean(driveLinks[p.id]);
        const dueDate = details?.dueDate || p.due_date || p.dueDate || '';
        const isOverdue = isDueDatePassed(dueDate);
        const isAutoSubmitted = !hasLink && (String(p.status || '').toLowerCase() === 'submitted' || isOverdue);

        let status = 'assigned';
        if (hasLink || isAutoSubmitted || String(p.status || '').toLowerCase() === 'submitted') {
          status = 'submitted';
        }
        if (String(p.status || '').toLowerCase() === 'feedback') {
          status = 'feedback';
        }

        return {
          ...p,
          ...details,
          projectType,
          status,
          hasLink,
          isOverdue,
          isAutoSubmitted,
          course: details?.courseName || p.course || p.category || 'General Curriculum',
          dueDate,
          skills: details?.skills || []
        };
      });
  }, [projectsState, driveLinks, isUnlocked, isEntityUnlocked, resolverReady, user?.locksLoaded, user?.unlockedLessonIds, user?.batchCode, user?.batchCategory]);

  useEffect(() => {
    localStorage.setItem('projectDriveLinks', JSON.stringify(driveLinks));
  }, [driveLinks]);

  useEffect(() => {
    try {
      if (projectsState && projectsState.length > 0) {
        localStorage.setItem('aspire_projects_cache', JSON.stringify(projectsState));
        localStorage.setItem('projectsState', JSON.stringify(projectsState));
      }
    } catch {}
  }, [projectsState]);

  // Category & Sub-Tab Filtering
  const categoryProjects = useMemo(() => {
    return effectiveProjects.filter((p: any) => (p.projectType || 'mini') === mainCategory);
  }, [effectiveProjects, mainCategory]);

  const filtered = useMemo(() => {
    return categoryProjects.filter((p: any) => p.status === subTab);
  }, [categoryProjects, subTab]);

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
      const rawP = effectiveProjects.find((p: any) => p.id === selectedProjectId) ||
                   projectsState.find((p: any) => p.id === selectedProjectId);
      if (!rawP) return null;

      const batchCategory = user?.batchCategory || (user?.batchCode?.toUpperCase().includes('S') ? 'Weekend Batch' : 'Weekday Batch');
      const details = parseProjectDetails(rawP, user?.batchCode, batchCategory);
      const projectType = (rawP.project_type || rawP.type || rawP.projectType || 'mini').toLowerCase();
      const hasLink = Boolean(driveLinks[rawP.id]);
      const dueDate = details?.dueDate || rawP.due_date || rawP.dueDate || '';
      const isOverdue = isDueDatePassed(dueDate);
      const isAutoSubmitted = !hasLink && (String(rawP.status || '').toLowerCase() === 'submitted' || isOverdue);

      let status = 'assigned';
      if (hasLink || isAutoSubmitted || String(rawP.status || '').toLowerCase() === 'submitted') {
        status = 'submitted';
      }
      if (String(rawP.status || '').toLowerCase() === 'feedback') {
        status = 'feedback';
      }

      return {
        ...rawP,
        ...details,
        projectType,
        status,
        hasLink,
        isOverdue,
        isAutoSubmitted,
        shortDescription: details?.shortDescription || formatProjectDescription(rawP.description, rawP.overview) || details?.overview || '',
        course: details?.courseName || rawP.course || rawP.category || 'General Curriculum',
        dueDate,
        skills: details?.skills || []
      };
    },
    [selectedProjectId, effectiveProjects, projectsState, driveLinks, user?.batchCode, user?.batchCategory]
  );

  // Lazy-load detailed rubric, requirements, and steps for the selected project
  useEffect(() => {
    if (!selectedProjectId) return;
    const existing = projectsState.find((p) => p.id === selectedProjectId);
    if (existing && (!existing.requirements || existing.requirements.length === 0)) {
      fetchProjectDetails(selectedProjectId).then((fullData) => {
        if (fullData) {
          setProjectsState((prev) =>
            prev.map((p) => (p.id === selectedProjectId ? { ...p, ...fullData } : p))
          );
        }
      }).catch((e) => console.warn('Could not load detailed project specs:', e));
    }
  }, [selectedProjectId, projectsState]);
  const selectedGuide = selectedProject ? (projectGuides[selectedProject.id] || {
    brief: selectedProject.shortDescription || formatProjectDescription(selectedProject.description) || selectedProject.overview,
    techStack: selectedProject.skills,
    fileStructure: [{ path: 'src/App.tsx', purpose: 'Main component layout' }],
    functions: ['renderApp', 'handleSubmit'],
    workflow: [{ action: 'User opens app', event: 'onload', calls: ['renderApp()'], result: 'Render page view' }],
    buildSteps: selectedProject.steps && selectedProject.steps.length > 0
      ? selectedProject.steps
      : ['Setup project repository', 'Build core feature logic', 'Submit drive link'],
    tips: selectedProject.tips && selectedProject.tips.length > 0
      ? selectedProject.tips
      : ['Test code thoroughly before submitting drive link.']
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
          isGitHubSubmissionUrl(explorerUrl) ? (
            <GitHubRepoViewer
              githubUrl={explorerUrl}
              demoUrl={demoLinks[selectedProject.id]}
              projectTitle={explorerTitle || selectedProject.title}
              onClose={() => setShowExplorer(false)}
            />
          ) : (
            <FileExplorerViewer
              storageUrl={explorerUrl}
              onClose={() => setShowExplorer(false)}
            />
          )
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
            {selectedProject.isAutoSubmitted ? (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-2xs">
                ⚡ Auto-Submitted
              </span>
            ) : (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 capitalize shadow-2xs">
                {selectedProject.status}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span className="px-3 py-1 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-100 text-[10px] font-black uppercase tracking-wider">
                {selectedProject.projectType || 'mini'} project
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{selectedProject.title}</h2>
              <p className="text-sm text-slate-500 leading-relaxed">{selectedProject.shortDescription || selectedGuide?.brief || selectedProject.overview}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {(selectedProject.skills?.length > 0 ? selectedProject.skills : selectedGuide.techStack || []).map((item: string) => (
                  <span key={item} className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs">
                    {item}
                  </span>
                ))}
              </div>

              {selectedProject.templateUrl && (
                <div className="pt-1">
                  <a
                    href={selectedProject.templateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 text-[#7c3aed] hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-all shadow-3xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Starter Template Repository</span>
                  </a>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Course</p>
                <p className="mt-1 text-xs font-bold text-slate-900 leading-snug">{selectedProject.course}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Due Date</p>
                <p className="mt-1 text-xs font-bold text-slate-900 leading-snug">{formatDisplayDueDate(selectedProject.dueDate)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</p>
                <p className={cn("mt-1 text-xs font-bold capitalize leading-snug", selectedProject.isAutoSubmitted ? "text-amber-700" : "text-[#7c3aed]")}>
                  {selectedProject.isAutoSubmitted ? 'Auto-Submitted' : selectedProject.status}
                </p>
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
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#7c3aed] text-xs font-black uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>PROJECT BRIEF & OBJECTIVES</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">Project Overview</h3>
                <ProjectOverviewRenderer
                  overview={selectedProject.overview || selectedGuide.brief || 'Develop a production-ready solution adhering to industry coding standards, modular component organization, and clean user experience.'}
                />
              </div>

              {/* Requirements Checklist */}
              {selectedProject.requirements && selectedProject.requirements.length > 0 ? (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Key Functional Requirements</h4>
                  <div className="space-y-2.5">
                    {selectedProject.requirements.map((req: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">{req.title}</p>
                          {req.desc && (
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">{req.desc}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
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
                  </div>
                </div>
              )}

              {/* Implementation Steps */}
              {((selectedProject.steps && selectedProject.steps.length > 0) || (selectedGuide.buildSteps && selectedGuide.buildSteps.length > 0)) && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Recommended Implementation Steps</h4>
                  <div className="space-y-2">
                    {(selectedProject.steps && selectedProject.steps.length > 0 ? selectedProject.steps : selectedGuide.buildSteps).map((step: string, idx: number) => (
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
                {(selectedProject.rubric && selectedProject.rubric.length > 0 ? selectedProject.rubric : [
                  { label: 'UI/UX & Responsiveness', weight: '35%', percent: 35 },
                  { label: 'Functionality & Logic', weight: '35%', percent: 35 },
                  { label: 'Code Quality & Cleanliness', weight: '30%', percent: 30 },
                ]).map((r: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-800">{r.label}</span>
                      <span className="text-[#7c3aed] font-extrabold">{r.weight}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#7c3aed] rounded-full transition-all duration-300" style={{ width: `${r.percent || 25}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pro Tips */}
            {((selectedProject.tips && selectedProject.tips.length > 0) || (selectedGuide.tips && selectedGuide.tips.length > 0)) && (
              <Card className="p-6 border border-amber-200/80 shadow-2xs rounded-[2rem] bg-amber-50/50 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>MENTOR PRO TIPS</span>
                </div>
                <ul className="space-y-2 text-xs font-medium text-amber-900/90 leading-relaxed list-disc list-inside">
                  {(selectedProject.tips && selectedProject.tips.length > 0 ? selectedProject.tips : selectedGuide.tips).map((tip: string, idx: number) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </Card>
            )}

          </div>

        </div>

        {/* Project Solution Submission Area (Zero-Storage GitHub Link + One-Time Lock) */}
        <Card className="p-6 sm:p-8 border border-slate-200/90 shadow-sm rounded-[2rem] bg-white">
          {driveLinks[selectedProject.id] ? (() => {
            const submittedUrl = driveLinks[selectedProject.id];
            const isGitHub = isGitHubSubmissionUrl(submittedUrl);
            const parsedRepo = isGitHub ? parseGitHubRepoUrl(submittedUrl) : null;
            const demoUrl = demoLinks[selectedProject.id];

            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-2">
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-[#7c3aed]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {isGitHub ? 'GitHub Repository Submitted' : 'Project Solution Submitted'}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Locked for Review
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium truncate">
                      {parsedRepo ? `${parsedRepo.owner}/${parsedRepo.repo}` : 'Your project solution is saved and ready for mentor review.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                  {demoUrl && (
                    <a
                      href={demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Live Demo</span>
                    </a>
                  )}
                  {isGitHub && (
                    <a
                      href={parsedRepo?.normalizedUrl || submittedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open on GitHub</span>
                    </a>
                  )}
                  <Button
                    onClick={() => {
                      setExplorerUrl(submittedUrl);
                      setExplorerTitle(selectedProject.title);
                      setShowExplorer(true);
                    }}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs"
                    leftIcon={<Eye className="w-4 h-4" />}
                  >
                    {isGitHub ? 'Inspect Repo' : 'View Submitted Files'}
                  </Button>
                </div>
              </div>
            );
          })() : selectedProject.isAutoSubmitted ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-2">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-slate-900 text-base">Submissions Closed</h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                      Auto-Submitted
                    </span>
                    {selectedProject.dueDate && (
                      <span className="text-slate-400 text-xs font-semibold">
                        • Deadline Passed ({formatDisplayDueDate(selectedProject.dueDate)})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-xl">
                    This project reached its deadline and was automatically closed without submission. Submissions are no longer accepted for this project.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => handleGitHubSubmit(e, selectedProject.id)} className="space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Submit Your Project via GitHub
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Push your code to a public GitHub repository and submit the repository link below for mentor review.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  One-time submission
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GitHub Repository URL */}
                <div className="space-y-1.5">
                  <label htmlFor="github-repo-url" className="block text-xs font-bold text-slate-700">
                    GitHub Repository URL <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <GitBranch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="github-repo-url"
                      type="url"
                      required
                      value={githubInput}
                      onChange={(e) => {
                        setGithubInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="https://github.com/username/project-repo"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-500/15 outline-none text-xs font-medium text-slate-800 transition-all"
                    />
                  </div>
                  {/* Live Verification Status */}
                  {repoCheckStatus === 'checking' && (
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin inline-block" />
                      Verifying public repository...
                    </p>
                  )}
                  {repoCheckStatus === 'verified' && repoMeta && (
                    <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Public repo verified: {repoMeta.owner}/{repoMeta.repo}
                        {repoMeta.language ? ` (${repoMeta.language})` : ''}
                        {repoMeta.commitSha ? ` • ${repoMeta.commitSha}` : ''}
                      </span>
                    </p>
                  )}
                  {repoCheckStatus === 'rate_limited' && (
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#7c3aed] shrink-0" />
                      <span>GitHub link format valid — ready to submit.</span>
                    </p>
                  )}
                </div>

                {/* Optional Live Demo URL */}
                <div className="space-y-1.5">
                  <label htmlFor="live-demo-url" className="block text-xs font-bold text-slate-700">
                    Live Demo URL <span className="text-slate-400 font-medium">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="live-demo-url"
                      type="url"
                      value={demoInput}
                      onChange={(e) => {
                        setDemoInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="https://your-project.vercel.app"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-500/15 outline-none text-xs font-medium text-slate-800 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Include a deployed link (Vercel, Netlify, Render, or GitHub Pages) if applicable.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <p className="text-[11px] text-slate-500 font-medium">
                  Once submitted, this link is locked and sent directly to your mentor.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting || !githubInput.trim() || repoCheckStatus === 'error'}
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-xs shrink-0"
                  leftIcon={isSubmitting ? undefined : <GitBranch className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Project for Review'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12 animate-fade-in">

      {showExplorer && explorerUrl && (
        isGitHubSubmissionUrl(explorerUrl) ? (
          <GitHubRepoViewer
            githubUrl={explorerUrl}
            projectTitle={explorerTitle}
            onClose={() => setShowExplorer(false)}
          />
        ) : (
          <FileExplorerViewer
            storageUrl={explorerUrl}
            onClose={() => setShowExplorer(false)}
          />
        )
      )}
      
      {/* Header */}
      <div className="pb-2" id="tour-projects-header">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Projects Workflow
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Inspect project briefs, build industry solutions, and submit your GitHub repository for mentor reviews.
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
              onClick={() => handleMainCategoryChange(cat.id as any)}
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
              { id: 'assigned', label: 'Assigned' },
              { id: 'submitted', label: 'Submitted' },
              { id: 'feedback', label: 'Mentor Feedback' },
            ]}
            active={subTab}
            onChange={(val) => handleSubTabChange(val as any)}
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
        {!hasLoadedOnce && projectsState.length === 0 && !fetchError ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : fetchError && projectsState.length === 0 ? (
          <ErrorState
            title="Unable to load projects (503)"
            description="We encountered a temporary server error connecting to the project repository. Please retry."
            onRetry={() => {
              setFetchError(null);
              loadProjectsAndSubmissions(true);
            }}
          />
        ) : filtered.length === 0 ? (
          <div>
            <Card className="p-12 text-center bg-white border border-slate-200/90 rounded-[2rem] shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <FolderGit2 className="w-8 h-8 text-[#7c3aed]" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                {subTab === 'assigned'
                  ? 'No Assigned Projects'
                  : subTab === 'submitted'
                  ? 'No Submitted Projects'
                  : 'No Mentor Feedback Yet'}
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1 max-w-sm mx-auto">
                {subTab === 'assigned'
                  ? 'You currently have no pending assigned projects in this category.'
                  : subTab === 'submitted'
                  ? 'You have not submitted any projects in this category yet.'
                  : 'No mentor feedback has been recorded for your submissions yet.'}
              </p>
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
                      {p.hasLink ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                          Submitted
                        </span>
                      ) : p.isAutoSubmitted ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                          Auto-Submitted
                        </span>
                      ) : p.isOverdue ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">{p.status}</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1">
                      {p.course}{p.dueDate && p.dueDate !== 'No deadline' ? ` • Due ${formatDisplayDueDate(p.dueDate)}` : ''}
                    </p>
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
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <FolderGit2 className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">{p.title}</h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">{p.course}</p>
                      </div>
                    </div>
                    {p.hasLink ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                        Submitted
                      </span>
                    ) : p.isAutoSubmitted ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                        Auto-Submitted
                      </span>
                    ) : p.isOverdue ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider">
                        Overdue
                      </span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                        {p.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-slate-600 mb-4 leading-relaxed line-clamp-2">{formatProjectDescription(p.description, p.overview)}</p>
                  
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
                    {p.dueDate && p.dueDate !== 'No deadline' ? `Due ${formatDisplayDueDate(p.dueDate)}` : 'No deadline'}
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
