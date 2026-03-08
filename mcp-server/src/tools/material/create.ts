/**
 * material.create tool handler.
 * Creates a new material asset in the Unreal project via the Python bridge.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';
import { createToolError, formatBridgeError } from '../../errors.js';

export interface MaterialCreateParams {
  materialName: string;
  materialPath: string;
  materialType?: string;
}

export async function materialCreate(
  bridge: WebSocketBridge,
  params: MaterialCreateParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'material_create', args: params },
    timestamp: Date.now(),
  };
  try {
    const response = await bridge.sendRequest(msg);
    if (response.error) {
      return formatBridgeError('material-create', response.error);
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', result: response.result }) }] };
  } catch (err) {
    return createToolError('material-create', err);
  }
}
