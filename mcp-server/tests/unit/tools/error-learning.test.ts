import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  addResolution,
  loadResolutions,
  matchError,
  markResolutionReused,
  getResolutions,
  clearResolutions,
  contextRecordResolution,
  contextMatchError,
  contextMarkResolutionReused,
  contextListResolutions,
  type ErrorResolution,
} from '../../../src/tools/context/error-learning.js';

const DATA_DIR = process.env.UMA_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'data');
const RESOLUTIONS_FILE = join(DATA_DIR, 'error-resolutions.json');

// Backup production data before tests modify it
const _backupResolutions = existsSync(RESOLUTIONS_FILE) ? readFileSync(RESOLUTIONS_FILE, 'utf-8') : null;

afterAll(() => {
  if (_backupResolutions !== null) writeFileSync(RESOLUTIONS_FILE, _backupResolutions, 'utf-8');
});

function cleanup() {
  if (existsSync(RESOLUTIONS_FILE)) rmSync(RESOLUTIONS_FILE);
}

function makeSampleResolution(overrides?: Partial<ErrorResolution>): ErrorResolution {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    errorMessage: 'Cannot connect pin: Float is not compatible with Integer',
    errorType: 'pin-connection-failure',
    sourceTool: 'blueprint-connectPins',
    developerIntent: 'Connect damage calculation output to health component input',
    attemptedFixes: [
      { action: 'Direct pin connection', toolUsed: 'blueprint-connectPins', result: 'failure', notes: 'Type mismatch' },
      { action: 'Insert ToInt conversion node', toolUsed: 'blueprint-createNode', result: 'success' },
    ],
    successfulFix: {
      description: 'Insert a FloatToInt conversion node between the two pins',
      toolSequence: ['blueprint-createNode', 'blueprint-connectPins', 'blueprint-connectPins'],
      steps: [
        'Create a FloatToInt (Truncate) conversion node',
        'Connect Float output to conversion node input',
        'Connect conversion node output to Integer input pin',
      ],
    },
    rootCause: 'Blueprint pin type mismatch: source outputs Float but target expects Integer',
    tags: ['blueprint', 'type-conversion', 'pin'],
    reuseCount: 0,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    ...overrides,
  };
}

describe('Error Resolution Store', () => {
  beforeEach(cleanup);

  it('saves and loads resolutions from disk', () => {
    const res = makeSampleResolution({ id: 'persist-test' });
    addResolution(res);

    const loaded = loadResolutions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('persist-test');
    expect(loaded[0].rootCause).toContain('type mismatch');
  });

  it('replaces resolution with same id', () => {
    const res = makeSampleResolution({ id: 'replace-test' });
    addResolution(res);
    addResolution({ ...res, rootCause: 'Updated root cause' });

    const loaded = loadResolutions();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].rootCause).toBe('Updated root cause');
  });

  it('increments reuse count', () => {
    const res = makeSampleResolution({ id: 'reuse-test', reuseCount: 0 });
    addResolution(res);

    expect(markResolutionReused('reuse-test')).toBe(true);
    expect(markResolutionReused('reuse-test')).toBe(true);

    const loaded = loadResolutions();
    expect(loaded[0].reuseCount).toBe(2);
  });

  it('returns false for unknown resolution id', () => {
    expect(markResolutionReused('nonexistent')).toBe(false);
  });

  it('filters resolutions by errorType and sourceTool', () => {
    addResolution(makeSampleResolution({ id: 'a', errorType: 'compile-error', sourceTool: 'compilation-trigger' }));
    addResolution(makeSampleResolution({ id: 'b', errorType: 'pin-connection-failure', sourceTool: 'blueprint-connectPins' }));
    addResolution(makeSampleResolution({ id: 'c', errorType: 'compile-error', sourceTool: 'blueprint-createNode' }));

    expect(getResolutions({ errorType: 'compile-error' })).toHaveLength(2);
    expect(getResolutions({ sourceTool: 'blueprint-connectPins' })).toHaveLength(1);
    expect(getResolutions({ errorType: 'compile-error', sourceTool: 'compilation-trigger' })).toHaveLength(1);
  });

  it('clears all resolutions', () => {
    addResolution(makeSampleResolution({ id: 'clear-1' }));
    addResolution(makeSampleResolution({ id: 'clear-2' }));
    clearResolutions();
    expect(loadResolutions()).toHaveLength(0);
  });
});

