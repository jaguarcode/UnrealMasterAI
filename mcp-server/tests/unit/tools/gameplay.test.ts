import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { gameplayGetGameMode } from '../../../src/tools/gameplay/get-game-mode.js';
import { gameplaySetGameMode } from '../../../src/tools/gameplay/set-game-mode.js';
import { gameplayListInputActions } from '../../../src/tools/gameplay/list-input-actions.js';
import { gameplayAddInputAction } from '../../../src/tools/gameplay/add-input-action.js';

describe('gameplay tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- gameplayGetGameMode ---
  describe('gameplayGetGameMode', () => {
    it('returns success with game mode path', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { gameModePath: '/Game/Blueprints/BP_GameMode.BP_GameMode_C' },
        duration_ms: 10,
      });
      const result = await gameplayGetGameMode(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('gameModePath');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('disconnected'));
      const result = await gameplayGetGameMode(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('disconnected');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5100, message: 'Settings unavailable' },
        duration_ms: 5,
      });
      const result = await gameplayGetGameMode(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- gameplaySetGameMode ---
  describe('gameplaySetGameMode', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { gameModePath: '/Game/Blueprints/BP_GameMode.BP_GameMode_C', applied: true },
        duration_ms: 10,
      });
      const result = await gameplaySetGameMode(mockBridge, {
        gameModePath: '/Game/Blueprints/BP_GameMode.BP_GameMode_C',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('applied');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'GameMode class not found' },
        duration_ms: 5,
      });
      const result = await gameplaySetGameMode(mockBridge, {
        gameModePath: '/Game/Blueprints/Missing.Missing_C',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- gameplayListInputActions ---
  describe('gameplayListInputActions', () => {
    it('returns success with action list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { actions: [{ actionName: 'Jump', key: 'SpaceBar', shift: false, ctrl: false, alt: false }], count: 1 },
        duration_ms: 10,
      });
      const result = await gameplayListInputActions(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('actions');
      expect(parsed.result.count).toBe(1);
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await gameplayListInputActions(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- gameplayAddInputAction ---
  describe('gameplayAddInputAction', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { actionName: 'Attack', key: 'LeftMouseButton', shift: false, ctrl: false, alt: false, added: true },
        duration_ms: 10,
      });
      const result = await gameplayAddInputAction(mockBridge, {
        actionName: 'Attack',
        key: 'LeftMouseButton',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('added');
    });

    it('returns success with modifier keys', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { actionName: 'Sprint', key: 'LeftShift', shift: true, ctrl: false, alt: false, added: true },
        duration_ms: 10,
      });
      const result = await gameplayAddInputAction(mockBridge, {
        actionName: 'Sprint',
        key: 'LeftShift',
        shift: true,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.shift).toBe(true);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Failed to add input mapping' },
        duration_ms: 5,
      });
      const result = await gameplayAddInputAction(mockBridge, {
        actionName: 'Bad',
        key: 'InvalidKey',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
