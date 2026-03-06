/**
 * Unit tests for Phase 5 context intelligence tools.
 * Tests context-autoGather, context-getManifest, context-getChains.
 */
import { describe, it, expect, vi } from 'vitest';

// --- context-autoGather ---
describe('context-autoGather', () => {
  it('sends python.execute with context_auto_gather script', async () => {
    const { contextAutoGather } = await import(
      '../../../src/tools/context/auto-gather.js'
    );
    const mockBridge = {
      sendRequest: vi.fn().mockResolvedValue({
        result: {
          project: { name: 'TestProject', engineVersion: '5.7.0' },
          conventions: { namingPattern: 'standard_ue' },
        },
      }),
    } as any;

    const result = await contextAutoGather(mockBridge, {});
    expect(mockBridge.sendRequest).toHaveBeenCalledOnce();
    const call = mockBridge.sendRequest.mock.calls[0][0];
    expect(call.method).toBe('python.execute');
    expect(call.params.script).toBe('context_auto_gather');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.result.project.name).toBe('TestProject');
  });

  it('handles bridge error', async () => {
    const { contextAutoGather } = await import(
      '../../../src/tools/context/auto-gather.js'
    );
    const mockBridge = {
      sendRequest: vi.fn().mockResolvedValue({
        error: { code: 9200, message: 'Failed to gather context' },
      }),
    } as any;

    const result = await contextAutoGather(mockBridge, {});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
  });

  it('handles bridge exception', async () => {
    const { contextAutoGather } = await import(
      '../../../src/tools/context/auto-gather.js'
    );
    const mockBridge = {
      sendRequest: vi.fn().mockRejectedValue(new Error('Connection lost')),
    } as any;

    const result = await contextAutoGather(mockBridge, {});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toBe('Connection lost');
  });

  it('passes optional params to bridge', async () => {
    const { contextAutoGather } = await import(
      '../../../src/tools/context/auto-gather.js'
    );
    const mockBridge = {
      sendRequest: vi.fn().mockResolvedValue({ result: {} }),
    } as any;

    await contextAutoGather(mockBridge, {
      includeConventions: true,
      includeViewport: false,
    });
    const call = mockBridge.sendRequest.mock.calls[0][0];
    expect(call.params.args.includeConventions).toBe(true);
    expect(call.params.args.includeViewport).toBe(false);
  });
});

