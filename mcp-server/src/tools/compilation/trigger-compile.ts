/**
 * compilation.trigger tool handler.
 * Triggers a Live Coding / Hot Reload compilation in Unreal Editor.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export async function compilationTrigger(bridge: WebSocketBridge) {
  const msg = {
    id: uuidv4(),
    method: 'compilation.trigger',
    params: {},
    timestamp: Date.now(),
  };

  try {
    const response = await bridge.sendRequest(msg);
    if (response.error) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', error: response.error }) }] };
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'compiling', compileId: response.id, result: response.result }) }] };
  } catch (err) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', error: (err as Error).message }) }] };
  }
}
