import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronRight, ChevronDown, FileCode, FolderOpen, Folder,
  Copy, Check, ExternalLink, FileText, Globe, Database, Settings,
  Code2, Hash, Package,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProjectFile {
  path: string;       // e.g. "src/components/App.tsx"
  name: string;       // e.g. "App.tsx"
  content: string;    // raw file content string
  size: number;       // bytes
  language: string;   // for syntax hint
}

export interface ProjectBundle {
  projectName: string;
  totalFiles: number;
  totalSize: number;
  uploadedAt: string;
  storageUrl: string;
  files: ProjectFile[];
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: ProjectFile;
}

interface FileExplorerViewerProps {
  storageUrl: string;
  onClose: () => void;
  inline?: boolean;   // when true, renders as inline panel (no modal overlay)
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getLanguageFromExt(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
    html: 'html', css: 'css', scss: 'scss',
    json: 'json', md: 'markdown', txt: 'text',
    yml: 'yaml', yaml: 'yaml', sh: 'bash', env: 'env',
  };
  return map[ext] ?? 'text';
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const cls = 'w-3.5 h-3.5 shrink-0';
  if (['ts', 'tsx'].includes(ext)) return <FileCode className={`${cls} text-blue-400`} />;
  if (['js', 'jsx'].includes(ext)) return <FileCode className={`${cls} text-yellow-400`} />;
  if (ext === 'py') return <FileCode className={`${cls} text-green-400`} />;
  if (ext === 'json') return <Database className={`${cls} text-orange-400`} />;
  if (['html', 'htm'].includes(ext)) return <Globe className={`${cls} text-red-400`} />;
  if (['css', 'scss'].includes(ext)) return <Hash className={`${cls} text-pink-400`} />;
  if (['md', 'txt'].includes(ext)) return <FileText className={`${cls} text-slate-300`} />;
  if (['yml', 'yaml'].includes(ext)) return <Settings className={`${cls} text-purple-400`} />;
  if (['sh', 'bash'].includes(ext)) return <Code2 className={`${cls} text-emerald-400`} />;
  if (filename === 'package.json' || filename === 'package-lock.json') return <Package className={`${cls} text-orange-400`} />;
  return <FileText className={`${cls} text-slate-400`} />;
}

/** Build a recursive tree from flat file list */
function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  files.forEach((file) => {
    const parts = file.path.split('/');
    let current = root;

    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1;
      let existing = current.find((n) => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: parts.slice(0, idx + 1).join('/'),
          isDir: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.push(existing);
      }

      if (!isLast) current = existing.children;
    });
  });

  // Sort: folders first, then files alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      })
      .map((n) => ({ ...n, children: sortNodes(n.children) }));
  };

  return sortNodes(root);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Tree Node Component ────────────────────────────────────────────────────────

function TreeNodeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedDirs,
  toggleDir,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: ProjectFile) => void;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedPath === node.path;

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => toggleDir(node.path)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-200/60 rounded-md text-left group transition-colors cursor-pointer"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {isExpanded
            ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
            : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
          }
          {isExpanded
            ? <FolderOpen className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            : <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
          }
          <span className="text-xs text-slate-700 font-bold truncate group-hover:text-slate-900">{node.name}</span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expandedDirs={expandedDirs}
                toggleDir={toggleDir}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => node.file && onSelect(node.file)}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer border ${
        isSelected
          ? 'bg-purple-50 border-purple-200 text-[#7c3aed] font-extrabold shadow-3xs'
          : 'border-transparent hover:bg-slate-200/50 text-slate-600 hover:text-slate-900 font-semibold'
      }`}
      style={{ paddingLeft: `${8 + depth * 14 + 14}px` }}
    >
      {getFileIcon(node.name)}
      <span className="text-xs truncate">{node.name}</span>
      {node.file && (
        <span className={`ml-auto text-[10px] shrink-0 font-mono ${isSelected ? 'text-[#7c3aed]/80' : 'text-slate-400'}`}>
          {formatBytes(node.file.size)}
        </span>
      )}
    </button>
  );
}

// ── Code Viewer ────────────────────────────────────────────────────────────────

function CodeViewer({ file }: { file: ProjectFile }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(file.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [file.content]);

  const lines = file.content.split('\n');

  return (
    <div className="flex flex-col h-full">
      {/* File Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {getFileIcon(file.name)}
          <span className="text-xs text-slate-700 font-black font-mono truncate">{file.path}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200/80 text-slate-600 border border-slate-300/40 shrink-0">
            {lines.length} lines
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200/80 text-slate-600 border border-slate-300/40 shrink-0">
            {formatBytes(file.size)}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code Lines */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-white">
        <table className="w-full border-collapse font-mono text-xs">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-purple-50/20">
                <td className="select-none text-right text-slate-400 pr-4 pl-4 w-12 sticky left-0 bg-slate-50 border-r border-slate-200/80">
                  {i + 1}
                </td>
                <td className="pl-4 pr-4 text-slate-800 whitespace-pre leading-6">
                  {line || '\u00A0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function FileExplorerViewer({ storageUrl, onClose, inline = false }: FileExplorerViewerProps) {
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load bundle from localStorage using storageUrl as key
  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      // Extract the blob key from the URL (everything after last '/')
      const blobKey = storageUrl.split('/').pop();
      const raw = localStorage.getItem(`lms_blob_${blobKey}`);
      if (!raw) throw new Error('Project bundle not found. It may have been cleared from browser storage.');
      const parsed: ProjectBundle = JSON.parse(raw);
      setBundle(parsed);
      const builtTree = buildTree(parsed.files);
      setTree(builtTree);

      // Auto-expand all directories recursively so deep folder structures (e.g. React apps) are visible
      const initialExpanded = new Set<string>();
      const expandAll = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          if (node.isDir) {
            initialExpanded.add(node.path);
            expandAll(node.children);
          }
        });
      };
      expandAll(builtTree);
      setExpandedDirs(initialExpanded);

      // Auto-select first file
      const firstFile = parsed.files[0];
      if (firstFile) setSelectedFile(firstFile);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load project bundle.');
    }
    setLoading(false);
  }, [storageUrl]);

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // Inner viewer content (shared between inline and modal modes)
  const viewerContent = (
    <div className={`${
      inline
        ? 'flex flex-col h-full w-full bg-white'
        : 'w-full max-w-6xl h-[90vh] rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden'
    }`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
              <Code2 className="w-4.5 h-4.5 text-[#7c3aed]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-base leading-tight truncate">
                {bundle?.projectName ?? 'Loading Project...'}
              </h2>
              {bundle && (
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-slate-500">
                    {bundle.totalFiles} files • {formatBytes(bundle.totalSize)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono truncate hidden sm:block">
                    {bundle.storageUrl}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-100">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse" />
              <span className="text-[10px] font-bold text-[#7c3aed]">READ ONLY</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all border border-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500">Loading project from storage...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-8 bg-white">
            <div className="text-center space-y-3 max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
                <X className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Failed to Load Project</h3>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">

            {/* ── File Tree Sidebar ── */}
            <div className="w-60 sm:w-72 bg-slate-50 border-r border-slate-200/80 flex flex-col shrink-0">
              <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Explorer
                </span>
                <span className="text-[10px] text-slate-400">
                  {bundle?.totalFiles} files
                </span>
              </div>
              <div className="flex-1 overflow-y-auto py-2 custom-scrollbar space-y-0.5 px-1 bg-slate-50">
                {tree.map((node) => (
                  <TreeNodeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedPath={selectedFile?.path ?? null}
                    onSelect={setSelectedFile}
                    expandedDirs={expandedDirs}
                    toggleDir={toggleDir}
                  />
                ))}
              </div>

              {/* Storage URL footer */}
              {bundle && (
                <div className="px-3 py-2.5 border-t border-slate-200 bg-slate-100/50">
                  <p className="text-[9px] text-slate-400 font-mono truncate">
                    DB: {bundle.storageUrl}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Uploaded {new Date(bundle.uploadedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* ── Code Viewer ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedFile ? (
                <CodeViewer file={selectedFile} />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-white animate-fade-in">
                  <div className="text-center space-y-2">
                    <FileCode className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-400 font-medium">Select a file from the explorer</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-2 bg-slate-50 text-slate-500 border-t border-slate-200 text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-4">
            {selectedFile && (
              <>
                <span className="font-bold text-slate-700">{selectedFile.path}</span>
                <span>{selectedFile.language}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-[#7c3aed]">Read Only</span>
            {bundle && <span>UTF-8</span>}
          </div>
        </div>

      </div>
  );

  // Return inline (fills parent container) or as full-screen modal
  if (inline) {
    return viewerContent;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      {viewerContent}
    </div>
  );
}


// ── Storage Utilities (with QuotaExceededError protection) ─────────────────────

const inMemoryBlobs = new Map<string, ProjectBundle>();

export function saveBundleToStorage(bundle: ProjectBundle): string {
  const blobKey = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storageUrl = `https://storage.lms.dev/blobs/${blobKey}`;
  const bundleWithUrl: ProjectBundle = { ...bundle, storageUrl };

  // Always keep copy in memory store for instant access
  inMemoryBlobs.set(blobKey, bundleWithUrl);

  const key = `lms_blob_${blobKey}`;
  const serialized = JSON.stringify(bundleWithUrl);

  try {
    localStorage.setItem(key, serialized);
  } catch (err) {
    console.warn('localStorage quota exceeded. Pruning old blobs...');
    
    // Clean up old lms_blob_ items to free up storage
    try {
      const blobKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('lms_blob_')) {
          blobKeys.push(k);
        }
      }
      
      // Delete oldest half of blob items
      blobKeys.slice(0, Math.max(1, Math.floor(blobKeys.length / 2))).forEach((k) => {
        localStorage.removeItem(k);
      });

      // Retry saving
      localStorage.setItem(key, serialized);
    } catch (retryErr) {
      console.warn('Stored in memory fallback store only (quota full).');
    }
  }

  return storageUrl;
}

export function loadBundleFromStorage(storageUrl: string): ProjectBundle | null {
  try {
    const blobKey = storageUrl.split('/').pop();
    if (!blobKey) return null;

    // Check memory store first
    if (inMemoryBlobs.has(blobKey)) {
      return inMemoryBlobs.get(blobKey)!;
    }

    // Check localStorage
    const raw = localStorage.getItem(`lms_blob_${blobKey}`);
    if (raw) {
      const parsed: ProjectBundle = JSON.parse(raw);
      inMemoryBlobs.set(blobKey, parsed);
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}
