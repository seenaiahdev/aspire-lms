/**
 * Lightweight in-memory TTL cache for Supabase query results.
 * Prevents redundant network round-trips when switching tabs.
 * Real-time channels can call invalidate() to bust stale entries.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 30_000; // 30 seconds

/**
 * Returns cached data if fresh, otherwise calls fetchFn and caches the result.
 */
export async function cachedQuery<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.data;
  }
  const data = await fetchFn();
  cache.set(key, { data, expiresAt: now + ttlMs });
  return data;
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
