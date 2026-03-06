import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { analyzeBlueprintComplexity } from '../../../src/tools/analyze/blueprint-complexity.js';
import { analyzeAssetHealth } from '../../../src/tools/analyze/asset-health.js';
import { analyzePerformanceHints } from '../../../src/tools/analyze/performance-hints.js';
import { analyzeCodeConventions } from '../../../src/tools/analyze/code-conventions.js';

describe('analyze tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- analyzeBlueprintComplexity ---
  describe('analyzeBlueprintComplexity', () => {
    it('returns success with complexity metrics', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          blueprintPath: '/Game/Blueprints/BP_Player',
          totalNodeCount: 42,
          totalCyclomaticComplexity: 7,
          overallComplexity: 'low',
          graphCount: 3,
          graphs: [],
        },
        duration_ms: 10,
      });
      const result = await analyzeBlueprintComplexity(mockBridge, { blueprintPath: '/Game/Blueprints/BP_Player' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('totalNodeCount');
      expect(parsed.result).toHaveProperty('overallComplexity');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 9100, message: 'Blueprint not found' },
        duration_ms: 5,
      });
      const result = await analyzeBlueprintComplexity(mockBridge, { blueprintPath: '/Game/Blueprints/BP_Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- analyzeAssetHealth ---
  describe('analyzeAssetHealth', () => {
    it('returns success with health report', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          directory: '/Game/',
          totalChecked: 120,
          healthScore: 85,
          brokenReferences: [],
          oversizedTextures: [{ assetPath: '/Game/Textures/T_Sky', width: 8192, height: 8192 }],
          unusedAssets: [],
        },
        duration_ms: 20,
      });
      const result = await analyzeAssetHealth(mockBridge, { directory: '/Game/', includeUnused: true });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('healthScore');
      expect(parsed.result).toHaveProperty('oversizedTextures');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await analyzeAssetHealth(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- analyzePerformanceHints ---
  describe('analyzePerformanceHints', () => {
    it('returns success with performance hints', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          levelPath: null,
          drawCallEstimate: 850,
          textureMemoryEstimateMB: 210.5,
          actorCounts: { staticMesh: 200, skeletalMesh: 5, lights: 30 },
          hintCount: 1,
          hints: [{ type: 'high_poly_mesh', actor: 'SM_Rock', triangles: 150000, message: 'Consider adding LODs' }],
        },
        duration_ms: 15,
      });
      const result = await analyzePerformanceHints(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('drawCallEstimate');
      expect(parsed.result).toHaveProperty('hints');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 9122, message: 'No world available' },
        duration_ms: 5,
      });
      const result = await analyzePerformanceHints(mockBridge, { levelPath: '/Game/Maps/TestMap' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- analyzeCodeConventions ---
  describe('analyzeCodeConventions', () => {
    it('returns success with convention violations', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          directory: '/Game/',
          assetsChecked: 50,
          conventionScore: 72,
          violationCount: 9,
          folderIssueCount: 1,
          violations: [
            {
              assetPath: '/Game/Meshes/Rock',
              assetName: 'Rock',
              assetClass: 'StaticMesh',
              expectedPrefix: 'SM_',
              issue: 'missing_prefix',
              message: "'Rock' should start with 'SM_' for StaticMesh",
            },
          ],
          folderIssues: [],
        },
        duration_ms: 12,
      });
      const result = await analyzeCodeConventions(mockBridge, { directory: '/Game/' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('conventionScore');
      expect(parsed.result).toHaveProperty('violations');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await analyzeCodeConventions(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });
});
