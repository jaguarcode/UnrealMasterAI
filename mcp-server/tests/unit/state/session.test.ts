import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../../../src/state/session.js';

describe('SessionManager', () => {
  let session: SessionManager;

  beforeEach(() => {
    session = new SessionManager();
  });

  describe('getRetryCount', () => {
    it('returns 0 for unknown file', () => {
      expect(session.getRetryCount('/unknown/file.cpp')).toBe(0);
    });
  });

  describe('incrementRetry', () => {
    it('increases count on each call', () => {
      session.incrementRetry('/some/file.cpp');
      expect(session.getRetryCount('/some/file.cpp')).toBe(1);
      session.incrementRetry('/some/file.cpp');
      expect(session.getRetryCount('/some/file.cpp')).toBe(2);
    });

    it('returns true when retry count is below max', () => {
      expect(session.incrementRetry('/some/file.cpp')).toBe(true);
    });

    it('returns false after max retries (3) reached', () => {
      session.incrementRetry('/some/file.cpp'); // 1
      session.incrementRetry('/some/file.cpp'); // 2
      session.incrementRetry('/some/file.cpp'); // 3
      const result = session.incrementRetry('/some/file.cpp'); // should be blocked
      expect(result).toBe(false);
    });

    it('count stays at max after failing', () => {
      session.incrementRetry('/some/file.cpp');
      session.incrementRetry('/some/file.cpp');
      session.incrementRetry('/some/file.cpp');
      session.incrementRetry('/some/file.cpp'); // blocked
      expect(session.getRetryCount('/some/file.cpp')).toBe(3);
    });
  });

  describe('resetRetry', () => {
    it('clears count for a specific file', () => {
      session.incrementRetry('/some/file.cpp');
      session.incrementRetry('/some/file.cpp');
      session.resetRetry('/some/file.cpp');
      expect(session.getRetryCount('/some/file.cpp')).toBe(0);
    });

    it('does not affect other files', () => {
      session.incrementRetry('/file-a.cpp');
      session.incrementRetry('/file-b.cpp');
      session.resetRetry('/file-a.cpp');
      expect(session.getRetryCount('/file-b.cpp')).toBe(1);
    });

    it('allows retrying again after reset', () => {
      session.incrementRetry('/some/file.cpp');
      session.incrementRetry('/some/file.cpp');
      session.incrementRetry('/some/file.cpp');
      // max reached
      expect(session.incrementRetry('/some/file.cpp')).toBe(false);
      // reset and try again
      session.resetRetry('/some/file.cpp');
      expect(session.incrementRetry('/some/file.cpp')).toBe(true);
    });
  });

  describe('resetAllRetries', () => {
    it('clears all retry counts', () => {
      session.incrementRetry('/file-a.cpp');
      session.incrementRetry('/file-b.cpp');
      session.resetAllRetries();
      expect(session.getRetryCount('/file-a.cpp')).toBe(0);
      expect(session.getRetryCount('/file-b.cpp')).toBe(0);
    });
  });

  describe('recordCompile', () => {
    it('adds entry to compile history', () => {
      session.recordCompile('compile-1', true, 0);
      const history = session.getCompileHistory();
      expect(history).toHaveLength(1);
      expect(history[0].compileId).toBe('compile-1');
      expect(history[0].success).toBe(true);
      expect(history[0].errorCount).toBe(0);
    });

    it('records multiple compile results', () => {
      session.recordCompile('compile-1', false, 3);
      session.recordCompile('compile-2', true, 0);
      expect(session.getCompileHistory()).toHaveLength(2);
    });
  });

  describe('getCompileHistory', () => {
    it('returns empty array initially', () => {
      expect(session.getCompileHistory()).toEqual([]);
    });

    it('returns a copy, not the internal array', () => {
      session.recordCompile('compile-1', true, 0);
      const history = session.getCompileHistory();
      history.pop();
      expect(session.getCompileHistory()).toHaveLength(1);
    });

    it('includes timestamp in records', () => {
      session.recordCompile('compile-1', true, 0);
      const record = session.getCompileHistory()[0];
      expect(typeof record.timestamp).toBe('number');
      expect(record.timestamp).toBeGreaterThan(0);
    });
  });

  describe('custom maxRetries', () => {
    it('respects custom maxRetries constructor argument', () => {
      const customSession = new SessionManager(5);
      expect(customSession.getMaxRetries()).toBe(5);

      for (let i = 0; i < 5; i++) {
        expect(customSession.incrementRetry('/file.cpp')).toBe(true);
      }
      expect(customSession.incrementRetry('/file.cpp')).toBe(false);
    });

    it('default maxRetries is 3', () => {
      expect(session.getMaxRetries()).toBe(3);
    });
  });
});
