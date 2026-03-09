import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../../../src/state/rate-limiter.js';

describe('RateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete process.env['RATE_LIMIT_PER_MINUTE'];
  });

  describe('disabled by default', () => {
    it('allows all calls when maxCallsPerMinute=0', () => {
      const rl = new RateLimiter();
      for (let i = 0; i < 1000; i++) {
        const result = rl.check('tool-a');
        expect(result.allowed).toBe(true);
      }
    });

    it('returns currentRate and limit=0 when disabled', () => {
      const rl = new RateLimiter();
      const result = rl.check('tool-a');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(0);
      expect(result.retryAfterMs).toBeUndefined();
    });
  });

  describe('global limit enforcement', () => {
    it('allows calls up to the limit', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 3 });
      expect(rl.check('tool-a').allowed).toBe(true);
      expect(rl.check('tool-a').allowed).toBe(true);
      expect(rl.check('tool-a').allowed).toBe(true);
    });

    it('rejects after reaching global limit', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 3 });
      rl.check('tool-a');
      rl.check('tool-a');
      rl.check('tool-a');
      const result = rl.check('tool-a');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(3);
      expect(result.currentRate).toBe(3);
    });

    it('retryAfterMs is positive when rate limited', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 1 });
      rl.check('tool-a');
      const result = rl.check('tool-a');
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('counts calls across different tools toward global limit', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 2 });
      rl.check('tool-a');
      rl.check('tool-b');
      const result = rl.check('tool-c');
      expect(result.allowed).toBe(false);
    });
  });

  describe('per-tool limit enforcement', () => {
    it('allows calls up to the per-tool limit', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 100, maxCallsPerToolPerMinute: 2 });
      expect(rl.check('tool-a').allowed).toBe(true);
      expect(rl.check('tool-a').allowed).toBe(true);
    });

    it('rejects after reaching per-tool limit', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 100, maxCallsPerToolPerMinute: 2 });
      rl.check('tool-a');
      rl.check('tool-a');
      const result = rl.check('tool-a');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(2);
      expect(result.currentRate).toBe(2);
    });

    it('per-tool limit is independent across tools', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 100, maxCallsPerToolPerMinute: 2 });
      rl.check('tool-a');
      rl.check('tool-a');
      // tool-a is exhausted but tool-b should still be allowed
      expect(rl.check('tool-b').allowed).toBe(true);
      expect(rl.check('tool-b').allowed).toBe(true);
    });

    it('per-tool limit rejects even if global allows', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 100, maxCallsPerToolPerMinute: 1 });
      rl.check('tool-a');
      const result = rl.check('tool-a');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(1);
    });

    it('retryAfterMs is positive when per-tool rate limited', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 100, maxCallsPerToolPerMinute: 1 });
      rl.check('tool-a');
      const result = rl.check('tool-a');
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe('sliding window expiry', () => {
    it('old calls expire after 60s, allowing new ones', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 2 });
      rl.check('tool-a');
      rl.check('tool-a');
      expect(rl.check('tool-a').allowed).toBe(false);

      // Advance past the window
      vi.advanceTimersByTime(60_001);

      expect(rl.check('tool-a').allowed).toBe(true);
    });

    it('only expired timestamps are pruned — recent ones still count', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 2 });
      rl.check('tool-a'); // t=0

      vi.advanceTimersByTime(30_000);
      rl.check('tool-a'); // t=30s

      // At t=61s the first call expires but second (at 30s) has not
      vi.advanceTimersByTime(31_000); // now t=61s
      // First expired, second still in window → count=1, limit=2 → allowed
      expect(rl.check('tool-a').allowed).toBe(true);
    });
  });

  describe('reset()', () => {
    it('clears all windows so calls are allowed again', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 1 });
      rl.check('tool-a');
      expect(rl.check('tool-a').allowed).toBe(false);

      rl.reset();

      expect(rl.check('tool-a').allowed).toBe(true);
    });

    it('clears per-tool windows', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 100, maxCallsPerToolPerMinute: 1 });
      rl.check('tool-a');
      expect(rl.check('tool-a').allowed).toBe(false);

      rl.reset();

      expect(rl.check('tool-a').allowed).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('returns globalRate=0 and empty toolRates initially', () => {
      const rl = new RateLimiter({ maxCallsPerMinute: 10 });
      const stats = rl.getStats();
      expect(stats.globalRate).toBe(0);
      expect(stats.toolRates).toEqual({});
    });

    it('reflects recorded calls', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 10 });
      rl.check('tool-a');
      rl.check('tool-a');
      rl.check('tool-b');
      const stats = rl.getStats();
      expect(stats.globalRate).toBe(3);
      expect(stats.toolRates['tool-a']).toBe(2);
      expect(stats.toolRates['tool-b']).toBe(1);
    });

    it('does not count expired calls in stats', () => {
      vi.useFakeTimers();
      const rl = new RateLimiter({ maxCallsPerMinute: 10 });
      rl.check('tool-a');
      rl.check('tool-a');

      vi.advanceTimersByTime(60_001);

      const stats = rl.getStats();
      expect(stats.globalRate).toBe(0);
      expect(stats.toolRates['tool-a']).toBe(0);
    });
  });

  describe('RATE_LIMIT_PER_MINUTE env var', () => {
    it('reads global limit from env when no config provided', () => {
      vi.useFakeTimers();
      process.env['RATE_LIMIT_PER_MINUTE'] = '2';
      const rl = new RateLimiter();
      rl.check('tool-a');
      rl.check('tool-a');
      const result = rl.check('tool-a');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(2);
    });

    it('explicit config overrides env var', () => {
      vi.useFakeTimers();
      process.env['RATE_LIMIT_PER_MINUTE'] = '1';
      const rl = new RateLimiter({ maxCallsPerMinute: 5 });
      for (let i = 0; i < 5; i++) {
        expect(rl.check('tool-a').allowed).toBe(true);
      }
      expect(rl.check('tool-a').allowed).toBe(false);
    });

    it('invalid env var value falls back to disabled (0)', () => {
      process.env['RATE_LIMIT_PER_MINUTE'] = 'not-a-number';
      const rl = new RateLimiter();
      for (let i = 0; i < 100; i++) {
        expect(rl.check('tool-a').allowed).toBe(true);
      }
    });
  });
});
