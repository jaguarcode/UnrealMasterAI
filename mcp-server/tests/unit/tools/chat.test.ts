/**
 * Unit tests for chat message tool handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { chatSendMessage } from '../../../src/tools/chat/send-message.js';

describe('chat.sendMessage tool', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = {
      sendRequest: vi.fn(),
      hasActiveConnection: vi.fn().mockReturnValue(true),
    } as unknown as WebSocketBridge;
  });

  it('sends chat.sendMessage WS request with user text', async () => {
    (mockBridge.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'test-id',
      result: { responseText: 'Hello from agent' },
      duration_ms: 10,
    });

    const result = await chatSendMessage(mockBridge, { text: 'Hello' });

    const sentMsg = (mockBridge.sendRequest as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(sentMsg.method).toBe('chat.sendMessage');
    expect(sentMsg.params.text).toBe('Hello');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.responseText).toBe('Hello from agent');
  });

  it('returns error when UE not connected', async () => {
    (mockBridge.hasActiveConnection as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (mockBridge.sendRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('UE plugin not connected'),
    );

    const result = await chatSendMessage(mockBridge, { text: 'Hello' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
  });

  it('returns empty responseText gracefully', async () => {
    (mockBridge.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'test-id',
      result: { responseText: '' },
      duration_ms: 5,
    });

    const result = await chatSendMessage(mockBridge, { text: 'Hi' });
    const parsed = JSON.parse(result.content[0].text);
    expect(typeof parsed.responseText).toBe('string');
  });
});
