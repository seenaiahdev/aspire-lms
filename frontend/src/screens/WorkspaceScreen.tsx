import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle2, Upload, FolderOpen,
  ExternalLink, AlertCircle, BookOpen, ChevronLeft, ChevronRight,
  MonitorSmartphone, Eye, Lock, FileText,
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Button } from '@/components/ui/Button';
import { FileExplorerViewer, saveBundleToStorage, loadBundleFromStorage, type ProjectFile } from '@/components/practice/FileExplorerViewer';

// ── Problem config ────────────────────────────────────────────────────────────

interface ProblemConfig {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
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

  const problemId = (params.id && PROBLEM_CONFIGS[params.id]) ? params.id : 'pp1';
  const problemConfig = PROBLEM_CONFIGS[problemId] || PROBLEM_CONFIGS['pp1'];
  const isReviewMode = params.mode === 'review';

  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedStorageUrl, setUploadedStorageUrl] = useState<string | null>(null);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [uploadedTotalSize, setUploadedTotalSize] = useState(0);
  const [uploadedProjectName, setUploadedProjectName] = useState('');

  // Review mode: inline file viewer
  const [reviewBundle, setReviewBundle] = useState<ReturnType<typeof loadBundleFromStorage> | null>(null);
  const [showFullExplorer, setShowFullExplorer] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // On mount: load submitted data
  useEffect(() => {
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
  }, [problemId, isReviewMode]);

  // ── File Processing ─────────────────────────────────────────────────────────

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [processingFileName, setProcessingFileName] = useState('');

  const processFileList = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;

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

    // Only the link goes to the DB
    localStorage.setItem(`submission_${problemId}`, JSON.stringify({
      storageUrl,
      language: 'project',
      timestamp: new Date().toISOString(),
      solved: true,
      projectName,
      fileCount: projectFiles.length,
    }));

    setUploadProgress(100);
    setUploadedStorageUrl(storageUrl);
    setUploadedFileCount(projectFiles.length);
    setUploadedTotalSize(totalSize);
    setUploadedProjectName(projectName);
    setIsProcessing(false);
  }, [problemId]);

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
    <div className={`transition-all duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden ${
      isPanelOpen ? 'w-full sm:w-[400px]' : 'w-0 border-r-0 opacity-0 pointer-events-none'
    }`}>
      <div className="flex items-center border-b border-slate-200 bg-slate-50 px-2 justify-between">
        <button className="px-4 py-3.5 text-xs font-black border-b-2 border-[#7c3aed] text-[#7c3aed] bg-white flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" /> Description
        </button>
        <button
          onClick={() => setIsPanelOpen(false)}
          className="mr-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-extrabold transition-all border border-slate-200"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Hide
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-700 bg-white">
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-2">{problemConfig.title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{problemConfig.description}</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Examples</h3>
          {problemConfig.examples.map((ex, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5 font-mono text-xs">
              <p className="font-bold text-slate-500 text-[10px] uppercase">Example {idx + 1}:</p>
              <p><span className="text-[#7c3aed] font-bold">Input:</span> {ex.input}</p>
              <p><span className="text-emerald-600 font-bold">Output:</span> {ex.output}</p>
              {ex.explanation && <p className="text-slate-500 text-[11px] font-sans mt-1">{ex.explanation}</p>}
            </div>
          ))}
        </div>

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
            <button onClick={() => navigate('practice')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-200">
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
              <Button size="sm" onClick={() => setShowFullExplorer(true)} leftIcon={<Eye className="w-4 h-4" />}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs px-3 shadow-xs">
                Expand View
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => navigate('practice')}
              className="bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs">
              Back to Practice
            </Button>
          </div>
        </div>

        {/* Layout: Left = Question | Right = File Structure */}
        <div className="flex-1 flex overflow-hidden">
          {/* Collapsed sidebar */}
          {!isPanelOpen && (
            <div className="w-12 bg-slate-100 border-r border-slate-200 flex flex-col items-center py-4 gap-4 shrink-0">
              <button onClick={() => setIsPanelOpen(true)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-200">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {LeftPanel}

          {/* Right: Submitted File Structure */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {reviewBundle ? (
              <>
                {/* File tree header */}
                <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FolderOpen className="w-4 h-4 text-yellow-500" />
                    <span className="font-extrabold text-slate-800">{reviewBundle.projectName}</span>
                    <span>•</span>
                    <span>{reviewBundle.totalFiles} file{reviewBundle.totalFiles !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 border border-purple-200/80">
                    Read Only
                  </span>
                </div>

                {/* Inline FileExplorerViewer (not fullscreen) */}
                <div className="flex-1 overflow-hidden">
                  <FileExplorerViewer
                    storageUrl={uploadedStorageUrl!}
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
                <Button size="sm" onClick={() => navigate('practice')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200">
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
          <button onClick={() => navigate('practice')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-200">
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
          <Button size="sm" variant="secondary" onClick={() => navigate('practice')}
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
        {!isPanelOpen && (
          <div className="w-12 bg-slate-100 border-r border-slate-200 flex flex-col items-center py-4 gap-4 shrink-0">
            <button onClick={() => setIsPanelOpen(true)}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-200">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {LeftPanel}

        {/* Right: Upload area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-6 sm:p-10">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* ── SUBMITTED STATE: hide upload, show submission card ── */}
            {uploadedStorageUrl ? (
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
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold transition-all shadow-sm"
                  >
                    <Eye className="w-5 h-5" />
                    View Submitted Files
                  </button>
                  <button
                    onClick={() => navigate('practice')}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all border border-slate-200 shadow-3xs"
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
