import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { geoscriptMeshBoolean } from '../../../src/tools/geoscript/mesh-boolean.js';
import { geoscriptMeshTransform } from '../../../src/tools/geoscript/mesh-transform.js';
import { geoscriptGetInfo } from '../../../src/tools/geoscript/get-info.js';

describe('geoscript tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- geoscriptMeshBoolean ---
  describe('geoscriptMeshBoolean', () => {
    it('returns success on valid union operation', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          targetMesh: '/Game/Meshes/CubeA',
          toolMesh: '/Game/Meshes/CubeB',
          operation: 'union',
          success: true,
        },
        duration_ms: 10,
      });
      const result = await geoscriptMeshBoolean(mockBridge, {
        targetMesh: '/Game/Meshes/CubeA',
        toolMesh: '/Game/Meshes/CubeB',
        operation: 'union',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.success).toBe(true);
      expect(parsed.result.operation).toBe('union');
    });

    it('returns error when target mesh not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8901, message: 'Target mesh not found: /Game/Meshes/Missing' },
        duration_ms: 5,
      });
      const result = await geoscriptMeshBoolean(mockBridge, {
        targetMesh: '/Game/Meshes/Missing',
        toolMesh: '/Game/Meshes/CubeB',
        operation: 'subtract',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- geoscriptMeshTransform ---
  describe('geoscriptMeshTransform', () => {
    it('returns success on simplify operation', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          meshPath: '/Game/Meshes/HighResMesh',
          operation: 'simplify',
          params: { targetTriangleCount: 500 },
          success: true,
        },
        duration_ms: 10,
      });
      const result = await geoscriptMeshTransform(mockBridge, {
        meshPath: '/Game/Meshes/HighResMesh',
        operation: 'simplify',
        params: { targetTriangleCount: 500 },
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.success).toBe(true);
      expect(parsed.result.operation).toBe('simplify');
    });

    it('returns error when mesh not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8911, message: 'Mesh not found: /Game/Meshes/Missing' },
        duration_ms: 5,
      });
      const result = await geoscriptMeshTransform(mockBridge, {
        meshPath: '/Game/Meshes/Missing',
        operation: 'remesh',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- geoscriptGetInfo ---
  describe('geoscriptGetInfo', () => {
    it('returns success with mesh geometry info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          meshPath: '/Game/Meshes/Cube',
          vertexCount: 24,
          triangleCount: 12,
          bounds: {
            min: { x: -50, y: -50, z: 0 },
            max: { x: 50, y: 50, z: 100 },
          },
        },
        duration_ms: 10,
      });
      const result = await geoscriptGetInfo(mockBridge, { meshPath: '/Game/Meshes/Cube' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('vertexCount');
      expect(parsed.result).toHaveProperty('triangleCount');
      expect(parsed.result).toHaveProperty('bounds');
    });

    it('returns error when mesh not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8920, message: 'Mesh not found: /Game/Meshes/Missing' },
        duration_ms: 5,
      });
      const result = await geoscriptGetInfo(mockBridge, { meshPath: '/Game/Meshes/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
