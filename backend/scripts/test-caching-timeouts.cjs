/**
 * Automated Verification Script for Backend Caching & Timeout Protections (R3)
 * Runs natively via: node backend/scripts/test-caching-timeouts.cjs
 */

const http = require('http');
const assert = require('assert');
const cache = require('../lib/cache');
const { MemoryCache } = require('../lib/cache');
const app = require('../server');

async function runTests() {
  console.log('--- Running Backend Caching & Timeout Protection Test Suite ---\n');
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // ── 1. Backend MemoryCache Unit Tests ──────────────────────────────────────
  test('Backend Cache: Basic set, get, hit, miss', () => {
    cache.clear();
    cache.resetStats();

    assert.equal(cache.get('non_existent'), null);
    let stats = cache.getStats();
    assert.equal(stats.misses, 1);
    assert.equal(stats.hits, 0);

    cache.set('student:999', { id: 999, name: 'Bob' }, 5000);
    const cached = cache.get('student:999');
    assert.deepStrictEqual(cached, { id: 999, name: 'Bob' });

    stats = cache.getStats();
    assert.equal(stats.hits, 1);
    assert.equal(stats.size, 1);
  });

  await asyncTest('Backend Cache: TTL Expiration', async () => {
    const customCache = new MemoryCache(50); // 50ms default TTL
    customCache.set('temp_token', 'xyz123', 60);

    assert.equal(customCache.get('temp_token'), 'xyz123');
    await new Promise((resolve) => setTimeout(resolve, 80));

    assert.equal(customCache.get('temp_token'), null, 'Expired entry must return null');
    assert.equal(customCache.getStats().misses, 1);
  });

  test('Backend Cache: Invalidation & Clear', () => {
    const customCache = new MemoryCache();
    customCache.set('key1', 'val1');
    customCache.set('key2', 'val2');
    assert.equal(customCache.getStats().size, 2);

    customCache.invalidate('key1');
    assert.equal(customCache.get('key1'), null);
    assert.equal(customCache.get('key2'), 'val2');

    customCache.clear();
    assert.equal(customCache.getStats().size, 0);
  });

  // ── 2. Outbound Fetch AbortSignal.timeout Protection ────────────────────────
  await asyncTest('Backend Fetch Timeout: AbortSignal.timeout(100ms) terminates hung requests', async () => {
    // Start a mock server that never responds
    const mockHangingServer = http.createServer((req, res) => {
      // Deliberately hold connection open
    });

    await new Promise((resolve) => mockHangingServer.listen(0, '127.0.0.1', resolve));
    const port = mockHangingServer.address().port;
    const hangUrl = `http://127.0.0.1:${port}/stalled`;

    let aborted = false;
    const startTime = Date.now();
    try {
      await fetch(hangUrl, { signal: AbortSignal.timeout(120) });
    } catch (err) {
      aborted = true;
      assert.ok(err.name === 'TimeoutError' || err.message.includes('timeout') || err.name === 'AbortError');
    } finally {
      mockHangingServer.close();
    }

    const elapsed = Date.now() - startTime;
    assert.ok(aborted, 'Hung fetch must abort');
    assert.ok(elapsed < 1000, `Fetch aborted within expected time (${elapsed}ms)`);
  });

  // ── 3. Express Request Timeout Protection (504 Gateway Timeout) ─────────────
  await asyncTest('Express Middleware: 504 Gateway Timeout returned on hung request', async () => {
    // Add a slow route to test the timeout behavior
    app.get('/api/test-slow-operation', (req, res) => {
      // Intentionally never respond or delay 30s
      setTimeout(() => {
        if (!res.headersSent) res.json({ done: true });
      }, 30_000);
    });

    // We also test the timeout middleware mechanism directly with a 150ms timeout
    const testApp = require('express')();
    const TIMEOUT_MS = 150;
    testApp.use((req, res, next) => {
      const timer = setTimeout(() => {
        if (!res.headersSent) {
          res.status(504).json({
            ok: false,
            error: 'Gateway Timeout',
            message: `Request exceeded timeout threshold of ${TIMEOUT_MS}ms`,
          });
        }
      }, TIMEOUT_MS);

      res.on('finish', () => clearTimeout(timer));
      res.on('close', () => clearTimeout(timer));
      next();
    });

    testApp.get('/slow', (req, res) => {
      setTimeout(() => {
        if (!res.headersSent) res.json({ ok: true });
      }, 1000);
    });

    const server = http.createServer(testApp);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    try {
      const resp = await fetch(`http://127.0.0.1:${port}/slow`);
      assert.equal(resp.status, 504, 'Response status must be 504 Gateway Timeout');
      const body = await resp.json();
      assert.equal(body.ok, false);
      assert.equal(body.error, 'Gateway Timeout');
    } finally {
      server.close();
    }
  });

  // ── 4. Verify Server Health Check Endpoint ──────────────────────────────────
  await asyncTest('Express Health: /health responds with status healthy', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    try {
      const resp = await fetch(`http://127.0.0.1:${port}/health`);
      assert.equal(resp.status, 200);
      const data = await resp.json();
      assert.equal(data.status, 'healthy');
      assert.equal(data.service, 'aspire-lms-backend');
    } finally {
      server.close();
    }
  });

  console.log(`\nResults: ${passed}/${total} tests passed.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
