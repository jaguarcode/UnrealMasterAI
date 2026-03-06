import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { levelCreate } from '../../../src/tools/level/create.js';
import { levelOpen } from '../../../src/tools/level/open.js';
import { levelSave } from '../../../src/tools/level/save.js';
import { levelAddSublevel } from '../../../src/tools/level/add-sublevel.js';
import { levelGetWorldSettings } from '../../../src/tools/level/get-world-settings.js';

describe('level tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- levelCreate ---
  describe('levelCreate', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { levelName: 'MyLevel', created: true },
        duration_ms: 10,
      });
      const result = await levelCreate(mockBridge, { levelName: 'MyLevel' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('levelName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Failed to create level' },
        duration_ms: 5,
      });
      const result = await levelCreate(mockBridge, { levelName: 'Bad' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await levelCreate(mockBridge, { levelName: 'MyLevel' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });

    it('passes templatePath param when provided', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { levelName: 'NewLevel', templatePath: '/Game/Templates/Base', created: true },
        duration_ms: 10,
      });
      const result = await levelCreate(mockBridge, {
        levelName: 'NewLevel',
        templatePath: '/Game/Templates/Base',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      const call = vi.mocked(mockBridge.sendRequest).mock.calls[0][0];
      expect(call.params.args).toMatchObject({ levelName: 'NewLevel', templatePath: '/Game/Templates/Base' });
    });
  });

  // --- levelOpen ---
  describe('levelOpen', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { levelPath: '/Game/Maps/TestMap', opened: true },
        duration_ms: 10,
      });
      const result = await levelOpen(mockBridge, { levelPath: '/Game/Maps/TestMap' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('opened');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Level not found' },
        duration_ms: 5,
      });
      const result = await levelOpen(mockBridge, { levelPath: '/Game/Maps/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- levelSave ---
  describe('levelSave', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { saved: true },
        duration_ms: 10,
      });
      const result = await levelSave(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('saved');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Save failed' },
        duration_ms: 5,
      });
      const result = await levelSave(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await levelSave(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- levelAddSublevel ---
  describe('levelAddSublevel', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { levelPath: '/Game/Maps/Sub', streamingMethod: 'AlwaysLoaded', added: true },
        duration_ms: 10,
      });
      const result = await levelAddSublevel(mockBridge, { levelPath: '/Game/Maps/Sub' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('added');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Failed to add sublevel' },
        duration_ms: 5,
      });
      const result = await levelAddSublevel(mockBridge, { levelPath: '/Game/Maps/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('passes streamingMethod param when provided', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { levelPath: '/Game/Maps/Sub', streamingMethod: 'Blueprint', added: true },
        duration_ms: 10,
      });
      const result = await levelAddSublevel(mockBridge, {
        levelPath: '/Game/Maps/Sub',
        streamingMethod: 'Blueprint',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      const call = vi.mocked(mockBridge.sendRequest).mock.calls[0][0];
      expect(call.params.args).toMatchObject({ streamingMethod: 'Blueprint' });
    });
  });

  // --- levelGetWorldSettings ---
  describe('levelGetWorldSettings', () => {
    it('returns success with world settings', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          worldName: 'TestWorld',
          killZValue: -100000,
          enableWorldBoundsChecks: true,
          gravityZ: false,
        },
        duration_ms: 10,
      });
      const result = await levelGetWorldSettings(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('worldName');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'No editor world available' },
        duration_ms: 5,
      });
      const result = await levelGetWorldSettings(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('disconnected'));
      const result = await levelGetWorldSettings(mockBridge);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('disconnected');
    });
  });
});
