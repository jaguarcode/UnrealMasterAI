import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { foliageCreateType } from '../../../src/tools/foliage/create-type.js';
import { foliageGetInfo } from '../../../src/tools/foliage/get-info.js';
import { foliageSetProperties } from '../../../src/tools/foliage/set-properties.js';

describe('foliage tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- foliageCreateType ---
  describe('foliageCreateType', () => {
    it('returns success with created foliage type on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          typeName: 'FT_Grass',
          typePath: '/Game/Foliage/FT_Grass',
          meshPath: '/Game/Meshes/SM_Grass',
        },
        duration_ms: 10,
      });
      const result = await foliageCreateType(mockBridge, {
        typeName: 'FT_Grass',
        typePath: '/Game/Foliage',
        meshPath: '/Game/Meshes/SM_Grass',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('typeName');
      expect(parsed.result).toHaveProperty('typePath');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8600, message: 'Mesh not found: /Game/Meshes/Missing' },
        duration_ms: 5,
      });
      const result = await foliageCreateType(mockBridge, {
        typeName: 'FT_Grass',
        typePath: '/Game/Foliage',
        meshPath: '/Game/Meshes/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- foliageGetInfo ---
  describe('foliageGetInfo', () => {
    it('returns success with foliage info on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          foliageTypePath: '/Game/Foliage/FT_Grass',
          density: 100,
          scaling: 'Uniform',
          cullDistance: '100|100',
          meshPath: '/Game/Meshes/SM_Grass',
        },
        duration_ms: 10,
      });
      const result = await foliageGetInfo(mockBridge, {
        foliageTypePath: '/Game/Foliage/FT_Grass',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('density');
      expect(parsed.result).toHaveProperty('foliageTypePath');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8610, message: 'FoliageType not found: /Game/Foliage/Missing' },
        duration_ms: 5,
      });
      const result = await foliageGetInfo(mockBridge, {
        foliageTypePath: '/Game/Foliage/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- foliageSetProperties ---
  describe('foliageSetProperties', () => {
    it('returns success when setting density and scale', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          foliageTypePath: '/Game/Foliage/FT_Grass',
          applied: { density: 200, scale: 1.5, cullDistance: 500 },
        },
        duration_ms: 10,
      });
      const result = await foliageSetProperties(mockBridge, {
        foliageTypePath: '/Game/Foliage/FT_Grass',
        density: 200,
        scale: 1.5,
        cullDistance: 500,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('applied');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8620, message: 'FoliageType not found: /Game/Foliage/Missing' },
        duration_ms: 5,
      });
      const result = await foliageSetProperties(mockBridge, {
        foliageTypePath: '/Game/Foliage/Missing',
        density: 100,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
