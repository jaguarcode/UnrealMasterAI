import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { physicsCreateAsset } from '../../../src/tools/physics/create-asset.js';
import { physicsGetInfo } from '../../../src/tools/physics/get-info.js';
import { physicsSetProfile } from '../../../src/tools/physics/set-profile.js';
import { physicsCreateMaterial } from '../../../src/tools/physics/create-material.js';
import { physicsSetConstraint } from '../../../src/tools/physics/set-constraint.js';

describe('physics tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- physicsCreateAsset ---
  describe('physicsCreateAsset', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { assetName: 'MyPhysicsAsset', assetPath: '/Game/Physics', objectPath: '/Game/Physics/MyPhysicsAsset.MyPhysicsAsset' },
        duration_ms: 10,
      });
      const result = await physicsCreateAsset(mockBridge, { assetName: 'MyPhysicsAsset', assetPath: '/Game/Physics' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('assetName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8400, message: "Failed to create PhysicsAsset 'MyPhysicsAsset'" },
        duration_ms: 5,
      });
      const result = await physicsCreateAsset(mockBridge, { assetName: 'MyPhysicsAsset', assetPath: '/Game/Physics' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- physicsGetInfo ---
  describe('physicsGetInfo', () => {
    it('returns success with bodies and constraints', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          physicsAssetPath: '/Game/Physics/MyPhysicsAsset',
          bodies: [{ boneName: 'Spine', collisionEnabled: 'QueryAndPhysics' }],
          bodyCount: 1,
          constraints: [{ jointName: 'Spine_Joint' }],
          constraintCount: 1,
        },
        duration_ms: 10,
      });
      const result = await physicsGetInfo(mockBridge, { physicsAssetPath: '/Game/Physics/MyPhysicsAsset' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.bodies).toHaveLength(1);
    });

    it('returns error when asset not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8401, message: "PhysicsAsset not found: '/Game/Missing'" },
        duration_ms: 5,
      });
      const result = await physicsGetInfo(mockBridge, { physicsAssetPath: '/Game/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- physicsSetProfile ---
  describe('physicsSetProfile', () => {
    it('returns success when profile is set', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { assetPath: '/Game/Physics/MyPhysicsAsset', bodyName: 'Spine', profileName: 'BlockAll', updated: true },
        duration_ms: 10,
      });
      const result = await physicsSetProfile(mockBridge, {
        assetPath: '/Game/Physics/MyPhysicsAsset',
        bodyName: 'Spine',
        profileName: 'BlockAll',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.updated).toBe(true);
    });

    it('returns error when body not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8412, message: "Body 'Missing' not found in PhysicsAsset" },
        duration_ms: 5,
      });
      const result = await physicsSetProfile(mockBridge, {
        assetPath: '/Game/Physics/MyPhysicsAsset',
        bodyName: 'Missing',
        profileName: 'BlockAll',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- physicsCreateMaterial ---
  describe('physicsCreateMaterial', () => {
    it('returns success with friction and restitution', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          materialName: 'IceMaterial',
          materialPath: '/Game/Physics',
          objectPath: '/Game/Physics/IceMaterial.IceMaterial',
          friction: 0.1,
          restitution: 0.8,
        },
        duration_ms: 10,
      });
      const result = await physicsCreateMaterial(mockBridge, {
        materialName: 'IceMaterial',
        materialPath: '/Game/Physics',
        friction: 0.1,
        restitution: 0.8,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.friction).toBe(0.1);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8420, message: "Failed to create PhysicalMaterial 'IceMaterial'" },
        duration_ms: 5,
      });
      const result = await physicsCreateMaterial(mockBridge, {
        materialName: 'IceMaterial',
        materialPath: '/Game/Physics',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- physicsSetConstraint ---
  describe('physicsSetConstraint', () => {
    it('returns success when constraint is updated', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          physicsAssetPath: '/Game/Physics/MyPhysicsAsset',
          constraintName: 'Spine_Joint',
          linearLimit: 10.0,
          angularLimit: 45.0,
          updated: true,
        },
        duration_ms: 10,
      });
      const result = await physicsSetConstraint(mockBridge, {
        physicsAssetPath: '/Game/Physics/MyPhysicsAsset',
        constraintName: 'Spine_Joint',
        linearLimit: 10.0,
        angularLimit: 45.0,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.updated).toBe(true);
    });

    it('returns error when constraint not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8432, message: "Constraint 'Missing_Joint' not found in PhysicsAsset" },
        duration_ms: 5,
      });
      const result = await physicsSetConstraint(mockBridge, {
        physicsAssetPath: '/Game/Physics/MyPhysicsAsset',
        constraintName: 'Missing_Joint',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
