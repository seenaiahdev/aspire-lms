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
import { StatusChip, DifficultyBadge } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { triggerFileDownload } from '@/lib/downloadHelper';

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
      {
        action: 'User clicks Signup',
        event: 'onclick on Signup button',
        calls: ['handleSignupClick()', 'validateForm()', 'showWelcomeMessage()'],
        result: 'Create the account flow and move to welcome state.',
      },
      {
        action: 'User clicks Reset',
        event: 'onclick on Reset button',
        calls: ['resetForm()'],
        result: 'Clear inputs and return the form to default state.',
      },
    ],
    buildSteps: [
      'Create a simple login and signup form in HTML.',
      'Style the page with CSS for a clean and responsive layout.',
      'Attach onclick handlers in JavaScript for Login, Signup, and Reset.',
      'Validate the form fields before showing the welcome message.',
      'Display a friendly welcome section after successful action.',
    ],
    tips: [
      'Keep the UI simple so students can focus on the flow.',
      'Use clear button names and small function names.',
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
      { path: 'backend/model.py', purpose: 'Load model and run predictions' },
    ],
    functions: [
      'handleImageUpload',
      'predictImage',
      'loadModel',
      'formatPrediction',
    ],
    buildSteps: [
      'Prepare the dataset and train the model.',
      'Wrap inference in a small API.',
      'Connect the frontend upload flow to the API.',
      'Show confidence, class label, and history of predictions.',
    ],
    tips: [
      'Keep the UI simple and focused on the prediction result.',
      'Use loading and error states so the demo feels complete.',
    ],
  },
  p3: {
    brief: 'Document a real-time chat system with clear components, APIs, and trade-offs.',
    techStack: ['System Design', 'WebSocket', 'Redis', 'Node.js', 'PostgreSQL'],
    fileStructure: [
      { path: 'docs/architecture.md', purpose: 'High-level design and diagrams' },
      { path: 'docs/api-spec.md', purpose: 'Core endpoints and message flow' },
      { path: 'src/server/websocket.ts', purpose: 'Live message handling' },
      { path: 'src/server/cache.ts', purpose: 'Redis caching and presence state' },
    ],
    functions: [
      'handleSendMessage',
      'syncMessageDelivery',
      'trackPresence',
      'persistChatEvent',
    ],
    buildSteps: [
      'Define users, rooms, and message flow.',
      'Draw the architecture and storage layers.',
      'Add real-time communication and caching.',
      'Explain scaling, retries, and delivery guarantees.',
    ],
    tips: [
      'Be explicit about trade-offs.',
      'Use diagrams to make the design easy to review.',
    ],
  },
  p4: {
    brief: 'Create a responsive personal portfolio page to showcase projects, skills, and contact information.',
    techStack: ['HTML5', 'CSS3', 'JavaScript'],
    fileStructure: [
      { path: 'index.html', purpose: 'Portfolio layout and sections' },
      { path: 'styles.css', purpose: 'Responsive styles and grid layout' },
      { path: 'main.js', purpose: 'Interactive behavior and filters' },
    ],
    functions: ['renderProjects', 'filterByTag', 'openProjectModal'],
    workflow: [
      { action: 'Design layout', event: 'n/a', calls: [], result: 'Create hero, projects grid and contact section' },
      { action: 'Add projects', event: 'n/a', calls: ['renderProjects()'], result: 'Show project cards with links and images' },
    ],
    buildSteps: ['Create HTML structure', 'Add responsive CSS', 'Render project cards with JavaScript', 'Add contact form (no backend required)'],
    tips: ['Keep images optimized', 'Use semantic HTML', 'Make it accessible and responsive'],
  },
};

