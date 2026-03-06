import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { debugExecConsole } from '../../../src/tools/debug/exec-console.js';
import { debugGetLog } from '../../../src/tools/debug/get-log.js';
import { debugGetPerformance } from '../../../src/tools/debug/get-performance.js';

describe('debug tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- debugExecConsole ---
  describe('debugExecConsole', () => {
    it('sends debug.execConsole method (not python.execute)', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { output: 'stat unit enabled', command: 'stat unit' },
        duration_ms: 10,
      });
      await debugExecConsole(mockBridge, { command: 'stat unit' });
      const callArg = vi.mocked(mockBridge.sendRequest).mock.calls[0][0];
      expect(callArg.method).toBe('debug.execConsole');
      expect((callArg.method as string)).not.toBe('python.execute');
    });

    it('returns success with command output', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { output: 'r.SetRes 1920x1080', command: 'r.SetRes 1920x1080' },
        duration_ms: 10,
      });
      const result = await debugExecConsole(mockBridge, { command: 'r.SetRes 1920x1080' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('command');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5500, message: 'Command blocked by safety filter' },
        duration_ms: 5,
      });
      const result = await debugExecConsole(mockBridge, { command: 'quit' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('connection lost'));
      const result = await debugExecConsole(mockBridge, { command: 'stat fps' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('connection lost');
    });

    it('passes command param directly to message params', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { output: 'ok' },
        duration_ms: 5,
      });
      await debugExecConsole(mockBridge, { command: 'stat memory' });
      const callArg = vi.mocked(mockBridge.sendRequest).mock.calls[0][0];
      expect((callArg.params as { command: string }).command).toBe('stat memory');
    });
  });

  // --- debugGetLog ---
  describe('debugGetLog', () => {
    it('returns success with log entries', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          entries: ['[2026.01.01] LogBlueprintUserMessages: Hello', '[2026.01.01] LogTemp: World'],
          count: 2,
          category: null,
          logFile: 'C:/Project/Saved/Logs/UnrealEditor.log',
        },
        duration_ms: 10,
      });
      const result = await debugGetLog(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.entries).toHaveLength(2);
      expect(parsed.result.count).toBe(2);
    });

    it('returns success filtered by category', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          entries: ['[LogTemp]: Test message'],
          count: 1,
          category: 'LogTemp',
          logFile: 'C:/Project/Saved/Logs/UnrealEditor.log',
        },
        duration_ms: 10,
      });
      const result = await debugGetLog(mockBridge, { category: 'LogTemp', count: 50 });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.category).toBe('LogTemp');
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5400, message: 'Log file not found' },
        duration_ms: 5,
      });
      const result = await debugGetLog(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- debugGetPerformance ---
  describe('debugGetPerformance', () => {
    it('returns success with performance metrics', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          performance: {
            worldName: 'TestMap',
            actorCount: 42,
            availablePhysicalMemoryMB: 8192,
            totalPhysicalMemoryMB: 16384,
          },
        },
        duration_ms: 10,
      });
      const result = await debugGetPerformance(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('performance');
      expect(parsed.result.performance.actorCount).toBe(42);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5401, message: 'Failed to gather performance stats' },
        duration_ms: 5,
      });
      const result = await debugGetPerformance(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });

    it('returns error when bridge throws', async () => {
      vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('timeout'));
      const result = await debugGetPerformance(mockBridge, {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
      expect(parsed.error).toContain('timeout');
    });
  });
});
