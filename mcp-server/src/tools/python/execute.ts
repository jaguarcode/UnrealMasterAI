/**
 * python.execute tool handler.
 * Sends a Python script execution request through the WebSocket bridge to the UE plugin.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface PythonExecuteParams {
  script: string;
  args?: Record<string, unknown>;
}

/**
 * Execute a bundled Python script in the UE Python runtime.
 * @param bridge - WebSocket bridge to UE plugin
 * @param params - Script name and optional arguments
 */
export async function pythonExecute(
  bridge: WebSocketBridge,
  params: PythonExecuteParams
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: {
      script: params.script,
      args: params.args ?? {},
    },
    timestamp: Date.now(),
  };

  try {
    const response = await bridge.sendRequest(msg);

    if (response.error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: response.error,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            result: response.result,
          }),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status: 'error', error: message }),
        },
      ],
    };
  }
}
