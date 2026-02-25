/**
 * file.read tool handler.
 * Reads a file from the Unreal project via WebSocket bridge.
 * Validates path safety before sending the request.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import { isPathSafe } from '../../state/safety.js';

export interface ReadFileParams {
  filePath: string;
  offset?: number;
  limit?: number;
}

export async function fileRead(
  bridge: WebSocketBridge,
  params: ReadFileParams,
  allowedRoots: string[],
) {
  // Path safety check
  if (!isPathSafe(params.filePath, allowedRoots)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ status: 'error', error: 'Path traversal blocked' }),
        },
      ],
    };
  }

  const msg = {
    id: uuidv4(),
    method: 'file.read',
    params: {
      filePath: params.filePath,
      ...(params.offset !== undefined && { offset: params.offset }),
      ...(params.limit !== undefined && { limit: params.limit }),
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
