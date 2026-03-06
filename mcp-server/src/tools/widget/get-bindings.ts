/**
 * widget.getBindings tool handler.
 * Returns property bindings and event dispatchers for a Widget Blueprint.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface WidgetGetBindingsParams {
  widgetPath: string;
}

export async function widgetGetBindings(
  bridge: WebSocketBridge,
  params: WidgetGetBindingsParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'widget_get_bindings', args: params },
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
