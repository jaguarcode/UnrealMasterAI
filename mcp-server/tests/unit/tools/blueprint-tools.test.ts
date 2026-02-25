import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { MockUEClient } from '../../fixtures/mock-ue-client.js';
import { CacheStore } from '../../../src/state/cache-store.js';
import { blueprintSerialize } from '../../../src/tools/blueprint/serialize.js';
import { blueprintCreateNode } from '../../../src/tools/blueprint/create-node.js';
import { blueprintConnectPins } from '../../../src/tools/blueprint/connect-pins.js';
import { blueprintModifyProperty } from '../../../src/tools/blueprint/modify-property.js';
import { blueprintDeleteNode } from '../../../src/tools/blueprint/delete-node.js';

describe('BlueprintToolHandlers', () => {
  let bridge: WebSocketBridge;
  let client: MockUEClient;
  let cache: CacheStore;

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

  describe('blueprint.serialize', () => {
    it('sends WS message with correct method and returns cache key + summary', async () => {
      cache = new CacheStore();
      const result = await blueprintSerialize(bridge, cache, {
        assetPath: '/Game/Blueprints/BP_Player',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.cacheKey).toBe('bp:/Game/Blueprints/BP_Player');
      expect(parsed.cached).toBe(false);
      expect(parsed).toHaveProperty('summary');
    });

    it('caches result and second call returns cached response', async () => {
      cache = new CacheStore();

      // First call — should send over WS
      const first = await blueprintSerialize(bridge, cache, {
        assetPath: '/Game/Blueprints/BP_Enemy',
      });
      const firstParsed = JSON.parse(first.content[0].text);
      expect(firstParsed.cached).toBe(false);

      // Second call — should return cached
      const second = await blueprintSerialize(bridge, cache, {
        assetPath: '/Game/Blueprints/BP_Enemy',
      });
      const secondParsed = JSON.parse(second.content[0].text);
      expect(secondParsed.cached).toBe(true);
      expect(secondParsed.cacheKey).toBe('bp:/Game/Blueprints/BP_Enemy');
    });

    it('bypasses cache when graphName is provided', async () => {
      cache = new CacheStore();

      // Pre-populate cache
      await blueprintSerialize(bridge, cache, {
        assetPath: '/Game/Blueprints/BP_Cached',
      });

      // With graphName — should send fresh request even if cached
      const result = await blueprintSerialize(bridge, cache, {
        assetPath: '/Game/Blueprints/BP_Cached',
        graphName: 'EventGraph',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.cached).toBe(false);
    });
  });

  describe('blueprint.createNode', () => {
    it('sends WS message with correct params', async () => {
      const result = await blueprintCreateNode(bridge, {
        blueprintCacheKey: 'bp:/Game/BP_Test',
        graphName: 'EventGraph',
        nodeClass: 'K2Node_CallFunction',
        posX: 100,
        posY: 200,
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.method).toBe('blueprint.createNode');
      expect(parsed.echo).toBe(true);
    });

    it('sends without optional position params', async () => {
      const result = await blueprintCreateNode(bridge, {
        blueprintCacheKey: 'bp:/Game/BP_Test',
        graphName: 'EventGraph',
        nodeClass: 'K2Node_Event',
      });

      expect(result).toHaveProperty('content');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.method).toBe('blueprint.createNode');
    });
  });

  describe('blueprint.connectPins', () => {
    it('sends WS message with sourcePinId and targetPinId', async () => {
      const result = await blueprintConnectPins(bridge, {
        blueprintCacheKey: 'bp:/Game/BP_Test',
        sourcePinId: 'node1:output',
        targetPinId: 'node2:input',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.method).toBe('blueprint.connectPins');
      expect(parsed.echo).toBe(true);
    });
  });

  describe('blueprint.modifyProperty', () => {
    it('sends WS message with propertyName and propertyValue', async () => {
      const result = await blueprintModifyProperty(bridge, {
        blueprintCacheKey: 'bp:/Game/BP_Test',
        nodeId: 'node-123',
        propertyName: 'Speed',
        propertyValue: '600.0',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.method).toBe('blueprint.modifyProperty');
      expect(parsed.echo).toBe(true);
    });
  });

  describe('blueprint.deleteNode', () => {
    it('sends WS message with nodeId', async () => {
      const result = await blueprintDeleteNode(bridge, {
        blueprintCacheKey: 'bp:/Game/BP_Test',
        nodeId: 'node-456',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.method).toBe('blueprint.deleteNode');
      expect(parsed.echo).toBe(true);
    });
  });

  describe('bridge not connected', () => {
    it('blueprint.serialize handles bridge not connected gracefully', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 1000 });
      await disconnectedBridge.start();

      try {
        const localCache = new CacheStore();
        const result = await blueprintSerialize(disconnectedBridge, localCache, {
          assetPath: '/Game/BP_Test',
        });
        // serialize catches errors and returns error content
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.status).toBe('error');
        expect(parsed.error).toMatch(/not connected/i);
      } finally {
        await disconnectedBridge.stop();
      }
    });

    it('blueprint.createNode handles bridge not connected gracefully', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 1000 });
      await disconnectedBridge.start();

      try {
        await blueprintCreateNode(disconnectedBridge, {
          blueprintCacheKey: 'bp:/Game/BP_Test',
          graphName: 'EventGraph',
          nodeClass: 'K2Node_Event',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toMatch(/not connected/i);
      } finally {
        await disconnectedBridge.stop();
      }
    });

    it('blueprint.connectPins handles bridge not connected gracefully', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 1000 });
      await disconnectedBridge.start();

      try {
        await blueprintConnectPins(disconnectedBridge, {
          blueprintCacheKey: 'bp:/Game/BP_Test',
          sourcePinId: 'pin1',
          targetPinId: 'pin2',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toMatch(/not connected/i);
      } finally {
        await disconnectedBridge.stop();
      }
    });

    it('blueprint.modifyProperty handles bridge not connected gracefully', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 1000 });
      await disconnectedBridge.start();

      try {
        await blueprintModifyProperty(disconnectedBridge, {
          blueprintCacheKey: 'bp:/Game/BP_Test',
          nodeId: 'node-1',
          propertyName: 'Health',
          propertyValue: '100',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toMatch(/not connected/i);
      } finally {
        await disconnectedBridge.stop();
      }
    });

    it('blueprint.deleteNode handles bridge not connected gracefully', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 1000 });
      await disconnectedBridge.start();

      try {
        await blueprintDeleteNode(disconnectedBridge, {
          blueprintCacheKey: 'bp:/Game/BP_Test',
          nodeId: 'node-1',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toMatch(/not connected/i);
      } finally {
        await disconnectedBridge.stop();
      }
    });
  });
});
