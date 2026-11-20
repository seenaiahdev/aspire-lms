/**
 * Hardened in-memory TTL cache & deduplication engine for Supabase and data queries.
 *
 * Features:
 * 1. Tiered TTL policies (STATIC: 10m, MEDIUM: 2m, DYNAMIC: 30s, USER_DATA: 15s).
 * 2. In-flight request deduplication — identical concurrent queries share a single active execution.
 * 3. Timeout racing — query execution is bounded by timeout thresholds (default 10s).
 * 4. PostgREST error filtering — queries returning error states are never cached.
 * 5. Observability — tracks cache hits, misses, inflight deduplications, timeouts, and size.
 * 6. Automatic memory cleanup — evicts expired entries every 60 seconds with unref'd timer.
 */

export const CACHE_TTL = {
  STATIC: 10 * 60 * 1000,    // 10 minutes (600,000 ms) — batched metadata, categories, badges
  CURRICULUM: 10 * 60 * 1000,// 10 minutes (600,000 ms) — syllabus tree, lessons, course topics
  MEDIUM: 2 * 60 * 1000,     // 2 minutes (120,000 ms) — courses, milestones, live sessions, schedules
  DYNAMIC: 30 * 1000,        // 30 seconds (30,000 ms) — quizzes, assignments, leaderboards
  USER_DATA: 15 * 1000,      // 15 seconds (15,000 ms) — student profile, attempts, user submissions
} as const;

export const DEFAULT_QUERY_TIMEOUT_MS = 10_000; // 10 seconds default query ceiling

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  inflightDeduplications: number;
  timeouts: number;
  size: number;
}

const cache = new Map<string, CacheEntry<any>>();

/** In-flight promises for deduplication — keyed identically to `cache`. */
const inflight = new Map<string, Promise<any>>();

// Cache observability metrics
let hitCount = 0;
let missCount = 0;
let dedupCount = 0;
let timeoutCount = 0;

// ── Dual-tier SessionStorage helpers ──────────────────────────────────────────
function readSessionStorage<T>(key: string): CacheEntry<T> | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem('qc:' + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.expiresAt === 'number') {
      return parsed;
    }
  } catch {}
  return null;
}

function writeSessionStorage<T>(key: string, entry: CacheEntry<T>): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem('qc:' + key, JSON.stringify(entry));
  } catch {}
}

function removeSessionStorage(key: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem('qc:' + key);
  } catch {}
}

function removeSessionStorageByPrefix(prefix: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const target = 'qc:' + prefix;
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(target)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {}
}

function clearSessionStorage(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith('qc:')) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {}
}

/**
 * Returns cached data if fresh, otherwise calls fetchFn and caches the result.
 * Concurrent calls for the same key share a single in-flight fetch (deduplication).
 * Bounded by timeoutMs to prevent hung promises.
 */
export async function cachedQuery<T>(
  key: string,
  fetchFn: () => PromiseLike<T> | Promise<T>,
  ttlMs: number = CACHE_TTL.DYNAMIC,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS
): Promise<T> {
  const now = Date.now();

  // 1. Return cached data if still fresh in memory or Tier-2 sessionStorage
  let entry = cache.get(key);
  if (!entry) {
    const stored = readSessionStorage<T>(key);
    if (stored && stored.expiresAt > now) {
      entry = stored;
      cache.set(key, stored);
    }
  }

  if (entry && entry.expiresAt > now) {
    hitCount++;
    return entry.data;
  }

  missCount++;

  // 2. If an identical fetch is already in-flight, piggyback on it
  const pending = inflight.get(key);
  if (pending) {
    dedupCount++;
    return pending;
  }

  // 3. Fire the actual fetch raced against timeoutMs, deduplicate, and cache
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timeoutCount++;
      inflight.delete(key);
      const err = new Error(`Query for key "${key}" timed out after ${timeoutMs}ms`);
      (err as any).name = 'TimeoutError';
      reject(err);
    }, timeoutMs);
  });

  const fetchPromise = Promise.resolve().then(() => fetchFn());

  const executionPromise = Promise.race([fetchPromise, timeoutPromise])
    .then((data) => {
      if (timer) clearTimeout(timer);
      inflight.delete(key);

      // PostgREST responses with error must NOT be cached
      const hasError = data && typeof data === 'object' && 'error' in (data as Record<string, unknown>) && Boolean((data as Record<string, unknown>).error);
      if (!hasError) {
        const cacheEntry = { data, expiresAt: Date.now() + ttlMs };
        cache.set(key, cacheEntry);
        writeSessionStorage(key, cacheEntry);
      }

      return data;
    })
    .catch((err) => {
      if (timer) clearTimeout(timer);
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, executionPromise);
  return executionPromise;
}

/**
 * Synchronously retrieves cached data if available and non-expired (memory or sessionStorage).
 */
export function getCached<T>(key: string): T | undefined {
  const now = Date.now();
  let entry = cache.get(key);
  if (!entry) {
    const stored = readSessionStorage<T>(key);
    if (stored && stored.expiresAt > now) {
      entry = stored;
      cache.set(key, stored);
    }
  }
  if (entry && entry.expiresAt > now) {
    return entry.data;
  }
  return undefined;
}

/**
 * Fires a background prefetch for a query if not already cached.
 * Safe to call from hover/touch events. Does not throw on error.
 */
export function prefetchQuery<T>(
  key: string,
  fetchFn: () => PromiseLike<T> | Promise<T>,
  ttlMs: number = CACHE_TTL.DYNAMIC
): void {
  const now = Date.now();
  let entry = cache.get(key);
  if (!entry) {
    const stored = readSessionStorage<T>(key);
    if (stored && stored.expiresAt > now) {
      entry = stored;
      cache.set(key, stored);
    }
  }
  if (entry && entry.expiresAt > now) {
    return; // Already cached and fresh
  }
  cachedQuery(key, fetchFn, ttlMs).catch(() => {});
}

/** Invalidate a specific cache key. */
export function invalidateCache(key: string): void {
  cache.delete(key);
  removeSessionStorage(key);
}

/** Invalidate all keys matching a prefix. */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
  removeSessionStorageByPrefix(prefix);
}

/** Clear the entire cache and in-flight tracking. */
export function clearCache(): void {
  cache.clear();
  inflight.clear();
  clearSessionStorage();
}

/** Retrieve current cache performance metrics. */
export function getCacheStats(): CacheStats {
  return {
    hits: hitCount,
    misses: missCount,
    inflightDeduplications: dedupCount,
    timeouts: timeoutCount,
    size: cache.size,
  };
}

/** Reset cache performance metrics counters (primarily for testing). */
export function resetCacheStats(): void {
  hitCount = 0;
  missCount = 0;
  dedupCount = 0;
  timeoutCount = 0;
}

// ── Automatic memory cleanup ───────────────────────────────────────────────
// Evict expired entries every 60 seconds to prevent unbounded memory growth.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}, 60_000);

// Ensure test runner or background workers are not kept alive by periodic cleanup
if (typeof cleanupTimer === 'object' && cleanupTimer !== null && 'unref' in cleanupTimer) {
  (cleanupTimer as any).unref();
}

