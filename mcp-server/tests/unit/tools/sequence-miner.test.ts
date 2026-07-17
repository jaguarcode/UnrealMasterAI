import { describe, it, expect } from 'vitest';
import { mineWorkflowCandidates } from '../../../src/tools/context/sequence-miner.js';
import type { ToolCallEvent } from '../../../src/tools/context/usage-types.js';
import { SESSION_GAP_MS } from '../../../src/tools/context/usage-types.js';
import { getAllWorkflows } from '../../../src/tools/context/workflow-knowledge.js';

const BASE_TS = 1_700_000_000_000;
const STEP_MS = 1_000;

/** Builds a contiguous run of events for `tools`, starting at `startTime`, one per STEP_MS. */
function buildRun(tools: string[], startTime: number, success = true): ToolCallEvent[] {
  return tools.map((tool, i) => ({
    tool,
    success,
    durationMs: 50,
    timestamp: startTime + i * STEP_MS,
  }));
}

describe('sequence-miner', () => {
  describe('empty input', () => {
    it('returns [] for empty events array', () => {
      expect(mineWorkflowCandidates([])).toEqual([]);
    });
  });

  describe('support threshold', () => {
    it('excludes a sequence occurring only 2 times when minSupport is 3', () => {
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 10 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      expect(results.find((c) => c.sequence.join('>') === 'zz-a>zz-b>zz-c')).toBeUndefined();
    });

    it('includes a sequence occurring 3 times when minSupport is 3', () => {
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 10 * STEP_MS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 20 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      const found = results.find((c) => c.sequence.join('>') === 'zz-a>zz-b>zz-c');
      expect(found).toBeDefined();
      expect(found!.occurrences).toBe(3);
    });
  });

  describe('session gap splitting', () => {
    it('does not count an n-gram that spans a session boundary', () => {
      // Three repeats of zz-a, zz-b, zz-c but the third occurrence is split across
      // a session gap (>= SESSION_GAP_MS between zz-b and zz-c), so it should not
      // contribute a 3rd full "zz-a>zz-b>zz-c" occurrence.
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 10 * STEP_MS),
        { tool: 'zz-a', success: true, durationMs: 50, timestamp: BASE_TS + 20 * STEP_MS },
        { tool: 'zz-b', success: true, durationMs: 50, timestamp: BASE_TS + 20 * STEP_MS + STEP_MS },
        // Gap >= SESSION_GAP_MS before zz-c starts a new session
        {
          tool: 'zz-c',
          success: true,
          durationMs: 50,
          timestamp: BASE_TS + 20 * STEP_MS + STEP_MS + SESSION_GAP_MS,
        },
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      const found = results.find((c) => c.sequence.join('>') === 'zz-a>zz-b>zz-c');
      expect(found).toBeUndefined();
    });
  });

  describe('meta-tool exclusion', () => {
    it('ignores context-* and editor-ping tools when building sequences', () => {
      const events: ToolCallEvent[] = [];
      for (let i = 0; i < 3; i++) {
        const start = BASE_TS + i * 10 * STEP_MS;
        events.push(
          { tool: 'zz-a', success: true, durationMs: 10, timestamp: start },
          { tool: 'context-matchIntent', success: true, durationMs: 10, timestamp: start + STEP_MS },
          { tool: 'zz-b', success: true, durationMs: 10, timestamp: start + 2 * STEP_MS },
          { tool: 'editor-ping', success: true, durationMs: 10, timestamp: start + 3 * STEP_MS },
          { tool: 'zz-c', success: true, durationMs: 10, timestamp: start + 4 * STEP_MS },
        );
      }
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      const found = results.find((c) => c.sequence.join('>') === 'zz-a>zz-b>zz-c');
      expect(found).toBeDefined();
      expect(found!.occurrences).toBe(3);
    });
  });

  describe('consecutive-duplicate compression', () => {
    it('collapses a run of identical consecutive calls into a single step', () => {
      const events: ToolCallEvent[] = [];
      for (let i = 0; i < 3; i++) {
        const start = BASE_TS + i * 20 * STEP_MS;
        events.push(
          { tool: 'zz-a', success: true, durationMs: 10, timestamp: start },
          { tool: 'zz-b', success: false, durationMs: 10, timestamp: start + STEP_MS },
          { tool: 'zz-b', success: false, durationMs: 10, timestamp: start + 2 * STEP_MS },
          { tool: 'zz-b', success: true, durationMs: 10, timestamp: start + 3 * STEP_MS },
          { tool: 'zz-c', success: true, durationMs: 10, timestamp: start + 4 * STEP_MS },
        );
      }
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      const found = results.find((c) => c.sequence.join('>') === 'zz-a>zz-b>zz-c');
      expect(found).toBeDefined();
      expect(found!.occurrences).toBe(3);
      // successRate should be 1.0: compressed zz-b run succeeded overall (at least one success)
      expect(found!.successRate).toBe(1);
    });
  });

  describe('closed-pattern filter', () => {
    it('drops a shorter sub-sequence when it has the SAME support as a longer superset', () => {
      // zz-a, zz-b, zz-c, zz-d repeated 3 times: every sub n-gram has support 3.
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-b', 'zz-c', 'zz-d'], BASE_TS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c', 'zz-d'], BASE_TS + 20 * STEP_MS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c', 'zz-d'], BASE_TS + 40 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 4, minSupport: 3 });
      const seqs = results.map((c) => c.sequence.join('>'));
      // The 4-length candidate should survive
      expect(seqs).toContain('zz-a>zz-b>zz-c>zz-d');
      // The 3-length sub-sequences (same support of 3) should be dropped
      expect(seqs).not.toContain('zz-a>zz-b>zz-c');
      expect(seqs).not.toContain('zz-b>zz-c>zz-d');
    });

    it('keeps a shorter sub-sequence when its support differs from the longer superset', () => {
      // zz-a, zz-b, zz-c appears 3 times as a 3-gram (with an extra zz-b, zz-c pair once more)
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 10 * STEP_MS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 20 * STEP_MS),
        // Extra standalone zz-b, zz-c occurrence (without leading zz-a) bumping its support to 4
        ...buildRun(['zz-b', 'zz-c'], BASE_TS + 30 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 2, maxLength: 3, minSupport: 3 });
      const seqs = results.map((c) => c.sequence.join('>'));
      expect(seqs).toContain('zz-a>zz-b>zz-c');
      // zz-b>zz-c has support 4 (differs from zz-a>zz-b>zz-c's support of 3), so it survives
      expect(seqs).toContain('zz-b>zz-c');
    });
  });

  describe('known-workflow filter', () => {
    it('drops a sequence copied from a builtin workflow required-step tool list', () => {
      const workflows = getAllWorkflows();
      const target = workflows.find((w) => w.id === 'asset-import-texture-pipeline');
      expect(target).toBeDefined();
      const requiredTools = target!.steps.filter((s) => s.optional !== true).map((s) => s.tool);
      expect(requiredTools).toEqual(['texture-import', 'texture-setCompression', 'texture-getInfo']);

      const events: ToolCallEvent[] = [
        ...buildRun(requiredTools, BASE_TS),
        ...buildRun(requiredTools, BASE_TS + 10 * STEP_MS),
        ...buildRun(requiredTools, BASE_TS + 20 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      const seqs = results.map((c) => c.sequence.join('>'));
      expect(seqs).not.toContain(requiredTools.join('>'));
    });
  });

  describe('successRate computation and ordering', () => {
    it('computes successRate as the fraction of occurrences with all-succeeding calls', () => {
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS, true),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 10 * STEP_MS, true),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 20 * STEP_MS, false),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 30 * STEP_MS, true),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      const found = results.find((c) => c.sequence.join('>') === 'zz-a>zz-b>zz-c');
      expect(found).toBeDefined();
      expect(found!.occurrences).toBe(4);
      // 3 of 4 occurrences fully succeeded -> 0.75
      expect(found!.successRate).toBe(0.75);
    });

    it('sorts by occurrences desc, then successRate desc, then lastSeen desc', () => {
      const events: ToolCallEvent[] = [
        // zz-a>zz-b>zz-c: 4 occurrences, all success
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS, true),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 10 * STEP_MS, true),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 20 * STEP_MS, true),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 30 * STEP_MS, true),
        // zz-d>zz-e>zz-f: 3 occurrences, all success (fewer occurrences -> should rank lower)
        ...buildRun(['zz-d', 'zz-e', 'zz-f'], BASE_TS + 100 * STEP_MS, true),
        ...buildRun(['zz-d', 'zz-e', 'zz-f'], BASE_TS + 110 * STEP_MS, true),
        ...buildRun(['zz-d', 'zz-e', 'zz-f'], BASE_TS + 120 * STEP_MS, true),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].sequence.join('>')).toBe('zz-a>zz-b>zz-c');
      expect(results[0].occurrences).toBe(4);
      const second = results.find((c) => c.sequence.join('>') === 'zz-d>zz-e>zz-f');
      expect(second).toBeDefined();
      expect(second!.occurrences).toBe(3);
    });
  });

  describe('suggestedDomain / suggestedId / suggestedName shapes', () => {
    it('produces expected shapes and a deterministic id for the same sequence', () => {
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-a', 'zz-b'], BASE_TS),
        ...buildRun(['zz-a', 'zz-a', 'zz-b'], BASE_TS + 10 * STEP_MS),
        ...buildRun(['zz-a', 'zz-a', 'zz-b'], BASE_TS + 20 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 2, maxLength: 2, minSupport: 3 });
      // Consecutive zz-a duplicates are compressed, so the surviving 2-gram is zz-a>zz-b
      const found = results.find((c) => c.sequence.join('>') === 'zz-a>zz-b');
      expect(found).toBeDefined();
      expect(found!.suggestedDomain).toBe('zz');
      expect(found!.suggestedId).toMatch(/^mined-zz-[0-9a-f]{8}$/);
      expect(found!.suggestedName).toBe('zz-a → zz-b');

      // Deterministic id: mining the same sequence again yields the same suggestedId
      const results2 = mineWorkflowCandidates(events, { minLength: 2, maxLength: 2, minSupport: 3 });
      const found2 = results2.find((c) => c.sequence.join('>') === 'zz-a>zz-b');
      expect(found2!.suggestedId).toBe(found!.suggestedId);
    });

    it('picks the most common prefix as suggestedDomain, ties broken by first-seen', () => {
      // Sequence: alpha-x, beta-y, alpha-z -> alpha appears twice, beta once -> domain "alpha"
      const events: ToolCallEvent[] = [
        ...buildRun(['alpha-x', 'beta-y', 'alpha-z'], BASE_TS),
        ...buildRun(['alpha-x', 'beta-y', 'alpha-z'], BASE_TS + 10 * STEP_MS),
        ...buildRun(['alpha-x', 'beta-y', 'alpha-z'], BASE_TS + 20 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      const found = results.find((c) => c.sequence.join('>') === 'alpha-x>beta-y>alpha-z');
      expect(found).toBeDefined();
      expect(found!.suggestedDomain).toBe('alpha');
    });
  });

  describe('lastSeen', () => {
    it('reports the timestamp of the last event of the most recent occurrence', () => {
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 10 * STEP_MS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 20 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, { minLength: 3, maxLength: 3, minSupport: 3 });
      const found = results.find((c) => c.sequence.join('>') === 'zz-a>zz-b>zz-c');
      expect(found).toBeDefined();
      expect(found!.lastSeen).toBe(BASE_TS + 20 * STEP_MS + 2 * STEP_MS);
    });
  });

  describe('maxResults', () => {
    it('caps the number of returned candidates', () => {
      const events: ToolCallEvent[] = [
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 10 * STEP_MS),
        ...buildRun(['zz-a', 'zz-b', 'zz-c'], BASE_TS + 20 * STEP_MS),
        ...buildRun(['zz-d', 'zz-e', 'zz-f'], BASE_TS + 100 * STEP_MS),
        ...buildRun(['zz-d', 'zz-e', 'zz-f'], BASE_TS + 110 * STEP_MS),
        ...buildRun(['zz-d', 'zz-e', 'zz-f'], BASE_TS + 120 * STEP_MS),
      ];
      const results = mineWorkflowCandidates(events, {
        minLength: 3,
        maxLength: 3,
        minSupport: 3,
        maxResults: 1,
      });
      expect(results.length).toBe(1);
    });
  });
});
