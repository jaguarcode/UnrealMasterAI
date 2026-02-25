import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheStore } from '../../../src/state/cache-store.js';

describe('CacheStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('set/get', () => {
    it('stores a value and retrieves it by key', () => {
      const cache = new CacheStore<string>();
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('stores objects and retrieves them by key', () => {
      const cache = new CacheStore<{ name: string }>();
      cache.set('user', { name: 'Alice' });
      expect(cache.get('user')).toEqual({ name: 'Alice' });
    });
  });

  describe('TTL', () => {
    it('value expires after default TTL (60s)', () => {
      const cache = new CacheStore<string>();
      cache.set('key1', 'value1');

      // Still available before TTL
      vi.advanceTimersByTime(59_999);
      expect(cache.get('key1')).toBe('value1');

      // Expired after TTL
      vi.advanceTimersByTime(2);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('value expires after custom TTL', () => {
      const cache = new CacheStore<string>({ ttlMs: 5000 });
      cache.set('key1', 'value1');

      vi.advanceTimersByTime(4999);
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(2);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('per-entry custom TTL overrides store default', () => {
      const cache = new CacheStore<string>({ ttlMs: 60000 });
      cache.set('short', 'value', 1000);

      vi.advanceTimersByTime(1001);
      expect(cache.get('short')).toBeUndefined();
    });
  });

  describe('LRU eviction', () => {
    it('evicts the oldest entry when at max capacity', () => {
      const cache = new CacheStore<string>({ maxEntries: 3 });
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Adding a 4th entry should evict 'a' (least recently used)
      cache.set('d', '4');

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });

    it('get() refreshes LRU order so accessed entry is not evicted', () => {
      const cache = new CacheStore<string>({ maxEntries: 3 });
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Access 'a' to make it recently used
      cache.get('a');

      // Adding 'd' should now evict 'b' (least recently used after refresh)
      cache.set('d', '4');

      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });
  });

  describe('cache hit / miss', () => {
    it('get() returns cached value on hit', () => {
      const cache = new CacheStore<number>();
      cache.set('counter', 42);
      expect(cache.get('counter')).toBe(42);
    });

    it('get() returns undefined for missing key', () => {
      const cache = new CacheStore<number>();
      expect(cache.get('nonexistent')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('returns true for existing non-expired key', () => {
      const cache = new CacheStore<string>();
      cache.set('key1', 'val');
      expect(cache.has('key1')).toBe(true);
    });

    it('returns false for missing key', () => {
      const cache = new CacheStore<string>();
      expect(cache.has('missing')).toBe(false);
    });

    it('returns false for expired key', () => {
      const cache = new CacheStore<string>({ ttlMs: 1000 });
      cache.set('key1', 'val');
      vi.advanceTimersByTime(1001);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes a specific cache entry', () => {
      const cache = new CacheStore<string>();
      cache.set('key1', 'val1');
      cache.set('key2', 'val2');

      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('val2');
    });

    it('returns false when deleting a non-existent key', () => {
      const cache = new CacheStore<string>();
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const cache = new CacheStore<string>();
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      cache.clear();

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBeUndefined();
      expect(cache.size).toBe(0);
    });
  });

  describe('size', () => {
    it('reports current entry count', () => {
      const cache = new CacheStore<string>();
      expect(cache.size).toBe(0);

      cache.set('a', '1');
      expect(cache.size).toBe(1);

      cache.set('b', '2');
      expect(cache.size).toBe(2);

      cache.delete('a');
      expect(cache.size).toBe(1);
    });

    it('does not count expired entries', () => {
      const cache = new CacheStore<string>({ ttlMs: 1000 });
      cache.set('a', '1');
      cache.set('b', '2');

      vi.advanceTimersByTime(1001);

      // Accessing size should reflect that entries are expired
      // (expired entries cleaned on access)
      expect(cache.size).toBe(0);
    });
  });

  describe('default options', () => {
    it('uses maxEntries=1000 by default', () => {
      const cache = new CacheStore<number>();
      // Fill to 1000 entries
      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, i);
      }
      expect(cache.size).toBe(1000);

      // 1001st entry should evict the first
      cache.set('overflow', 9999);
      expect(cache.size).toBe(1000);
      expect(cache.get('key0')).toBeUndefined();
      expect(cache.get('overflow')).toBe(9999);
    });
  });
});
