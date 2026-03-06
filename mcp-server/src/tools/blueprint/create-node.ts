/**
 * blueprint.createNode tool handler.
 * Creates a new node in a Blueprint graph via WebSocket bridge.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface CreateNodeParams {
  blueprintCacheKey: string;
  graphName: string;
  nodeClass: string;
  functionOwnerClass?: string;
  functionName?: string;
  posX?: number;
  posY?: number;
}

export async function blueprintCreateNode(
  bridge: WebSocketBridge,
  params: CreateNodeParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'blueprint.createNode',
    params: {
      blueprintPath: params.blueprintCacheKey.replace(/^bp:/, ''),
      graphName: params.graphName,
      nodeClass: params.nodeClass,
      ...(params.functionOwnerClass && { functionOwnerClass: params.functionOwnerClass }),
      ...(params.functionName && { functionName: params.functionName }),
      ...(params.posX !== undefined && { posX: params.posX }),
      ...(params.posY !== undefined && { posY: params.posY }),
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
