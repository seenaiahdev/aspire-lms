/**
 * Lightweight in-memory TTL cache for backend services and route handlers.
 * Reduces redundant database roundtrips during student lookups and OTP/passkey flows.
 */

const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

class MemoryCache {
  constructor(defaultTtlMs = DEFAULT_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
    };

    // Periodic sweep every 60s
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  getStats() {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.store.size,
    };
  }

  resetStats() {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }
}

// Export singleton instance as default plus class for custom scoping
const defaultCache = new MemoryCache();

module.exports = defaultCache;
module.exports.MemoryCache = MemoryCache;