export function ProjectsScreen() {
  const [tab, setTab] = useState('assigned');
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

  const filtered = useMemo(() => {
    return effectiveProjects.filter((p: any) => {
      if (tab === 'assigned') return p.status === 'assigned';
      if (tab === 'submitted' || tab === 'completed') return p.status === 'submitted' || p.status === 'completed';
      if (tab === 'feedback') return p.status === 'feedback';
      return true;
    });
  }, [effectiveProjects, tab]);

  const selectedProject = useMemo(
    () => effectiveProjects.find((p: any) => p.id === selectedProjectId) || null,
    [selectedProjectId, effectiveProjects]
  );
  const selectedGuide = selectedProject ? projectGuides[selectedProject.id] : undefined;

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

  // live validation: true when draftLink is a non-empty, parseable URL
  const isValidLink = (() => {
    const v = draftLink.trim();
    if (!v) return false;
    try {
      // ensure it's an absolute URL
      const u = new URL(v);
      return Boolean(u.protocol && u.hostname);
    } catch {
      return false;
    }
  })();

  const openProjectInVSCode = () => {
    const workspace = localStorage.getItem('vscodeWorkspacePath') || VSCODE_WORKSPACE_PATH;
    // map project ids to starter folder names (if present)
    const starterMap: Record<string, string> = {
      p1: 'project-starters/login-signup-welcome',
      // add more mappings if you create additional starter folders
    };

    const starter = starterMap[selectedProject?.id || ''] || '';
    // build path and normalize slashes
    const filePath = starter ? `${workspace.replaceAll('\\', '/')}/${starter}` : workspace.replaceAll('\\', '/');
    const vscodeUri = `vscode://file/${encodeURI(filePath)}`;
    window.open(vscodeUri, '_blank', 'noopener,noreferrer');
  };

  const [workspacePath, setWorkspacePath] = useState(() => localStorage.getItem('vscodeWorkspacePath') || '');

  const configureWorkspacePath = () => {
    const current = localStorage.getItem('vscodeWorkspacePath') || '';
    const val = window.prompt('Enter your local VS Code workspace absolute path (e.g. C:/Users/you/Projects/my-repo):', current || VSCODE_WORKSPACE_PATH);
    if (val !== null) {
      localStorage.setItem('vscodeWorkspacePath', val);
      setWorkspacePath(val);
    }
  };

  const openInVscodeDev = () => {
    // fallback to opening vscode.dev — user can open the project repo there
    window.open('https://vscode.dev', '_blank', 'noopener,noreferrer');
  };

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

      setTab('submitted');
      setToastVisible(true);
      setTouched(false);
    } catch {
      setTouched(true);
    }
  };

  if (selectedProject && selectedGuide) {
    return (
      <div className="space-y-6 pb-12">
        {toastVisible && (
          <Toast message="Project submitted — we'll notify you when feedback arrives." onClose={() => setToastVisible(false)} position="top-right" />
        )}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={closeProjectDetail}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to projects
          </button>

          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={selectedProject.difficulty} />
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
              {selectedProject.status}
            </span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 sm:p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">Project brief</p>
              <h2 className="text-3xl sm:text-[2.6rem] font-bold text-slate-900 leading-tight">{selectedProject.title}</h2>
              <p className="text-sm sm:text-base text-slate-500 leading-relaxed">{selectedGuide.brief}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {(selectedGuide.techStack || []).map((item) => (
                  <span key={item} className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px] xl:w-[460px]">
              <div className="min-h-[104px] rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-semibold">Course</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{selectedProject.course}</p>
              </div>
              <div className="min-h-[104px] rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-semibold">Due</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{selectedProject.dueDate}</p>
              </div>
              <div className="min-h-[104px] rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400 font-semibold">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 capitalize leading-snug">{selectedProject.status}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
          <div className="space-y-6">
            <Card className="p-6 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.05)] rounded-[1.75rem] bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FolderGit2 className="w-4 h-4 text-primary-500" /> Suggested file structure
              </div>
              <div className="mt-5 space-y-3">
                {(selectedGuide.fileStructure || []).map((item) => (
                  <div key={item.path} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                    <p className="font-mono text-sm font-semibold text-slate-900">{item.path}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.purpose}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.05)] rounded-[1.75rem] bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Terminal className="w-4 h-4 text-primary-500" /> Core function names
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(selectedGuide.functions || []).map((fn) => (
                  <span key={fn} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-700">
                    {fn}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-6 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.05)] rounded-[1.75rem] bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ArrowRight className="w-4 h-4 text-primary-500" /> Workflow
              </div>
              <div className="mt-5 space-y-4">
                {(selectedGuide.workflow || []).map((step, index) => (
                  <div key={step.action} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{step.action}</p>
                        <p className="mt-1 text-xs text-slate-500">{step.event}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(step.calls || []).map((call) => (
                            <span key={call} className="rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] font-mono text-slate-700">
                              {call}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-600">{step.result}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.05)] rounded-[1.75rem] bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BookOpen className="w-4 h-4 text-primary-500" /> Build flow
              </div>
              <ol className="mt-5 space-y-3">
                {(selectedGuide.buildSteps || []).map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-slate-600">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 text-xs font-bold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="p-6 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.05)] rounded-[1.75rem] bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-primary-500" /> Tips
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                {(selectedGuide.tips || []).map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <Card className="p-6 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.05)] rounded-[1.75rem] bg-white">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Submission link</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Link2 className="w-4 h-4 text-primary-500" />
                <span>Paste the Google Drive link for this project.</span>
              </div>
            </div>
            {/* submission input */}
            <div className="min-w-0 w-full lg:w-[320px]">
              <input
                value={draftLink}
                onChange={(e) => { setDraftLink(e.target.value); setTouched(true); }}
                placeholder="Paste Google Drive link"
                readOnly={isSaved}
                disabled={isSaved}
                className={`w-full rounded-2xl px-4 py-3 text-sm outline-none transition ${isSaved ? 'border border-emerald-200 bg-emerald-50 text-emerald-900' : ''} ${
                  !isSaved ? (isValidLink ? 'border border-emerald-300 bg-emerald-50 text-emerald-900 focus:ring-2 focus:ring-emerald-500/15' : (draftLink.trim() === '' ? 'border border-red-300 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-500/15' : 'border border-red-300 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-500/15')) : ''
                }`}
              />
              <div className="mt-2">
                {!isSaved && (
                  <>
                    {draftLink.trim() === '' && touched && (
                      <p className="text-xs text-red-600">Please paste a link — this field cannot be empty.</p>
                    )}
                    {draftLink.trim() !== '' && (
                      isValidLink ? (
                        <p className="text-xs text-emerald-700">Looks good — valid URL.</p>
                      ) : (
                        <p className="text-xs text-red-600">That doesn't look like a valid URL.</p>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
            {isSaved ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold">Saved</span>
              </div>
            ) : (
              <Button onClick={saveDriveLink} disabled={!isValidLink} className="whitespace-nowrap" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Save Link
              </Button>
            )}
          </div>

            <div className="mt-5 flex items-center gap-3">
              {isSaved && (
                <a href={driveLinks[selectedProject.id]} target="_blank" rel="noopener noreferrer" className="truncate rounded-md px-3 py-2 bg-slate-50 border border-slate-200 text-sm text-primary-700 hover:bg-slate-100">
                  {driveLinks[selectedProject.id]}
                </a>
              )}

              <button
                type="button"
                onClick={openInVscodeDev}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:bg-primary-50"
              >
                <ExternalLink className="w-4 h-4" />
                Open in VS Code
              </button>
            </div>
          </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">Projects</p>
            <h2 className="mt-2 font-display font-bold text-3xl text-ink-900">Project workflow</h2>
            <p className="text-slate-500 text-sm mt-2 max-w-2xl">
              Open an assigned project, inspect the brief, launch VS Code, and submit your drive link when you are ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Assigned briefs</span>
            <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">VS Code launch</span>
            <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Drive submission</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned', value: effectiveProjects.filter((p: any) => p.status === 'assigned').length, icon: Clock, color: 'warning' },
          { label: 'Submitted / Completed', value: effectiveProjects.filter((p: any) => p.status === 'submitted' || p.status === 'completed').length, icon: CheckCircle2, color: 'accent' },
          { label: 'With Feedback', value: effectiveProjects.filter((p: any) => p.status === 'feedback').length, icon: MessageCircle, color: 'primary' },
          { label: 'Avg Grade', value: '89%', icon: Star, color: 'success' },
        ].map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 text-${s.color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900 font-display">{s.value}</p>
              <p className="text-xs text-ink-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs
        variant="pills"
        tabs={[
          { id: 'assigned', label: `Assigned (${effectiveProjects.filter((p: any) => p.status === 'assigned').length})` },
          { id: 'submitted', label: `Submitted / Completed (${effectiveProjects.filter((p: any) => p.status === 'submitted' || p.status === 'completed').length})` },
          { id: 'feedback', label: `Mentor Feedback (${effectiveProjects.filter((p: any) => p.status === 'feedback').length})` },
          { id: 'templates', label: 'Templates' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab !== 'templates' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((p) => (
            <Card key={p.id} hover className="group p-5 cursor-pointer rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(15,23,42,0.10)]" onClick={() => openProjectDetail(p.id)}>
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 flex items-center justify-center shadow-sm">
                    <FolderGit2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink-900 text-sm group-hover:text-primary-700 transition-colors">{p.title}</h3>
                    <p className="text-xs text-ink-500">{p.course}</p>
                  </div>
                </div>
                <DifficultyBadge difficulty={p.difficulty} />
              </div>
              <p className="text-sm text-ink-600 mb-4 leading-relaxed">{p.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {p.skills.map((s: string) => <Badge key={s} variant="default">{s}</Badge>)}
              </div>
              {p.status === 'feedback' && p.mentorFeedback && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
                  <p className="text-xs font-semibold text-accent-700 mb-1">Mentor Feedback</p>
                  <p className="text-xs text-accent-700">{p.mentorFeedback}</p>
                  {p.grade && (
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={p.grade} color="bg-accent-500" className="flex-1" />
                      <span className="text-xs font-bold text-accent-700">{p.grade}/100</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-ink-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Due {p.dueDate}</span>
                <Button size="sm" variant={p.status === 'assigned' ? 'primary' : 'secondary'} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Open Brief
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {['React Starter Kit', 'Node.js API Template', 'ML Project Boilerplate', 'Next.js SaaS Template', 'Python Data Pipeline', 'Docker Dev Setup'].map((t, i) => (
            <Card key={i} hover className="p-5 flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-ink-100 flex items-center justify-center mb-3">
                  <Code2 className="w-5 h-5 text-ink-500" />
                </div>
                <h3 className="font-bold text-ink-900 text-sm mb-1">{t}</h3>
                <p className="text-xs text-ink-500 mb-4">Production-ready template with best practices built in.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => {
                  triggerFileDownload(t);
                  setToastVisible(true);
                }}
              >
                Download
              </Button>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
