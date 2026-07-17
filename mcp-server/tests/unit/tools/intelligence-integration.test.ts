import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks ──
// Control the workflow-tracker singleton so we can assert start/notifyExplicitOutcome
// without touching persistence.
const { startMock, notifyExplicitOutcomeMock, getProgressMock } = vi.hoisted(() => ({
  startMock: vi.fn(),
  notifyExplicitOutcomeMock: vi.fn(),
  getProgressMock: vi.fn(() => null),
}));
vi.mock('../../../src/tools/context/workflow-tracker.js', () => ({
  getWorkflowTracker: () => ({
    start: startMock,
    notifyExplicitOutcome: notifyExplicitOutcomeMock,
    getProgress: getProgressMock,
  }),
}));

// Control the usage tracker so mining reads a synthetic event journal and
// nothing writes test-data/tool-usage.json.
const { getAllEventsMock, getRecentToolsMock, getToolStatsMock } = vi.hoisted(() => ({
  getAllEventsMock: vi.fn(() => [] as unknown[]),
  getRecentToolsMock: vi.fn(() => [] as string[]),
  getToolStatsMock: vi.fn(() => [] as unknown[]),
}));
vi.mock('../../../src/tools/context/usage-tracker.js', () => ({
  getUsageTracker: () => ({
    getAllEvents: getAllEventsMock,
    getRecentTools: getRecentToolsMock,
    getToolStats: getToolStatsMock,
  }),
}));

// Keep outcome recording out of the filesystem for contextRecordOutcome.
vi.mock('../../../src/tools/context/workflow-store.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/tools/context/workflow-store.js')>();
  return {
    ...actual,
    recordOutcome: vi.fn(),
    getOutcomeStats: vi.fn(() => null),
  };
});

import {
  contextMatchIntent,
  contextRecordOutcome,
} from '../../../src/tools/context/learn-workflow.js';
import { getTools } from '../../../src/tools/context/index.js';
import type { ToolContext, McpToolResult } from '../../../src/tools/tool-module.js';
import type { ToolCallEvent } from '../../../src/tools/context/usage-types.js';

// ── Helpers ──

function parse(result: McpToolResult): Record<string, unknown> {
  return JSON.parse(result.content[0].text);
}

/** Build a chronological journal repeating a zz-* sequence `times` times. */
function frequentSequence(tools: string[], times: number): ToolCallEvent[] {
  const events: ToolCallEvent[] = [];
  let ts = 1_000_000;
  for (let i = 0; i < times; i++) {
    for (const tool of tools) {
      events.push({ tool, success: true, durationMs: 10, timestamp: ts });
      ts += 1000; // within a single session
    }
    ts += 60_000; // still < SESSION_GAP_MS, keep one session
  }
  return events;
}

const stubCtx = {} as ToolContext;

beforeEach(() => {
  startMock.mockClear();
  notifyExplicitOutcomeMock.mockClear();
  getProgressMock.mockReturnValue(null);
  getAllEventsMock.mockReturnValue([]);
  getRecentToolsMock.mockReturnValue([]);
  getToolStatsMock.mockReturnValue([]);
});

// ── contextMatchIntent auto-tracking ──

