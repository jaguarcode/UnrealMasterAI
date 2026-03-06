import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { niagaraCreateSystem } from '../../../src/tools/niagara/create-system.js';
import { niagaraGetInfo } from '../../../src/tools/niagara/get-info.js';
import { niagaraAddEmitter } from '../../../src/tools/niagara/add-emitter.js';
import { niagaraSetParameter } from '../../../src/tools/niagara/set-parameter.js';
import { niagaraCompile } from '../../../src/tools/niagara/compile.js';
import { niagaraListSystems } from '../../../src/tools/niagara/list-systems.js';

describe('niagara tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- niagaraCreateSystem ---
  describe('niagaraCreateSystem', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { systemName: 'NS_Fire', systemPath: '/Game/VFX', objectPath: '/Game/VFX/NS_Fire.NS_Fire' },
        duration_ms: 10,
      });
      const result = await niagaraCreateSystem(mockBridge, { systemName: 'NS_Fire', systemPath: '/Game/VFX' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('objectPath');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8100, message: 'Failed to create Niagara System' },
        duration_ms: 5,
      });
      const result = await niagaraCreateSystem(mockBridge, { systemName: 'Bad', systemPath: '/Game/VFX' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await niagaraCreateSystem(mockBridge, { systemName: 'NS_Fire', systemPath: '/Game/VFX' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- niagaraGetInfo ---
  describe('niagaraGetInfo', () => {
    it('returns success with emitter info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          systemPath: '/Game/VFX/NS_Fire',
          emitters: [{ name: 'Emitter_0', isEnabled: true }],
          emitterCount: 1,
          userParameters: [],
        },
        duration_ms: 10,
      });
      const result = await niagaraGetInfo(mockBridge, { systemPath: '/Game/VFX/NS_Fire' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('emitters');
    });

    it('returns error when system not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8101, message: 'Niagara System not found' },
        duration_ms: 5,
      });
      const result = await niagaraGetInfo(mockBridge, { systemPath: '/Game/VFX/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- niagaraAddEmitter ---
  describe('niagaraAddEmitter', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { systemPath: '/Game/VFX/NS_Fire', emitterName: 'SparksEmitter', added: true },
        duration_ms: 10,
      });
      const result = await niagaraAddEmitter(mockBridge, {
        systemPath: '/Game/VFX/NS_Fire',
        emitterName: 'SparksEmitter',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.added).toBe(true);
    });

    it('returns error when system not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8103, message: 'Niagara System not found' },
        duration_ms: 5,
      });
      const result = await niagaraAddEmitter(mockBridge, {
        systemPath: '/Game/VFX/Missing',
        emitterName: 'Emitter',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- niagaraSetParameter ---
  describe('niagaraSetParameter', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { systemPath: '/Game/VFX/NS_Fire', parameterName: 'SpawnRate', value: 100, updated: true },
        duration_ms: 10,
      });
      const result = await niagaraSetParameter(mockBridge, {
        systemPath: '/Game/VFX/NS_Fire',
        parameterName: 'SpawnRate',
        value: 100,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.updated).toBe(true);
    });

    it('returns error when parameter set fails', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8109, message: "Failed to set parameter 'InvalidParam'" },
        duration_ms: 5,
      });
      const result = await niagaraSetParameter(mockBridge, {
        systemPath: '/Game/VFX/NS_Fire',
        parameterName: 'InvalidParam',
        value: 42,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- niagaraCompile ---
  describe('niagaraCompile', () => {
    it('returns success on compile', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { systemPath: '/Game/VFX/NS_Fire', compiled: true },
        duration_ms: 20,
      });
      const result = await niagaraCompile(mockBridge, { systemPath: '/Game/VFX/NS_Fire' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.compiled).toBe(true);
    });

    it('returns error when system not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8110, message: 'Niagara System not found' },
        duration_ms: 5,
      });
      const result = await niagaraCompile(mockBridge, { systemPath: '/Game/VFX/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- niagaraListSystems ---
  describe('niagaraListSystems', () => {
    it('returns success with systems list', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          directory: '/Game/',
          filter: '',
          systems: [
            { assetName: 'NS_Fire', packagePath: '/Game/VFX', objectPath: '/Game/VFX/NS_Fire.NS_Fire' },
          ],
          count: 1,
        },
        duration_ms: 10,
      });
      const result = await niagaraListSystems(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.systems).toHaveLength(1);
    });

    it('returns error when registry query fails', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8199, message: 'Asset registry unavailable' },
        duration_ms: 5,
      });
      const result = await niagaraListSystems(mockBridge, { directory: '/Game/VFX' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await niagaraListSystems(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });
});
