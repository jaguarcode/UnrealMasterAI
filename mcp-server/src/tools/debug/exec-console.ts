/**
 * debug.execConsole tool handler.
 * Executes a console command via C++ handler (not Python) for safety.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface DebugExecConsoleParams {
  command: string;
}

export async function debugExecConsole(
  bridge: WebSocketBridge,
  params: DebugExecConsoleParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'debug.execConsole' as const,
    params: { command: params.command },
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
