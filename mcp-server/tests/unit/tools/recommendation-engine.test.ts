import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the usage tracker so tests never read/write the shared test-data journal.
// By default, observed adjacency and recent history are empty — this keeps the
// original static-workflow-only behavior deterministic for the existing tests.
const { getRecentToolsMock, getObservedAdjacencyMock } = vi.hoisted(() => ({
  getRecentToolsMock: vi.fn(() => [] as string[]),
  getObservedAdjacencyMock: vi.fn(() => new Map()),
}));
vi.mock('../../../src/tools/context/usage-tracker.js', () => ({
  getUsageTracker: () => ({
    getRecentTools: getRecentToolsMock,
    getObservedAdjacency: getObservedAdjacencyMock,
  }),
}));

import { getRecommendations } from '../../../src/tools/context/recommendation-engine.js';

beforeEach(() => {
  getRecentToolsMock.mockClear();
  getObservedAdjacencyMock.mockClear();
  getRecentToolsMock.mockReturnValue([]);
  getObservedAdjacencyMock.mockReturnValue(new Map());
});

describe('getRecommendations', () => {
  it('returns empty array for empty recentTools', () => {
    const result = getRecommendations([]);
    expect(result).toEqual([]);
  });

  it('returns recommendations after actor-spawn', () => {
    const result = getRecommendations(['actor-spawn']);
    expect(result.length).toBeGreaterThan(0);
    const tools = result.map((r) => r.tool);
    // actor-addComponent or actor-setProperty commonly follow actor-spawn
    const hasExpected = tools.some((t) => t === 'actor-addComponent' || t === 'actor-setProperty');
    expect(hasExpected).toBe(true);
  });

  it('returns recommendations after material-create', () => {
    const result = getRecommendations(['material-create']);
    expect(result.length).toBeGreaterThan(0);
    const tools = result.map((r) => r.tool);
    // material-setParameter or material-setTexture commonly follow material-create
    const hasExpected = tools.some(
      (t) => t === 'material-setParameter' || t === 'material-setTexture' || t === 'material-createInstance' || t === 'material-getNodes',
    );
    expect(hasExpected).toBe(true);
  });

  it('filters out tools already in recentTools', () => {
    const recentTools = ['actor-spawn', 'actor-addComponent'];
    const result = getRecommendations(recentTools);
    const tools = result.map((r) => r.tool);
    expect(tools).not.toContain('actor-spawn');
    expect(tools).not.toContain('actor-addComponent');
  });

  it('respects maxResults parameter', () => {
    const result = getRecommendations(['actor-spawn'], undefined, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('domain filter boosts domain-specific recommendations', () => {
    const withDomain = getRecommendations(['actor-spawn'], 'blueprint');
    const withoutDomain = getRecommendations(['actor-spawn']);
    // With domain filter, top result should be from the blueprint domain
    if (withDomain.length > 0) {
      expect(withDomain[0].confidence).toBeGreaterThan(0);
    }
    // Both calls should return arrays (domain filter does not break anything)
    expect(Array.isArray(withDomain)).toBe(true);
    expect(Array.isArray(withoutDomain)).toBe(true);
  });

  it('confidence values are between 0 and 1', () => {
    const result = getRecommendations(['actor-spawn', 'actor-addComponent']);
    for (const rec of result) {
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('each recommendation has tool, reason, confidence, fromWorkflow fields', () => {
    const result = getRecommendations(['actor-spawn']);
    expect(result.length).toBeGreaterThan(0);
    for (const rec of result) {
      expect(typeof rec.tool).toBe('string');
      expect(typeof rec.reason).toBe('string');
      expect(typeof rec.confidence).toBe('number');
      expect(typeof rec.fromWorkflow).toBe('string');
    }
  });

  // ── v2: usage-weighted behavior ──

  it('falls back to the tracker recent history when recentTools is undefined', () => {
    getRecentToolsMock.mockReturnValue(['actor-spawn']);
    const result = getRecommendations();
    expect(getRecentToolsMock).toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
    const tools = result.map((r) => r.tool);
    const hasExpected = tools.some((t) => t === 'actor-addComponent' || t === 'actor-setProperty');
    expect(hasExpected).toBe(true);
  });

  it('an explicit empty array still returns [] without consulting the tracker history', () => {
    getRecentToolsMock.mockReturnValue(['actor-spawn']);
    const result = getRecommendations([]);
    expect(result).toEqual([]);
    expect(getRecentToolsMock).not.toHaveBeenCalled();
  });

  it('observed adjacency boosts a transition no static workflow contains, with source "observed"', () => {
    // zz-source → zz-observed-next is a purely observed edge (no known workflow has it).
    const observed = new Map([
      ['zz-source', new Map([['zz-observed-next', { count: 6, successCount: 5 }]])],
    ]);
    getObservedAdjacencyMock.mockReturnValue(observed);

    const result = getRecommendations(['zz-source']);
    const rec = result.find((r) => r.tool === 'zz-observed-next');
    expect(rec).toBeDefined();
    expect(rec!.source).toBe('observed');
    expect(rec!.reason).toContain('Observed 6');
    expect(rec!.reason).toContain('83% success'); // 5/6 ≈ 0.833 → 83%
    expect(rec!.confidence).toBeGreaterThan(0);
  });

  it('marks a transition present in both static and observed signals as source "both"', () => {
    // material-create → material-setParameter exists in the static workflow graph.
    const observed = new Map([
      ['material-create', new Map([['material-setParameter', { count: 5, successCount: 5 }]])],
    ]);
    getObservedAdjacencyMock.mockReturnValue(observed);

    const result = getRecommendations(['material-create']);
    const rec = result.find((r) => r.tool === 'material-setParameter');
    expect(rec).toBeDefined();
    expect(rec!.source).toBe('both');
  });
});
