/**
 * editor.getLevelInfo tool handler.
 * Queries the Unreal Editor for current level information.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export async function editorGetLevelInfo(bridge: WebSocketBridge) {
  const msg = {
    id: uuidv4(),
    method: 'editor.getLevelInfo',
    params: {},
    timestamp: Date.now(),
  };

  const response = await bridge.sendRequest(msg);

  if (response.error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ status: 'error', error: response.error }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(response.result),
      },
    ],
  };
}
