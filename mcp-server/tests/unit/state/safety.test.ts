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
    const result = classifyOperation('blueprint-deleteNode', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies asset-delete as "dangerous"', () => {
    const result = classifyOperation('asset-delete', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies asset-rename as "dangerous"', () => {
    const result = classifyOperation('asset-rename', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies actor-delete as "dangerous"', () => {
    const result = classifyOperation('actor-delete', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies datatable-removeRow as "dangerous"', () => {
    const result = classifyOperation('datatable-removeRow', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies debug-execConsole as "dangerous"', () => {
    const result = classifyOperation('debug-execConsole', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies build-cookContent as "dangerous"', () => {
    const result = classifyOperation('build-cookContent', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies refactor-renameChain as "dangerous"', () => {
    const result = classifyOperation('refactor-renameChain', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });

  // --- New safe tools ---
  it.each([
    'project-getStructure', 'project-getSettings', 'project-getPlugins',
    'project-getDependencyGraph', 'project-getClassHierarchy', 'project-snapshot',
    'content-listAssets', 'content-findAssets', 'content-getAssetDetails', 'content-validateAssets',
    'asset-export', 'asset-getReferences',
    'actor-getProperties', 'actor-getComponents', 'actor-select',
    'level-getWorldSettings',
    'material-getParameters', 'material-getNodes',
    'mesh-getInfo',
    'datatable-getRows',
    'anim-listMontages', 'anim-getBlendSpace', 'anim-listSequences', 'anim-getSkeletonInfo',
    'gameplay-getGameMode', 'gameplay-listInputActions',
    'sourcecontrol-getStatus', 'sourcecontrol-diff',
    'build-getMapCheck',
    'debug-getLog', 'debug-getPerformance',
    // Sequencer (read-only)
    'sequencer-getInfo', 'sequencer-exportFBX',
    // AI/Navigation (read-only)
    'ai-getBehaviorTreeInfo', 'ai-getBlackboardKeys', 'ai-getNavMeshInfo',
    // Widget (read-only)
    'widget-getInfo', 'widget-getBindings', 'widget-listWidgets',
    // Editor utilities (read-only)
    'editor-getSelection', 'editor-getViewport', 'editor-setSelection', 'editor-getRecentActivity',
    // Slate (read-only)
    'slate-listTemplates', 'slate-generate', 'slate-validate',
    // Chat
    'chat-sendMessage',
    // Texture (read-only)
    'texture-getInfo', 'texture-listTextures',
    // Niagara (read-only)
    'niagara-getInfo', 'niagara-listSystems',
    // Audio (read-only)
    'audio-getInfo', 'audio-listAssets',
    // Landscape (read-only)
    'landscape-getInfo', 'landscape-exportHeightmap',
    // Physics (read-only)
    'physics-getInfo',
    // World Partition (read-only)
    'worldpartition-getInfo',
    // Foliage (read-only)
    'foliage-getInfo',
    // Curves (read-only)
    'curve-getInfo',
    // PCG (read-only)
    'pcg-getInfo',
    // Geometry Script (read-only)
    'geoscript-getInfo',
    // Analysis (read-only)
    'analyze-blueprintComplexity', 'analyze-assetHealth', 'analyze-performanceHints', 'analyze-codeConventions',
  ])('classifies %s as "safe"', (tool) => {
    const result = classifyOperation(tool, {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
  });

  // --- New warn tools ---
  it.each([
    'asset-create', 'asset-duplicate', 'asset-import', 'asset-setMetadata',
    'actor-spawn', 'actor-setTransform', 'actor-setProperty', 'actor-addComponent',
    'level-create', 'level-open', 'level-save', 'level-addSublevel',
    'material-create', 'material-setParameter', 'material-createInstance', 'material-setTexture',
    'mesh-setMaterial', 'mesh-generateCollision', 'mesh-setLOD',
    'datatable-create', 'datatable-addRow',
    'anim-createMontage',
    'gameplay-setGameMode', 'gameplay-addInputAction',
    'sourcecontrol-checkout',
    'build-lightmaps',
    // Sequencer (mutations)
    'sequencer-create', 'sequencer-open', 'sequencer-addTrack', 'sequencer-addBinding',
    'sequencer-setKeyframe', 'sequencer-importFBX',
    // AI/Navigation (mutations)
    'ai-createBehaviorTree', 'ai-createBlackboard', 'ai-addBlackboardKey',
    'ai-configureNavMesh', 'ai-createEQS',
    // Widget (mutations)
    'widget-create', 'widget-addElement', 'widget-setProperty',
    // Editor utilities (mutations)
    'editor-batchOperation',
    // Texture (mutations)
    'texture-import', 'texture-setCompression', 'texture-createRenderTarget', 'texture-resize',
    // Niagara (mutations)
    'niagara-createSystem', 'niagara-addEmitter', 'niagara-setParameter', 'niagara-compile',
    // Audio (mutations)
    'audio-import', 'audio-createCue', 'audio-setAttenuation', 'audio-createMetaSound',
    // Landscape (mutations)
    'landscape-create', 'landscape-importHeightmap', 'landscape-setMaterial',
    // Physics (mutations)
    'physics-createAsset', 'physics-setProfile', 'physics-createMaterial', 'physics-setConstraint',
    // World Partition (mutations)
    'worldpartition-setConfig', 'worldpartition-createDataLayer', 'worldpartition-createHLOD',
    // Foliage (mutations)
    'foliage-createType', 'foliage-setProperties',
    // Curves (mutations)
    'curve-create', 'curve-setKeys',
    // PCG (mutations)
    'pcg-createGraph', 'pcg-addNode', 'pcg-connectNodes',
    // Geometry Script (mutations)
    'geoscript-meshBoolean', 'geoscript-meshTransform',
    // Workflow (mutations)
    'workflow-createCharacter', 'workflow-createUIScreen', 'workflow-setupLevel',
    'workflow-createInteractable', 'workflow-createProjectile', 'workflow-setupMultiplayer',
    'workflow-createInventorySystem', 'workflow-createDialogueSystem',
  ])('classifies %s as "warn"', (tool) => {
    const result = classifyOperation(tool, {});
    expect(result.level).toBe('warn');
    expect(result.requiresApproval).toBe(false);
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
