import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, installStdoutGuard } from '../../../src/observability/logger.js';

describe('Logger', () => {
  let originalStderrWrite: typeof process.stderr.write;
  let stderrOutput: string[];

  beforeEach(() => {
    stderrOutput = [];
    originalStderrWrite = process.stderr.write;
    process.stderr.write = vi.fn((chunk: any) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
  });

  it('logger.info() writes to stderr', () => {
    const logger = createLogger('info');
    logger.info('test message');
    expect(stderrOutput.length).toBeGreaterThan(0);
    expect(stderrOutput.some(s => s.includes('test message'))).toBe(true);
  });

  it('logger.error() writes to stderr with ERROR prefix', () => {
    const logger = createLogger('info');
    logger.error('something broke');
    expect(stderrOutput.some(s => s.includes('ERROR'))).toBe(true);
    expect(stderrOutput.some(s => s.includes('something broke'))).toBe(true);
  });

  it('logger.debug() writes to stderr when level is debug', () => {
    const logger = createLogger('debug');
    logger.debug('debug info');
    expect(stderrOutput.some(s => s.includes('debug info'))).toBe(true);
  });

  it('logger.debug() does NOT write when level is info', () => {
    const logger = createLogger('info');
    logger.debug('should not appear');
    expect(stderrOutput.some(s => s.includes('should not appear'))).toBe(false);
  });

  it('logger.warn() writes to stderr with WARN prefix', () => {
    const logger = createLogger('info');
    logger.warn('warning message');
    expect(stderrOutput.some(s => s.includes('WARN'))).toBe(true);
  });
});

describe('installStdoutGuard', () => {
  it('overrides console.log to write to stderr', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const originalLog = console.log;

    installStdoutGuard();
    console.log('redirected message');

    expect(stderrSpy).toHaveBeenCalled();
    const calls = stderrSpy.mock.calls.map(c => String(c[0]));
    expect(calls.some(s => s.includes('redirected message'))).toBe(true);

    // Restore
    console.log = originalLog;
    stderrSpy.mockRestore();
  });
});
