import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import the modules under test
import {
  loadLearnedWorkflows,
  saveLearnedWorkflows,
  appendLearnedWorkflow,
  removeLearnedWorkflow,
  recordOutcome,
  loadOutcomes,
  getOutcomeStats,
  getAllOutcomeStats,
} from '../../../src/tools/context/workflow-store.js';
import { matchIntent } from '../../../src/tools/context/intent-matcher.js';
import {
  contextLearnWorkflow,
  contextMatchIntent,
  contextRecordOutcome,
  contextLearnFromDocs,
  contextGetOutcomeStats,
} from '../../../src/tools/context/learn-workflow.js';
import {
  clearLearnedWorkflows,
  getAllWorkflows,
  getBuiltinWorkflowCount,
} from '../../../src/tools/context/workflow-knowledge.js';
import type { Workflow } from '../../../src/tools/context/workflow-knowledge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data');

describe('Workflow Store - Persistence', () => {
  beforeEach(() => {
    clearLearnedWorkflows();
  });

  it('saves and loads learned workflows from disk', () => {
    const testWorkflow: Workflow = {
      id: 'test-persist-1',
      name: 'Test Persistence',
      description: 'Verify persistence works',
      domain: 'test',
      difficulty: 'beginner',
      intentPatterns: ['test persistence'],
      prerequisites: [],
      steps: [{ tool: 'editor-ping', purpose: 'Verify connection' }],
      expectedOutcome: 'Data persists',
      source: 'user-defined',
      tags: ['test'],
    };

    saveLearnedWorkflows([testWorkflow]);
    const loaded = loadLearnedWorkflows();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('test-persist-1');
    expect(loaded[0].name).toBe('Test Persistence');
  });

  it('appends without duplicating by id', () => {
    const wf1: Workflow = {
      id: 'test-append',
      name: 'Version 1',
      description: 'First version',
      domain: 'test',
      difficulty: 'beginner',
      intentPatterns: ['v1'],
      prerequisites: [],
      steps: [{ tool: 'editor-ping', purpose: 'test' }],
      expectedOutcome: 'v1',
      source: 'user-defined',
      tags: ['test'],
    };

    appendLearnedWorkflow(wf1);
    appendLearnedWorkflow({ ...wf1, name: 'Version 2' });

    const loaded = loadLearnedWorkflows();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Version 2');
  });

  it('removes a workflow by id', () => {
    const wf: Workflow = {
      id: 'test-remove',
      name: 'To Remove',
      description: 'Will be removed',
      domain: 'test',
      difficulty: 'beginner',
      intentPatterns: ['remove me'],
      prerequisites: [],
      steps: [{ tool: 'editor-ping', purpose: 'test' }],
      expectedOutcome: 'removed',
      source: 'user-defined',
      tags: ['test'],
    };

    appendLearnedWorkflow(wf);
    expect(removeLearnedWorkflow('test-remove')).toBe(true);
    expect(removeLearnedWorkflow('test-remove')).toBe(false);
    expect(loadLearnedWorkflows()).toHaveLength(0);
  });
});