describe('Error Similarity Matching', () => {
  beforeEach(() => {
    cleanup();
    // Seed with known resolutions
    addResolution(makeSampleResolution({
      id: 'pin-float-int',
      errorMessage: 'Cannot connect pin: Float is not compatible with Integer',
      errorType: 'pin-connection-failure',
      sourceTool: 'blueprint-connectPins',
      rootCause: 'Float→Integer type mismatch',
    }));
    addResolution(makeSampleResolution({
      id: 'asset-missing-mesh',
      errorMessage: 'Asset not found: /Game/Meshes/SM_Chair does not exist',
      errorType: 'asset-not-found',
      sourceTool: 'mesh-setMaterial',
      rootCause: 'Asset was renamed from SM_Chair to SM_Chair_01',
    }));
    addResolution(makeSampleResolution({
      id: 'mat-compile-fail',
      errorMessage: 'Material compile error: Missing connection to Base Color',
      errorType: 'material-compile-error',
      sourceTool: 'material-create',
      rootCause: 'Base Color input was left unconnected',
    }));
  });

  it('matches similar pin connection errors with high similarity', () => {
    const result = matchError(
      'Cannot connect pin: Boolean is not compatible with Float',
      'blueprint-connectPins',
    );

    expect(result.learnedResolutions.length).toBeGreaterThan(0);
    const topMatch = result.learnedResolutions[0];
    expect(topMatch.resolution.id).toBe('pin-float-int');
    expect(topMatch.similarity).toBeGreaterThan(0.4);
  });

  it('matches asset-not-found errors to correct resolution', () => {
    const result = matchError(
      'Asset not found: /Game/Meshes/SM_Table does not exist',
      'mesh-setMaterial',
    );

    const assetMatch = result.learnedResolutions.find((m) => m.resolution.id === 'asset-missing-mesh');
    expect(assetMatch).toBeDefined();
    expect(assetMatch!.similarity).toBeGreaterThan(0.4);
  });

  it('returns builtin strategy for known error types', () => {
    const result = matchError(
      'Compilation failed with 3 errors',
      'compilation-trigger',
      'compile-error',
    );

    expect(result.builtinStrategy).not.toBeNull();
    expect(result.builtinStrategy!.errorType).toBe('compile-error');
  });

  it('combines builtin + learned when both match', () => {
    const result = matchError(
      'Material compile error: Missing input connection',
      'material-create',
      'material-compile-error',
    );

    expect(result.builtinStrategy).not.toBeNull();
    expect(result.learnedResolutions.length).toBeGreaterThan(0);
    expect(result.recommendation.source).toBe('combined');
  });

  it('includes avoidActions from failed attempts', () => {
    const result = matchError(
      'Cannot connect pin: String is not compatible with Integer',
      'blueprint-connectPins',
    );

    // The seeded resolution has a failed "Direct pin connection" attempt
    if (result.learnedResolutions.length > 0) {
      expect(result.recommendation.avoidActions).toContain('Direct pin connection');
    }
  });

  it('returns no-match guidance when nothing matches', () => {
    const result = matchError(
      'Completely novel error that has never been seen before XYZ123',
      'unknown-tool',
      'unknown-type',
    );

    expect(result.recommendation.confidence).toBe(0);
    expect(result.recommendation.steps[0]).toContain('No matching resolution');
  });

  it('boosts resolutions with higher reuse counts', () => {
    // Add two similar resolutions, one with higher reuse
    addResolution(makeSampleResolution({
      id: 'high-reuse',
      errorMessage: 'Cannot connect pin: Vector is not compatible with Float',
      errorType: 'pin-connection-failure',
      sourceTool: 'blueprint-connectPins',
      reuseCount: 10,
    }));

    const result = matchError(
      'Cannot connect pin: Vector is not compatible with Integer',
      'blueprint-connectPins',
    );

    // The high-reuse resolution should rank at or near the top
    const highReuse = result.learnedResolutions.find((m) => m.resolution.id === 'high-reuse');
    expect(highReuse).toBeDefined();
    expect(highReuse!.matchReason).toContain('reused');
  });
});

describe('Error Type Inference', () => {
  beforeEach(cleanup);

  it('infers compile-error from message', () => {
    addResolution(makeSampleResolution({
      id: 'infer-compile',
      errorMessage: 'Blueprint compilation failed',
      errorType: 'compile-error',
      sourceTool: 'compilation-trigger',
    }));

    // Query without explicit errorType — should auto-infer
    const result = matchError('Compilation failed with errors', 'compilation-trigger');
    expect(result.builtinStrategy).not.toBeNull();
  });

  it('infers asset-not-found from message', () => {
    const result = matchError(
      'Asset path /Game/Missing/Thing does not exist',
      'content-findAssets',
    );
    expect(result.builtinStrategy).not.toBeNull();
    expect(result.builtinStrategy!.errorType).toBe('asset-not-found');
  });

  it('infers permission-denied from message', () => {
    const result = matchError(
      'Operation blocked: permission denied by safety gate',
      'asset-delete',
    );
    expect(result.builtinStrategy).not.toBeNull();
    expect(result.builtinStrategy!.errorType).toBe('permission-denied');
  });
});

