/**
 * chat.sendMessage tool handler.
 * Forwards a developer's chat message to the UE plugin via WebSocket.
 * In Phase 1 the UE plugin echoes back an acknowledgement.
 * In a future phase, this could route through the LLM for an agent response.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface ChatSendMessageParams {
  text: string;
}

export async function chatSendMessage(
  bridge: WebSocketBridge,
  params: ChatSendMessageParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'chat.sendMessage',
    params: { text: params.text },
    timestamp: Date.now(),
  };

  try {
    const response = await bridge.sendRequest(msg);

    if (response.error) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ status: 'error', error: response.error }),
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(response.result),
      }],
    };
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ status: 'error', error: (err as Error).message }),
      }],
    };
  }
}
