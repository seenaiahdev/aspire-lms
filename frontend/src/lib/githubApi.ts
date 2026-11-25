import { cachedQuery, CACHE_TTL } from './queryCache';

export interface ParsedGitHubRepo {
  owner: string;
  repo: string;
  normalizedUrl: string;
}

export interface GitHubRepoMeta {
  status: 'verified' | 'private_or_missing' | 'rate_limited' | 'network_error';
  owner: string;
  repo: string;
  normalizedUrl: string;
  defaultBranch: string;
  language?: string;
  description?: string;
  stars?: number;
  updatedAt?: string;
  commitSha?: string;
  commitMessage?: string;
  error?: string;
}

export interface GitHubTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}

const RESERVED_GITHUB_OWNERS = new Set([
  'orgs', 'settings', 'marketplace', 'explore', 'topics', 'trending',
  'collections', 'events', 'sponsors', 'features', 'enterprise', 'pricing',
  'login', 'signup', 'join', 'search', 'notifications', 'issues', 'pulls',
  'codespaces', 'about', 'security', 'site', 'solutions', 'team',
]);

/**
 * Parses and normalizes a GitHub repository URL into `{ owner, repo, normalizedUrl }`.
 * Rejects non-GitHub hosts, profile-only URLs, and reserved GitHub top-level paths.
 */
export function parseGitHubRepoUrl(input: string): ParsedGitHubRepo | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') {
    return null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');

  if (!owner || !repo || RESERVED_GITHUB_OWNERS.has(owner.toLowerCase())) {
    return null;
  }

  // GitHub owner and repo name character rules
  if (!/^[a-zA-Z0-9-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
    return null;
  }

  return {
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}

/** Validates an optional external HTTP/HTTPS URL (e.g. Live Demo link). */
export function isValidHttpUrl(input: string): boolean {
  const trimmed = (input || '').trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Returns true when a stored submission URL points to a GitHub repository. */
export function isGitHubSubmissionUrl(url?: string | null): boolean {
  if (!url) return false;
  return parseGitHubRepoUrl(url) !== null;
}

/**
 * Verifies a public GitHub repository via GitHub's REST API.
 * Gracefully degrades on rate limits (403/429) or network issues so 1,000+ concurrent
 * campus users on shared Wi-Fi are never blocked from submitting valid links.
 */
export async function verifyPublicGitHubRepo(owner: string, repo: string): Promise<GitHubRepoMeta> {
  const normalizedUrl = `https://github.com/${owner}/${repo}`;
  const cacheKey = `gh_repo_meta:${owner.toLowerCase()}/${repo.toLowerCase()}`;

  return cachedQuery(
    cacheKey,
    async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
          headers: { Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(5000),
        });

        if (res.status === 404) {
          return {
            status: 'private_or_missing',
            owner,
            repo,
            normalizedUrl,
            defaultBranch: 'main',
            error: 'Repository not found or is private. Please ensure your GitHub repository is set to Public.',
          } satisfies GitHubRepoMeta;
        }

        if (res.status === 403 || res.status === 429) {
          return {
            status: 'rate_limited',
            owner,
            repo,
            normalizedUrl,
            defaultBranch: 'main',
          } satisfies GitHubRepoMeta;
        }

        if (!res.ok) {
          return {
            status: 'network_error',
            owner,
            repo,
            normalizedUrl,
            defaultBranch: 'main',
          } satisfies GitHubRepoMeta;
        }

        const data = await res.json();
        const defaultBranch = data.default_branch || 'main';

        // Best-effort latest commit lookup (non-blocking if rate-limited)
        let commitSha: string | undefined;
        let commitMessage: string | undefined;
        try {
          const commitRes = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=1`,
            {
              headers: { Accept: 'application/vnd.github+json' },
              signal: AbortSignal.timeout(3500),
            }
          );
          if (commitRes.ok) {
            const commits = await commitRes.json();
            if (Array.isArray(commits) && commits[0]) {
              commitSha = String(commits[0].sha || '').slice(0, 7);
              commitMessage = String(commits[0].commit?.message || '').split('\n')[0];
            }
          }
        } catch {
          // Commit lookup is optional enrichment
        }

        return {
          status: 'verified',
          owner,
          repo,
          normalizedUrl,
          defaultBranch,
          language: data.language || undefined,
          description: data.description || undefined,
          stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : undefined,
          updatedAt: data.pushed_at || data.updated_at || undefined,
          commitSha,
          commitMessage,
        } satisfies GitHubRepoMeta;
      } catch {
        return {
          status: 'network_error',
          owner,
          repo,
          normalizedUrl,
          defaultBranch: 'main',
        } satisfies GitHubRepoMeta;
      }
    },
    CACHE_TTL.STATIC
  );
}

/**
 * Fetches the recursive file tree of a public GitHub repository with in-memory TTL caching.
 */
export async function fetchGitHubRepoTree(
  owner: string,
  repo: string,
  branch: string = 'main'
): Promise<{ entries: GitHubTreeEntry[]; truncated: boolean; rateLimited?: boolean }> {
  const cacheKey = `gh_tree:${owner.toLowerCase()}/${repo.toLowerCase()}@${branch}`;

  return cachedQuery(
    cacheKey,
    async () => {
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
        {
          headers: { Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (res.status === 403 || res.status === 429) {
        return { entries: [], truncated: false, rateLimited: true };
      }
      if (!res.ok) {
        throw new Error(`Unable to load repository file tree (HTTP ${res.status}).`);
      }

      const data = await res.json();
      const rawTree = Array.isArray(data.tree) ? data.tree : [];
      const entries: GitHubTreeEntry[] = rawTree
        .filter((item: any) => item?.path && (item.type === 'blob' || item.type === 'tree'))
        .filter((item: any) => {
          const lower = String(item.path).toLowerCase();
          return !lower.startsWith('.git/') && !lower.includes('/node_modules/') && !lower.startsWith('node_modules/');
        })
        .slice(0, 400)
        .map((item: any) => ({
          path: String(item.path),
          type: item.type as 'blob' | 'tree',
          size: typeof item.size === 'number' ? item.size : undefined,
        }));

      return { entries, truncated: Boolean(data.truncated) || rawTree.length > 400 };
    },
    CACHE_TTL.STATIC
  );
}

/**
 * Fetches raw file contents from raw.githubusercontent.com (does not consume REST API rate limit).
 */
export async function fetchGitHubRawFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string> {
  const cacheKey = `gh_raw:${owner.toLowerCase()}/${repo.toLowerCase()}@${branch}:${filePath}`;

  return cachedQuery(
    cacheKey,
    async () => {
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const res = await fetch(
        `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) {
        throw new Error(`Unable to load file preview (HTTP ${res.status}).`);
      }
      return await res.text();
    },
    CACHE_TTL.STATIC
  );
}
