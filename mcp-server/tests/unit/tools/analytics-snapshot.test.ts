import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { generateSnapshot, type AnalyticsSnapshot } from '../../../src/cli/analytics.js';
import { getAllBuiltinTools } from '../../../src/tools/auto-register.js';
import { getBuiltinWorkflowCount } from '../../../src/tools/context/workflow-knowledge.js';

// vitest.config.ts forces UMA_DATA_DIR='./test-data' for the whole run, so
// analytics.ts resolves BOTH its DATA_DIR (workflows/outcomes/error-resolutions)
// and USAGE_DATA_DIR (tool-usage.json) to that same directory. test-data/ is
// gitignored and shared across suites — we only ever touch tool-usage.json here
// (no other suite writes that file) and always remove it afterwards so we never
// pollute workflow-outcomes.json / learned-workflows.json / error-resolutions.json
// used elsewhere.
const USAGE_FIXTURE_PATH = join(process.cwd(), 'test-data', 'tool-usage.json');

describe('generateSnapshot()', () => {
  let snapshot: AnalyticsSnapshot;

  beforeAll(() => {
    snapshot = generateSnapshot();
  });

  it('returns an object with all required top-level keys', () => {
    expect(snapshot).toHaveProperty('generatedAt');
    expect(snapshot).toHaveProperty('workflows');
    expect(snapshot).toHaveProperty('tools');
    expect(snapshot).toHaveProperty('outcomes');
    expect(snapshot).toHaveProperty('errorResolutions');
    expect(snapshot).toHaveProperty('usage');
  });

  it('workflows.builtin matches getBuiltinWorkflowCount() (derived, not hardcoded)', () => {
    expect(snapshot.workflows.builtin).toBe(getBuiltinWorkflowCount());
  });

  it('workflows.total >= workflows.builtin', () => {
    expect(snapshot.workflows.total).toBeGreaterThanOrEqual(snapshot.workflows.builtin);
  });

  it('workflows.byDomain is an object (Record<string, number>)', () => {
    expect(typeof snapshot.workflows.byDomain).toBe('object');
    expect(snapshot.workflows.byDomain).not.toBeNull();
    expect(Array.isArray(snapshot.workflows.byDomain)).toBe(false);
    for (const [key, val] of Object.entries(snapshot.workflows.byDomain)) {
      expect(typeof key).toBe('string');
      expect(typeof val).toBe('number');
    }
  });

  it('tools.totalRegistered matches getAllBuiltinTools().length (derived, not hardcoded)', () => {
    expect(snapshot.tools.totalRegistered).toBe(getAllBuiltinTools().length);
  });

  it('tools.topToolsByFrequency is an array', () => {
    expect(Array.isArray(snapshot.tools.topToolsByFrequency)).toBe(true);
  });

  it('outcomes.successRate is between 0 and 1 inclusive', () => {
    expect(snapshot.outcomes.successRate).toBeGreaterThanOrEqual(0);
    expect(snapshot.outcomes.successRate).toBeLessThanOrEqual(1);
  });

  it('errorResolutions.total is a number >= 0', () => {
    expect(typeof snapshot.errorResolutions.total).toBe('number');
    expect(snapshot.errorResolutions.total).toBeGreaterThanOrEqual(0);
  });

  it('errorResolutions.totalReuses is a number >= 0', () => {
    expect(typeof snapshot.errorResolutions.totalReuses).toBe('number');
    expect(snapshot.errorResolutions.totalReuses).toBeGreaterThanOrEqual(0);
  });

  it('generatedAt is a valid ISO date string', () => {
    expect(typeof snapshot.generatedAt).toBe('string');
    const parsed = new Date(snapshot.generatedAt);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(snapshot.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('workflows.topDomains is an array sorted by count descending', () => {
    const { topDomains } = snapshot.workflows;
    expect(Array.isArray(topDomains)).toBe(true);
    for (let i = 1; i < topDomains.length; i++) {
      expect(topDomains[i - 1].count).toBeGreaterThanOrEqual(topDomains[i].count);
    }
  });

  it('workflows.learned equals total minus builtin', () => {
    expect(snapshot.workflows.learned).toBe(snapshot.workflows.total - snapshot.workflows.builtin);
    expect(snapshot.workflows.learned).toBeGreaterThanOrEqual(0);
  });

  it('usage is null when tool-usage.json does not exist', () => {
    // No fixture written for this describe block — test-data/tool-usage.json
    // is not created by any other suite.
    expect(existsSync(USAGE_FIXTURE_PATH)).toBe(false);
    expect(snapshot.usage).toBeNull();
  });
});

describe('generateSnapshot() usage section with fixture data', () => {
  let snapshot: AnalyticsSnapshot;

  beforeAll(() => {
    mkdirSync(join(process.cwd(), 'test-data'), { recursive: true });
    const now = Date.now();
    writeFileSync(
      USAGE_FIXTURE_PATH,
      JSON.stringify({
        version: 1,
        updatedAt: now,
        items: [
          { tool: 'actor-spawn', success: true, durationMs: 12, timestamp: now - 3000 },
          { tool: 'actor-spawn', success: true, durationMs: 15, timestamp: now - 2000 },
          { tool: 'actor-spawn', success: false, durationMs: 20, timestamp: now - 1000 },
          { tool: 'blueprint-createNode', success: true, durationMs: 8, timestamp: now - 500 },
        ],
      }, null, 2),
      'utf-8',
    );
    snapshot = generateSnapshot();
  });

  afterAll(() => {
    rmSync(USAGE_FIXTURE_PATH, { force: true });
  });

  it('usage is not null when tool-usage.json exists with items', () => {
    expect(snapshot.usage).not.toBeNull();
  });

  it('usage.totalCalls matches the number of fixture items', () => {
    expect(snapshot.usage?.totalCalls).toBe(4);
  });

  it('usage.overallSuccessRate is 0.75 (3 of 4 succeeded)', () => {
    expect(snapshot.usage?.overallSuccessRate).toBe(0.75);
  });

  it('usage.topByCalls ranks actor-spawn first with calls=3 and successRate=0.67', () => {
    const top = snapshot.usage?.topByCalls ?? [];
    expect(top.length).toBe(2);
    expect(top[0].tool).toBe('actor-spawn');
    expect(top[0].calls).toBe(3);
    expect(top[0].successRate).toBeCloseTo(0.67, 2);
    expect(top[1].tool).toBe('blueprint-createNode');
    expect(top[1].calls).toBe(1);
    expect(top[1].successRate).toBe(1);
  });

  it('usage.topByCalls is capped at 10 entries', () => {
    expect((snapshot.usage?.topByCalls ?? []).length).toBeLessThanOrEqual(10);
  });
});
