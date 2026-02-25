/**
 * Integration tests for file operations through the safety gate.
 * Tests the full pipeline: file handler -> safety check -> WebSocketBridge -> MockUEClient -> response.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketBridge } from '../../src/transport/websocket-bridge.js';
import { MockUEClient } from '../fixtures/mock-ue-client.js';
import { ApprovalGate } from '../../src/state/safety.js';
import { fileRead } from '../../src/tools/file/read-file.js';
import { fileWrite } from '../../src/tools/file/write-file.js';
import { fileSearch } from '../../src/tools/file/search-files.js';

describe('SafetyGateIntegration', () => {
  let bridge: WebSocketBridge;
  let mockClient: MockUEClient;
  let approvalGate: ApprovalGate;
  const allowedRoots = ['/Project/Source', '/Project/Content'];

  beforeEach(async () => {
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 2000 });
    await bridge.start();

    mockClient = new MockUEClient();
    await mockClient.connect(`ws://localhost:${bridge.getPort()}`);
    // Allow connection handshake to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    approvalGate = new ApprovalGate(1000);
  });

  afterEach(async () => {
    await mockClient.disconnect();
    if (bridge.isListening()) {
      await bridge.stop();
    }
  });

  it('file.read through bridge with mock UE client returns result', async () => {
    const result = await fileRead(
      bridge,
      { filePath: '/Project/Source/MyFile.cpp' },
      allowedRoots,
    );

    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse(result.content[0].text);
    // MockUEClient echoes back { method, echo: true }
    expect(parsed.method).toBe('file.read');
    expect(parsed.echo).toBe(true);
  });

  it('file.read blocks path traversal attempt', async () => {
    const result = await fileRead(
      bridge,
      { filePath: '/Project/Source/../../../etc/passwd' },
      allowedRoots,
    );

    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toBe('Path traversal blocked');
  });

  it('file.write to test path proceeds without approval', async () => {
    // Test paths are warn-level, no approval needed
    approvalGate.setAutoResponse(null); // No auto-response — rely on classification
    const result = await fileWrite(
      bridge,
      { filePath: '/Project/Source/Tests/TestFile.cpp', content: '// test' },
      allowedRoots,
      approvalGate,
    );

    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);

    const parsed = JSON.parse(result.content[0].text);
    // Should succeed — mock echoes back the method
    expect(parsed.method).toBe('file.write');
    expect(parsed.echo).toBe(true);
  });

  it('file.write to production path with auto-reject returns error', async () => {
    approvalGate.setAutoResponse('reject');
    const result = await fileWrite(
      bridge,
      { filePath: '/Project/Content/Blueprints/BP_Player.uasset', content: 'data' },
      allowedRoots,
      approvalGate,
    );

    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toMatch(/rejected/i);
    expect(parsed.error).toMatch(/production content path/i);
  });

  it('file.search through bridge returns result', async () => {
    const result = await fileSearch(bridge, {
      pattern: '*.uasset',
      directory: '/Project/Content',
    });

    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.method).toBe('file.search');
    expect(parsed.echo).toBe(true);
  });
});
