/**
 * Unit tests for the hybrid TF-IDF intent matching upgrade and time-decayed outcome stats.
 * Covers: getWeightedOutcomeStats (workflow-store.ts) and the semantic ranking blend
 * plus invalidateIntentIndex (intent-matcher.ts).
 *
 * ISOLATION NOTE: workflow-store.ts resolves its on-disk data directory from
 * UMA_DATA_DIR once at module load. context-workflow.test.ts and other suites
 * share the default `./test-data` directory and perform non-atomic
 * read-modify-write / full-file-wipe operations against it in their own
 * beforeEach/afterEach hooks. Since vitest runs test files concurrently in
 * separate workers (each with its own fresh module registry, but all sharing
 * the same physical disk), writing to that same shared directory from here
 * would race with those hooks. To keep this file's disk footprint fully
 * self-contained (per the task's "runs stay isolated" requirement) we point
 * UMA_DATA_DIR at a dedicated subdirectory before dynamically importing
 * workflow-store.ts / intent-matcher.ts / workflow-knowledge.ts, so this
 * file's recordOutcome()/addLearnedWorkflow() calls never touch the files
 * other suites use.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ISOLATED_DATA_DIR = join(__dirname, '..', '..', '..', 'test-data-intent-hybrid');

// Set before any dynamic import of the modules under test so their
// module-level DATA_DIR constant resolves to our isolated directory.
process.env.UMA_DATA_DIR = ISOLATED_DATA_DIR;

let workflowStore: typeof import('../../../src/tools/context/workflow-store.js');
let intentMatcher: typeof import('../../../src/tools/context/intent-matcher.js');
let workflowKnowledge: typeof import('../../../src/tools/context/workflow-knowledge.js');
type Workflow = import('../../../src/tools/context/workflow-knowledge.js').Workflow;

beforeAll(async () => {
  if (existsSync(ISOLATED_DATA_DIR)) rmSync(ISOLATED_DATA_DIR, { recursive: true, force: true });
  mkdirSync(ISOLATED_DATA_DIR, { recursive: true });

  workflowStore = await import('../../../src/tools/context/workflow-store.js');
  intentMatcher = await import('../../../src/tools/context/intent-matcher.js');
  workflowKnowledge = await import('../../../src/tools/context/workflow-knowledge.js');
});

afterAll(() => {
  if (existsSync(ISOLATED_DATA_DIR)) rmSync(ISOLATED_DATA_DIR, { recursive: true, force: true });
});

const DAY_MS = 86_400_000;

describe('getWeightedOutcomeStats — time decay', () => {
  it('returns null when there are no outcomes', () => {
    expect(workflowStore.getWeightedOutcomeStats('nonexistent-decay-workflow-hybrid-test')).toBeNull();
  });

  it('weights recent successes near 1 when mixed with year-old failures (halfLife 90d)', () => {
    const workflowId = 'decay-test-wf-hybrid';
    const now = Date.now();

    // 5 old failures, ~365 days ago — decay weight after 365 days at halfLife 90:
    // 0.5^(365/90) ≈ 0.043, so they contribute very little to the weighted average.
    for (let i = 0; i < 5; i++) {
      workflowStore.recordOutcome({
        workflowId,
        timestamp: now - 365 * DAY_MS - i * 1000,
        success: false,
        toolsUsed: [],
      });
    }

    // 5 recent successes, today.
    for (let i = 0; i < 5; i++) {
      workflowStore.recordOutcome({
        workflowId,
        timestamp: now - i * 1000,
        success: true,
        toolsUsed: [],
      });
    }

    const base = workflowStore.getOutcomeStats(workflowId);
    expect(base).not.toBeNull();
    expect(base!.totalExecutions).toBe(10);
    // Unweighted success rate should be exactly 0.5 (5 of 10)
    expect(base!.successRate).toBe(0.5);

    const weighted = workflowStore.getWeightedOutcomeStats(workflowId, 90);
    expect(weighted).not.toBeNull();
    expect(weighted!.totalExecutions).toBe(10);
    // Recent successes should dominate — weighted rate should be near 1, well above the raw 0.5
    expect(weighted!.weightedSuccessRate).toBeGreaterThan(0.9);
    // effectiveExecutions (sum of decay weights) should be less than raw totalExecutions
    // since the 5 old outcomes contribute far less than weight=1 each.
    expect(weighted!.effectiveExecutions).toBeLessThan(base!.totalExecutions);
    expect(weighted!.effectiveExecutions).toBeGreaterThan(0);
  });

  it('effectiveExecutions equals totalExecutions when all outcomes are fresh (age ~0)', () => {
    const workflowId = 'decay-fresh-wf-hybrid';
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      workflowStore.recordOutcome({ workflowId, timestamp: now, success: true, toolsUsed: [] });
    }
    const weighted = workflowStore.getWeightedOutcomeStats(workflowId, 90);
    expect(weighted).not.toBeNull();
    // All outcomes at age ~0 => weight ~1 each => effectiveExecutions ~= totalExecutions
    expect(weighted!.effectiveExecutions).toBeCloseTo(4, 1);
    expect(weighted!.weightedSuccessRate).toBe(1);
  });
});

describe('Hybrid TF-IDF ranking — matchIntent improvements', () => {
  it('ranks the intended landscape workflow top for a loosely-phrased query', () => {
    const result = intentMatcher.matchIntent('set up terrain with painted layers');
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].workflow.id).toBe('level-landscape-outdoor');
  });

  it('still returns strong confidence for an exact intentPattern query (no regression)', () => {
    const result = intentMatcher.matchIntent('create a material');
    expect(result.matches.length).toBeGreaterThan(0);
    // Matches the existing threshold used across context.test.ts / context-workflow.test.ts:
    // exact-pattern queries should retain high confidence after the additive semantic blend.
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.topRecommendation!.domain).toBe('material');
  });

  it('exposes an optional semanticScore on matches', () => {
    const result = intentMatcher.matchIntent('create a basic material with textures');
    expect(result.matches.length).toBeGreaterThan(0);
    for (const m of result.matches) {
      if (m.semanticScore !== undefined) {
        expect(m.semanticScore).toBeGreaterThanOrEqual(0);
        expect(m.semanticScore).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('invalidateIntentIndex — index rebuild picks up learned workflows', () => {
  const LEARNED_ID = 'learned-holographic-projector-wf';

  it('finds a newly learned workflow with distinctive vocabulary after invalidation', () => {
    const distinctiveWorkflow: Workflow = {
      id: LEARNED_ID,
      name: 'Configure Holographic Projector Rig',
      description:
        'Set up a holographic projector rig with volumetric fog interaction and prismatic refraction shaders for sci-fi environments.',
      domain: 'vfx',
      difficulty: 'advanced',
      intentPatterns: [
        'configure holographic projector rig',
        'set up prismatic refraction shader',
        'holographic projector volumetric fog',
      ],
      prerequisites: [],
      steps: [
        { tool: 'niagara-createSystem', purpose: 'Create holographic projector base system' },
        { tool: 'material-create', purpose: 'Create prismatic refraction shader' },
      ],
      expectedOutcome: 'A working holographic projector rig with refraction effects',
      source: 'user-defined',
      tags: ['holographic', 'projector', 'prismatic', 'refraction'],
    };

    // Baseline: without the learned workflow, matchIntent must not find it.
    const before = intentMatcher.matchIntent('configure a holographic projector rig with prismatic refraction');
    expect(before.matches.some((m) => m.workflow.id === LEARNED_ID)).toBe(false);

    // addLearnedWorkflow persists via workflow-store.appendLearnedWorkflow (into our
    // isolated data dir) AND updates the in-memory workflow-knowledge cache so
    // getAllWorkflows() picks it up immediately.
    workflowKnowledge.addLearnedWorkflow(distinctiveWorkflow);
    expect(workflowKnowledge.getAllWorkflows().some((w) => w.id === LEARNED_ID)).toBe(true);

    // Force the semantic index to rebuild so it observes the newly learned workflow.
    intentMatcher.invalidateIntentIndex();

    const result = intentMatcher.matchIntent('configure a holographic projector rig with prismatic refraction');
    const found = result.matches.some((m) => m.workflow.id === LEARNED_ID);
    expect(found).toBe(true);
    expect(result.matches[0].workflow.id).toBe(LEARNED_ID);

    // Clean up: remove the learned workflow from our isolated store and invalidate again.
    workflowKnowledge.removeWorkflow(LEARNED_ID);
    intentMatcher.invalidateIntentIndex();
  });
});
