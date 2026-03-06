import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { landscapeCreate } from '../../../src/tools/landscape/create.js';
import { landscapeImportHeightmap } from '../../../src/tools/landscape/import-heightmap.js';
import { landscapeExportHeightmap } from '../../../src/tools/landscape/export-heightmap.js';
import { landscapeGetInfo } from '../../../src/tools/landscape/get-info.js';
import { landscapeSetMaterial } from '../../../src/tools/landscape/set-material.js';

describe('landscape tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  describe('landscapeCreate', () => {
    it('returns success with landscape info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { landscapeName: 'MainLandscape', sectionSize: 63, components: '4x4' },
        duration_ms: 10,
      });
      const result = await landscapeCreate(mockBridge, { landscapeName: 'MainLandscape' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('landscapeName');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8300, message: 'LandscapeEditorSubsystem not available' },
        duration_ms: 5,
      });
      const result = await landscapeCreate(mockBridge, { landscapeName: 'Bad' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  describe('landscapeImportHeightmap', () => {
    it('returns success on valid import', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { landscapeName: 'MainLandscape', heightmapPath: '/Game/heightmap.r16', imported: true },
        duration_ms: 10,
      });
      const result = await landscapeImportHeightmap(mockBridge, {
        landscapeName: 'MainLandscape',
        heightmapPath: '/Game/heightmap.r16',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('imported', true);
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8312, message: "Landscape actor 'Missing' not found" },
        duration_ms: 5,
      });
      const result = await landscapeImportHeightmap(mockBridge, {
        landscapeName: 'Missing',
        heightmapPath: '/Game/heightmap.r16',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  describe('landscapeExportHeightmap', () => {
    it('returns success with export path', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { landscapeName: 'MainLandscape', exportPath: 'C:/exports/heightmap.r16', exported: true },
        duration_ms: 10,
      });
      const result = await landscapeExportHeightmap(mockBridge, {
        landscapeName: 'MainLandscape',
        exportPath: 'C:/exports/heightmap.r16',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('exported', true);
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8323, message: 'Failed to export heightmap' },
        duration_ms: 5,
      });
      const result = await landscapeExportHeightmap(mockBridge, {
        landscapeName: 'MainLandscape',
        exportPath: 'C:/bad/path.r16',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  describe('landscapeGetInfo', () => {
    it('returns success with landscape list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          landscapes: [{ name: 'MainLandscape', location: '(0,0,0)', scale: '(1,1,1)' }],
          count: 1,
        },
        duration_ms: 10,
      });
      const result = await landscapeGetInfo(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('count', 1);
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8331, message: 'No landscape actors found' },
        duration_ms: 5,
      });
      const result = await landscapeGetInfo(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  describe('landscapeSetMaterial', () => {
    it('returns success when material applied', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { landscapeName: 'MainLandscape', materialPath: '/Game/M_Landscape', applied: true },
        duration_ms: 10,
      });
      const result = await landscapeSetMaterial(mockBridge, {
        landscapeName: 'MainLandscape',
        materialPath: '/Game/M_Landscape',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('applied', true);
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8342, message: "Material not found at path '/Game/Bad'" },
        duration_ms: 5,
      });
      const result = await landscapeSetMaterial(mockBridge, {
        landscapeName: 'MainLandscape',
        materialPath: '/Game/Bad',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
