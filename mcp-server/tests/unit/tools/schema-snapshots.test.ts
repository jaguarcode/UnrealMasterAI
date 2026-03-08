/**
 * Snapshot tests that lock tool schema outputs to detect unintended breaking changes.
 */
import { describe, it, expect } from 'vitest';
import { generateManifest } from '../../../src/tools/context/tool-manifest.js';

describe('tool schema snapshots', () => {
  const manifest = generateManifest();

  it('tool names list is stable', () => {
    const names = manifest.tools.map(t => t.name).sort();
    expect(names).toMatchSnapshot();
  });

  it('domain-to-tools mapping is stable', () => {
    const domains = manifest.domains
      .map(d => ({ name: d.name, tools: [...d.tools].sort() }))
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(domains).toMatchSnapshot();
  });

  it('safety classifications are stable', () => {
    const safety = manifest.tools
      .map(t => ({ name: t.name, safety: t.safety }))
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(safety).toMatchSnapshot();
  });
});
