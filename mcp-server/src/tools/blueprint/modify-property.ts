/**
 * blueprint.modifyProperty tool handler.
 * Modifies a property on a specific node in a Blueprint graph via WebSocket bridge.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface ModifyPropertyParams {
  blueprintCacheKey: string;
  nodeId: string;
  propertyName: string;
  propertyValue: string;
}

export async function blueprintModifyProperty(
  bridge: WebSocketBridge,
  params: ModifyPropertyParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'blueprint.modifyProperty',
    params: {
      blueprintCacheKey: params.blueprintCacheKey,
      nodeId: params.nodeId,
      propertyName: params.propertyName,
      propertyValue: params.propertyValue,
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
