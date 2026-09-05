import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle2, Upload, FolderOpen,
  ExternalLink, AlertCircle, BookOpen, ChevronLeft, ChevronRight,
  MonitorSmartphone, Eye, Lock, FileText, Loader2,
  Play, Terminal, RotateCcw, Clock, FileCode, Check, XCircle
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FileExplorerViewer, saveBundleToStorage, loadBundleFromStorage, type ProjectFile } from '@/components/practice/FileExplorerViewer';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/UserContext';
import { submitPracticeProblem } from '@/lib/api';
import { uploadSubmissionBundle } from '@/lib/submissionStorage';
import { executeCodeFile, type ExecutionResult } from '@/lib/codeRunner';


// ── Problem config ────────────────────────────────────────────────────────────

interface ProblemConfig {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  starterCode?: string;
}

const PROBLEM_CONFIGS: Record<string, ProblemConfig> = {
  pp1: {
    id: 'pp1',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays & Math',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. Return the answer as an array of indices.',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0, 1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1, 2]' },
      { input: 'nums = [3,3], target = 6', output: '[0, 1]' },
    ],
  },
  pp2: {
    id: 'pp2',
    title: 'Print Hello World',
    difficulty: 'Easy',
    category: 'Basics',
    description: 'Write a function named `helloWorld` (or `hello_world` in Python) that returns the exact string `"Hello World"`.\n\nMake sure the casing and spacing match exactly.',
    examples: [
      { input: 'helloWorld()', output: '"Hello World"', explanation: 'Returns the classic greeting string.' },
    ],
  },
  pp3: {
    id: 'pp3',
    title: 'Reverse a String',
    difficulty: 'Easy',
    category: 'Strings',
    description: 'Write a function `reverseString(str)` (or `reverse_string(s)` in Python) that takes a string input and returns the string in reverse order.',
    examples: [
      { input: 'str = "hello"', output: '"olleh"', explanation: 'Reversing "hello" produces "olleh".' },
      { input: 'str = "aspire"', output: '"eripsa"' },
    ],
  },
  pp4: {
    id: 'pp4',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    category: 'Strings & Logic',
    description: 'Write a function `isPalindrome(s)` that returns `true` if a given string reads the same backward as forward, ignoring casing and non-alphanumeric characters.',
    examples: [
      { input: 's = "A man, a plan, a canal: Panama"', output: 'true', explanation: '"amanaplanacanalpanama" is a palindrome.' },
      { input: 's = "race a car"', output: 'false', explanation: '"raceacar" is not a palindrome.' },
    ],
  },
  pp5: {
    id: 'pp5',
    title: 'Find Maximum in Array',
    difficulty: 'Medium',
    category: 'Arrays & Search',
    description: 'Write a function `findMax(nums)` that takes an array of integers `nums` and returns the maximum element.',
    examples: [
      { input: 'nums = [3, 7, 2, 9, 5]', output: '9', explanation: 'The largest number in the array is 9.' },
      { input: 'nums = [-10, -3, -5, -1]', output: '-1' },
    ],
  },
};

// Directories to skip during folder upload
const SKIP_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.DS_Store', 'venv', '.venv'];

