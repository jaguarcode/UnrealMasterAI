import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface WorkflowCreateCharacterParams {
  characterName: string;
  basePath: string;
  meshPath?: string;
}

export async function workflowCreateCharacter(
  bridge: WebSocketBridge,
  params: WorkflowCreateCharacterParams
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'workflow_create_character', args: params },
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