describe('MCP Tool Handlers', () => {
  beforeEach(cleanup);

  it('contextRecordResolution persists and returns success', async () => {
    const result = await contextRecordResolution({
      errorMessage: 'Static mesh mobility error: cannot move Static actor',
      sourceTool: 'actor-setTransform',
      developerIntent: 'Move a car actor to a new position',
      attemptedFixes: [
        { action: 'Called actor-setTransform directly', toolUsed: 'actor-setTransform', result: 'failure', notes: 'Static mobility prevents movement' },
        { action: 'Set mobility to Movable first', toolUsed: 'actor-setProperty', result: 'success' },
      ],
      successfulFix: {
        description: 'Set actor mobility to Movable before calling setTransform',
        toolSequence: ['actor-setProperty', 'actor-setTransform'],
        steps: [
          'Call actor-setProperty to set Mobility to Movable on the root component',
          'Then call actor-setTransform to move the actor',
        ],
      },
      rootCause: 'StaticMeshActors default to Static mobility which prevents runtime movement',
      tags: ['mobility', 'static-mesh', 'transform'],
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.id).toBeTruthy();
    expect(parsed.errorType).toBe('actor-error');
    expect(parsed.totalResolutions).toBe(1);
  });

  it('contextMatchError returns structured recommendation', async () => {
    // First seed a resolution
    await contextRecordResolution({
      errorMessage: 'Cannot set transform: actor has Static mobility',
      sourceTool: 'actor-setTransform',
      developerIntent: 'Move actor',
      attemptedFixes: [
        { action: 'Direct setTransform', result: 'failure' },
      ],
      successfulFix: {
        description: 'Set mobility to Movable first',
        toolSequence: ['actor-setProperty', 'actor-setTransform'],
        steps: ['Set mobility to Movable', 'Then set transform'],
      },
      rootCause: 'Static mobility blocks movement',
      tags: ['mobility'],
    });

    const result = await contextMatchError({
      errorMessage: 'Cannot move actor: Static mobility prevents transform changes',
      sourceTool: 'actor-setTransform',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.recommendation).toBeDefined();
    expect(parsed.recommendation.toolSequence.length).toBeGreaterThan(0);
    expect(parsed.recommendation.confidence).toBeGreaterThan(0);
  });

  it('contextMarkResolutionReused updates ranking', async () => {
    // Seed
    const recordResult = await contextRecordResolution({
      errorMessage: 'Test error for reuse',
      sourceTool: 'editor-ping',
      developerIntent: 'Test',
      attemptedFixes: [],
      successfulFix: {
        description: 'Fixed it',
        toolSequence: ['editor-ping'],
        steps: ['Step 1'],
      },
      rootCause: 'Test root cause',
    });
    const { id } = JSON.parse(recordResult.content[0].text);

    const result = await contextMarkResolutionReused({ resolutionId: id });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');

    // Verify reuse count increased
    const resolutions = loadResolutions();
    const updated = resolutions.find((r) => r.id === id);
    expect(updated!.reuseCount).toBe(1);
  });

  it('contextMarkResolutionReused returns error for unknown id', async () => {
    const result = await contextMarkResolutionReused({ resolutionId: 'does-not-exist' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
  });

  it('contextListResolutions returns all stored resolutions', async () => {
    await contextRecordResolution({
      errorMessage: 'Error A',
      sourceTool: 'tool-a',
      developerIntent: 'Intent A',
      attemptedFixes: [],
      successfulFix: { description: 'Fix A', toolSequence: [], steps: [] },
      rootCause: 'Cause A',
    });
    await contextRecordResolution({
      errorMessage: 'Error B',
      sourceTool: 'tool-b',
      developerIntent: 'Intent B',
      attemptedFixes: [],
      successfulFix: { description: 'Fix B', toolSequence: [], steps: [] },
      rootCause: 'Cause B',
    });

    const result = await contextListResolutions({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.count).toBe(2);
  });

  it('contextListResolutions filters by sourceTool', async () => {
    await contextRecordResolution({
      errorMessage: 'Error X',
      sourceTool: 'blueprint-connectPins',
      developerIntent: 'Connect',
      attemptedFixes: [],
      successfulFix: { description: 'Fix', toolSequence: [], steps: [] },
      rootCause: 'Cause',
    });
    await contextRecordResolution({
      errorMessage: 'Error Y',
      sourceTool: 'material-create',
      developerIntent: 'Create',
      attemptedFixes: [],
      successfulFix: { description: 'Fix', toolSequence: [], steps: [] },
      rootCause: 'Cause',
    });

    const result = await contextListResolutions({ sourceTool: 'material-create' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(1);
    expect(parsed.resolutions[0].sourceTool).toBe('material-create');
  });
});
