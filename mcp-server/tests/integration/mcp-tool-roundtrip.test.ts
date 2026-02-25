/**
 * Integration tests for MCP tool roundtrip through the WebSocket bridge.
 * Verifies the full pipeline: editorPing() -> WebSocketBridge -> MockUEClient -> response.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketBridge } from '../../src/transport/websocket-bridge.js';
import { MockUEClient } from '../fixtures/mock-ue-client.js';
import { editorPing } from '../../src/tools/editor/ping.js';

describe('MCP Tool Roundtrip – editor.ping', () => {
  let bridge: WebSocketBridge;
  let mockClient: MockUEClient;
  let bridgeStarted: boolean;

  beforeEach(async () => {
    bridgeStarted = false;
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 2000 });
    await bridge.start();
    bridgeStarted = true;
    mockClient = new MockUEClient();
    await mockClient.connect(`ws://localhost:${bridge.getPort()}`);
    // Allow connection handshake to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    await mockClient.disconnect();
    if (bridgeStarted && bridge.isListening()) {
      await bridge.stop();
    }
  });

  it('sends WS message with method "editor.ping" and receives pong', async () => {
    const result = await editorPing(bridge);

    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const payload = JSON.parse(result.content[0].text);
    expect(payload.status).toBe('pong');
    expect(payload.result).toBeDefined();
    // MockUEClient echoes back { method, echo: true }
    expect(payload.result.method).toBe('editor.ping');
    expect(payload.result.echo).toBe(true);
  });

  it('returns MCP-formatted response with content array', async () => {
    const result = await editorPing(bridge);

    // Verify MCP response shape: { content: [{ type: 'text', text: string }] }
    expect(result.content).toBeInstanceOf(Array);
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect(typeof result.content[0].text).toBe('string');
    // Text should be valid JSON
    expect(() => JSON.parse(result.content[0].text)).not.toThrow();
  });

  it('full roundtrip completes in <100ms with mock client', async () => {
    const start = performance.now();
    await editorPing(bridge);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it('returns error when UE client is not connected', async () => {
    // Disconnect the mock client
    await mockClient.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await editorPing(bridge);

    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);

    const payload = JSON.parse(result.content[0].text);
    expect(payload.status).toBe('error');
    expect(payload.error).toBeDefined();
  });

  it('returns error on timeout when UE client does not respond', async () => {
    // Disconnect current client
    await mockClient.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Stop the current bridge
    await bridge.stop();
    bridgeStarted = false;

    // Create a new bridge with very short timeout
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 50 });
    await bridge.start();
    bridgeStarted = true;

    // Connect a slow mock client that takes longer than the timeout
    mockClient = new MockUEClient({ responseDelay: 5000 });
    await mockClient.connect(`ws://localhost:${bridge.getPort()}`);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await editorPing(bridge);

    expect(result).toHaveProperty('content');
    const payload = JSON.parse(result.content[0].text);
    expect(payload.status).toBe('error');
    expect(payload.error).toMatch(/timeout/i);
  });
});
