import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { curveCreate } from '../../../src/tools/curve/create.js';
import { curveSetKeys } from '../../../src/tools/curve/set-keys.js';
import { curveGetInfo } from '../../../src/tools/curve/get-info.js';

describe('curve tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- curveCreate ---
  describe('curveCreate', () => {
    it('returns success with created curve on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          curveName: 'C_Speed',
          curvePath: '/Game/Curves/C_Speed',
          curveType: 'float',
        },
        duration_ms: 10,
      });
      const result = await curveCreate(mockBridge, {
        curveName: 'C_Speed',
        curvePath: '/Game/Curves',
        curveType: 'float',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('curveName');
      expect(parsed.result).toHaveProperty('curveType');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8700, message: "Invalid curveType 'bad'" },
        duration_ms: 5,
      });
      const result = await curveCreate(mockBridge, {
        curveName: 'C_Bad',
        curvePath: '/Game/Curves',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- curveSetKeys ---
  describe('curveSetKeys', () => {
    it('returns success with keys set on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          curvePath: '/Game/Curves/C_Speed',
          keysSet: 2,
          keys: [
            { time: 0, value: 0 },
            { time: 1, value: 100 },
          ],
        },
        duration_ms: 10,
      });
      const result = await curveSetKeys(mockBridge, {
        curvePath: '/Game/Curves/C_Speed',
        keys: [
          { time: 0, value: 0 },
          { time: 1, value: 100 },
        ],
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('keysSet');
      expect(parsed.result).toHaveProperty('keys');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8710, message: 'Curve not found: /Game/Curves/Missing' },
        duration_ms: 5,
      });
      const result = await curveSetKeys(mockBridge, {
        curvePath: '/Game/Curves/Missing',
        keys: [{ time: 0, value: 0 }],
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- curveGetInfo ---
  describe('curveGetInfo', () => {
    it('returns success with curve info on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          curvePath: '/Game/Curves/C_Speed',
          curveType: 'CurveFloat',
          keyCount: 3,
          timeRange: { min: 0, max: 2 },
          valueRange: { min: 0, max: 100 },
        },
        duration_ms: 10,
      });
      const result = await curveGetInfo(mockBridge, {
        curvePath: '/Game/Curves/C_Speed',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('keyCount');
      expect(parsed.result).toHaveProperty('curveType');
      expect(parsed.result).toHaveProperty('timeRange');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8720, message: 'Curve not found: /Game/Curves/Missing' },
        duration_ms: 5,
      });
      const result = await curveGetInfo(mockBridge, {
        curvePath: '/Game/Curves/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
