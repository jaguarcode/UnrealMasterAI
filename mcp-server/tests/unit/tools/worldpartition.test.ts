import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { worldpartitionGetInfo } from '../../../src/tools/worldpartition/get-info.js';
import { worldpartitionSetConfig } from '../../../src/tools/worldpartition/set-config.js';
import { worldpartitionCreateDataLayer } from '../../../src/tools/worldpartition/create-data-layer.js';
import { worldpartitionCreateHLOD } from '../../../src/tools/worldpartition/create-hlod.js';

describe('worldpartition tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- worldpartitionGetInfo ---
  describe('worldpartitionGetInfo', () => {
    it('returns success with WP info on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          worldPartition: { enabled: true, worldName: 'World' },
          dataLayers: [],
          hlodLayers: [],
        },
        duration_ms: 10,
      });
      const result = await worldpartitionGetInfo(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('worldPartition');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8501, message: 'World Partition is not enabled for this level' },
        duration_ms: 5,
      });
      const result = await worldpartitionGetInfo(mockBridge, { levelPath: '/Game/Maps/TestMap' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- worldpartitionSetConfig ---
  describe('worldpartitionSetConfig', () => {
    it('returns success when config is updated', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          worldName: 'World',
          updated: { gridSize: 12800, loadingRange: 25600 },
        },
        duration_ms: 10,
      });
      const result = await worldpartitionSetConfig(mockBridge, { gridSize: 12800, loadingRange: 25600 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('updated');
    });

    it('returns error when WP is not enabled', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8512, message: 'World Partition is not enabled for this level' },
        duration_ms: 5,
      });
      const result = await worldpartitionSetConfig(mockBridge, { cellSize: 3200 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- worldpartitionCreateDataLayer ---
  describe('worldpartitionCreateDataLayer', () => {
    it('returns success when data layer is created', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { layerName: 'Gameplay', layerType: 'Editor', created: true },
        duration_ms: 10,
      });
      const result = await worldpartitionCreateDataLayer(mockBridge, { layerName: 'Gameplay' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.created).toBe(true);
    });

    it('returns error when data layer already exists', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8523, message: "Data layer 'Gameplay' already exists" },
        duration_ms: 5,
      });
      const result = await worldpartitionCreateDataLayer(mockBridge, { layerName: 'Gameplay' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- worldpartitionCreateHLOD ---
  describe('worldpartitionCreateHLOD', () => {
    it('returns success when HLOD layer is created', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          layerName: 'MainHLOD',
          assetPath: '/Game/WorldPartition/HLODLayers/MainHLOD',
          hlodSetupAsset: null,
          created: true,
        },
        duration_ms: 10,
      });
      const result = await worldpartitionCreateHLOD(mockBridge, { layerName: 'MainHLOD' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.created).toBe(true);
      expect(parsed.result).toHaveProperty('assetPath');
    });

    it('returns error when HLOD layer already exists', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8532, message: "HLOD layer asset 'MainHLOD' already exists at /Game/WorldPartition/HLODLayers" },
        duration_ms: 5,
      });
      const result = await worldpartitionCreateHLOD(mockBridge, { layerName: 'MainHLOD' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