describe('contextMatchIntent — auto-tracking on high confidence', () => {
  it('starts tracking and reports autoTracking for a high-confidence builtin match', async () => {
    const out = await contextMatchIntent({ query: 'create a blueprint actor' });
    const parsed = parse(out);

    expect((parsed.confidence as number) >= 0.5).toBe(true);
    expect(startMock).toHaveBeenCalledTimes(1);

    const startArg = startMock.mock.calls[0][0] as { id: string; name: string; steps: unknown[] };
    expect(startArg.id).toBe('bp-create-actor-class');
    expect(Array.isArray(startArg.steps)).toBe(true);

    const autoTracking = parsed.autoTracking as Record<string, unknown>;
    expect(autoTracking.workflowId).toBe('bp-create-actor-class');
    expect(String(autoTracking.note)).toContain('context-recordOutcome');
  });

  it('does NOT start tracking for a nonsense (zero/low confidence) query', async () => {
    const out = await contextMatchIntent({ query: 'zxqwv gibberish foobar quux nonsense' });
    const parsed = parse(out);

    expect(parsed.matchCount).toBe(0);
    expect(startMock).not.toHaveBeenCalled();
    expect(parsed.autoTracking).toBeUndefined();
  });

  it('includes workflowCandidates mined from usage on zero matches', async () => {
    getAllEventsMock.mockReturnValue(frequentSequence(['zz-alpha', 'zz-beta', 'zz-gamma'], 4));

    const out = await contextMatchIntent({ query: 'zxqwv gibberish foobar quux nonsense' });
    const parsed = parse(out);

    expect(parsed.matchCount).toBe(0);
    const candidates = parsed.workflowCandidates as Array<Record<string, unknown>>;
    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
    // The mined candidate should surface our synthetic zz-* sequence.
    const top = candidates[0];
    expect(top.sequence).toEqual(['zz-alpha', 'zz-beta', 'zz-gamma']);
    expect(top.occurrences).toBe(4);
    expect(typeof top.suggestedId).toBe('string');
    expect(typeof top.suggestedName).toBe('string');
    expect(String(parsed.candidatesNote)).toContain('context-learnWorkflow');
  });

  it('omits workflowCandidates when there are matches (non-empty)', async () => {
    getAllEventsMock.mockReturnValue(frequentSequence(['zz-alpha', 'zz-beta', 'zz-gamma'], 4));
    const out = await contextMatchIntent({ query: 'create a blueprint actor' });
    const parsed = parse(out);
    expect(parsed.workflowCandidates).toBeUndefined();
  });
});

// ── contextRecordOutcome ──

describe('contextRecordOutcome — explicit outcome precedence', () => {
  it('calls notifyExplicitOutcome before recording (for a known workflow)', async () => {
    const out = await contextRecordOutcome({ workflowId: 'bp-create-actor-class', success: true });
    const parsed = parse(out);

    expect(parsed.status).toBe('success');
    expect(notifyExplicitOutcomeMock).toHaveBeenCalledTimes(1);
    expect(notifyExplicitOutcomeMock).toHaveBeenCalledWith('bp-create-actor-class');
  });
});

// ── New tool handlers via getTools() ──

describe('context tool handlers — suggestWorkflows / getUsageStats', () => {
  function findTool(name: string) {
    const tool = getTools().find((t) => t.name === name);
    if (!tool) throw new Error(`tool not found: ${name}`);
    return tool;
  }

  it('context-suggestWorkflows returns candidates + guidance', async () => {
    getAllEventsMock.mockReturnValue(frequentSequence(['zz-one', 'zz-two', 'zz-three'], 5));
    const tool = findTool('context-suggestWorkflows');
    const out = await tool.handler(stubCtx, {});
    const parsed = parse(out);

    expect(parsed.status).toBe('success');
    expect(parsed.count).toBeGreaterThan(0);
    const candidates = parsed.candidates as Array<Record<string, unknown>>;
    expect(candidates[0].sequence).toEqual(['zz-one', 'zz-two', 'zz-three']);
    expect(String(parsed.guidance)).toContain('context-learnWorkflow');
  });

  it('context-suggestWorkflows respects minSupport (no candidates below threshold)', async () => {
    getAllEventsMock.mockReturnValue(frequentSequence(['zz-one', 'zz-two', 'zz-three'], 2));
    const tool = findTool('context-suggestWorkflows');
    const out = await tool.handler(stubCtx, { minSupport: 3 });
    const parsed = parse(out);
    expect(parsed.count).toBe(0);
  });

  it('context-getUsageStats returns totals, recent tools, stats, and active workflow', async () => {
    getAllEventsMock.mockReturnValue(frequentSequence(['zz-x', 'zz-y', 'zz-z'], 2));
    getRecentToolsMock.mockReturnValue(['zz-x', 'zz-y', 'zz-z']);
    getToolStatsMock.mockReturnValue([{ tool: 'zz-x', calls: 2 }]);
    getProgressMock.mockReturnValue(null);

    const tool = findTool('context-getUsageStats');
    const out = await tool.handler(stubCtx, {});
    const parsed = parse(out);

    expect(parsed.status).toBe('success');
    expect(parsed.totalEvents).toBe(6); // 3 tools × 2 repeats
    expect(parsed.recentTools).toEqual(['zz-x', 'zz-y', 'zz-z']);
    expect(Array.isArray(parsed.toolStats)).toBe(true);
    expect(parsed.activeWorkflow).toBeNull();
  });
});
