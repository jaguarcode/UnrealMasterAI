import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { animListMontages } from '../../../src/tools/animation/list-montages.js';
import { animGetBlendSpace } from '../../../src/tools/animation/get-blend-space.js';
import { animCreateMontage } from '../../../src/tools/animation/create-montage.js';
import { animListSequences } from '../../../src/tools/animation/list-sequences.js';
import { animGetSkeletonInfo } from '../../../src/tools/animation/get-skeleton-info.js';

describe('animation tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- animListMontages ---
  describe('animListMontages', () => {
    it('returns success with montage list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { montages: ['/Game/Anim/Run_Montage'], count: 1 },
        duration_ms: 10,
      });
      const result = await animListMontages(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('montages');
    });

    it('returns success filtered by skeleton', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { montages: [], count: 0 },
        duration_ms: 10,
      });
      const result = await animListMontages(mockBridge, {
        skeletonPath: '/Game/Skeletons/HeroSkeleton',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.count).toBe(0);
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('bridge down'));
      const result = await animListMontages(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('bridge down');
    });
  });

  // --- animGetBlendSpace ---
  describe('animGetBlendSpace', () => {
    it('returns success with blend space info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { blendSpacePath: '/Game/Anim/WalkRun_BS', skeletonPath: '/Game/Skeletons/Hero', assetClass: 'BlendSpace' },
        duration_ms: 10,
      });
      const result = await animGetBlendSpace(mockBridge, {
        blendSpacePath: '/Game/Anim/WalkRun_BS',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('blendSpacePath');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'BlendSpace not found' },
        duration_ms: 5,
      });
      const result = await animGetBlendSpace(mockBridge, {
        blendSpacePath: '/Game/Anim/Missing_BS',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- animCreateMontage ---
  describe('animCreateMontage', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { montageName: 'Attack_Montage', objectPath: '/Game/Anim/Attack_Montage.Attack_Montage' },
        duration_ms: 10,
      });
      const result = await animCreateMontage(mockBridge, {
        montageName: 'Attack_Montage',
        montagePath: '/Game/Anim',
        sequencePath: '/Game/Anim/Attack_Seq',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('montageName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'AnimSequence not found' },
        duration_ms: 5,
      });
      const result = await animCreateMontage(mockBridge, {
        montageName: 'Bad_Montage',
        montagePath: '/Game/Anim',
        sequencePath: '/Game/Anim/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await animCreateMontage(mockBridge, {
        montageName: 'Attack_Montage',
        montagePath: '/Game/Anim',
        sequencePath: '/Game/Anim/Attack_Seq',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- animListSequences ---
  describe('animListSequences', () => {
    it('returns success with sequence list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { sequences: ['/Game/Anim/Run_Seq', '/Game/Anim/Idle_Seq'], count: 2 },
        duration_ms: 10,
      });
      const result = await animListSequences(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.count).toBe(2);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5100, message: 'Registry unavailable' },
        duration_ms: 5,
      });
      const result = await animListSequences(mockBridge, { skeletonPath: '/Game/Skeletons/Hero' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- animGetSkeletonInfo ---
  describe('animGetSkeletonInfo', () => {
    it('returns success with skeleton info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { skeletonPath: '/Game/Skeletons/Hero', assetClass: 'Skeleton', boneCount: 67 },
        duration_ms: 10,
      });
      const result = await animGetSkeletonInfo(mockBridge, {
        skeletonPath: '/Game/Skeletons/Hero',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('boneCount');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Skeleton not found' },
        duration_ms: 5,
      });
      const result = await animGetSkeletonInfo(mockBridge, {
        skeletonPath: '/Game/Skeletons/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
