/**
 * LRU Cache Store with configurable TTL and max entries.
 * Used for caching Blueprint serialization results to prevent token waste.
 *
 * Internally uses a Map which preserves insertion order. On get(), the accessed
 * entry is re-inserted at the end (most recently used). On set(), if at capacity,
 * the first entry (least recently used) is evicted.
 */

export interface CacheStoreOptions {
  /** Maximum number of entries before LRU eviction (default: 1000) */
  maxEntries?: number;
  /** Default time-to-live in milliseconds (default: 60000 = 60s) */
  ttlMs?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheStore<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private maxEntries: number;
  private ttlMs: number;

  constructor(options?: CacheStoreOptions) {
    this.cache = new Map();
    this.maxEntries = options?.maxEntries ?? 1000;
    this.ttlMs = options?.ttlMs ?? 60_000;
  }

  /**
   * Set a value with optional custom TTL.
   * If at max capacity, evicts the least recently used entry.
   */
  set(key: string, value: T, ttlMs?: number): void {
    // If key already exists, delete first so re-insert goes to end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict LRU entry if at capacity
    if (this.cache.size >= this.maxEntries) {
      const lruKey = this.cache.keys().next().value as string;
      this.cache.delete(lruKey);
    }

    const expiresAt = Date.now() + (ttlMs ?? this.ttlMs);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value. Returns undefined if expired or missing.
   * Refreshes LRU order on hit (moves entry to most-recently-used position).
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check expiry
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU: delete and re-insert to move to end
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Check if key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific entry.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Number of non-expired entries.
   * Performs a sweep to remove expired entries before counting.
   */
  get size(): number {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}
