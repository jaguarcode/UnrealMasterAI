/**
 * editor.listActors tool handler.
 * Lists actors in the current Unreal Editor level with optional filters.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface ListActorsParams {
  className?: string;
  tag?: string;
}

export async function editorListActors(
  bridge: WebSocketBridge,
  params: ListActorsParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'editor.listActors',
    params: {
      ...(params.className !== undefined && { className: params.className }),
      ...(params.tag !== undefined && { tag: params.tag }),
    },
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
