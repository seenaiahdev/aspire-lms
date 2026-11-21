/**
 * Aspire LMS — Modularized API Client (F-35)
 *
 * This barrel module re-exports all domain clients for 100% backward compatibility
 * with all existing screens, hooks, and tests.
 */

export {
  cachedQuery,
  getCached,
  invalidateCache,
  invalidateCacheByPrefix,
  clearCache,
  getCacheStats,
  resetCacheStats,
  CACHE_TTL,
} from './queryCache';

export * from './api/auth';
export * from './api/courses';
export * from './api/submissions';
export * from './api/gamification';
export * from './api/notifications';
export * from './api/profile';
