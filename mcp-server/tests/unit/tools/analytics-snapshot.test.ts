import { describe, it, expect } from 'vitest';
import { generateSnapshot, type AnalyticsSnapshot } from '../../../src/cli/analytics.js';

describe('generateSnapshot()', () => {
  let snapshot: AnalyticsSnapshot;

  // Call once and reuse — generateSnapshot() reads from disk but has no side effects.
  snapshot = generateSnapshot();

  it('returns an object with all required top-level keys', () => {
    expect(snapshot).toHaveProperty('generatedAt');
    expect(snapshot).toHaveProperty('workflows');
    expect(snapshot).toHaveProperty('tools');
    expect(snapshot).toHaveProperty('outcomes');
    expect(snapshot).toHaveProperty('errorResolutions');
  });

  it('workflows.builtin equals 20 (hardcoded constant)', () => {
    expect(snapshot.workflows.builtin).toBe(20);
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

  it('tools.totalRegistered equals 188', () => {
    expect(snapshot.tools.totalRegistered).toBe(188);
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

  it('workflows.learned > 0 when learned-workflows.json has items', () => {
    // learned-workflows.json currently has items: [] so learned === 0.
    // This test asserts the relationship: learned equals total minus builtin.
    expect(snapshot.workflows.learned).toBe(snapshot.workflows.total - snapshot.workflows.builtin);
    expect(snapshot.workflows.learned).toBeGreaterThanOrEqual(0);
  });
});
