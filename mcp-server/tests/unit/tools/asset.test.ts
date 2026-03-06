import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { assetCreate } from '../../../src/tools/asset/create.js';
import { assetDuplicate } from '../../../src/tools/asset/duplicate.js';
import { assetRename } from '../../../src/tools/asset/rename.js';
import { assetDelete } from '../../../src/tools/asset/delete.js';
import { assetImport } from '../../../src/tools/asset/import.js';
import { assetExport } from '../../../src/tools/asset/export.js';
import { assetGetReferences } from '../../../src/tools/asset/get-references.js';
import { assetSetMetadata } from '../../../src/tools/asset/set-metadata.js';

describe('asset tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- assetCreate ---
  describe('assetCreate', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { assetName: 'MyBlueprint', objectPath: '/Game/Blueprints/MyBlueprint.MyBlueprint' },
        duration_ms: 10,
      });
      const result = await assetCreate(mockBridge, {
        assetName: 'MyBlueprint',
        assetPath: '/Game/Blueprints',
        assetType: 'BlueprintFactory',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('assetName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Failed to create asset' },
        duration_ms: 5,
      });
      const result = await assetCreate(mockBridge, {
        assetName: 'Bad',
        assetPath: '/Game/Blueprints',
        assetType: 'BlueprintFactory',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await assetCreate(mockBridge, {
        assetName: 'MyBP',
        assetPath: '/Game/Blueprints',
        assetType: 'BlueprintFactory',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- assetDuplicate ---
  describe('assetDuplicate', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { newPath: '/Game/Blueprints/CopyBP' },
        duration_ms: 10,
      });
      const result = await assetDuplicate(mockBridge, {
        sourcePath: '/Game/Blueprints/MyBP',
        destinationPath: '/Game/Blueprints',
        newName: 'CopyBP',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Duplicate failed' },
        duration_ms: 5,
      });
      const result = await assetDuplicate(mockBridge, {
        sourcePath: '/Game/Blueprints/MyBP',
        destinationPath: '/Game/Blueprints',
        newName: 'CopyBP',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- assetRename ---
  describe('assetRename', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { oldPath: '/Game/Blueprints/OldBP', newPath: '/Game/Blueprints/NewBP' },
        duration_ms: 10,
      });
      const result = await assetRename(mockBridge, {
        assetPath: '/Game/Blueprints/OldBP',
        newName: 'NewBP',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Rename failed' },
        duration_ms: 5,
      });
      const result = await assetRename(mockBridge, {
        assetPath: '/Game/Blueprints/OldBP',
        newName: 'NewBP',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- assetDelete ---
  describe('assetDelete', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { deleted: true },
        duration_ms: 10,
      });
      const result = await assetDelete(mockBridge, {
        assetPath: '/Game/Blueprints/OldBP',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Delete failed' },
        duration_ms: 5,
      });
      const result = await assetDelete(mockBridge, {
        assetPath: '/Game/Blueprints/OldBP',
        forceDelete: true,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- assetImport ---
  describe('assetImport', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { importedAssets: ['/Game/Textures/MyTex'] },
        duration_ms: 10,
      });
      const result = await assetImport(mockBridge, {
        filePath: 'C:/art/texture.png',
        destinationPath: '/Game/Textures',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Import failed' },
        duration_ms: 5,
      });
      const result = await assetImport(mockBridge, {
        filePath: 'C:/art/missing.png',
        destinationPath: '/Game/Textures',
        assetName: 'MyTex',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- assetExport ---
  describe('assetExport', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { exported: true, outputPath: 'C:/out/mesh.fbx' },
        duration_ms: 10,
      });
      const result = await assetExport(mockBridge, {
        assetPath: '/Game/Meshes/Cube',
        outputPath: 'C:/out/mesh.fbx',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Export failed' },
        duration_ms: 5,
      });
      const result = await assetExport(mockBridge, {
        assetPath: '/Game/Meshes/Cube',
        outputPath: 'C:/out/mesh.fbx',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- assetGetReferences ---
  describe('assetGetReferences', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { referencers: ['/Game/Maps/TestLevel'], count: 1 },
        duration_ms: 10,
      });
      const result = await assetGetReferences(mockBridge, {
        assetPath: '/Game/Meshes/Cube',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('referencers');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Asset not found' },
        duration_ms: 5,
      });
      const result = await assetGetReferences(mockBridge, {
        assetPath: '/Game/Meshes/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- assetSetMetadata ---
  describe('assetSetMetadata', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { updated: true, key: 'Author', value: 'Alice' },
        duration_ms: 10,
      });
      const result = await assetSetMetadata(mockBridge, {
        assetPath: '/Game/Blueprints/MyBP',
        key: 'Author',
        value: 'Alice',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Asset not found' },
        duration_ms: 5,
      });
      const result = await assetSetMetadata(mockBridge, {
        assetPath: '/Game/Blueprints/Missing',
        key: 'Author',
        value: 'Alice',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
