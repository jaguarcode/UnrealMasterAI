import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../../../src/observability/logger.js';

describe('Structured Logger - JSON format', () => {
  let stderrOutput: string[];
  let originalStderrWrite: typeof process.stderr.write;
  let originalLogFormat: string | undefined;

  beforeEach(() => {
    stderrOutput = [];
    originalStderrWrite = process.stderr.write;
    process.stderr.write = vi.fn((chunk: any) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    }) as any;
    originalLogFormat = process.env['LOG_FORMAT'];
    delete process.env['LOG_FORMAT'];
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
    if (originalLogFormat === undefined) {
      delete process.env['LOG_FORMAT'];
    } else {
      process.env['LOG_FORMAT'] = originalLogFormat;
    }
  });

  it('JSON format outputs valid JSON per line', () => {
    const logger = createLogger('info', { format: 'json' });
    logger.info('hello world');
    expect(stderrOutput.length).toBe(1);
    expect(() => JSON.parse(stderrOutput[0])).not.toThrow();
  });

  it('JSON includes timestamp, level, and message fields', () => {
    const logger = createLogger('info', { format: 'json' });
    logger.info('test message');
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
  });

  it('JSON level field reflects actual log level', () => {
    const logger = createLogger('debug', { format: 'json' });
    logger.debug('dbg');
    logger.warn('wrn');
    logger.error('err');
    expect(JSON.parse(stderrOutput[0]).level).toBe('debug');
    expect(JSON.parse(stderrOutput[1]).level).toBe('warn');
    expect(JSON.parse(stderrOutput[2]).level).toBe('error');
  });

  it('JSON includes optional requestId, toolName, durationMs when provided via withContext', () => {
    const logger = createLogger('info', { format: 'json' });
    const child = logger.withContext({ requestId: 'req-123', toolName: 'myTool', durationMs: 42 });
    child.info('context test');
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry.requestId).toBe('req-123');
    expect(entry.toolName).toBe('myTool');
    expect(entry.durationMs).toBe(42);
  });

  it('JSON omits requestId/toolName/durationMs when not in context', () => {
    const logger = createLogger('info', { format: 'json' });
    logger.info('no context');
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry).not.toHaveProperty('requestId');
    expect(entry).not.toHaveProperty('toolName');
    expect(entry).not.toHaveProperty('durationMs');
  });

  it('extra args appear in data field for JSON format', () => {
    const logger = createLogger('info', { format: 'json' });
    logger.info('with extras', { key: 'val' }, 99);
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry.data).toEqual([{ key: 'val' }, 99]);
  });

  it('single extra arg is unwrapped (not in array) in data field', () => {
    const logger = createLogger('info', { format: 'json' });
    logger.info('single extra', { key: 'val' });
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry.data).toEqual({ key: 'val' });
  });

  it('data field absent when no extra args', () => {
    const logger = createLogger('info', { format: 'json' });
    logger.info('no extras');
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry).not.toHaveProperty('data');
  });

  it('LOG_FORMAT=json env var enables JSON logging', () => {
    process.env['LOG_FORMAT'] = 'json';
    const logger = createLogger('info');
    logger.info('env driven');
    expect(() => JSON.parse(stderrOutput[0])).not.toThrow();
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('env driven');
  });

  it('withContext returns logger with pre-filled context', () => {
    const logger = createLogger('info', { format: 'json' });
    const child = logger.withContext({ requestId: 'r1', toolName: 'tool1' });
    child.info('child message');
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry.requestId).toBe('r1');
    expect(entry.toolName).toBe('tool1');
    expect(entry.message).toBe('child message');
  });

  it('withContext can be chained and child context overrides parent', () => {
    const logger = createLogger('info', { format: 'json' });
    const child = logger.withContext({ requestId: 'r1' }).withContext({ toolName: 'tool2', requestId: 'r2' });
    child.info('chained');
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry.requestId).toBe('r2');
    expect(entry.toolName).toBe('tool2');
  });

  it('withContext child does not affect parent logger context', () => {
    const logger = createLogger('info', { format: 'json' });
    logger.withContext({ requestId: 'child-only' });
    logger.info('parent message');
    const entry = JSON.parse(stderrOutput[0]);
    expect(entry).not.toHaveProperty('requestId');
  });
});

describe('Structured Logger - text format unchanged', () => {
  let stderrOutput: string[];
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    stderrOutput = [];
    originalStderrWrite = process.stderr.write;
    process.stderr.write = vi.fn((chunk: any) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    }) as any;
    delete process.env['LOG_FORMAT'];
  });

  afterEach(() => {
    process.stderr.write = originalStderrWrite;
  });

  it('text format is the default when no option or env var given', () => {
    const logger = createLogger('info');
    logger.info('plain text');
    expect(stderrOutput[0]).toMatch(/^\[.*\] INFO plain text\n$/);
  });

  it('text format explicitly set produces bracketed timestamp prefix', () => {
    const logger = createLogger('info', { format: 'text' });
    logger.warn('warn msg');
    expect(stderrOutput[0]).toMatch(/^\[.*\] WARN warn msg\n$/);
  });

  it('text format includes extra args as JSON-stringified values', () => {
    const logger = createLogger('info', { format: 'text' });
    logger.info('msg', { a: 1 });
    expect(stderrOutput[0]).toContain('{"a":1}');
  });

  it('text format respects log level filtering', () => {
    const logger = createLogger('warn', { format: 'text' });
    logger.info('should not appear');
    logger.warn('should appear');
    expect(stderrOutput.length).toBe(1);
    expect(stderrOutput[0]).toContain('should appear');
  });

  it('text format withContext does not alter output format', () => {
    const logger = createLogger('info', { format: 'text' });
    const child = logger.withContext({ requestId: 'x', toolName: 'y' });
    child.info('text child');
    expect(stderrOutput[0]).toMatch(/^\[.*\] INFO text child\n$/);
  });
});
