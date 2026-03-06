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
