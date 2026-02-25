import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { MockUEClient } from '../../fixtures/mock-ue-client.js';
import type { WSMessage } from '../../../src/types/messages.js';

describe('WebSocketBridge', () => {
  let bridge: WebSocketBridge;
  let mockClient: MockUEClient;
  let bridgeStarted: boolean;

  beforeEach(async () => {
    bridgeStarted = false;
    // Use port 0 so the OS assigns a free port — avoids EADDRINUSE between tests.
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 2000 });
    await bridge.start();
    bridgeStarted = true;
    mockClient = new MockUEClient();
    await mockClient.connect(`ws://localhost:${bridge.getPort()}`);
    // Small delay to ensure connection is established
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    await mockClient.disconnect();
    // Only stop bridge if it was started (guard against tests that already called stop()).
    if (bridgeStarted && bridge.isListening()) {
      await bridge.stop();
    }
  });

  it('WS server starts on configured port', async () => {
    expect(bridge.isListening()).toBe(true);
  });

  it('accepts incoming client connection', async () => {
    expect(bridge.hasActiveConnection()).toBe(true);
  });

  it('sends message and receives correlated response', async () => {
    const msg: WSMessage = {
      id: uuidv4(),
      method: 'editor.ping',
      params: {},
      timestamp: Date.now(),
    };

    const response = await bridge.sendRequest(msg);
    expect(response.id).toBe(msg.id);
    expect(response.result).toBeDefined();
  });

  it('request timeout rejects with error', async () => {
    // Disconnect mock client so no response comes
    await mockClient.disconnect();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Reconnect with delay longer than timeout
    mockClient = new MockUEClient({ responseDelay: 5000 });
    await mockClient.connect(`ws://localhost:${bridge.getPort()}`);
    await new Promise(resolve => setTimeout(resolve, 50));

    const msg: WSMessage = {
      id: uuidv4(),
      method: 'editor.ping',
      params: {},
      timestamp: Date.now(),
    };

    await expect(bridge.sendRequest(msg)).rejects.toThrow(/timeout/i);
  });

  it('multiple concurrent requests correlate correctly by ID', async () => {
    const msg1: WSMessage = {
      id: uuidv4(),
      method: 'editor.ping',
      params: { tag: '1' },
      timestamp: Date.now(),
    };
    const msg2: WSMessage = {
      id: uuidv4(),
      method: 'blueprint.serialize',
      params: { tag: '2' },
      timestamp: Date.now(),
    };

    const [response1, response2] = await Promise.all([
      bridge.sendRequest(msg1),
      bridge.sendRequest(msg2),
    ]);

    expect(response1.id).toBe(msg1.id);
    expect(response2.id).toBe(msg2.id);
  });

  it('connection drop triggers onDisconnect callback', async () => {
    let disconnected = false;
    bridge.onClientDisconnected = () => { disconnected = true; };

    await mockClient.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(disconnected).toBe(true);
  });

  it('graceful shutdown closes all connections', async () => {
    await bridge.stop();
    expect(bridge.isListening()).toBe(false);
    // Mark bridge as stopped so afterEach skips calling stop() again.
    bridgeStarted = false;
  });

  it('rejects sendRequest when no client is connected', async () => {
    await mockClient.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));

    const msg: WSMessage = {
      id: uuidv4(),
      method: 'editor.ping',
      params: {},
      timestamp: Date.now(),
    };

    await expect(bridge.sendRequest(msg)).rejects.toThrow(/not connected/i);
  });
});
