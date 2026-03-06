/**
 * project.getDependencyGraph tool handler.
 * Returns the asset reference graph for a given asset path.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface ProjectGetDependencyGraphParams {
  assetPath: string;
}

export async function projectGetDependencyGraph(
  bridge: WebSocketBridge,
  params: ProjectGetDependencyGraphParams
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'project_dependencies', args: params },
    timestamp: Date.now(),
  };

  try {
    const response = await bridge.sendRequest(msg);

    if (response.error) {
      return {
        content: [
          { type: 'text', text: JSON.stringify({ status: 'error', error: response.error }) },
        ],
      };
    }

    return {
      content: [
        { type: 'text', text: JSON.stringify({ status: 'success', result: response.result }) },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}
