/**
 * blueprint.deleteNode tool handler.
 * Deletes a node from a Blueprint graph via WebSocket bridge.
 * Checks safety classification + approval gate before proceeding.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import { classifyOperation, ApprovalGate } from '../../state/safety.js';

export interface DeleteNodeParams {
  blueprintCacheKey: string;
  nodeId: string;
}

export async function blueprintDeleteNode(
  bridge: WebSocketBridge,
  params: DeleteNodeParams,
  approvalGate: ApprovalGate,
) {
  // Safety classification and approval gate
  const classification = classifyOperation('blueprint-deleteNode', { ...params });
  const approved = await approvalGate.requestApproval(classification, {
    toolName: 'blueprint-deleteNode',
  });

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
    method: 'blueprint.deleteNode',
    params: {
      blueprintPath: params.blueprintCacheKey.replace(/^bp:/, ''),
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
