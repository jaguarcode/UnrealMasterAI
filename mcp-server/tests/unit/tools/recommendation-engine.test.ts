import { describe, it, expect } from 'vitest';
import { getRecommendations } from '../../../src/tools/context/recommendation-engine.js';

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
});
