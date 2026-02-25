import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { MockUEClient } from '../../fixtures/mock-ue-client.js';
import { compilationTrigger } from '../../../src/tools/compilation/trigger-compile.js';
import { compilationGetStatus } from '../../../src/tools/compilation/get-status.js';
import { compilationGetErrors } from '../../../src/tools/compilation/get-errors.js';

describe('CompilationTools', () => {
  let bridge: WebSocketBridge;
  let client: MockUEClient;

  beforeAll(async () => {
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 2000 });
    await bridge.start();
    client = new MockUEClient();
    await client.connect(`ws://localhost:${bridge.getPort()}`);
    // Small delay to ensure connection is established
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterAll(async () => {
    await client.disconnect();
    await bridge.stop();
  });

  describe('compilation.trigger', () => {
    it('sends compile command and returns compiling status', async () => {
      const result = await compilationTrigger(bridge);
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('compiling');
      expect(parsed.compileId).toBeDefined();
    });

    it('handles bridge not connected', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 1000 });
      await disconnectedBridge.start();
      const result = await compilationTrigger(disconnectedBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      await disconnectedBridge.stop();
    });
  });

  describe('compilation.getStatus', () => {
    it('returns status result from UE', async () => {
      const result = await compilationGetStatus(bridge, {});
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toBeDefined();
    });

    it('passes compileId parameter', async () => {
      const result = await compilationGetStatus(bridge, { compileId: 'test-id' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toBeDefined();
    });
  });

  describe('compilation.getErrors', () => {
    it('returns errors result from UE', async () => {
      const result = await compilationGetErrors(bridge, {});
      expect(result.content[0].type).toBe('text');
    });

    it('passes compileId parameter', async () => {
      const result = await compilationGetErrors(bridge, { compileId: 'test-id' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toBeDefined();
    });

    it('handles bridge not connected', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 1000 });
      await disconnectedBridge.start();
      const result = await compilationGetErrors(disconnectedBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      await disconnectedBridge.stop();
    });
  });
});
