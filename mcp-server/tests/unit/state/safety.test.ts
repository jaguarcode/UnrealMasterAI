/**
 * Unit tests for safety classification system.
 * Tests classifyOperation, isPathSafe, and ApprovalGate.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  classifyOperation,
  isPathSafe,
  ApprovalGate,
  type SafetyClassification,
} from '../../../src/state/safety.js';

describe('classifyOperation', () => {
  // --- Safe operations ---
  it('classifies editor-ping as "safe"', () => {
    const result = classifyOperation('editor-ping', {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
    expect(result.reason).toBe('Read-only operation');
  });

  it('classifies editor-getLevelInfo as "safe"', () => {
    const result = classifyOperation('editor-getLevelInfo', {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies file-read as "safe"', () => {
    const result = classifyOperation('file-read', {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies file-search as "safe"', () => {
    const result = classifyOperation('file-search', {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies blueprint-serialize as "safe"', () => {
    const result = classifyOperation('blueprint-serialize', {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies compilation-getStatus as "safe"', () => {
    const result = classifyOperation('compilation-getStatus', {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies compilation-getErrors as "safe"', () => {
    const result = classifyOperation('compilation-getErrors', {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
  });

  // --- Warn operations ---
  it('classifies file-write to new file as "warn"', () => {
    const result = classifyOperation('file-write', { filePath: '/Project/Source/NewFile.cpp' });
    expect(result.level).toBe('warn');
    expect(result.reason).toBe('File write operation');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies file-write to test path as "warn" not requiring approval', () => {
    const result = classifyOperation('file-write', { filePath: '/Game/Content/Tests/TestBlueprint.uasset' });
    expect(result.level).toBe('warn');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies blueprint-createNode as "warn"', () => {
    const result = classifyOperation('blueprint-createNode', {
      blueprintCacheKey: 'key',
      graphName: 'EventGraph',
      nodeClass: 'K2Node_CallFunction',
    });
    expect(result.level).toBe('warn');
    expect(result.reason).toBe('Mutation operation');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies blueprint-connectPins as "warn"', () => {
    const result = classifyOperation('blueprint-connectPins', {});
    expect(result.level).toBe('warn');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies blueprint-modifyProperty as "warn"', () => {
    const result = classifyOperation('blueprint-modifyProperty', {});
    expect(result.level).toBe('warn');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies compilation-trigger as "warn"', () => {
    const result = classifyOperation('compilation-trigger', {});
    expect(result.level).toBe('warn');
    expect(result.reason).toBe('Mutation operation');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies unknown tool as "warn"', () => {
    const result = classifyOperation('some-unknown-tool', {});
    expect(result.level).toBe('warn');
    expect(result.reason).toBe('Unknown operation');
    expect(result.requiresApproval).toBe(false);
  });

  // --- Dangerous operations ---
  it('classifies file-write to production content path as "dangerous" requiring approval', () => {
    const result = classifyOperation('file-write', { filePath: '/Game/Content/Blueprints/BP_Player.uasset' });
    expect(result.level).toBe('dangerous');
    expect(result.reason).toBe('Writing to production content path');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies blueprint-deleteNode as "dangerous" requiring approval', () => {
    const result = classifyOperation('blueprint-deleteNode', {
      blueprintCacheKey: 'key',
      nodeId: 'node-123',
    });
    expect(result.level).toBe('dangerous');
    expect(result.reason).toBe('Destructive Blueprint operation');
    expect(result.requiresApproval).toBe(true);
  });
});

describe('isPathSafe', () => {
  const allowedRoots = ['/Project/Source', '/Project/Content'];

  it('blocks path traversal with ".."', () => {
    expect(isPathSafe('/Project/Source/../../../etc/passwd', allowedRoots)).toBe(false);
  });

  it('blocks path with "~"', () => {
    expect(isPathSafe('~/secret/file.txt', allowedRoots)).toBe(false);
  });

  it('allows path within allowed root', () => {
    expect(isPathSafe('/Project/Source/MyFile.cpp', allowedRoots)).toBe(true);
  });

  it('allows path within second allowed root', () => {
    expect(isPathSafe('/Project/Content/Maps/Level.umap', allowedRoots)).toBe(true);
  });

  it('rejects path outside allowed root', () => {
    expect(isPathSafe('/Other/Path/file.txt', allowedRoots)).toBe(false);
  });

  it('normalizes backslashes for Windows paths', () => {
    expect(isPathSafe('\\Project\\Source\\File.cpp', ['\\Project\\Source'])).toBe(true);
  });

  it('blocks traversal embedded in an otherwise valid path', () => {
    expect(isPathSafe('/Project/Source/sub/../../../etc/passwd', allowedRoots)).toBe(false);
  });
});

describe('ApprovalGate', () => {
  let gate: ApprovalGate;

  beforeEach(() => {
    gate = new ApprovalGate(100); // Short timeout for tests
  });

  it('auto-approve returns true', async () => {
    gate.setAutoResponse('approve');
    const classification: SafetyClassification = {
      level: 'dangerous',
      reason: 'test',
      requiresApproval: true,
    };
    const result = await gate.requestApproval(classification);
    expect(result).toBe(true);
  });

  it('auto-reject returns false', async () => {
    gate.setAutoResponse('reject');
    const classification: SafetyClassification = {
      level: 'dangerous',
      reason: 'test',
      requiresApproval: true,
    };
    const result = await gate.requestApproval(classification);
    expect(result).toBe(false);
  });

  it('returns true immediately when approval not required', async () => {
    const classification: SafetyClassification = {
      level: 'warn',
      reason: 'test',
      requiresApproval: false,
    };
    const result = await gate.requestApproval(classification);
    expect(result).toBe(true);
  });

  it('timeout defaults to reject', async () => {
    vi.useFakeTimers();

    const timeoutGate = new ApprovalGate(60000);
    const classification: SafetyClassification = {
      level: 'dangerous',
      reason: 'test',
      requiresApproval: true,
    };

    const promise = timeoutGate.requestApproval(classification);

    // Advance past the timeout
    vi.advanceTimersByTime(60001);

    const result = await promise;
    expect(result).toBe(false);

    vi.useRealTimers();
  });
});
