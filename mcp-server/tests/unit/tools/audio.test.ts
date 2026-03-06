import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { audioImport } from '../../../src/tools/audio/import.js';
import { audioCreateCue } from '../../../src/tools/audio/create-cue.js';
import { audioGetInfo } from '../../../src/tools/audio/get-info.js';
import { audioSetAttenuation } from '../../../src/tools/audio/set-attenuation.js';
import { audioCreateMetaSound } from '../../../src/tools/audio/create-meta-sound.js';
import { audioListAssets } from '../../../src/tools/audio/list-assets.js';

describe('audio tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- audioImport ---
  describe('audioImport', () => {
    it('returns success', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { importedPath: '/Game/Audio/S_Test', sourcePath: '/tmp/test.wav' },
        duration_ms: 10,
      });
      const result = await audioImport(mockBridge, { filePath: '/tmp/test.wav', destinationPath: '/Game/Audio' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('importedPath');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8200, message: 'Import failed' },
        duration_ms: 5,
      });
      const result = await audioImport(mockBridge, { filePath: '/bad.wav', destinationPath: '/Game/Audio' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- audioCreateCue ---
  describe('audioCreateCue', () => {
    it('returns success', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { cuePath: '/Game/Audio/SC_Test', cueName: 'SC_Test' },
        duration_ms: 10,
      });
      const result = await audioCreateCue(mockBridge, { cueName: 'SC_Test', cuePath: '/Game/Audio' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('cuePath');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8210, message: 'Failed to create SoundCue' },
        duration_ms: 5,
      });
      const result = await audioCreateCue(mockBridge, { cueName: 'Bad', cuePath: '/Game/Audio' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- audioGetInfo ---
  describe('audioGetInfo', () => {
    it('returns success', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { audioPath: '/Game/Audio/S_Test', duration: 3.5, numChannels: 2, sampleRate: '44100', compressionQuality: 40 },
        duration_ms: 10,
      });
      const result = await audioGetInfo(mockBridge, { audioPath: '/Game/Audio/S_Test' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('duration');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8220, message: 'Audio asset not found' },
        duration_ms: 5,
      });
      const result = await audioGetInfo(mockBridge, { audioPath: '/Game/Audio/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- audioSetAttenuation ---
  describe('audioSetAttenuation', () => {
    it('returns success', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { audioPath: '/Game/Audio/S_Test', innerRadius: 100, outerRadius: 500 },
        duration_ms: 10,
      });
      const result = await audioSetAttenuation(mockBridge, {
        audioPath: '/Game/Audio/S_Test',
        innerRadius: 100,
        outerRadius: 500,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('audioPath');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8230, message: 'Audio asset not found' },
        duration_ms: 5,
      });
      const result = await audioSetAttenuation(mockBridge, { audioPath: '/Game/Audio/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- audioCreateMetaSound ---
  describe('audioCreateMetaSound', () => {
    it('returns success', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { assetPath: '/Game/Audio/MS_Test', assetName: 'MS_Test' },
        duration_ms: 10,
      });
      const result = await audioCreateMetaSound(mockBridge, { assetName: 'MS_Test', assetPath: '/Game/Audio' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('assetPath');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8240, message: 'MetaSoundSource class not found' },
        duration_ms: 5,
      });
      const result = await audioCreateMetaSound(mockBridge, { assetName: 'MS_Bad', assetPath: '/Game/Audio' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- audioListAssets ---
  describe('audioListAssets', () => {
    it('returns success', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          assets: [
            { assetName: 'S_Test', assetPath: '/Game/Audio/S_Test', assetClass: 'SoundWave', packagePath: '/Game/Audio' },
          ],
          count: 1,
          directory: '/Game/Audio',
        },
        duration_ms: 10,
      });
      const result = await audioListAssets(mockBridge, { directory: '/Game/Audio' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('assets');
      expect(parsed.result.count).toBe(1);
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8250, message: 'Registry unavailable' },
        duration_ms: 5,
      });
      const result = await audioListAssets(mockBridge, { directory: '/Game/BadPath' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