describe('Outcome Tracking', () => {
  beforeEach(() => {
    // Clear outcomes file for clean tests
    const outcomesFile = join(DATA_DIR, 'workflow-outcomes.json');
    if (existsSync(outcomesFile)) rmSync(outcomesFile);
  });

  it('records and retrieves outcomes', () => {
    recordOutcome({
      workflowId: 'bp-create-actor-class',
      timestamp: Date.now(),
      success: true,
      toolsUsed: ['actor-spawn', 'actor-addComponent'],
      durationMs: 5000,
    });

    const outcomes = loadOutcomes();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].workflowId).toBe('bp-create-actor-class');
    expect(outcomes[0].success).toBe(true);
  });

  it('calculates outcome stats correctly', () => {
    for (let i = 0; i < 8; i++) {
      recordOutcome({
        workflowId: 'mat-create-basic',
        timestamp: Date.now() + i,
        success: i < 6, // 6 successes, 2 failures
        toolsUsed: ['material-create'],
        durationMs: 3000 + i * 100,
      });
    }

    const stats = getOutcomeStats('mat-create-basic');
    expect(stats).not.toBeNull();
    expect(stats!.totalExecutions).toBe(8);
    expect(stats!.successCount).toBe(6);
    expect(stats!.failureCount).toBe(2);
    expect(stats!.successRate).toBe(0.75);
    expect(stats!.avgDurationMs).toBeGreaterThan(0);
  });

  it('returns null for workflows with no outcomes', () => {
    expect(getOutcomeStats('nonexistent-workflow')).toBeNull();
  });

  it('aggregates stats across all workflows', () => {
    recordOutcome({ workflowId: 'wf-a', timestamp: 1, success: true, toolsUsed: [] });
    recordOutcome({ workflowId: 'wf-b', timestamp: 2, success: false, toolsUsed: [] });

    const allStats = getAllOutcomeStats();
    expect(allStats).toHaveLength(2);
  });
});

