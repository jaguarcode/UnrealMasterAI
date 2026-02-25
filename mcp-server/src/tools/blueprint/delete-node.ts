/**
 * blueprint.deleteNode tool handler.
 * Deletes a node from a Blueprint graph via WebSocket bridge.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface DeleteNodeParams {
  blueprintCacheKey: string;
  nodeId: string;
}

export async function blueprintDeleteNode(
  bridge: WebSocketBridge,
  params: DeleteNodeParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'blueprint.deleteNode',
    params: {
      blueprintCacheKey: params.blueprintCacheKey,
      nodeId: params.nodeId,
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
