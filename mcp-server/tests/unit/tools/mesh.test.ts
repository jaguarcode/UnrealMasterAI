import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { meshGetInfo } from '../../../src/tools/mesh/get-info.js';
import { meshSetMaterial } from '../../../src/tools/mesh/set-material.js';
import { meshGenerateCollision } from '../../../src/tools/mesh/generate-collision.js';
import { meshSetLOD } from '../../../src/tools/mesh/set-lod.js';

describe('mesh tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- meshGetInfo ---
  describe('meshGetInfo', () => {
    it('returns success with mesh info on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          meshPath: '/Game/Meshes/Cube',
          vertexCount: 24,
          triangleCount: 12,
          lodCount: 3,
          materialSlots: [{ slotIndex: 0, materialPath: '/Game/Materials/M_Cube' }],
        },
        duration_ms: 10,
      });
      const result = await meshGetInfo(mockBridge, { meshPath: '/Game/Meshes/Cube' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('vertexCount');
      expect(parsed.result).toHaveProperty('triangleCount');
      expect(parsed.result).toHaveProperty('lodCount');
      expect(parsed.result).toHaveProperty('materialSlots');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Mesh not found: /Game/Meshes/Missing' },
        duration_ms: 5,
      });
      const result = await meshGetInfo(mockBridge, { meshPath: '/Game/Meshes/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await meshGetInfo(mockBridge, { meshPath: '/Game/Meshes/Cube' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- meshSetMaterial ---
  describe('meshSetMaterial', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          meshPath: '/Game/Meshes/Cube',
          materialPath: '/Game/Materials/M_Red',
          slotIndex: 0,
        },
        duration_ms: 10,
      });
      const result = await meshSetMaterial(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
        materialPath: '/Game/Materials/M_Red',
        slotIndex: 0,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('slotIndex');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Material not found' },
        duration_ms: 5,
      });
      const result = await meshSetMaterial(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
        materialPath: '/Game/Materials/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await meshSetMaterial(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
        materialPath: '/Game/Materials/M_Red',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- meshGenerateCollision ---
  describe('meshGenerateCollision', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { meshPath: '/Game/Meshes/Cube', collisionType: 'convex' },
        duration_ms: 10,
      });
      const result = await meshGenerateCollision(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
        collisionType: 'convex',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('collisionType');
    });

    it('returns success with default collision type', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { meshPath: '/Game/Meshes/Cube', collisionType: 'simple' },
        duration_ms: 10,
      });
      const result = await meshGenerateCollision(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Mesh not found' },
        duration_ms: 5,
      });
      const result = await meshGenerateCollision(mockBridge, {
        meshPath: '/Game/Meshes/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- meshSetLOD ---
  describe('meshSetLOD', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          meshPath: '/Game/Meshes/Cube',
          lodIndex: 1,
          screenSize: 0.3,
          reductionPercent: 50,
        },
        duration_ms: 10,
      });
      const result = await meshSetLOD(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
        lodIndex: 1,
        screenSize: 0.3,
        reductionPercent: 50,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('lodIndex');
    });

    it('returns success with only required params', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { meshPath: '/Game/Meshes/Cube', lodIndex: 0 },
        duration_ms: 10,
      });
      const result = await meshSetLOD(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
        lodIndex: 0,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'LOD index out of range' },
        duration_ms: 5,
      });
      const result = await meshSetLOD(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
        lodIndex: 99,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('socket closed'));
      const result = await meshSetLOD(mockBridge, {
        meshPath: '/Game/Meshes/Cube',
        lodIndex: 1,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('socket closed');
    });
  });
});