// --- tool-manifest ---
describe('tool-manifest', () => {
  it('generates manifest with all tools', async () => {
    const { generateManifest } = await import(
      '../../../src/tools/context/tool-manifest.js'
    );
    const manifest = generateManifest();
    expect(manifest.version).toBe('5.0.0');
    expect(manifest.toolCount).toBeGreaterThanOrEqual(170);
    expect(manifest.domainCount).toBeGreaterThanOrEqual(36);
    expect(manifest.tools.length).toBeGreaterThanOrEqual(170);
    expect(manifest.domains.length).toBeGreaterThanOrEqual(36);
  });

  it('includes tool chains in manifest', async () => {
    const { generateManifest } = await import(
      '../../../src/tools/context/tool-manifest.js'
    );
    const manifest = generateManifest();
    expect(manifest.chains.length).toBeGreaterThanOrEqual(8);
    const bpChain = manifest.chains.find(
      (c) => c.name === 'add-blueprint-logic',
    );
    expect(bpChain).toBeDefined();
    expect(bpChain!.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('every tool has domain and safety level', async () => {
    const { generateManifest } = await import(
      '../../../src/tools/context/tool-manifest.js'
    );
    const manifest = generateManifest();
    for (const tool of manifest.tools) {
      expect(tool.domain).toBeTruthy();
      expect(['safe', 'warn', 'dangerous']).toContain(tool.safety);
      expect(tool.name).toBeTruthy();
    }
  });

  it('domains reference valid tools', async () => {
    const { generateManifest } = await import(
      '../../../src/tools/context/tool-manifest.js'
    );
    const manifest = generateManifest();
    const toolNames = new Set(manifest.tools.map((t) => t.name));
    for (const domain of manifest.domains) {
      for (const toolName of domain.tools) {
        expect(toolNames.has(toolName)).toBe(true);
      }
    }
  });
});

// --- tool-chains ---
describe('tool-chains', () => {
  it('exports TOOL_CHAINS with 8+ chains', async () => {
    const { TOOL_CHAINS, listChains } = await import(
      '../../../src/tools/context/tool-chains.js'
    );
    const chains = listChains();
    expect(chains.length).toBeGreaterThanOrEqual(8);
    expect(TOOL_CHAINS['add-blueprint-logic']).toBeDefined();
  });

  it('getChain returns specific chain', async () => {
    const { getChain } = await import(
      '../../../src/tools/context/tool-chains.js'
    );
    const chain = getChain('add-blueprint-logic');
    expect(chain).toBeDefined();
    expect(chain!.steps.length).toBeGreaterThanOrEqual(3);
    expect(chain!.steps[0].tool).toBe('blueprint-serialize');
  });

  it('getChain returns undefined for unknown', async () => {
    const { getChain } = await import(
      '../../../src/tools/context/tool-chains.js'
    );
    expect(getChain('nonexistent-chain')).toBeUndefined();
  });
});

// --- workflow-knowledge ---
describe('workflow-knowledge', () => {
  it('has 20+ built-in workflows from Epic docs', async () => {
    const { getAllWorkflows, getBuiltinWorkflowCount } = await import(
      '../../../src/tools/context/workflow-knowledge.js'
    );
    expect(getBuiltinWorkflowCount()).toBeGreaterThanOrEqual(20);
    expect(getAllWorkflows().length).toBeGreaterThanOrEqual(20);
  });

  it('getWorkflowById returns a specific workflow', async () => {
    const { getWorkflowById } = await import(
      '../../../src/tools/context/workflow-knowledge.js'
    );
    const workflow = getWorkflowById('bp-create-actor-class');
    expect(workflow).toBeDefined();
    expect(workflow!.name).toBe('Create a Blueprint Actor Class');
    expect(workflow!.domain).toBe('blueprint');
    expect(workflow!.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('getWorkflowsByDomain filters correctly', async () => {
    const { getWorkflowsByDomain } = await import(
      '../../../src/tools/context/workflow-knowledge.js'
    );
    const materialWorkflows = getWorkflowsByDomain('material');
    expect(materialWorkflows.length).toBeGreaterThanOrEqual(2);
    for (const w of materialWorkflows) {
      expect(w.domain).toBe('material');
    }
  });

  it('getWorkflowsByTag filters correctly', async () => {
    const { getWorkflowsByTag } = await import(
      '../../../src/tools/context/workflow-knowledge.js'
    );
    const animWorkflows = getWorkflowsByTag('animation');
    expect(animWorkflows.length).toBeGreaterThanOrEqual(1);
  });

  it('every workflow has required fields', async () => {
    const { getAllWorkflows } = await import(
      '../../../src/tools/context/workflow-knowledge.js'
    );
    for (const w of getAllWorkflows()) {
      expect(w.id).toBeTruthy();
      expect(w.name).toBeTruthy();
      expect(w.domain).toBeTruthy();
      expect(w.intentPatterns.length).toBeGreaterThanOrEqual(1);
      expect(w.steps.length).toBeGreaterThanOrEqual(2);
      expect(w.expectedOutcome).toBeTruthy();
      expect(['beginner', 'intermediate', 'advanced']).toContain(w.difficulty);
      expect(['epic-docs', 'community', 'user-defined']).toContain(w.source);
    }
  });

  it('addLearnedWorkflow adds and retrieves workflow', async () => {
    const { addLearnedWorkflow, getLearnedWorkflows, clearLearnedWorkflows, getAllWorkflows } = await import(
      '../../../src/tools/context/workflow-knowledge.js'
    );
    clearLearnedWorkflows();
    const before = getAllWorkflows().length;
    addLearnedWorkflow({
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'A test',
      domain: 'test',
      difficulty: 'beginner',
      intentPatterns: ['test something'],
      prerequisites: [],
      steps: [{ tool: 'editor-ping', purpose: 'test' }, { tool: 'editor-listActors', purpose: 'test' }],
      expectedOutcome: 'test passes',
      source: 'user-defined',
      tags: ['test'],
    });
    expect(getAllWorkflows().length).toBe(before + 1);
    expect(getLearnedWorkflows().length).toBe(1);
    clearLearnedWorkflows();
    expect(getLearnedWorkflows().length).toBe(0);
  });
});

// --- intent-matcher ---
describe('intent-matcher', () => {
  it('matches "create a character" to character setup workflow', async () => {
    const { matchIntent } = await import(
      '../../../src/tools/context/intent-matcher.js'
    );
    const result = matchIntent('create a playable character');
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.topRecommendation).toBeDefined();
    expect(result.topRecommendation!.id).toBe('char-setup-playable');
  });

  it('matches "create a material" to material workflow', async () => {
    const { matchIntent } = await import(
      '../../../src/tools/context/intent-matcher.js'
    );
    const result = matchIntent('create a basic material with textures');
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.topRecommendation!.domain).toBe('material');
  });

  it('matches "add logic to blueprint" to blueprint logic workflow', async () => {
    const { matchIntent } = await import(
      '../../../src/tools/context/intent-matcher.js'
    );
    const result = matchIntent('add logic to blueprint');
    expect(result.topRecommendation).toBeDefined();
    expect(result.topRecommendation!.domain).toBe('blueprint');
  });

  it('returns suggested tool sequence from top match', async () => {
    const { matchIntent } = await import(
      '../../../src/tools/context/intent-matcher.js'
    );
    const result = matchIntent('create a new level');
    expect(result.suggestedToolSequence.length).toBeGreaterThanOrEqual(2);
    expect(result.suggestedToolSequence).toContain('level-create');
  });

  it('returns no high-confidence matches for unrelated query', async () => {
    const { matchIntent } = await import(
      '../../../src/tools/context/intent-matcher.js'
    );
    const result = matchIntent('xyzzy frobulate the quantum flux capacitor');
    expect(result.matches.length).toBe(0);
    expect(result.topRecommendation).toBeNull();
  });

  it('respects maxResults parameter', async () => {
    const { matchIntent } = await import(
      '../../../src/tools/context/intent-matcher.js'
    );
    const result = matchIntent('create blueprint actor material', 2);
    expect(result.matches.length).toBeLessThanOrEqual(2);
  });
});

// --- learn-workflow tool handler ---
describe('context-learnWorkflow', () => {
  it('learns a new workflow and returns success', async () => {
    const { contextLearnWorkflow } = await import(
      '../../../src/tools/context/learn-workflow.js'
    );
    const { clearLearnedWorkflows } = await import(
      '../../../src/tools/context/workflow-knowledge.js'
    );
    clearLearnedWorkflows();
    const result = await contextLearnWorkflow({
      id: 'custom-decal-workflow',
      name: 'Create Decal Material',
      description: 'Create a deferred decal material and apply to level',
      domain: 'material',
      intentPatterns: ['create decal', 'add decal material'],
      steps: [
        { tool: 'material-create', purpose: 'Create decal material' },
        { tool: 'material-setParameter', purpose: 'Set blend mode to translucent' },
      ],
      expectedOutcome: 'A decal material applied in the level',
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.learnedWorkflows).toBe(1);
    clearLearnedWorkflows();
  });
});

// --- matchIntent tool handler ---
describe('context-matchIntent', () => {
  it('returns structured match results', async () => {
    const { contextMatchIntent } = await import(
      '../../../src/tools/context/learn-workflow.js'
    );
    const result = await contextMatchIntent({ query: 'create a hud widget' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.matchCount).toBeGreaterThanOrEqual(1);
    expect(parsed.topRecommendation).toBeDefined();
    expect(parsed.suggestedToolSequence).toBeDefined();
    expect(parsed.allMatches.length).toBeGreaterThanOrEqual(1);
  });
});

// --- error-recovery ---
describe('error-recovery', () => {
  it('exports recovery strategies', async () => {
    const { listRecoveryStrategies } = await import(
      '../../../src/tools/context/error-recovery.js'
    );
    const strategies = listRecoveryStrategies();
    expect(strategies.length).toBeGreaterThanOrEqual(6);
  });

  it('getRecoveryStrategy returns compile-error strategy', async () => {
    const { getRecoveryStrategy } = await import(
      '../../../src/tools/context/error-recovery.js'
    );
    const strategy = getRecoveryStrategy('compile-error');
    expect(strategy).toBeDefined();
    expect(strategy!.suggestedTools).toContain('compilation-getErrors');
  });

  it('getRecoveryStrategy returns undefined for unknown', async () => {
    const { getRecoveryStrategy } = await import(
      '../../../src/tools/context/error-recovery.js'
    );
    expect(getRecoveryStrategy('unknown-error')).toBeUndefined();
  });
});
