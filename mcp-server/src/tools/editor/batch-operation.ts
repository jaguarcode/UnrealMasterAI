/**
 * editor.batchOperation tool handler.
 * Performs batch operations (rename, move, setProperty, tag) on assets/actors.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export type BatchOperationType = 'rename' | 'move' | 'setProperty' | 'tag';

export interface EditorBatchOperationParams {
  operation: BatchOperationType;
  targets: string[];
  args?: Record<string, unknown>;
}

export async function editorBatchOperation(
  bridge: WebSocketBridge,
  params: EditorBatchOperationParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'editor_batch_operation', args: params },
    timestamp: Date.now(),
  };
  try {
    const response = await bridge.sendRequest(msg);
    if (response.error) {
      return { content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: response.error }) }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', result: response.result }) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }] };
  }
}
