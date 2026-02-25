/**
 * editor.getAssetInfo tool handler.
 * Queries metadata for a specific asset in the Unreal Editor.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface GetAssetInfoParams {
  assetPath: string;
}

export async function editorGetAssetInfo(
  bridge: WebSocketBridge,
  params: GetAssetInfoParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'editor.getAssetInfo',
    params: {
      assetPath: params.assetPath,
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
