import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { aiCreateBehaviorTree } from '../../../src/tools/ai/create-behavior-tree.js';
import { aiCreateBlackboard } from '../../../src/tools/ai/create-blackboard.js';
import { aiGetBehaviorTreeInfo } from '../../../src/tools/ai/get-behavior-tree-info.js';
import { aiGetBlackboardKeys } from '../../../src/tools/ai/get-blackboard-keys.js';
import { aiAddBlackboardKey } from '../../../src/tools/ai/add-blackboard-key.js';
import { aiConfigureNavMesh } from '../../../src/tools/ai/configure-nav-mesh.js';
import { aiGetNavMeshInfo } from '../../../src/tools/ai/get-nav-mesh-info.js';
import { aiCreateEqs } from '../../../src/tools/ai/create-eqs.js';

describe('ai tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- aiCreateBehaviorTree ---
  describe('aiCreateBehaviorTree', () => {
    it('returns success with created tree info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { treeName: 'EnemyBT', objectPath: '/Game/AI/EnemyBT.EnemyBT' },
        duration_ms: 10,
      });
      const result = await aiCreateBehaviorTree(mockBridge, {
        treeName: 'EnemyBT',
        treePath: '/Game/AI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('treeName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7600, message: "Failed to create BehaviorTree 'EnemyBT'" },
        duration_ms: 5,
      });
      const result = await aiCreateBehaviorTree(mockBridge, {
        treeName: 'EnemyBT',
        treePath: '/Game/AI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await aiCreateBehaviorTree(mockBridge, {
        treeName: 'EnemyBT',
        treePath: '/Game/AI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- aiCreateBlackboard ---
  describe('aiCreateBlackboard', () => {
    it('returns success with created blackboard info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { blackboardName: 'EnemyBB', objectPath: '/Game/AI/EnemyBB.EnemyBB' },
        duration_ms: 10,
      });
      const result = await aiCreateBlackboard(mockBridge, {
        blackboardName: 'EnemyBB',
        blackboardPath: '/Game/AI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('blackboardName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7601, message: "Failed to create Blackboard 'EnemyBB'" },
        duration_ms: 5,
      });
      const result = await aiCreateBlackboard(mockBridge, {
        blackboardName: 'EnemyBB',
        blackboardPath: '/Game/AI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- aiGetBehaviorTreeInfo ---
  describe('aiGetBehaviorTreeInfo', () => {
    it('returns success with tree metadata', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          treePath: '/Game/AI/EnemyBT',
          assetClass: 'BehaviorTree',
          blackboardPath: '/Game/AI/EnemyBB',
        },
        duration_ms: 10,
      });
      const result = await aiGetBehaviorTreeInfo(mockBridge, {
        treePath: '/Game/AI/EnemyBT',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('assetClass');
    });

    it('returns error when tree not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7602, message: 'BehaviorTree not found: /Game/AI/Missing' },
        duration_ms: 5,
      });
      const result = await aiGetBehaviorTreeInfo(mockBridge, {
        treePath: '/Game/AI/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- aiGetBlackboardKeys ---
  describe('aiGetBlackboardKeys', () => {
    it('returns success with key list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          blackboardPath: '/Game/AI/EnemyBB',
          keys: [{ keyName: 'TargetActor', keyType: 'BlackboardKeyType_Object' }],
          count: 1,
        },
        duration_ms: 10,
      });
      const result = await aiGetBlackboardKeys(mockBridge, {
        blackboardPath: '/Game/AI/EnemyBB',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.count).toBe(1);
    });

    it('returns error when blackboard not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7603, message: 'Blackboard not found: /Game/AI/Missing' },
        duration_ms: 5,
      });
      const result = await aiGetBlackboardKeys(mockBridge, {
        blackboardPath: '/Game/AI/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- aiAddBlackboardKey ---
  describe('aiAddBlackboardKey', () => {
    it('returns success when key added', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          blackboardPath: '/Game/AI/EnemyBB',
          keyName: 'TargetLocation',
          keyType: 'vector',
        },
        duration_ms: 10,
      });
      const result = await aiAddBlackboardKey(mockBridge, {
        blackboardPath: '/Game/AI/EnemyBB',
        keyName: 'TargetLocation',
        keyType: 'vector',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.keyName).toBe('TargetLocation');
    });

    it('returns error when blackboard not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7604, message: 'Blackboard not found: /Game/AI/Missing' },
        duration_ms: 5,
      });
      const result = await aiAddBlackboardKey(mockBridge, {
        blackboardPath: '/Game/AI/Missing',
        keyName: 'Health',
        keyType: 'float',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await aiAddBlackboardKey(mockBridge, {
        blackboardPath: '/Game/AI/EnemyBB',
        keyName: 'Health',
        keyType: 'float',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- aiConfigureNavMesh ---
  describe('aiConfigureNavMesh', () => {
    it('returns success with applied settings', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { applied: { agentRadius: 34.0, agentHeight: 144.0 } },
        duration_ms: 10,
      });
      const result = await aiConfigureNavMesh(mockBridge, {
        agentRadius: 34.0,
        agentHeight: 144.0,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.applied).toHaveProperty('agentRadius');
    });

    it('returns error when no nav mesh found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7610, message: 'No RecastNavMesh actor found in the current world' },
        duration_ms: 5,
      });
      const result = await aiConfigureNavMesh(mockBridge, { cellSize: 19.0 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- aiGetNavMeshInfo ---
  describe('aiGetNavMeshInfo', () => {
    it('returns success with nav mesh config', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          agentRadius: 34.0,
          agentHeight: 144.0,
          cellSize: 19.0,
          objectPath: '/Game/Maps/TestMap.RecastNavMesh',
        },
        duration_ms: 10,
      });
      const result = await aiGetNavMeshInfo(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('agentRadius');
    });

    it('returns error when no nav mesh found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7611, message: 'No RecastNavMesh actor found in the current world' },
        duration_ms: 5,
      });
      const result = await aiGetNavMeshInfo(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- aiCreateEqs ---
  describe('aiCreateEqs', () => {
    it('returns success with created EQS info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { queryName: 'FindCover', objectPath: '/Game/AI/FindCover.FindCover' },
        duration_ms: 10,
      });
      const result = await aiCreateEqs(mockBridge, {
        queryName: 'FindCover',
        queryPath: '/Game/AI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('queryName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 7620, message: "Failed to create EQS query 'FindCover'" },
        duration_ms: 5,
      });
      const result = await aiCreateEqs(mockBridge, {
        queryName: 'FindCover',
        queryPath: '/Game/AI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('bridge down'));
      const result = await aiCreateEqs(mockBridge, {
        queryName: 'FindCover',
        queryPath: '/Game/AI',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('bridge down');
    });
  });
});
