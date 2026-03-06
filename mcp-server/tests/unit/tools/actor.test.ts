import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { actorSpawn } from '../../../src/tools/actor/spawn.js';
import { actorDelete } from '../../../src/tools/actor/delete.js';
import { actorSetTransform } from '../../../src/tools/actor/set-transform.js';
import { actorGetProperties } from '../../../src/tools/actor/get-properties.js';
import { actorSetProperty } from '../../../src/tools/actor/set-property.js';
import { actorGetComponents } from '../../../src/tools/actor/get-components.js';
import { actorAddComponent } from '../../../src/tools/actor/add-component.js';
import { actorSelect } from '../../../src/tools/actor/select.js';

describe('actor tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- actorSpawn ---
  describe('actorSpawn', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { actorName: 'StaticMeshActor_1', className: '/Script/Engine.StaticMeshActor' },
        duration_ms: 10,
      });
      const result = await actorSpawn(mockBridge, { className: '/Script/Engine.StaticMeshActor' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('actorName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Actor class not found' },
        duration_ms: 5,
      });
      const result = await actorSpawn(mockBridge, { className: 'NonExistentClass' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await actorSpawn(mockBridge, { className: '/Script/Engine.StaticMeshActor' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- actorDelete ---
  describe('actorDelete', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { deleted: true, actorName: 'Cube_1' },
        duration_ms: 10,
      });
      const result = await actorDelete(mockBridge, { actorName: 'Cube_1' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.deleted).toBe(true);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Actor not found' },
        duration_ms: 5,
      });
      const result = await actorDelete(mockBridge, { actorName: 'Missing_Actor' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- actorSetTransform ---
  describe('actorSetTransform', () => {
    it('returns success with location update', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { actorName: 'Cube_1', location: { x: 100, y: 0, z: 0 } },
        duration_ms: 10,
      });
      const result = await actorSetTransform(mockBridge, {
        actorName: 'Cube_1',
        location: { x: 100, y: 0, z: 0 },
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('location');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Actor not found' },
        duration_ms: 5,
      });
      const result = await actorSetTransform(mockBridge, { actorName: 'Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- actorGetProperties ---
  describe('actorGetProperties', () => {
    it('returns success with properties object', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { actorName: 'Cube_1', properties: { label: 'Cube_1', class: 'StaticMeshActor' } },
        duration_ms: 10,
      });
      const result = await actorGetProperties(mockBridge, { actorName: 'Cube_1' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('properties');
    });

    it('returns error when actor not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Actor not found' },
        duration_ms: 5,
      });
      const result = await actorGetProperties(mockBridge, { actorName: 'Ghost' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- actorSetProperty ---
  describe('actorSetProperty', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { actorName: 'Cube_1', propertyName: 'bHidden', propertyValue: 'true', updated: true },
        duration_ms: 10,
      });
      const result = await actorSetProperty(mockBridge, {
        actorName: 'Cube_1',
        propertyName: 'bHidden',
        propertyValue: 'true',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.updated).toBe(true);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5103, message: 'Failed to set property' },
        duration_ms: 5,
      });
      const result = await actorSetProperty(mockBridge, {
        actorName: 'Cube_1',
        propertyName: 'InvalidProp',
        propertyValue: 'xyz',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- actorGetComponents ---
  describe('actorGetComponents', () => {
    it('returns success with components list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          actorName: 'Cube_1',
          components: [{ name: 'StaticMeshComponent0', class: 'StaticMeshComponent' }],
          count: 1,
        },
        duration_ms: 10,
      });
      const result = await actorGetComponents(mockBridge, { actorName: 'Cube_1' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.components).toHaveLength(1);
    });

    it('returns error when actor not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Actor not found' },
        duration_ms: 5,
      });
      const result = await actorGetComponents(mockBridge, { actorName: 'Ghost' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- actorAddComponent ---
  describe('actorAddComponent', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { actorName: 'Cube_1', componentClass: 'PointLightComponent', componentName: 'PointLight_0', added: true },
        duration_ms: 10,
      });
      const result = await actorAddComponent(mockBridge, {
        actorName: 'Cube_1',
        componentClass: '/Script/Engine.PointLightComponent',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.added).toBe(true);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Component class not found' },
        duration_ms: 5,
      });
      const result = await actorAddComponent(mockBridge, {
        actorName: 'Cube_1',
        componentClass: 'NonExistentComponent',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- actorSelect ---
  describe('actorSelect', () => {
    it('returns success with selected actors', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { selected: ['Cube_1', 'Sphere_1'], count: 2 },
        duration_ms: 10,
      });
      const result = await actorSelect(mockBridge, { actorNames: ['Cube_1', 'Sphere_1'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.count).toBe(2);
    });

    it('returns error when actors not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: "Actors not found: ['Ghost_1']" },
        duration_ms: 5,
      });
      const result = await actorSelect(mockBridge, { actorNames: ['Ghost_1'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
