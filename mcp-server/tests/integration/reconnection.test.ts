import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketBridge } from '../../src/transport/websocket-bridge.js';
import { MockUEClient } from '../fixtures/mock-ue-client.js';
import { ConnectionManager } from '../../src/transport/connection-manager.js';

describe('Reconnection', () => {
  let bridge: WebSocketBridge;

  beforeAll(async () => {
    bridge = new WebSocketBridge({ port: 0 });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  it('detects client disconnect', async () => {
    const client = new MockUEClient();
    await client.connect(`ws://localhost:${bridge.getPort()}`);
    expect(bridge.hasActiveConnection()).toBe(true);

    let disconnected = false;
    bridge.onClientDisconnected = () => { disconnected = true; };

    await client.disconnect();
    // Give WS time to process
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(disconnected).toBe(true);
    expect(bridge.hasActiveConnection()).toBe(false);
  });

  it('accepts new client after disconnect', async () => {
    const client1 = new MockUEClient();
    await client1.connect(`ws://localhost:${bridge.getPort()}`);
    expect(bridge.hasActiveConnection()).toBe(true);

    await client1.disconnect();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(bridge.hasActiveConnection()).toBe(false);

    // New client connects
    const client2 = new MockUEClient();
    await client2.connect(`ws://localhost:${bridge.getPort()}`);
    expect(bridge.hasActiveConnection()).toBe(true);

    await client2.disconnect();
  });

  it('ConnectionManager tracks state changes', async () => {
    const connManager = new ConnectionManager();
    const states: string[] = [];
    connManager.onStateChange = (state) => states.push(state);

    bridge.onClientConnected = () => connManager.setState('connected');
    bridge.onClientDisconnected = () => connManager.setState('disconnected');

    const client = new MockUEClient();
    await client.connect(`ws://localhost:${bridge.getPort()}`);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(connManager.isConnected()).toBe(true);

    await client.disconnect();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(connManager.isConnected()).toBe(false);

    expect(states).toEqual(['connected', 'disconnected']);
    connManager.destroy();
  });

  it('rejects concurrent requests when client disconnects mid-flight', async () => {
    const client = new MockUEClient({ responseDelay: 500 });
    await client.connect(`ws://localhost:${bridge.getPort()}`);

    // Start a request
    const requestPromise = bridge.sendRequest({
      id: crypto.randomUUID(),
      method: 'test.slow',
      params: {},
      timestamp: Date.now(),
    });

    // Attach a catch handler immediately to prevent unhandled rejection
    requestPromise.catch(() => {});

    // Disconnect while request is pending
    await new Promise(resolve => setTimeout(resolve, 50));
    await client.disconnect();

    // Request should be rejected
    await expect(requestPromise).rejects.toThrow('Client disconnected');
  });
});
