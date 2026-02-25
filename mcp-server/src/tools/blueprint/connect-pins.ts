/**
 * blueprint.connectPins tool handler.
 * Connects two pins in a Blueprint graph via WebSocket bridge.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface ConnectPinsParams {
  blueprintCacheKey: string;
  sourcePinId: string;
  targetPinId: string;
}

export async function blueprintConnectPins(
  bridge: WebSocketBridge,
  params: ConnectPinsParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'blueprint.connectPins',
    params: {
      blueprintCacheKey: params.blueprintCacheKey,
      sourcePinId: params.sourcePinId,
      targetPinId: params.targetPinId,
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
