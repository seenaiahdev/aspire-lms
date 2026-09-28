/**
 * Lightweight in-memory TTL cache for Supabase query results.
 *
 * Features:
 * 1. TTL-based expiry — stale entries are automatically discarded.
 * 2. In-flight deduplication — if 5 components call cachedQuery('courses', ...)
 *    simultaneously, only ONE actual fetch is made; the other 4 await the same promise.
 * 3. Real-time channels can call invalidateCache() to bust stale entries.
 * 4. Automatic memory cleanup — evicts expired entries every 60 seconds.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

/** In-flight promises for deduplication — keyed identically to `cache`. */
const inflight = new Map<string, Promise<any>>();

const DEFAULT_TTL_MS = 30_000; // 30 seconds

/**
 * Returns cached data if fresh, otherwise calls fetchFn and caches the result.
 * Concurrent calls for the same key share a single in-flight fetch (deduplication).
 */
export async function cachedQuery<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();

  // 1. Return cached data if still fresh
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.data;
  }

  // 2. If an identical fetch is already in-flight, piggyback on it
  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  // 3. Fire the actual fetch, deduplicate, and cache
  const promise = fetchFn()
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + ttlMs });
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

/** Invalidate a specific cache key. */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/** Invalidate all keys matching a prefix. */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/** Clear the entire cache. */
export function clearCache(): void {
  cache.clear();
}

// ── Automatic memory cleanup ───────────────────────────────────────────────
// Evict expired entries every 60 seconds to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}, 60_000);
