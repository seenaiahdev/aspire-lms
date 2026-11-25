import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, GitBranch, ExternalLink, Globe, Folder, FolderOpen, FileCode2,
  ChevronRight, ChevronDown, Copy, Check, AlertCircle, GitCommit
} from 'lucide-react';
import {
  parseGitHubRepoUrl,
  verifyPublicGitHubRepo,
  fetchGitHubRepoTree,
  fetchGitHubRawFile,
  type GitHubRepoMeta,
  type GitHubTreeEntry,
} from '@/lib/githubApi';

interface GitHubRepoViewerProps {
  githubUrl: string;
  demoUrl?: string;
  projectTitle?: string;
  onClose: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  children: TreeNode[];
}

const BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'tar', 'gz',
  'mp4', 'mp3', 'wav', 'woff', 'woff2', 'ttf', 'eot', 'exe', 'dll', 'so', 'bin',
]);

function buildTree(entries: GitHubTreeEntry[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isDir: true, children: [] };

  for (const entry of entries) {
    const parts = entry.path.split('/');
    let current = root;
    let accumPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumPath = accumPath ? `${accumPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      const isDir = isLast ? entry.type === 'tree' : true;

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: accumPath,
          isDir,
          size: isLast ? entry.size : undefined,
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => {
      if (n.children.length > 0) sortNodes(n.children);
    });
    return nodes;
  };

  return sortNodes(root.children);
}

/**
 * Zero-storage in-app GitHub repository code and README viewer.
 * Fetches tree metadata and raw source files on-demand directly from GitHub.
 */
export function GitHubRepoViewer({ githubUrl, demoUrl, projectTitle, onClose }: GitHubRepoViewerProps) {
  const parsed = useMemo(() => parseGitHubRepoUrl(githubUrl), [githubUrl]);

  const [meta, setMeta] = useState<GitHubRepoMeta | null>(null);
  const [entries, setEntries] = useState<GitHubTreeEntry[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!parsed) {
      setLoadingTree(false);
      setTreeError('Invalid GitHub repository URL.');
      return;
    }

    (async () => {
      setLoadingTree(true);
      setTreeError(null);
      setRateLimited(false);

      try {
        const repoMeta = await verifyPublicGitHubRepo(parsed.owner, parsed.repo);
        if (!alive) return;
        setMeta(repoMeta);

        if (repoMeta.status === 'private_or_missing') {
          setTreeError(repoMeta.error || 'Repository not found or is private.');
          setLoadingTree(false);
          return;
        }

        if (repoMeta.status === 'rate_limited') {
          setRateLimited(true);
          setLoadingTree(false);
          return;
        }

        const branch = repoMeta.defaultBranch || 'main';
        const treeRes = await fetchGitHubRepoTree(parsed.owner, parsed.repo, branch);
        if (!alive) return;

        if (treeRes.rateLimited) {
          setRateLimited(true);
          setLoadingTree(false);
          return;
        }

        setEntries(treeRes.entries);

        // Auto-expand top-level src folder if present and select README.md or first file
        const firstDir = treeRes.entries.find((e) => e.type === 'tree' && !e.path.includes('/'));
        if (firstDir) {
          setExpandedDirs(new Set([firstDir.path]));
        }

        const blobs = treeRes.entries.filter((e) => e.type === 'blob');
        const readme = blobs.find((b) => /^readme\.md$/i.test(b.path)) || blobs[0];
        if (readme) {
          setSelectedPath(readme.path);
        }
      } catch (err: any) {
        if (alive) {
          setTreeError(err?.message || 'Unable to load repository preview.');
        }
      } finally {
        if (alive) setLoadingTree(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [parsed]);

  useEffect(() => {
    let alive = true;
    if (!parsed || !selectedPath) return;

    const ext = selectedPath.split('.').pop()?.toLowerCase() || '';
    const entry = entries.find((e) => e.path === selectedPath);
    if (BINARY_EXTS.has(ext) || (entry?.size && entry.size > 200 * 1024)) {
      setFileContent(`// Preview omitted for binary or large file (${entry?.size ? `${(entry.size / 1024).toFixed(1)} KB` : ext}).\n// Click "Open on GitHub" above to inspect this file directly.`);
      setFileError(null);
      setLoadingFile(false);
      return;
    }

    (async () => {
      setLoadingFile(true);
      setFileError(null);
      try {
        const branch = meta?.defaultBranch || 'main';
        const text = await fetchGitHubRawFile(parsed.owner, parsed.repo, branch, selectedPath);
        if (alive) setFileContent(text);
      } catch (err: any) {
        if (alive) setFileError(err?.message || 'Unable to load file content.');
      } finally {
        if (alive) setLoadingFile(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [parsed, selectedPath, meta?.defaultBranch, entries]);

  const treeNodes = useMemo(() => buildTree(entries), [entries]);

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const handleCopy = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path}>
        <button
          type="button"
          onClick={() => (node.isDir ? toggleDir(node.path) : setSelectedPath(node.path))}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`w-full flex items-center gap-1.5 py-1.5 pr-2 text-left text-xs rounded-lg transition-colors cursor-pointer ${
            isSelected
              ? 'bg-purple-50 text-[#7c3aed] font-bold'
              : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 font-medium'
          }`}
        >
          {node.isDir ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-3.5 shrink-0" />
              <FileCode2 className="w-3.5 h-3.5 text-[#7c3aed] shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {node.isDir && isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  const lines = useMemo(() => (fileContent ? fileContent.split('\n') : []), [fileContent]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[85vh] max-h-[780px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] shrink-0">
              <GitBranch className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-slate-900 truncate">
                  {parsed ? `${parsed.owner}/${parsed.repo}` : projectTitle || 'GitHub Repository'}
                </h3>
                {meta?.language && (
                  <span className="text-[11px] font-semibold text-[#7c3aed]">
                    • {meta.language}
                  </span>
                )}
                {meta?.commitSha && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                    <GitCommit className="w-3 h-3" />
                    {meta.commitSha}
                  </span>
                )}
              </div>
              {projectTitle && (
                <p className="text-[11px] text-slate-500 truncate">{projectTitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Live Demo</span>
              </a>
            )}
            <a
              href={parsed?.normalizedUrl || githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open on GitHub</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loadingTree ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white">
            <div className="w-8 h-8 border-3 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">Loading repository files from GitHub...</p>
          </div>
        ) : rateLimited || treeError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h4 className="text-sm font-extrabold text-slate-900">
                {rateLimited ? 'GitHub API Preview Limit Reached' : 'Preview Unavailable'}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {rateLimited
                  ? 'Shared network requests hit GitHub’s temporary preview limit. You can open the repository directly on GitHub to inspect all files.'
                  : treeError}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={parsed?.normalizedUrl || githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open on GitHub
              </a>
              {demoUrl && (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Live Demo
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-white">
            {/* Sidebar File Tree */}
            <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/80 overflow-y-auto p-2 max-h-48 md:max-h-none shrink-0">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Files ({entries.filter((e) => e.type === 'blob').length})
              </p>
              <div className="mt-1 space-y-0.5">
                {treeNodes.map((n) => renderNode(n, 0))}
              </div>
            </div>

            {/* Code / README Content */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white">
              <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/60 shrink-0">
                <span className="text-xs font-mono font-semibold text-slate-700 truncate">
                  {selectedPath || 'Select a file to inspect'}
                </span>
                {fileContent && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed bg-white">
                {loadingFile ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
                    <span>Loading file...</span>
                  </div>
                ) : fileError ? (
                  <p className="text-rose-600">{fileError}</p>
                ) : (
                  <table className="w-full border-collapse">
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="select-none pr-4 text-right text-slate-400 w-10 align-top">
                            {idx + 1}
                          </td>
                          <td className="text-slate-800 whitespace-pre-wrap break-all">
                            {line || ' '}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
