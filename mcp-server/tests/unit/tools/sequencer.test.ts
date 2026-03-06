import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { sequencerCreate } from '../../../src/tools/sequencer/create.js';
import { sequencerOpen } from '../../../src/tools/sequencer/open.js';
import { sequencerAddTrack } from '../../../src/tools/sequencer/add-track.js';
import { sequencerAddBinding } from '../../../src/tools/sequencer/add-binding.js';
import { sequencerSetKeyframe } from '../../../src/tools/sequencer/set-keyframe.js';
import { sequencerGetInfo } from '../../../src/tools/sequencer/get-info.js';
import { sequencerExportFbx } from '../../../src/tools/sequencer/export-fbx.js';
import { sequencerImportFbx } from '../../../src/tools/sequencer/import-fbx.js';

describe('sequencer tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- sequencerCreate ---
  describe('sequencerCreate', () => {
    it('returns success with created sequence info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          sequenceName: 'MySequence',
          sequencePath: '/Game/Cinematics',
          objectPath: '/Game/Cinematics/MySequence.MySequence',
        },
        duration_ms: 10,
      });
      const result = await sequencerCreate(mockBridge, {
        sequenceName: 'MySequence',
        sequencePath: '/Game/Cinematics',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('sequenceName');
      expect(parsed.result).toHaveProperty('objectPath');
    });

    it('returns error when bridge returns error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Failed to create Level Sequence' },
        duration_ms: 5,
      });
      const result = await sequencerCreate(mockBridge, {
        sequenceName: 'BadSequence',
        sequencePath: '/Game/Cinematics',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('bridge timeout'));
      const result = await sequencerCreate(mockBridge, {
        sequenceName: 'MySequence',
        sequencePath: '/Game/Cinematics',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('bridge timeout');
    });
  });

  // --- sequencerOpen ---
  describe('sequencerOpen', () => {
    it('returns success when sequence opens', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          sequencePath: '/Game/Cinematics/MySequence',
          objectPath: '/Game/Cinematics/MySequence.MySequence',
        },
        duration_ms: 10,
      });
      const result = await sequencerOpen(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('sequencePath');
    });

    it('returns error when sequence not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Level Sequence not found' },
        duration_ms: 5,
      });
      const result = await sequencerOpen(mockBridge, {
        sequencePath: '/Game/Cinematics/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- sequencerAddTrack ---
  describe('sequencerAddTrack', () => {
    it('returns success with track info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          sequencePath: '/Game/Cinematics/MySequence',
          trackType: 'audio',
          trackClass: 'MovieSceneAudioTrack',
        },
        duration_ms: 10,
      });
      const result = await sequencerAddTrack(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        trackType: 'audio',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('trackType');
    });

    it('returns error on unknown track type', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: "Unknown track type 'invalid'" },
        duration_ms: 5,
      });
      const result = await sequencerAddTrack(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        trackType: 'invalid',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await sequencerAddTrack(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        trackType: 'audio',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });
  });

  // --- sequencerAddBinding ---
  describe('sequencerAddBinding', () => {
    it('returns success with possessable binding', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          sequencePath: '/Game/Cinematics/MySequence',
          actorName: 'HeroCharacter',
          bindingType: 'possessable',
          bindingId: 'abc-123',
        },
        duration_ms: 10,
      });
      const result = await sequencerAddBinding(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        actorName: 'HeroCharacter',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('bindingId');
      expect(parsed.result.bindingType).toBe('possessable');
    });

    it('returns error when sequence not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Level Sequence not found' },
        duration_ms: 5,
      });
      const result = await sequencerAddBinding(mockBridge, {
        sequencePath: '/Game/Cinematics/Missing',
        actorName: 'HeroCharacter',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- sequencerSetKeyframe ---
  describe('sequencerSetKeyframe', () => {
    it('returns success with keyframe info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          sequencePath: '/Game/Cinematics/MySequence',
          trackName: 'MovieSceneFadeTrack',
          time: 1.5,
          value: 0.0,
          frameTime: 45,
        },
        duration_ms: 10,
      });
      const result = await sequencerSetKeyframe(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        trackName: 'MovieSceneFadeTrack',
        time: 1.5,
        value: 0.0,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('frameTime');
    });

    it('returns error when track not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Track not found' },
        duration_ms: 5,
      });
      const result = await sequencerSetKeyframe(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        trackName: 'MissingTrack',
        time: 0,
        value: null,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await sequencerSetKeyframe(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        trackName: 'FadeTrack',
        time: 0,
        value: 1.0,
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });

  // --- sequencerGetInfo ---
  describe('sequencerGetInfo', () => {
    it('returns success with tracks, bindings, and frame range', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          sequencePath: '/Game/Cinematics/MySequence',
          objectPath: '/Game/Cinematics/MySequence.MySequence',
          tracks: [{ name: 'CameraCutTrack', class: 'MovieSceneCameraCutTrack' }],
          bindings: [{ name: 'HeroCharacter', id: 'abc-123', type: 'possessable' }],
          frameRange: { start: 0, end: 150 },
          playRate: '30/1',
        },
        duration_ms: 10,
      });
      const result = await sequencerGetInfo(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('tracks');
      expect(parsed.result).toHaveProperty('bindings');
      expect(parsed.result).toHaveProperty('frameRange');
      expect(parsed.result).toHaveProperty('playRate');
    });

    it('returns error when sequence not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5102, message: 'Level Sequence not found' },
        duration_ms: 5,
      });
      const result = await sequencerGetInfo(mockBridge, {
        sequencePath: '/Game/Cinematics/Missing',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- sequencerExportFbx ---
  describe('sequencerExportFbx', () => {
    it('returns success with export paths', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          sequencePath: '/Game/Cinematics/MySequence',
          outputPath: 'C:/Exports/MySequence.fbx',
        },
        duration_ms: 10,
      });
      const result = await sequencerExportFbx(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        outputPath: 'C:/Exports/MySequence.fbx',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('outputPath');
    });

    it('returns error when export fails', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'FBX export failed' },
        duration_ms: 5,
      });
      const result = await sequencerExportFbx(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        outputPath: 'C:/Invalid/Path.fbx',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('export timeout'));
      const result = await sequencerExportFbx(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        outputPath: 'C:/Exports/MySequence.fbx',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('export timeout');
    });
  });

  // --- sequencerImportFbx ---
  describe('sequencerImportFbx', () => {
    it('returns success with import paths', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          sequencePath: '/Game/Cinematics/MySequence',
          fbxPath: 'C:/Imports/Motion.fbx',
        },
        duration_ms: 10,
      });
      const result = await sequencerImportFbx(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        fbxPath: 'C:/Imports/Motion.fbx',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('fbxPath');
    });

    it('returns error when import fails', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'FBX import failed' },
        duration_ms: 5,
      });
      const result = await sequencerImportFbx(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        fbxPath: 'C:/Invalid/Motion.fbx',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('import timeout'));
      const result = await sequencerImportFbx(mockBridge, {
        sequencePath: '/Game/Cinematics/MySequence',
        fbxPath: 'C:/Imports/Motion.fbx',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('import timeout');
    });
  });
});
