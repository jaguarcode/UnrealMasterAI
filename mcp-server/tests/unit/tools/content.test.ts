import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { MockUEClient } from '../../fixtures/mock-ue-client.js';
import { contentListAssets } from '../../../src/tools/content/list-assets.js';
import { contentFindAssets } from '../../../src/tools/content/find-assets.js';
import { contentGetAssetDetails } from '../../../src/tools/content/get-asset-details.js';
import { contentValidateAssets } from '../../../src/tools/content/validate-assets.js';

describe('ContentTools', () => {
  let bridge: WebSocketBridge;
  let client: MockUEClient;

  beforeAll(async () => {
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 2000 });
    await bridge.start();
    client = new MockUEClient();
    await client.connect(`ws://localhost:${bridge.getPort()}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterAll(async () => {
    await client.disconnect();
    await bridge.stop();
  });

  describe('content.listAssets', () => {
    it('returns success with asset list for default path', async () => {
      const result = await contentListAssets(bridge, {});
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('handles bridge not connected', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 500 });
      await disconnectedBridge.start();
      const result = await contentListAssets(disconnectedBridge, { path: '/Game/' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      await disconnectedBridge.stop();
    });

    it('passes assetType and recursive params', async () => {
      const result = await contentListAssets(bridge, { path: '/Game/', assetType: 'Blueprint', recursive: true });
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });
  });

  describe('content.findAssets', () => {
    it('returns success with matching assets', async () => {
      const result = await contentFindAssets(bridge, { query: 'BP_Test' });
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('handles bridge not connected', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 500 });
      await disconnectedBridge.start();
      const result = await contentFindAssets(disconnectedBridge, { query: 'test' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      await disconnectedBridge.stop();
    });

    it('passes optional path and assetType params', async () => {
      const result = await contentFindAssets(bridge, { query: 'MyActor', assetType: 'Blueprint', path: '/Game/' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });
  });

  describe('content.getAssetDetails', () => {
    it('returns success with asset details', async () => {
      const result = await contentGetAssetDetails(bridge, { assetPath: '/Game/BP_MyActor' });
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('handles bridge not connected', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 500 });
      await disconnectedBridge.start();
      const result = await contentGetAssetDetails(disconnectedBridge, { assetPath: '/Game/BP_MyActor' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      await disconnectedBridge.stop();
    });
  });

  describe('content.validateAssets', () => {
    it('returns success with validation results', async () => {
      const result = await contentValidateAssets(bridge, { paths: ['/Game/BP_MyActor'] });
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toBeDefined();
    });

    it('handles bridge not connected', async () => {
      const disconnectedBridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 500 });
      await disconnectedBridge.start();
      const result = await contentValidateAssets(disconnectedBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      await disconnectedBridge.stop();
    });

    it('handles empty paths param', async () => {
      const result = await contentValidateAssets(bridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });
  });
});
