/**
 * editor.ping tool handler.
 * Sends a ping message through the WebSocket bridge to the UE plugin
 * and returns an MCP-formatted response with latency and diagnostics.
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

const SUGGESTED_FIXES = [
  'Ensure Unreal Editor is running with the UnrealMasterAgent plugin enabled',
  'Check that the WebSocket port (default: 8080) is not blocked by firewall',
  'Verify the plugin is enabled in Edit → Plugins → UnrealMasterAgent',
  'Try restarting the Unreal Editor',
];

/**
 * Send an editor.ping through the WebSocket bridge and return an MCP-formatted result.
 * On success: { status: 'pong', latencyMs, ueVersion, websocketState }
 * On failure: { status: 'error'|'timeout'|'disconnected', error, diagnostics }
 */
export async function editorPing(bridge: WebSocketBridge): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'editor.ping' as const,
    params: {},
    timestamp: Date.now(),
  };

  const startTime = Date.now();

  try {
    const response = await bridge.sendRequest(msg);
    const latencyMs = Date.now() - startTime;

    if (response.error) {
      const diagnostics = bridge.getDiagnostics();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: response.error,
              latencyMs,
              diagnostics: {
                ...diagnostics,
                suggestedFixes: SUGGESTED_FIXES,
              },
            }),
          },
        ],
      };
    }

    const result = response.result as Record<string, unknown> | undefined;
    const ueVersion = result && typeof result['ueVersion'] === 'string'
      ? result['ueVersion']
      : undefined;

    const diagnostics = bridge.getDiagnostics();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'pong',
            result: response.result,
            latencyMs,
            ...(ueVersion !== undefined ? { ueVersion } : {}),
            websocketState: diagnostics.websocketState,
          }),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const diagnostics = bridge.getDiagnostics();

    const isTimeout = message.toLowerCase().includes('timeout');
    const isDisconnected = message.toLowerCase().includes('not connected') ||
      message.toLowerCase().includes('disconnected');

    const failureKind = isTimeout ? 'timeout' : isDisconnected ? 'disconnected' : 'error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            failureKind,
            error: message,
            diagnostics: {
              ...diagnostics,
              suggestedFixes: SUGGESTED_FIXES,
            },
          }),
        },
      ],
    };
  }
}
