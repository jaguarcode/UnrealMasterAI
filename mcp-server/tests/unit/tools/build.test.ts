import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { buildLightmaps } from '../../../src/tools/build/lightmaps.js';
import { buildGetMapCheck } from '../../../src/tools/build/get-map-check.js';
import { buildCookContent } from '../../../src/tools/build/cook-content.js';

describe('build tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- buildLightmaps ---
  describe('buildLightmaps', () => {
    it('returns success when lightmaps build is started', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { quality: 'Production', world: 'TestMap', started: true },
        duration_ms: 10,
      });
      const result = await buildLightmaps(mockBridge, { quality: 'Production' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.started).toBe(true);
      expect(parsed.result.quality).toBe('Production');
    });

    it('returns success with default quality when none specified', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { quality: 'Preview', world: 'TestMap', started: true },
        duration_ms: 10,
      });
      const result = await buildLightmaps(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5300, message: "Invalid quality: 'BadQuality'" },
        duration_ms: 5,
      });
      const result = await buildLightmaps(mockBridge, { quality: 'BadQuality' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('bridge unavailable'));
      const result = await buildLightmaps(mockBridge, { quality: 'High' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('bridge unavailable');
    });
  });

  // --- buildGetMapCheck ---
  describe('buildGetMapCheck', () => {
    it('returns success with errors and warnings lists', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          errors: [],
          warnings: [{ text: 'Lightmap UV overlap', category: 'WARNING' }],
          infos: [],
          errorCount: 0,
          warningCount: 1,
          infoCount: 0,
        },
        duration_ms: 10,
      });
      const result = await buildGetMapCheck(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.warningCount).toBe(1);
      expect(parsed.result.errorCount).toBe(0);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5301, message: 'No editor world available' },
        duration_ms: 5,
      });
      const result = await buildGetMapCheck(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await buildGetMapCheck(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- buildCookContent ---
  describe('buildCookContent', () => {
    it('returns success when cook is started for Windows', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { platform: 'Windows', started: true, message: "Cook job queued for platform 'Windows'." },
        duration_ms: 10,
      });
      const result = await buildCookContent(mockBridge, { platform: 'Windows' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.platform).toBe('Windows');
      expect(parsed.result.started).toBe(true);
    });

    it('returns success with default platform when none specified', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { platform: 'Windows', started: true },
        duration_ms: 10,
      });
      const result = await buildCookContent(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5310, message: "Invalid platform: 'PS5'" },
        duration_ms: 5,
      });
      const result = await buildCookContent(mockBridge, { platform: 'PS5' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
