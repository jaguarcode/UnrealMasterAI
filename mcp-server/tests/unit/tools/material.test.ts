import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { materialCreate } from '../../../src/tools/material/create.js';
import { materialSetParameter } from '../../../src/tools/material/set-parameter.js';
import { materialGetParameters } from '../../../src/tools/material/get-parameters.js';
import { materialCreateInstance } from '../../../src/tools/material/create-instance.js';
import { materialSetTexture } from '../../../src/tools/material/set-texture.js';
import { materialGetNodes } from '../../../src/tools/material/get-nodes.js';

describe('material tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- materialCreate ---
  describe('materialCreate', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { materialName: 'MyMaterial', objectPath: '/Game/Materials/MyMaterial.MyMaterial' },
        duration_ms: 10,
      });
      const result = await materialCreate(mockBridge, {
        materialName: 'MyMaterial',
        materialPath: '/Game/Materials',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('materialName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Failed to create material' },
        duration_ms: 5,
      });
      const result = await materialCreate(mockBridge, {
        materialName: 'BadMaterial',
        materialPath: '/Game/Materials',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await materialCreate(mockBridge, {
        materialName: 'MyMaterial',
        materialPath: '/Game/Materials',
        materialType: 'Opaque',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- materialSetParameter ---
  describe('materialSetParameter', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { materialPath: '/Game/Materials/MyMat', parameterName: 'Roughness', value: 0.5 },
        duration_ms: 10,
      });
      const result = await materialSetParameter(mockBridge, {
        materialPath: '/Game/Materials/MyMat',
        parameterName: 'Roughness',
        value: 0.5,
        parameterType: 'scalar',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('parameterName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Material not found' },
        duration_ms: 5,
      });
      const result = await materialSetParameter(mockBridge, {
        materialPath: '/Game/Materials/Missing',
        parameterName: 'Roughness',
        value: 0.5,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- materialGetParameters ---
  describe('materialGetParameters', () => {
    it('returns success with parameter lists', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          materialPath: '/Game/Materials/MyMat',
          scalarParameters: [{ name: 'Roughness', value: 0.5 }],
          vectorParameters: [],
          textureParameters: [],
          staticSwitchParameters: [],
        },
        duration_ms: 10,
      });
      const result = await materialGetParameters(mockBridge, {
        materialPath: '/Game/Materials/MyMat',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('scalarParameters');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Material not found' },
        duration_ms: 5,
      });
      const result = await materialGetParameters(mockBridge, {
        materialPath: '/Game/Materials/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- materialCreateInstance ---
  describe('materialCreateInstance', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          instanceName: 'MyMat_Inst',
          instancePath: '/Game/Materials/Instances',
          parentPath: '/Game/Materials/MyMat',
          objectPath: '/Game/Materials/Instances/MyMat_Inst.MyMat_Inst',
        },
        duration_ms: 10,
      });
      const result = await materialCreateInstance(mockBridge, {
        parentPath: '/Game/Materials/MyMat',
        instanceName: 'MyMat_Inst',
        instancePath: '/Game/Materials/Instances',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('instanceName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Parent material not found' },
        duration_ms: 5,
      });
      const result = await materialCreateInstance(mockBridge, {
        parentPath: '/Game/Materials/Missing',
        instanceName: 'MyMat_Inst',
        instancePath: '/Game/Materials/Instances',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- materialSetTexture ---
  describe('materialSetTexture', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          materialPath: '/Game/Materials/MyMat_Inst',
          parameterName: 'BaseColorTexture',
          texturePath: '/Game/Textures/MyTex',
        },
        duration_ms: 10,
      });
      const result = await materialSetTexture(mockBridge, {
        materialPath: '/Game/Materials/MyMat_Inst',
        parameterName: 'BaseColorTexture',
        texturePath: '/Game/Textures/MyTex',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('texturePath');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Texture not found' },
        duration_ms: 5,
      });
      const result = await materialSetTexture(mockBridge, {
        materialPath: '/Game/Materials/MyMat_Inst',
        parameterName: 'BaseColorTexture',
        texturePath: '/Game/Textures/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- materialGetNodes ---
  describe('materialGetNodes', () => {
    it('returns success with node list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          materialPath: '/Game/Materials/MyMat',
          nodeCount: 2,
          nodes: [
            { nodeType: 'MaterialExpressionConstant', objectPath: '/Game/Materials/MyMat.MyMat:0' },
            { nodeType: 'MaterialExpressionTextureSample', objectPath: '/Game/Materials/MyMat.MyMat:1' },
          ],
        },
        duration_ms: 10,
      });
      const result = await materialGetNodes(mockBridge, {
        materialPath: '/Game/Materials/MyMat',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('nodes');
      expect(parsed.result.nodeCount).toBe(2);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Material not found' },
        duration_ms: 5,
      });
      const result = await materialGetNodes(mockBridge, {
        materialPath: '/Game/Materials/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