// Accepted single-file extensions
const SINGLE_FILE_EXTS = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.cs', '.go', '.rb', '.php', '.kt', '.swift', '.rs', '.html', '.css', '.txt', '.md'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkspaceScreen() {
  const { navigate, params } = useNav();
  const { user } = useUser();

  const [problemConfig, setProblemConfig] = useState<ProblemConfig>(() => {
    const defaultId = params.id && PROBLEM_CONFIGS[params.id] ? params.id : 'pp1';
    return PROBLEM_CONFIGS[defaultId] || PROBLEM_CONFIGS['pp1'];
  });
  const [loadingProblem, setLoadingProblem] = useState(false);
  const problemId = problemConfig.id;
  const isReviewMode = params.mode === 'review';

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedStorageUrl, setUploadedStorageUrl] = useState<string | null>(null);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [uploadedTotalSize, setUploadedTotalSize] = useState(0);
  const [uploadedProjectName, setUploadedProjectName] = useState('');

  // Staged solution for custom input testing before final submission
  interface StagedSubmission {
    bundle: any;
    files: ProjectFile[];
    primaryFile: ProjectFile;
    projectName: string;
    totalSize: number;
  }
  const [stagedSubmission, setStagedSubmission] = useState<StagedSubmission | null>(null);
  const [customInput, setCustomInput] = useState<string>('');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<ExecutionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  // Review mode: inline file viewer
  const [reviewBundle, setReviewBundle] = useState<ReturnType<typeof loadBundleFromStorage> | null>(null);
  const [showFullExplorer, setShowFullExplorer] = useState(false);
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

  // Dynamically load coding question from database if not hardcoded
  useEffect(() => {
    const fetchDbProblem = async () => {
      if (!params.id) return;
      if (PROBLEM_CONFIGS[params.id]) {
        setProblemConfig(PROBLEM_CONFIGS[params.id]);
        return;
      }

      setLoadingProblem(true);
      try {
        const { data, error } = await supabase
          .from('coding_questions')
          .select('*')
          .eq('id', params.id)
          .maybeSingle();

        if (data) {
          const mapped: ProblemConfig = {
            id: data.id,
            title: data.title || 'Untitled Problem',
            difficulty: (data.difficulty as any) || 'Easy',
            category: data.category || 'Basics',
            problem_statement: data.problem_statement || data.description || '',
            description: data.problem_statement || data.description || '',
            examples: Array.isArray(data.test_cases) ? data.test_cases.map((tc: any) => ({
              input: typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input || ''),
              output: typeof tc.output === 'object' ? JSON.stringify(tc.output) : String(tc.output || ''),
              explanation: tc.explanation || undefined
            })) : [],
            starterCode: data.starter_code || ''
          } as any;
          setProblemConfig(mapped);
        }
      } catch (err) {
        console.error("Failed to load dynamic coding question:", err);
      } finally {
        setLoadingProblem(false);
      }
    };

    fetchDbProblem();
  }, [params.id]);

  // On mount: load submitted data and sync with DB status
  useEffect(() => {
    const checkSubmission = async () => {
      // First try to load from database if user is logged in
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('practice_submissions')
            .select('*')
            .eq('student_id', user.id)
            .eq('problem_id', problemId)
            .maybeSingle();

          if (data) {
            setUploadedStorageUrl(data.storage_url);
            setUploadedFileCount(data.file_count ?? 0);
            setUploadedTotalSize(data.total_size ?? 0);
            setUploadedProjectName(data.project_name ?? '');
            
            // Sync with local storage
            localStorage.setItem(`submission_${problemId}`, JSON.stringify({
              storageUrl: data.storage_url,
              language: data.language || 'project',
              timestamp: data.submitted_at,
              solved: true,
              projectName: data.project_name,
              fileCount: data.file_count
            }));

            if (isReviewMode) {
              const bundle = loadBundleFromStorage(data.storage_url);
              setReviewBundle(bundle);
            }
            return;
          } else {
            // Database has no submission, so clean up local storage cache to keep them synced
            localStorage.removeItem(`submission_${problemId}`);
            setUploadedStorageUrl(null);
            setUploadedFileCount(0);
            setUploadedTotalSize(0);
            setUploadedProjectName('');
            setReviewBundle(null);
          }
        } catch (dbErr) {
          console.warn('Failed to fetch submission from Supabase:', dbErr);
        }
      }

      // Fallback to local storage if offline or not logged in
      try {
        const raw = localStorage.getItem(`submission_${problemId}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.storageUrl) {
            setUploadedStorageUrl(data.storageUrl);
            setUploadedFileCount(data.fileCount ?? 0);
            setUploadedTotalSize(0);
            setUploadedProjectName(data.projectName ?? '');
            if (isReviewMode) {
              const bundle = loadBundleFromStorage(data.storageUrl);
              setReviewBundle(bundle);
            }
          }
        }
      } catch {}
    };

    checkSubmission();
  }, [problemId, isReviewMode, user?.id]);

  // ── File Processing ─────────────────────────────────────────────────────────

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [processingFileName, setProcessingFileName] = useState('');

  const processFileList = useCallback(async (files: File[]) => {
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
    setUploadStatusText('Scanning solution files...');
    setUploadedStorageUrl(null);

    const firstItem = files[0];
    const nameCandidate = firstItem?.webkitRelativePath?.split('/')[0] || firstItem?.name || 'Solution';
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

    setUploadProgress(100);
    setUploadStatusText('Solution ready for custom input testing & submission');
    setIsProcessing(false);

    // Identify primary code file for testing
    const primaryFile = projectFiles.find((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['py', 'js', 'ts', 'jsx', 'tsx'].includes(ext || '');
    }) || projectFiles[0];

    setStagedSubmission({
      bundle,
      files: projectFiles,
      primaryFile,
      projectName,
      totalSize,
    });
    setCustomInput(problemConfig.examples?.[0]?.input || '');
    setTestResult(null);
  }, [problemConfig.examples]);

  // Execute custom input test against the uploaded file
  const handleRunCustomTest = async () => {
    if (!stagedSubmission?.primaryFile) return;
    setIsRunningTest(true);
    try {
      const res = await executeCodeFile(
        stagedSubmission.primaryFile.content,
        stagedSubmission.primaryFile.language || 'python',
        customInput
      );
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'error',
        output: '',
        stdout: [],
        error: err?.message || String(err),
        executionTimeMs: 0,
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  // Submit solution after testing
  const handleFinalizeSubmit = async () => {
    if (!stagedSubmission) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const { bundle, files, primaryFile, projectName, totalSize } = stagedSubmission;
      const localUrl = saveBundleToStorage(bundle);

      let remoteUrl: string | null = null;
      if (user && user.id) {
        setUploadStatusText('Uploading to review storage...');
        remoteUrl = await uploadSubmissionBundle(bundle, user.id, problemId, 'practice');
      }
      const submissionUrl = remoteUrl || localUrl;
      const detectedLang = primaryFile?.language || 'practice';

      localStorage.setItem(`submission_${problemId}`, JSON.stringify({
        storageUrl: localUrl,
        remoteUrl,
        language: detectedLang,
        timestamp: new Date().toISOString(),
        solved: true,
        projectName,
        fileCount: files.length,
      }));

      if (user && user.id) {
        const difficultyXpMap: Record<string, number> = { Easy: 15, Medium: 30, Hard: 50 };
        const rewardXp = difficultyXpMap[problemConfig.difficulty] || 25;
        await submitPracticeProblem(
          user.id,
          problemId,
          detectedLang,
          undefined,
          undefined,
          submissionUrl,
          projectName,
          files.length,
          totalSize,
          rewardXp
        );
      }

      setUploadedStorageUrl(localUrl);
      setUploadedFileCount(files.length);
      setUploadedTotalSize(totalSize);
      setUploadedProjectName(projectName);
      setStagedSubmission(null);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage('Failed to submit solution: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-test an already submitted solution with custom inputs
  const handleTestSubmittedFile = () => {
    if (uploadedStorageUrl) {
      const bundle = loadBundleFromStorage(uploadedStorageUrl);
      if (bundle && bundle.files && bundle.files.length > 0) {
        const primaryFile = bundle.files.find((f: any) => {
          const ext = f.name.split('.').pop()?.toLowerCase();
          return ['py', 'js', 'ts', 'jsx', 'tsx'].includes(ext || '');
        }) || bundle.files[0];

        setStagedSubmission({
          bundle,
          files: bundle.files,
          primaryFile,
          projectName: bundle.projectName || 'Submitted Solution',
          totalSize: bundle.totalSize || 0,
        });
        setCustomInput(problemConfig.examples?.[0]?.input || '');
        setTestResult(null);
      }
    }
  };

  // Folder upload
  const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const fileArray = Array.from(e.target.files).filter((f) => {
      const parts = (f.webkitRelativePath || f.name).split('/');
      return !parts.some((p) => SKIP_DIRS.includes(p));
    });
    processFileList(fileArray);
  }, [processFileList]);

  // Single file upload
  const handleSingleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    processFileList(Array.from(e.target.files));
  }, [processFileList]);

  // Drag & drop (supports both files and folders)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files?.length) return;
    const fileArray = Array.from(e.dataTransfer.files).filter((f) => {
      const parts = (f.webkitRelativePath || f.name).split('/');
      return !parts.some((p) => SKIP_DIRS.includes(p));
    });
    processFileList(fileArray);
  }, [processFileList]);

  // ── Left Panel ──────────────────────────────────────────────────────────────

  const LeftPanel = (
    <div className="w-full lg:w-1/2 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
      <div className="flex items-center border-b border-slate-200 bg-slate-50 px-2 justify-between">
        <button className="px-4 py-3.5 text-xs font-black border-b-2 border-[#7c3aed] text-[#7c3aed] bg-white flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" /> Description
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-700 bg-white">
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-2">{problemConfig.title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{problemConfig.description}</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Examples</h3>
          {problemConfig.examples && problemConfig.examples.length > 0 ? (
            problemConfig.examples.map((ex, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5 font-mono text-xs">
                <p className="font-bold text-slate-500 text-[10px] uppercase">Example {idx + 1}:</p>
                <p><span className="text-[#7c3aed] font-bold">Input:</span> {ex.input}</p>
                <p><span className="text-emerald-600 font-bold">Output:</span> {ex.output}</p>
                {ex.explanation && <p className="text-slate-500 text-[11px] font-sans mt-1">{ex.explanation}</p>}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">No example cases provided.</p>
          )}
        </div>

        {problemConfig.starterCode && (
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Starter Code</h3>
            <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all cursor-pointer">
              {problemConfig.starterCode}
            </pre>
          </div>
        )}

        {!isReviewMode && (
          <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/30">
            <h3 className="text-xs font-bold text-primary-300 mb-2">How to Submit</h3>
            <ol className="space-y-1.5 text-xs text-slate-400">
              <li><span className="text-primary-400 font-bold">1.</span> Read the problem carefully above.</li>
              <li><span className="text-primary-400 font-bold">2.</span> Open VS Code or <span className="text-white font-semibold">vscode.dev</span> online.</li>
              <li><span className="text-primary-400 font-bold">3.</span> Write and save your solution file(s).</li>
              <li><span className="text-primary-400 font-bold">4.</span> Upload a <strong className="text-white">single file</strong> (e.g. <code className="text-primary-300">solution.py</code>) or a whole <strong className="text-white">project folder</strong>.</li>
              <li><span className="text-primary-400 font-bold">5.</span> Click <span className="text-primary-400 font-bold">"View Project"</span> to preview your submission.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );

  if (loadingProblem) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <h3 className="font-extrabold text-slate-900 text-lg">Loading coding workspace...</h3>
        </div>
      </div>
    );
  }

  // ── Right Panel: REVIEW MODE ────────────────────────────────────────────────
  //  Shows the submitted file structure directly (embedded inline)

  if (isReviewMode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col font-sans text-slate-800">
        {/* Full-screen explorer modal (optional "expand") */}
        {showFullExplorer && uploadedStorageUrl && (
          <FileExplorerViewer storageUrl={uploadedStorageUrl} onClose={() => setShowFullExplorer(false)} />
        )}

        {/* Header */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('practice', { tab: 'history' })} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base">{problemConfig.title}</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                  problemConfig.difficulty === 'Easy'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                    : 'bg-amber-50 text-amber-700 border-amber-200/70'
                }`}>{problemConfig.difficulty}</span>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-[#7c3aed] border border-purple-200/70 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Submitted
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Practice Lab • {problemConfig.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {uploadedStorageUrl && (
              <>
                <Button size="sm" onClick={() => setShowFullExplorer(true)} leftIcon={<Eye className="w-4 h-4" />}
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs px-3 shadow-xs">
                  Expand View
                </Button>
              </>
            )}
            <Button size="sm" variant="secondary" onClick={() => navigate('practice', { tab: 'history' })}
              className="bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs">
              Back to Practice
            </Button>
          </div>
        </div>

        {/* Modal for Testing in Review Mode */}
        {isReviewMode && stagedSubmission && (
          <Modal open={stagedSubmission !== null} onClose={() => { setStagedSubmission(null); setTestResult(null); }} size="lg">
            <div className="p-6 sm:p-8 space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed]">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Test Submitted Solution</h3>
                    <p className="text-xs text-slate-500">Run custom inputs against {stagedSubmission.primaryFile.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setStagedSubmission(null); setTestResult(null); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Code Preview Toggle */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 font-mono">
                  {stagedSubmission.primaryFile.name} ({formatBytes(stagedSubmission.primaryFile.size)})
                </span>
                <button
                  type="button"
                  onClick={() => setShowCodePreview(!showCodePreview)}
                  className="text-xs font-bold text-[#7c3aed] hover:underline cursor-pointer"
                >
                  {showCodePreview ? 'Hide File Content' : 'View File Content'}
                </button>
              </div>
              {showCodePreview && (
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {stagedSubmission.primaryFile.content}
                </pre>
              )}

              {/* Custom Input Field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Custom Input Parameters
                </label>
                {problemConfig.examples && problemConfig.examples.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap text-xs mb-2">
                    <span className="font-bold text-slate-400 text-[11px]">Load:</span>
                    {problemConfig.examples.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomInput(ex.input)}
                        className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-200 text-[11px] font-bold transition cursor-pointer"
                      >
                        Ex {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  rows={3}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g. nums = [2, 7, 11, 15], target = 9"
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs focus:bg-white focus:outline-none focus:border-[#7c3aed]"
                />
              </div>

              {/* Run button */}
              <button
                type="button"
                disabled={isRunningTest}
                onClick={handleRunCustomTest}
                className="w-full py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRunningTest ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Executing Code on File...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Run Test Against Submitted File
                  </>
                )}
              </button>

              {/* Execution Results */}
              {testResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-4 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      testResult.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {testResult.success ? 'Execution Successful' : 'Execution Error'}
                    </span>
                    <span className="text-[11px] text-slate-400">{testResult.executionTimeMs} ms</span>
                  </div>

                  {testResult.stdout.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Standard Output (stdout):</p>
                      <pre className="text-slate-300 bg-slate-950 p-2.5 rounded-lg whitespace-pre-wrap">
                        {testResult.stdout.join('\n')}
                      </pre>
                    </div>
                  )}

                  {testResult.output && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Output:</p>
                      <pre className="text-emerald-400 bg-slate-950 p-2.5 rounded-lg whitespace-pre-wrap font-bold">
                        {testResult.output}
                      </pre>
                    </div>
                  )}

                  {testResult.error && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-400 mb-1">Error:</p>
                      <pre className="text-rose-300 bg-rose-950/40 p-2.5 rounded-lg whitespace-pre-wrap">
                        {testResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Layout: Left = Question | Right = File Structure */}
        <div className="flex-1 flex overflow-hidden">
          {LeftPanel}

          {/* Right: Submitted File Structure */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {uploadedStorageUrl ? (
              <>
                {/* File tree header */}
                <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FolderOpen className="w-4 h-4 text-yellow-500" />
                    <span className="font-extrabold text-slate-800">{uploadedProjectName || 'Project Solution'}</span>
                    {uploadedFileCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{uploadedFileCount} file{uploadedFileCount !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 border border-purple-200/80">
                    Read Only
                  </span>
                </div>

                {/* Inline FileExplorerViewer (not fullscreen) */}
                <div className="flex-1 overflow-hidden">
                  <FileExplorerViewer
                    storageUrl={uploadedStorageUrl}
                    onClose={() => {}}
                    inline
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center p-8 bg-slate-50">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  <FolderOpen className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-800 font-bold">No project files found</p>
                  <p className="text-slate-500 text-xs mt-1">This submission may not have file data available</p>
                </div>
                <Button size="sm" onClick={() => navigate('practice', { tab: 'history' })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200">
                  Back to Practice
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Right Panel: SOLVE MODE ─────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col font-sans text-slate-800">

      {/* Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('practice', uploadedStorageUrl ? { tab: 'history' } : undefined)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-base">{problemConfig.title}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                problemConfig.difficulty === 'Easy'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                  : 'bg-amber-50 text-amber-700 border-amber-200/70'
              }`}>{problemConfig.difficulty}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Practice Lab • {problemConfig.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={() => navigate('practice', uploadedStorageUrl ? { tab: 'history' } : undefined)}
            className="bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs">
            Back to Practice
          </Button>
        </div>
      </div>

      {/* Full-screen explorer modal */}
      {showFullExplorer && uploadedStorageUrl && (
        <FileExplorerViewer storageUrl={uploadedStorageUrl} onClose={() => setShowFullExplorer(false)} />
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {LeftPanel}

        {/* Right: Upload area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-6 sm:p-10">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* ── STAGED STATE: Test Against Uploaded File Before Submitting ── */}
            {stagedSubmission ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[#7c3aed] text-xs font-black uppercase tracking-wider mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7c3aed]" />
                    Step 3: Confirm & Submit Solution
                  </div>
                  <h2 className="text-xl font-black text-slate-900">Verify Your Uploaded Solution</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Your solution from <strong className="text-slate-800 font-mono">{stagedSubmission.primaryFile.name}</strong> is verified and ready for submission.
                  </p>
                </div>

                {/* File summary card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed]">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900 font-mono">{stagedSubmission.primaryFile.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                            {stagedSubmission.primaryFile.language || 'code'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatBytes(stagedSubmission.primaryFile.size)} • {stagedSubmission.files.length} file{stagedSubmission.files.length !== 1 ? 's' : ''} in bundle
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCodePreview(!showCodePreview)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {showCodePreview ? 'Hide File Code' : 'View File Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStagedSubmission(null); setTestResult(null); }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Re-upload
                      </button>
                    </div>
                  </div>

                  {showCodePreview && (
                    <div className="mt-4 pt-4 border-t border-slate-150">
                      <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs max-h-60 overflow-y-auto whitespace-pre-wrap">
                        {stagedSubmission.primaryFile.content}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Custom Input Testing Console - Hidden from frontend for future use */}
                {false && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#7c3aed]" />
                      <h3 className="text-sm font-extrabold text-slate-900">Custom Input Runner</h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">Tests code from uploaded file</span>
                  </div>

                  {/* Example Loaders */}
                  {problemConfig.examples && problemConfig.examples.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-bold text-slate-500 text-[11px]">Load Sample Input:</span>
                      {problemConfig.examples.map((ex, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCustomInput(ex.input)}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-200 text-xs font-bold transition cursor-pointer"
                        >
                          Example {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Custom Input Parameters (arguments or variable assignments)
                    </label>
                    <textarea
                      rows={3}
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="e.g. nums = [2, 7, 11, 15], target = 9"
                      className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs focus:bg-white focus:outline-none focus:border-[#7c3aed] transition"
                    />
                  </div>

                  {/* Run Button */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isRunningTest}
                      onClick={handleRunCustomTest}
                      className="px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-xs font-extrabold transition shadow-sm inline-flex items-center gap-2 cursor-pointer"
                    >
                      {isRunningTest ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Executing Code on Uploaded File...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          Run Test on Uploaded File
                        </>
                      )}
                    </button>
                  </div>

                  {/* Execution Results Console */}
                  {testResult && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-4 font-mono text-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          testResult.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {testResult.success ? 'Execution Successful' : 'Execution Error'}
                        </span>
                        <span className="text-[11px] text-slate-400">{testResult.executionTimeMs} ms</span>
                      </div>

                      {testResult.stdout.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Standard Output (stdout):</p>
                          <pre className="text-slate-300 bg-slate-950 p-2.5 rounded-lg whitespace-pre-wrap">
                            {testResult.stdout.join('\n')}
                          </pre>
                        </div>
                      )}

                      {testResult.output && (
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Output Result:</p>
                          <pre className="text-emerald-400 bg-slate-950 p-2.5 rounded-lg whitespace-pre-wrap font-bold">
                            {testResult.output}
                          </pre>
                        </div>
                      )}

                      {testResult.error && (
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-rose-400">Error Details:</p>
                          <pre className="text-rose-300 bg-rose-950/40 p-2.5 rounded-lg whitespace-pre-wrap">
                            {testResult.error}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* Finalize Submission Card */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 flex-wrap gap-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Ready to Submit?</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submit your solution file to record your practice attempt and earn XP.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinalizeSubmit}
                    className="px-6 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Solution Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : uploadedStorageUrl ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">

                {/* Big success icon */}
                <div className="w-20 h-20 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-[#7c3aed]" />
                </div>

                {/* Heading */}
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Solution Submitted!</h2>
                  <p className="text-sm text-slate-500">
                    Your solution for <span className="text-slate-900 font-extrabold">{problemConfig.title}</span> has been submitted successfully.
                  </p>
                </div>

                {/* File metadata */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {uploadedProjectName && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-3xs">
                      <FolderOpen className="w-3.5 h-3.5 text-yellow-500" />
                      {uploadedProjectName}
                    </span>
                  )}
                  {uploadedFileCount > 0 && (
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-600 shadow-3xs">
                      {uploadedFileCount} file{uploadedFileCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {uploadedTotalSize > 0 && (
                    <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-600 shadow-3xs">
                      {formatBytes(uploadedTotalSize)}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => setShowFullExplorer(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Eye className="w-5 h-5" />
                    View Submitted Files
                  </button>
                  <button
                    onClick={() => navigate('practice', { tab: 'history' })}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all border border-slate-200 shadow-3xs cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Practice
                  </button>
                </div>

                {/* Submitted lock note */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-500 shadow-3xs">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Submission locked — you can review your files anytime from Practice History
                </div>

              </div>

            ) : (
              /* ── UPLOAD FLOW: before submission ── */
              <>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Submit Your Solution</h2>
                  <p className="text-sm text-slate-500 mt-1">Code in your local VS Code or <strong className="text-slate-800">vscode.dev</strong>, then upload your file or folder here.</p>
                </div>

                {/* Step 1: Open VS Code */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-base font-black text-[#7c3aed]">1</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 mb-1">Open VS Code & Write Your Solution</h3>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Work in your local VS Code or open the browser-based <strong className="text-slate-700">vscode.dev</strong> — no installation needed.
                      </p>
                      <a href="https://vscode.dev" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold transition-all shadow-sm">
                        <MonitorSmartphone className="w-4 h-4" />
                        Open vscode.dev
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 2: Upload */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                      <span className="text-base font-black text-[#7c3aed]">2</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 mb-1">Upload Your Solution</h3>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        Upload a <strong className="text-slate-700">single file</strong> (e.g. <code className="text-primary-600 font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-200">solution.py</code>)
                        or a complete <strong className="text-slate-700">project folder</strong>.
                      </p>

                      {/* Hidden input (folder or file) */}
                      <input ref={folderInputRef} type="file"
                        /* @ts-ignore */
                        webkitdirectory="" directory="" multiple
                        className="hidden" onChange={handleFolderInput}
                      />
                      <input ref={fileInputRef} type="file"
                        accept={SINGLE_FILE_EXTS.join(',')}
                        className="hidden" onChange={handleSingleFileInput}
                      />

                      {/* 1 Single Unified Upload Zone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
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
                              <p className="text-sm font-black text-slate-900">Uploading Solution...</p>
                              {processingFileName && (
                                <p className="text-xs font-semibold text-[#7c3aed] mt-0.5 font-mono truncate">
                                  {processingFileName}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 mt-1 font-medium">{uploadStatusText}</p>
                            </div>
                            {/* Progress bar */}
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
                                {isDragging ? 'Drop solution here!' : 'Drag & Drop your solution file or folder'}
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
                  </div>
                </div>

              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
