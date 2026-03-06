import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { editorGetSelection } from '../../../src/tools/editor/get-selection.js';
import { editorGetViewport } from '../../../src/tools/editor/get-viewport.js';
import { editorSetSelection } from '../../../src/tools/editor/set-selection.js';
import { editorGetRecentActivity } from '../../../src/tools/editor/get-recent-activity.js';
import { editorBatchOperation } from '../../../src/tools/editor/batch-operation.js';

describe('editor utility tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- editorGetSelection ---
  describe('editorGetSelection', () => {
    it('returns success with selected actors', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { selectedActors: [{ name: 'Cube_1', class: 'StaticMeshActor' }], actorCount: 1 },
        duration_ms: 10,
      });
      const result = await editorGetSelection(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.actorCount).toBe(1);
    });

    it('returns success with asset selection when assetSelection=true', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          selectedActors: [],
          actorCount: 0,
          selectedAssets: [{ name: 'MyTexture', path: '/Game/Textures/MyTexture', class: 'Texture2D' }],
          assetCount: 1,
        },
        duration_ms: 10,
      });
      const result = await editorGetSelection(mockBridge, { assetSelection: true });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.assetCount).toBe(1);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Subsystem not available' },
        duration_ms: 5,
      });
      const result = await editorGetSelection(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await editorGetSelection(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- editorGetViewport ---
  describe('editorGetViewport', () => {
    it('returns success with camera info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          cameraLocation: { x: 0, y: 0, z: 200 },
          cameraRotation: { pitch: -30, yaw: 0, roll: 0 },
          fieldOfView: 90,
        },
        duration_ms: 10,
      });
      const result = await editorGetViewport(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.fieldOfView).toBe(90);
      expect(parsed.result.cameraLocation.z).toBe(200);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'No editor world available' },
        duration_ms: 5,
      });
      const result = await editorGetViewport(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await editorGetViewport(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- editorSetSelection ---
  describe('editorSetSelection', () => {
    it('returns success when actors are selected', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { selected: ['Cube_1', 'Sphere_1'], count: 2 },
        duration_ms: 10,
      });
      const result = await editorSetSelection(mockBridge, { actorNames: ['Cube_1', 'Sphere_1'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.count).toBe(2);
    });

    it('returns success with deselectOthers=false', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { selected: ['Cube_1'], count: 1 },
        duration_ms: 10,
      });
      const result = await editorSetSelection(mockBridge, { actorNames: ['Cube_1'], deselectOthers: false });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error when actor not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Actors not found: [Missing_Actor]' },
        duration_ms: 5,
      });
      const result = await editorSetSelection(mockBridge, { actorNames: ['Missing_Actor'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('not connected'));
      const result = await editorSetSelection(mockBridge, { actorNames: ['Cube_1'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('not connected');
    });
  });

  // --- editorGetRecentActivity ---
  describe('editorGetRecentActivity', () => {
    it('returns success with recent assets', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          recentAssets: [{ name: 'MyMesh', path: '/Game/Meshes', class: 'StaticMesh' }],
          assetCount: 1,
          currentLevel: 'NewMap',
        },
        duration_ms: 10,
      });
      const result = await editorGetRecentActivity(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.assetCount).toBe(1);
      expect(parsed.result.currentLevel).toBe('NewMap');
    });

    it('returns success with custom count', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { recentAssets: [], assetCount: 0, currentLevel: 'NewMap' },
        duration_ms: 10,
      });
      const result = await editorGetRecentActivity(mockBridge, { count: 5 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Asset registry unavailable' },
        duration_ms: 5,
      });
      const result = await editorGetRecentActivity(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await editorGetRecentActivity(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- editorBatchOperation ---
  describe('editorBatchOperation', () => {
    it('returns success for rename operation', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          operation: 'rename',
          results: [{ target: '/Game/Meshes/OldName', newName: 'NewName', status: 'renamed' }],
          errors: [],
          successCount: 1,
          errorCount: 0,
        },
        duration_ms: 10,
      });
      const result = await editorBatchOperation(mockBridge, {
        operation: 'rename',
        targets: ['/Game/Meshes/OldName'],
        args: { newName: 'NewName' },
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.successCount).toBe(1);
      expect(parsed.result.errorCount).toBe(0);
    });

    it('returns success for tag operation', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          operation: 'tag',
          results: [{ target: '/Game/Meshes/Cube', tag: 'hero_prop', status: 'tagged' }],
          errors: [],
          successCount: 1,
          errorCount: 0,
        },
        duration_ms: 10,
      });
      const result = await editorBatchOperation(mockBridge, {
        operation: 'tag',
        targets: ['/Game/Meshes/Cube'],
        args: { tag: 'hero_prop' },
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.operation).toBe('tag');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Invalid operation' },
        duration_ms: 5,
      });
      const result = await editorBatchOperation(mockBridge, {
        operation: 'rename',
        targets: ['/Game/Meshes/Cube'],
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await editorBatchOperation(mockBridge, {
        operation: 'move',
        targets: ['/Game/Meshes/Cube'],
        args: { destination: '/Game/NewFolder' },
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });
});
