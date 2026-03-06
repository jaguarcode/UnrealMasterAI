/**
 * material.setParameter tool handler.
 * Sets a parameter on a material asset via the Python bridge.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface MaterialSetParameterParams {
  materialPath: string;
  parameterName: string;
  value: unknown;
  parameterType?: string;
}

export async function materialSetParameter(
  bridge: WebSocketBridge,
  params: MaterialSetParameterParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'material_set_param', args: params },
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
