/**
 * editor.ping tool handler.
 * Sends a ping message through the WebSocket bridge to the UE plugin
 * and returns an MCP-formatted response.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  [key: string]: unknown;
  content: McpTextContent[];
}

/**
 * Send an editor.ping through the WebSocket bridge and return an MCP-formatted result.
 * On success: { status: 'pong', result: <UE response> }
 * On failure: { status: 'error', error: <error message> }
 */
export async function editorPing(bridge: WebSocketBridge): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'editor.ping' as const,
    params: {},
    timestamp: Date.now(),
  };

  try {
    const response = await bridge.sendRequest(msg);

    if (response.error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ status: 'error', error: response.error }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status: 'pong', result: response.result }),
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
