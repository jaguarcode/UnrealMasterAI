import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { refactorRenameChain } from '../../../src/tools/refactor/rename-chain.js';

describe('refactor tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- refactorRenameChain ---
  describe('refactorRenameChain', () => {
    it('returns success with rename details and reference count', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          oldPath: '/Game/Blueprints/BP_OldName',
          newPath: '/Game/Blueprints/BP_NewName',
          newName: 'BP_NewName',
          referencersUpdated: 3,
          redirectorsCleaned: 1,
          updateReferences: true,
        },
        duration_ms: 25,
      });
      const result = await refactorRenameChain(mockBridge, {
        assetPath: '/Game/Blueprints/BP_OldName',
        newName: 'BP_NewName',
        updateReferences: true,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.oldPath).toBe('/Game/Blueprints/BP_OldName');
      expect(parsed.result.newPath).toBe('/Game/Blueprints/BP_NewName');
      expect(parsed.result).toHaveProperty('referencersUpdated');
      expect(parsed.result).toHaveProperty('redirectorsCleaned');
    });

    it('returns error when asset not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 9141, message: 'Asset not found: /Game/Blueprints/BP_Missing' },
        duration_ms: 5,
      });
      const result = await refactorRenameChain(mockBridge, {
        assetPath: '/Game/Blueprints/BP_Missing',
        newName: 'BP_Renamed',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
