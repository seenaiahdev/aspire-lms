/**
 * Automated Verification Suite for Query Caching & Timeout Protections (R3)
 * Runs natively via Node.js test runner: node --test tests/queryCache.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esbuild = require(require.resolve('esbuild', { paths: ['frontend'] }));

// Transpile and load the source TypeScript implementation directly
const tsSource = fs.readFileSync(path.resolve('frontend/src/lib/queryCache.ts'), 'utf8');
const { code } = esbuild.transformSync(tsSource, { loader: 'ts' });
const {
  cachedQuery,
  getCached,
  prefetchQuery,
  invalidateCache,
  invalidateCacheByPrefix,
  clearCache,
  getCacheStats,
  resetCacheStats,
  CACHE_TTL,
  DEFAULT_QUERY_TIMEOUT_MS,
} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('Query Cache: Interface contracts and constants', () => {
  assert.equal(typeof cachedQuery, 'function');
  assert.equal(typeof invalidateCache, 'function');
  assert.equal(typeof invalidateCacheByPrefix, 'function');
  assert.equal(typeof clearCache, 'function');
  assert.equal(typeof getCacheStats, 'function');
  assert.equal(typeof resetCacheStats, 'function');

  assert.equal(CACHE_TTL.STATIC, 600_000);
  assert.equal(CACHE_TTL.MEDIUM, 120_000);
  assert.equal(CACHE_TTL.DYNAMIC, 30_000);
  assert.equal(CACHE_TTL.USER_DATA, 15_000);
  assert.equal(DEFAULT_QUERY_TIMEOUT_MS, 10_000);
});

test('Query Cache Test 1: Cache Miss followed by Cache Hit', async () => {
  clearCache();
  resetCacheStats();

  let fetchCalls = 0;
  const mockFetch = async () => {
    fetchCalls++;
    return { id: 101, name: 'Alice Student', xp: 500 };
  };

  // 1. Initial call: Cache Miss
  const res1 = await cachedQuery('student:101', mockFetch, 5000);
  assert.deepEqual(res1, { id: 101, name: 'Alice Student', xp: 500 });
  assert.equal(fetchCalls, 1, 'mockFetch should be called once on miss');

  let stats = getCacheStats();
  assert.equal(stats.misses, 1);
  assert.equal(stats.hits, 0);

  // 2. Second call with same key: Cache Hit (should not invoke mockFetch)
  const res2 = await cachedQuery('student:101', async () => {
    fetchCalls++;
    return { id: 101, name: 'Overridden' };
  }, 5000);

  assert.deepEqual(res2, { id: 101, name: 'Alice Student', xp: 500 });
  assert.equal(fetchCalls, 1, 'mockFetch should NOT be called on cache hit');

  stats = getCacheStats();
  assert.equal(stats.hits, 1, 'Cache hits counter should increment');
  assert.equal(stats.misses, 1);
});

test('Query Cache Test 2: In-Flight Deduplication', async () => {
  clearCache();
  resetCacheStats();

  let executionCount = 0;
  const slowQuery = async () => {
    executionCount++;
    await new Promise((resolve) => setTimeout(resolve, 60));
    return { batchId: 'batch-2026', title: 'Full Stack MERN' };
  };

  // Launch 5 concurrent calls with the same cache key
  const promises = [
    cachedQuery('batch:2026', slowQuery, 10_000),
    cachedQuery('batch:2026', slowQuery, 10_000),
    cachedQuery('batch:2026', slowQuery, 10_000),
    cachedQuery('batch:2026', slowQuery, 10_000),
    cachedQuery('batch:2026', slowQuery, 10_000),
  ];

  const results = await Promise.all(promises);

  assert.equal(executionCount, 1, 'Actual query fetch must only execute once for 5 concurrent callers');
  results.forEach((r) => {
    assert.deepEqual(r, { batchId: 'batch-2026', title: 'Full Stack MERN' });
  });

  const stats = getCacheStats();
  assert.equal(stats.inflightDeduplications, 4, '4 redundant concurrent calls were deduplicated');
});

test('Query Cache Test 3: TTL Expiration', async () => {
  clearCache();
  resetCacheStats();

  let callCount = 0;
  const fetchTime = async () => {
    callCount++;
    return { version: callCount, timestamp: Date.now() };
  };

  const SHORT_TTL = 60; // 60ms
  const first = await cachedQuery('ephemeral_data', fetchTime, SHORT_TTL);
  assert.equal(first.version, 1);

  // Immediate query hits cache
  const cached = await cachedQuery('ephemeral_data', fetchTime, SHORT_TTL);
  assert.equal(cached.version, 1);
  assert.equal(callCount, 1);

  // Wait past TTL
  await new Promise((resolve) => setTimeout(resolve, 85));

  // Query after expiration triggers fresh fetch
  const fresh = await cachedQuery('ephemeral_data', fetchTime, SHORT_TTL);
  assert.equal(fresh.version, 2);
  assert.equal(callCount, 2, 'Fresh fetch must be executed after TTL expired');

  const stats = getCacheStats();
  assert.equal(stats.misses, 2);
  assert.equal(stats.hits, 1);
});

test('Query Cache Test 4: Timeout Handling', async () => {
  clearCache();
  resetCacheStats();

  const hangingQuery = () => new Promise((resolve) => {
    // Stalls indefinitely
    setTimeout(() => resolve('eventual data'), 5000);
  });

  const TIMEOUT_CEILING_MS = 100;

  await assert.rejects(
    async () => {
      await cachedQuery('hung_query', hangingQuery, 5000, TIMEOUT_CEILING_MS);
    },
    (err) => {
      assert.match(err.message, /timed out after 100ms/);
      assert.equal(err.name, 'TimeoutError');
      return true;
    },
    'Query exceeding timeout ceiling must reject with TimeoutError'
  );

  const stats = getCacheStats();
  assert.equal(stats.timeouts, 1, 'Timeout count must be incremented');

  // Verify in-flight map is clean: a subsequent fast query succeeds
  const fastQuery = async () => 'recovered data';
  const recovered = await cachedQuery('hung_query', fastQuery, 5000, 500);
  assert.equal(recovered, 'recovered data');
});

test('Query Cache Test 5: Mutation Invalidation', async () => {
  clearCache();
  resetCacheStats();

  let score = 50;
  const fetchScore = async () => ({ score });

  const initial = await cachedQuery('student_score:usr1', fetchScore, 60_000);
  assert.equal(initial.score, 50);

  // Mutation occurs: student score increases
  score = 100;

  // Invalidate specific key
  invalidateCache('student_score:usr1');

  // Query returns fresh score
  const updated = await cachedQuery('student_score:usr1', fetchScore, 60_000);
  assert.equal(updated.score, 100);

  // Test prefix invalidation
  await cachedQuery('module:101:overview', async () => 'v1', 60_000);
  await cachedQuery('module:101:topics', async () => 'v1', 60_000);
  await cachedQuery('module:202:overview', async () => 'v1', 60_000);

  invalidateCacheByPrefix('module:101:');

  let stats = getCacheStats();
  assert.equal(stats.size, 2, 'Only un-invalidated entries should remain');
});

test('Query Cache Test 6: PostgREST Error Filtering (Never Cache Errors)', async () => {
  clearCache();
  resetCacheStats();

  let callCount = 0;
  const failingPostgrestQuery = async () => {
    callCount++;
    if (callCount === 1) {
      return { data: null, error: { message: 'Database connection failed', code: 'PGRST000' } };
    }
    return { data: [{ id: 1, name: 'Recovered' }], error: null };
  };

  // First call returns error
  const first = await cachedQuery('postgrest_error_test', failingPostgrestQuery, 60_000);
  assert.ok(first.error, 'First response contains error');
  assert.equal(callCount, 1);

  // Second call must NOT use cached error, must re-execute
  const second = await cachedQuery('postgrest_error_test', failingPostgrestQuery, 60_000);
  assert.equal(second.error, null);
  assert.deepEqual(second.data, [{ id: 1, name: 'Recovered' }]);
  assert.equal(callCount, 2, 'Query must re-run rather than serving cached error');
});

test('Query Cache Test 7: getCached and prefetchQuery', async () => {
  clearCache();
  resetCacheStats();

  // 1. getCached returns undefined on missing key
  assert.equal(getCached('unseen_key'), undefined);

  // 2. prefetchQuery fires in background without blocking
  let prefetchedCalls = 0;
  prefetchQuery('prefetch_test', async () => {
    prefetchedCalls++;
    return { status: 'prefetched' };
  }, 60_000);

  // Wait a small tick for promise execution
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(prefetchedCalls, 1);
  const cachedVal = getCached('prefetch_test');
  assert.deepEqual(cachedVal, { status: 'prefetched' });

  // 3. Repeated prefetch does not refetch if already cached
  prefetchQuery('prefetch_test', async () => {
    prefetchedCalls++;
    return { status: 'duplicate' };
  }, 60_000);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(prefetchedCalls, 1, 'prefetched query must not refetch when fresh');
});
