/**
 * file.search tool handler.
 * Searches for files in the Unreal project via WebSocket bridge.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface SearchFilesParams {
  pattern: string;
  directory?: string;
  glob?: string;
}

export async function fileSearch(
  bridge: WebSocketBridge,
  params: SearchFilesParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'file.search',
    params: {
      pattern: params.pattern,
      ...(params.directory !== undefined && { directory: params.directory }),
      ...(params.glob !== undefined && { glob: params.glob }),
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