describe('Intent Matcher - Synonym Expansion', () => {
  it('matches "make a shader" to material workflows via synonym', () => {
    const result = matchIntent('make a shader for my object');
    expect(result.matches.length).toBeGreaterThan(0);
    const domains = result.matches.map((m) => m.workflow.domain);
    expect(domains).toContain('material');
  });

  it('matches "vfx particles" to niagara workflows via synonym', () => {
    const result = matchIntent('create vfx particles for explosion');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].workflow.domain).toBe('niagara');
  });

  it('matches "add a bot enemy" to AI character workflow via synonym', () => {
    const result = matchIntent('add a bot enemy that patrols');
    expect(result.matches.length).toBeGreaterThan(0);
    const hasAI = result.matches.some((m) => m.workflow.id === 'char-setup-ai');
    expect(hasAI).toBe(true);
  });

  it('matches "terrain heightmap" to landscape workflow via synonym', () => {
    const result = matchIntent('create terrain with a heightmap');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].workflow.domain).toBe('level');
  });

  it('returns confidence score between 0 and 1', () => {
    const result = matchIntent('create a material');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    for (const m of result.matches) {
      expect(m.confidence).toBeGreaterThanOrEqual(0);
      expect(m.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe('Tool Handlers', () => {
  beforeEach(() => {
    clearLearnedWorkflows();
    // Clear outcomes too
    const outcomesFile = join(DATA_DIR, 'workflow-outcomes.json');
    if (existsSync(outcomesFile)) rmSync(outcomesFile);
  });

  afterEach(() => {
    // Clean up any persisted learned workflows so other test files aren't affected
    clearLearnedWorkflows();
  });

  it('contextLearnWorkflow persists and reports success', async () => {
    const result = await contextLearnWorkflow({
      id: 'test-handler-wf',
      name: 'Test Handler Workflow',
      description: 'Created via handler test',
      domain: 'test',
      intentPatterns: ['test handler'],
      steps: [{ tool: 'editor-ping', purpose: 'ping' }],
      expectedOutcome: 'Handler works',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.persistent).toBe(true);
    expect(parsed.learnedWorkflows).toBeGreaterThanOrEqual(1);
  });

  it('contextMatchIntent returns confidence-weighted results', async () => {
    const result = await contextMatchIntent({ query: 'create a material' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.status).toBe('success');
    expect(parsed.confidence).toBeDefined();
    expect(parsed.matchCount).toBeGreaterThan(0);
    expect(parsed.allMatches[0].confidence).toBeDefined();
  });

  it('contextRecordOutcome validates workflow exists', async () => {
    const result = await contextRecordOutcome({
      workflowId: 'nonexistent-workflow-id',
      success: true,
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toContain('not found');
  });

  it('contextRecordOutcome records valid outcome', async () => {
    const result = await contextRecordOutcome({
      workflowId: 'mat-create-basic',
      success: true,
      toolsUsed: ['material-create', 'material-setTexture'],
      notes: 'Worked perfectly',
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.cumulativeStats).toBeDefined();
    expect(parsed.cumulativeStats.successRate).toBeGreaterThan(0);
  });

  it('contextLearnFromDocs extracts workflows from structured doc content', async () => {
    const docContent = `# Creating a Decal Material
A decal material projects textures onto surfaces for effects like bullet holes or paint splatter.
1. Create material and set material domain to Deferred Decal
2. Set texture for the decal base color
3. Set parameter for opacity and blend mode
4. Spawn actor with DecalComponent in the level`;

    const result = await contextLearnFromDocs({
      domain: 'material',
      docContent,
      docSource: 'epic-docs',
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.workflows.length).toBeGreaterThan(0);
    expect(parsed.workflows[0].domain).toBe('material');
  });

  it('contextLearnFromDocs returns hint for unparseable content', async () => {
    const result = await contextLearnFromDocs({
      domain: 'test',
      docContent: 'This is just a paragraph with no steps.',
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.hint).toBeDefined();
  });

  it('contextGetOutcomeStats returns tracked data', async () => {
    const result = await contextGetOutcomeStats();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.trackedWorkflows).toBeDefined();
  });
});

describe('Integration - Outcome-Weighted Matching', () => {
  beforeEach(() => {
    // Clear outcomes for clean integration test
    const outcomesFile = join(DATA_DIR, 'workflow-outcomes.json');
    if (existsSync(outcomesFile)) rmSync(outcomesFile);
    clearLearnedWorkflows();
  });

  afterEach(() => {
    clearLearnedWorkflows();
    const outcomesFile = join(DATA_DIR, 'workflow-outcomes.json');
    if (existsSync(outcomesFile)) rmSync(outcomesFile);
  });

  it('successful workflow outcomes boost future match scores', () => {
    // Get baseline score for material creation
    const before = matchIntent('create a material');
    const baselineScore = before.matches.find((m) => m.workflow.id === 'mat-create-basic')?.score ?? 0;

    // Record multiple successes
    for (let i = 0; i < 10; i++) {
      recordOutcome({
        workflowId: 'mat-create-basic',
        timestamp: Date.now() + i,
        success: true,
        toolsUsed: ['material-create', 'material-setTexture'],
      });
    }

    // Re-match — score should be higher
    const after = matchIntent('create a material');
    const boostedScore = after.matches.find((m) => m.workflow.id === 'mat-create-basic')?.score ?? 0;

    expect(boostedScore).toBeGreaterThan(baselineScore);
  });

  it('learned workflows are included in intent matching', async () => {
    await contextLearnWorkflow({
      id: 'custom-decal-wf',
      name: 'Create Decal Material',
      description: 'Create a decal material for surface projection',
      domain: 'material',
      intentPatterns: ['create decal', 'decal material', 'surface projection'],
      steps: [
        { tool: 'material-create', purpose: 'Create new material' },
        { tool: 'material-setParameter', purpose: 'Set domain to Deferred Decal' },
      ],
      expectedOutcome: 'A decal material ready for projection',
      tags: ['material', 'decal'],
    });

    const result = matchIntent('create a decal material');
    const hasCustom = result.matches.some((m) => m.workflow.id === 'custom-decal-wf');
    expect(hasCustom).toBe(true);
  });

  it('builtin workflow count remains stable after learning', () => {
    const builtinCount = getBuiltinWorkflowCount();
    const totalBefore = getAllWorkflows().length;

    // Add a learned workflow
    contextLearnWorkflow({
      id: 'temp-wf',
      name: 'Temp',
      description: 'Temporary',
      domain: 'test',
      intentPatterns: ['temp'],
      steps: [{ tool: 'editor-ping', purpose: 'test' }],
      expectedOutcome: 'test',
    });

    // Builtin count should not change
    expect(getBuiltinWorkflowCount()).toBe(builtinCount);
    // Total should increase by 1
    expect(getAllWorkflows().length).toBe(totalBefore + 1);
  });
});
