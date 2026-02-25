/**
 * compilation.getErrors tool handler.
 * Gets compilation errors from Unreal Editor.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface GetErrorsParams {
  compileId?: string;
}

export async function compilationGetErrors(bridge: WebSocketBridge, params: GetErrorsParams) {
  const msg = {
    id: uuidv4(),
    method: 'compilation.getErrors',
    params: { ...(params.compileId && { compileId: params.compileId }) },
    timestamp: Date.now(),
  };

  try {
    const response = await bridge.sendRequest(msg);
    if (response.error) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', error: response.error }) }] };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify(response.result) }] };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', error: (err as Error).message }) }] };
  }
}
