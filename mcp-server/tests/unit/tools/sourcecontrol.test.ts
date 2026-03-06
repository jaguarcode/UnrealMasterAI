import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { sourcecontrolGetStatus } from '../../../src/tools/sourcecontrol/get-status.js';
import { sourcecontrolCheckout } from '../../../src/tools/sourcecontrol/checkout.js';
import { sourcecontrolDiff } from '../../../src/tools/sourcecontrol/diff.js';

describe('sourcecontrol tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- sourcecontrolGetStatus ---
  describe('sourcecontrolGetStatus', () => {
    it('returns success with status list for given paths', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          statuses: [{ assetPath: '/Game/Maps/TestMap', isCheckedOut: false, isModified: true, statusString: 'Modified' }],
          count: 1,
        },
        duration_ms: 10,
      });
      const result = await sourcecontrolGetStatus(mockBridge, { assetPaths: ['/Game/Maps/TestMap'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('statuses');
      expect(parsed.result.count).toBe(1);
    });

    it('returns success with no paths (all assets)', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { statuses: [], count: 0 },
        duration_ms: 10,
      });
      const result = await sourcecontrolGetStatus(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5200, message: 'No source control provider available' },
        duration_ms: 5,
      });
      const result = await sourcecontrolGetStatus(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await sourcecontrolGetStatus(mockBridge, { assetPaths: ['/Game/Maps/TestMap'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- sourcecontrolCheckout ---
  describe('sourcecontrolCheckout', () => {
    it('returns success with checked out paths', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { checkedOut: ['/Game/Maps/TestMap'], success: 1, errors: 0 },
        duration_ms: 10,
      });
      const result = await sourcecontrolCheckout(mockBridge, { assetPaths: ['/Game/Maps/TestMap'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.checkedOut).toHaveLength(1);
      expect(parsed.result.errors).toBe(0);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5200, message: 'No source control provider available' },
        duration_ms: 5,
      });
      const result = await sourcecontrolCheckout(mockBridge, { assetPaths: ['/Game/Blueprints/BP_Player'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await sourcecontrolCheckout(mockBridge, { assetPaths: ['/Game/Maps/TestMap'] });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- sourcecontrolDiff ---
  describe('sourcecontrolDiff', () => {
    it('returns success with diff info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          diff: {
            assetPath: '/Game/Maps/TestMap',
            isModified: true,
            isCheckedOut: true,
            statusString: 'Checked Out - Modified',
          },
        },
        duration_ms: 10,
      });
      const result = await sourcecontrolDiff(mockBridge, { assetPath: '/Game/Maps/TestMap' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.diff).toHaveProperty('assetPath');
      expect(parsed.result.diff.isModified).toBe(true);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5202, message: 'Could not get state for asset' },
        duration_ms: 5,
      });
      const result = await sourcecontrolDiff(mockBridge, { assetPath: '/Game/Maps/NonExistent' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
