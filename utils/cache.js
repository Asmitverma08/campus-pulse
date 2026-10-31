/**
 * @fileoverview Lightweight in-memory TTL cache to memoize AI extractions and weekly summaries.
 */

class SimpleTTLCache {
  /**
   * @param {number} [defaultTTLSeconds=300] Default time to live (5 minutes).
   */
  constructor(defaultTTLSeconds = 300) {
    this.defaultTTL = defaultTTLSeconds * 1000;
    this.store = new Map();
  }

  /**
   * Generates a cache key.
   * @param {string} prefix - Key prefix.
   * @param {string} input - Text input or serialized JSON.
   * @returns {string} Normalized key.
   */
  makeKey(prefix, input) {
    return `${prefix}:${input.trim().toLowerCase()}`;
  }

  /**
   * Retrieves a cached value if present and not expired.
   * @param {string} key - Cache key.
   * @returns {any|null} Cached value or null.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Sets a value in the cache with a time-to-live.
   * @param {string} key - Cache key.
   * @param {any} value - Value to cache.
   * @param {number} [ttlSeconds] - Optional custom TTL in seconds.
   */
  set(key, value, ttlSeconds) {
    const ttl = typeof ttlSeconds === "number" ? ttlSeconds * 1000 : this.defaultTTL;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });

    // Prevent unbounded memory growth by evicting oldest if size > 500
    if (this.store.size > 500) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
  }

  /**
   * Clears all items from the cache.
   */
  clear() {
    this.store.clear();
  }
}

const memoryCache = new SimpleTTLCache(300);

module.exports = {
  SimpleTTLCache,
  memoryCache,
};

