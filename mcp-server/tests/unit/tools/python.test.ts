import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pythonExecute } from '../../../src/tools/python/execute.js';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';

describe('pythonExecute', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = {
      sendRequest: vi.fn(),
    } as unknown as WebSocketBridge;
  });

  it('returns status success when bridge returns a result', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: { output: 'Hello from Python' },
      duration_ms: 42,
    });

    const result = await pythonExecute(mockBridge, { script: 'hello_world' });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.result).toEqual({ output: 'Hello from Python' });
  });

  it('forwards error when bridge returns error code 5101 (script not found)', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      error: { code: 5101, message: 'Script not found: missing_script' },
      duration_ms: 10,
    });

    const result = await pythonExecute(mockBridge, { script: 'missing_script' });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error.code).toBe(5101);
    expect(parsed.error.message).toContain('Script not found');
  });

  it('forwards error when bridge returns error code 5100 (Python unavailable)', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      error: { code: 5100, message: 'Python runtime is not available' },
      duration_ms: 5,
    });

    const result = await pythonExecute(mockBridge, { script: 'any_script' });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error.code).toBe(5100);
    expect(parsed.error.message).toContain('Python runtime');
  });

  it('handles empty script name (validation deferred to C++ side)', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: {},
      duration_ms: 1,
    });

    const result = await pythonExecute(mockBridge, { script: '' });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    // Empty script name passes through — C++ side validates
    expect(parsed.status).toBe('success');

    const call = vi.mocked(mockBridge.sendRequest).mock.calls[0][0];
    expect(call.method).toBe('python.execute');
    expect((call.params as Record<string, unknown>).script).toBe('');
  });

  it('catches thrown errors from bridge and returns status error', async () => {
    vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(
      new Error('WebSocket connection timed out')
    );

    const result = await pythonExecute(mockBridge, { script: 'some_script' });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toContain('WebSocket connection timed out');
  });
});
