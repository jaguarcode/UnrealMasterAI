/**
 * file.write tool handler.
 * Writes content to a file in the Unreal project via WebSocket bridge.
 * Validates path safety and checks safety classification + approval gate before proceeding.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import { classifyOperation, isPathSafe, ApprovalGate } from '../../state/safety.js';

export interface WriteFileParams {
  filePath: string;
  content: string;
}

export async function fileWrite(
  bridge: WebSocketBridge,
  params: WriteFileParams,
  allowedRoots: string[],
  approvalGate: ApprovalGate,
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

  // Safety classification and approval gate
  const classification = classifyOperation('file-write', { filePath: params.filePath });
  const approved = await approvalGate.requestApproval(classification);

  if (!approved) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            status: 'error',
            error: `Operation rejected: ${classification.reason}`,
          }),
        },
      ],
    };
  }

  const msg = {
    id: uuidv4(),
    method: 'file.write',
    params: {
      filePath: params.filePath,
      content: params.content,
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
