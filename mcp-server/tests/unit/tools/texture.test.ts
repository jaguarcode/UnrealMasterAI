import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { textureImport } from '../../../src/tools/texture/import.js';
import { textureGetInfo } from '../../../src/tools/texture/get-info.js';
import { textureSetCompression } from '../../../src/tools/texture/set-compression.js';
import { textureCreateRenderTarget } from '../../../src/tools/texture/create-render-target.js';
import { textureResize } from '../../../src/tools/texture/resize.js';
import { textureListTextures } from '../../../src/tools/texture/list-textures.js';

describe('texture tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  describe('textureImport', () => {
    it('returns success with imported texture info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { importedPath: '/Game/Textures/T_Test', sourcePath: '/tmp/test.png' },
        duration_ms: 10,
      });
      const result = await textureImport(mockBridge, {
        filePath: '/tmp/test.png',
        destinationPath: '/Game/Textures',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('importedPath');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8000, message: 'Import failed' },
        duration_ms: 5,
      });
      const result = await textureImport(mockBridge, {
        filePath: '/bad.png',
        destinationPath: '/Game/Textures',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Connection lost'));
      const result = await textureImport(mockBridge, {
        filePath: '/tmp/test.png',
        destinationPath: '/Game/Textures',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Connection lost');
    });
  });

  describe('textureGetInfo', () => {
    it('returns texture info on success', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          texturePath: '/Game/Textures/T_Test',
          width: 1024,
          height: 1024,
          compressionSettings: 'TC_DEFAULT',
          lodGroup: 'TEXTUREGROUP_World',
          maxTextureSize: 0,
          lodBias: 0,
        },
        duration_ms: 10,
      });
      const result = await textureGetInfo(mockBridge, { texturePath: '/Game/Textures/T_Test' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('width');
      expect(parsed.result).toHaveProperty('compressionSettings');
    });

    it('returns error when texture not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8010, message: "Texture not found at path '/Game/Textures/Missing'" },
        duration_ms: 5,
      });
      const result = await textureGetInfo(mockBridge, { texturePath: '/Game/Textures/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Timeout'));
      const result = await textureGetInfo(mockBridge, { texturePath: '/Game/Textures/T_Test' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Timeout');
    });
  });

  describe('textureSetCompression', () => {
    it('returns success after setting compression', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { texturePath: '/Game/Textures/T_Test', compressionType: 'Normalmap' },
        duration_ms: 10,
      });
      const result = await textureSetCompression(mockBridge, {
        texturePath: '/Game/Textures/T_Test',
        compressionType: 'Normalmap',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.compressionType).toBe('Normalmap');
    });

    it('returns error for invalid compression type', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8022, message: "Unknown compressionType 'BadType'" },
        duration_ms: 5,
      });
      const result = await textureSetCompression(mockBridge, {
        texturePath: '/Game/Textures/T_Test',
        compressionType: 'BadType',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Bridge error'));
      const result = await textureSetCompression(mockBridge, {
        texturePath: '/Game/Textures/T_Test',
        compressionType: 'Default',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Bridge error');
    });
  });

  describe('textureCreateRenderTarget', () => {
    it('returns success with created render target info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          assetPath: '/Game/RenderTargets/RT_Test',
          assetName: 'RT_Test',
          width: 512,
          height: 512,
          format: 'RGBA16f',
        },
        duration_ms: 10,
      });
      const result = await textureCreateRenderTarget(mockBridge, {
        assetName: 'RT_Test',
        assetPath: '/Game/RenderTargets',
        width: 512,
        height: 512,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('assetPath');
      expect(parsed.result.width).toBe(512);
    });

    it('returns error when creation fails', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8031, message: 'Failed to create RenderTarget2D' },
        duration_ms: 5,
      });
      const result = await textureCreateRenderTarget(mockBridge, {
        assetName: 'RT_Test',
        assetPath: '/Game/RenderTargets',
        width: 512,
        height: 512,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Network error'));
      const result = await textureCreateRenderTarget(mockBridge, {
        assetName: 'RT_Test',
        assetPath: '/Game/RenderTargets',
        width: 256,
        height: 256,
        format: 'R32f',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Network error');
    });
  });

  describe('textureResize', () => {
    it('returns success after resizing texture', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { texturePath: '/Game/Textures/T_Test', maxSize: 512, lodBias: 0 },
        duration_ms: 10,
      });
      const result = await textureResize(mockBridge, {
        texturePath: '/Game/Textures/T_Test',
        maxSize: 512,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.maxSize).toBe(512);
    });

    it('returns error for invalid max size', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8042, message: 'maxSize must be a power of 2' },
        duration_ms: 5,
      });
      const result = await textureResize(mockBridge, {
        texturePath: '/Game/Textures/T_Test',
        maxSize: 300,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('UE crash'));
      const result = await textureResize(mockBridge, {
        texturePath: '/Game/Textures/T_Test',
        maxSize: 1024,
        lodBias: 2,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('UE crash');
    });
  });

  describe('textureListTextures', () => {
    it('returns list of textures in directory', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          directory: '/Game/Textures',
          filter: '',
          count: 2,
          textures: [
            { assetName: 'T_Rock', packagePath: '/Game/Textures', objectPath: '/Game/Textures/T_Rock' },
            { assetName: 'T_Dirt', packagePath: '/Game/Textures', objectPath: '/Game/Textures/T_Dirt' },
          ],
        },
        duration_ms: 10,
      });
      const result = await textureListTextures(mockBridge, { directory: '/Game/Textures' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.count).toBe(2);
      expect(parsed.result.textures).toHaveLength(2);
    });

    it('returns filtered list when filter provided', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          directory: '/Game',
          filter: 'Rock',
          count: 1,
          textures: [
            { assetName: 'T_Rock', packagePath: '/Game/Textures', objectPath: '/Game/Textures/T_Rock' },
          ],
        },
        duration_ms: 8,
      });
      const result = await textureListTextures(mockBridge, { directory: '/Game', filter: 'Rock' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.count).toBe(1);
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Registry error'));
      const result = await textureListTextures(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toBe('Registry error');
    });
  });
});
