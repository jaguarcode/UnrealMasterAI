/**
 * Unit tests for Phase 4.3 Multi-LLM Support features.
 * Tests parseTransportType (transport-factory.ts) and parseHost/HOST_CONFIGS (init.ts).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseTransportType, startTransport } from '../../../src/transport/transport-factory.js';
import { parseHost, HOST_CONFIGS, getHostConfigs } from '../../../src/cli/init.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ── parseTransportType ────────────────────────────────────────────────────────

describe('parseTransportType', () => {
  it('returns stdio when no flags or env vars are set', () => {
    expect(parseTransportType([], {})).toBe('stdio');
  });

  it('returns sse when --transport=sse is in argv', () => {
    expect(parseTransportType(['--transport=sse'], {})).toBe('sse');
  });

  it('returns streamable-http when --transport=streamable-http is in argv', () => {
    expect(parseTransportType(['--transport=streamable-http'], {})).toBe('streamable-http');
  });

  it('returns stdio when --transport=stdio is explicitly in argv', () => {
    expect(parseTransportType(['--transport=stdio'], {})).toBe('stdio');
  });

  it('returns transport from MCP_TRANSPORT env var when no CLI flag', () => {
    expect(parseTransportType([], { MCP_TRANSPORT: 'sse' })).toBe('sse');
    expect(parseTransportType([], { MCP_TRANSPORT: 'streamable-http' })).toBe('streamable-http');
    expect(parseTransportType([], { MCP_TRANSPORT: 'stdio' })).toBe('stdio');
  });

  it('CLI flag takes precedence over env var', () => {
    expect(
      parseTransportType(['--transport=stdio'], { MCP_TRANSPORT: 'sse' })
    ).toBe('stdio');

    expect(
      parseTransportType(['--transport=streamable-http'], { MCP_TRANSPORT: 'sse' })
    ).toBe('streamable-http');
  });

  it('throws on unknown --transport value', () => {
    expect(() => parseTransportType(['--transport=websocket'], {})).toThrow(
      /Unknown transport type "websocket"/
    );
  });

  it('throws on unknown MCP_TRANSPORT env value', () => {
    expect(() => parseTransportType([], { MCP_TRANSPORT: 'grpc' })).toThrow(
      /Unknown MCP_TRANSPORT value "grpc"/
    );
  });

  it('ignores unrelated argv entries', () => {
    expect(parseTransportType(['--host=cursor', '--port=3000'], {})).toBe('stdio');
  });
});

// ── startTransport ────────────────────────────────────────────────────────────

describe('startTransport', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) {
      await cleanup();
    }
  });

  it('creates stdio transport and calls server.connect', async () => {
    const mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as McpServer;

    const result = await startTransport(mockServer, 'stdio');
    cleanups.push(result.cleanup);

    expect(mockServer.connect).toHaveBeenCalledOnce();
  });

  it('returns cleanup function for stdio that resolves', async () => {
    const mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as McpServer;

    const result = await startTransport(mockServer, 'stdio');
    await expect(result.cleanup()).resolves.toBeUndefined();
  });

  it('for SSE transport: starts HTTP server on random port and cleanup resolves', async () => {
    const mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as McpServer;

    const result = await startTransport(mockServer, 'sse', { port: 0 });
    cleanups.push(result.cleanup);

    // cleanup should resolve without error
    await expect(result.cleanup()).resolves.toBeUndefined();
    // Remove from cleanups since we already cleaned up
    cleanups.pop();
  });

  it('for streamable-http transport: starts HTTP server on random port and cleanup resolves', async () => {
    const mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as McpServer;

    const result = await startTransport(mockServer, 'streamable-http', { port: 0 });
    cleanups.push(result.cleanup);

    await expect(result.cleanup()).resolves.toBeUndefined();
    cleanups.pop();
  });

  it('accepts a logger option without throwing', async () => {
    const mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as McpServer;

    const logger = { info: vi.fn() };
    const result = await startTransport(mockServer, 'stdio', { logger });
    cleanups.push(result.cleanup);

    expect(logger.info).toHaveBeenCalledWith('MCP server connected via stdio transport');
  });
});

// ── parseHost ─────────────────────────────────────────────────────────────────

describe('parseHost', () => {
  it('returns claude when no --host flag is present', () => {
    expect(parseHost([])).toBe('claude');
    expect(parseHost(['--transport=sse', '--port=3000'])).toBe('claude');
  });

  it('returns cursor for --host=cursor', () => {
    expect(parseHost(['--host=cursor'])).toBe('cursor');
  });

  it('returns windsurf for --host=windsurf', () => {
    expect(parseHost(['--host=windsurf'])).toBe('windsurf');
  });

  it('returns vscode for --host=vscode', () => {
    expect(parseHost(['--host=vscode'])).toBe('vscode');
  });

  it('returns claude-code for --host=claude-code', () => {
    expect(parseHost(['--host=claude-code'])).toBe('claude-code');
  });

  it('returns the raw value for unknown hosts', () => {
    expect(parseHost(['--host=jetbrains'])).toBe('jetbrains');
  });

  it('picks up --host from mixed argv', () => {
    expect(parseHost(['--transport=sse', '--host=cursor', '--port=3001'])).toBe('cursor');
  });
});

// ── HOST_CONFIGS ──────────────────────────────────────────────────────────────

describe('HOST_CONFIGS', () => {
  it('has 5 host entries', () => {
    expect(Object.keys(HOST_CONFIGS)).toHaveLength(5);
  });

  it('contains all expected host keys', () => {
    expect(HOST_CONFIGS).toHaveProperty('claude');
    expect(HOST_CONFIGS).toHaveProperty('claude-code');
    expect(HOST_CONFIGS).toHaveProperty('cursor');
    expect(HOST_CONFIGS).toHaveProperty('windsurf');
    expect(HOST_CONFIGS).toHaveProperty('vscode');
  });

  it('all hosts have required fields', () => {
    for (const [key, cfg] of Object.entries(HOST_CONFIGS)) {
      expect(cfg, `${key} missing name`).toHaveProperty('name');
      expect(cfg, `${key} missing displayName`).toHaveProperty('displayName');
      expect(cfg, `${key} missing configPath`).toHaveProperty('configPath');
      expect(cfg, `${key} missing generateConfig`).toHaveProperty('generateConfig');
      expect(cfg, `${key} missing description`).toHaveProperty('description');
      expect(typeof cfg.name, `${key}.name not string`).toBe('string');
      expect(typeof cfg.displayName, `${key}.displayName not string`).toBe('string');
      expect(typeof cfg.configPath, `${key}.configPath not function`).toBe('function');
      expect(typeof cfg.generateConfig, `${key}.generateConfig not function`).toBe('function');
      expect(typeof cfg.description, `${key}.description not string`).toBe('string');
    }
  });

  it('claude config generates mcpServers with unreal-master-agent entry', () => {
    const config = HOST_CONFIGS['claude'].generateConfig();
    expect(config).toHaveProperty('mcpServers');
    const servers = config['mcpServers'] as Record<string, unknown>;
    expect(servers).toHaveProperty('unreal-master-agent');
    const entry = servers['unreal-master-agent'] as Record<string, unknown>;
    expect(entry).toHaveProperty('command', 'npx');
    expect(entry).toHaveProperty('args');
  });

  it('VS Code config generates servers (not mcpServers) with type: stdio', () => {
    const config = HOST_CONFIGS['vscode'].generateConfig();
    expect(config).not.toHaveProperty('mcpServers');
    expect(config).toHaveProperty('servers');
    const servers = config['servers'] as Record<string, unknown>;
    expect(servers).toHaveProperty('unreal-master-agent');
    const entry = servers['unreal-master-agent'] as Record<string, unknown>;
    expect(entry).toHaveProperty('type', 'stdio');
  });

  it('cursor config path includes .cursor/mcp.json', () => {
    const configPath = HOST_CONFIGS['cursor'].configPath('/some/project');
    expect(configPath).toContain('.cursor');
    expect(configPath).toContain('mcp.json');
  });

  it('windsurf config path includes .codeium/windsurf', () => {
    const configPath = HOST_CONFIGS['windsurf'].configPath('/some/project');
    expect(configPath).toContain('.codeium');
    expect(configPath).toContain('windsurf');
  });

  it('claude-code config path includes .mcp.json', () => {
    const configPath = HOST_CONFIGS['claude-code'].configPath('/some/project');
    expect(configPath).toContain('.mcp.json');
  });

  it('all host configs generate valid JSON', () => {
    for (const [key, cfg] of Object.entries(HOST_CONFIGS)) {
      const config = cfg.generateConfig();
      expect(() => JSON.stringify(config), `${key} generateConfig not JSON-serialisable`).not.toThrow();
    }
  });

  it('non-vscode hosts use mcpServers key', () => {
    for (const key of ['claude', 'claude-code', 'cursor', 'windsurf']) {
      const config = HOST_CONFIGS[key].generateConfig();
      expect(config, `${key} should use mcpServers`).toHaveProperty('mcpServers');
    }
  });
});

// ── getHostConfigs ────────────────────────────────────────────────────────────

describe('getHostConfigs', () => {
  it('returns the HOST_CONFIGS object', () => {
    const configs = getHostConfigs();
    expect(configs).toBe(HOST_CONFIGS);
  });

  it('returns an object with 5 keys', () => {
    expect(Object.keys(getHostConfigs())).toHaveLength(5);
  });
});
