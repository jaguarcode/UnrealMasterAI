/**
 * worldpartition.createHLOD tool handler.
 * Creates a Hierarchical Level of Detail (HLOD) layer config for World Partition.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface WorldPartitionCreateHLODParams {
  layerName: string;
  hlodSetupAsset?: string;
}

export async function worldpartitionCreateHLOD(
  bridge: WebSocketBridge,
  params: WorldPartitionCreateHLODParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'worldpartition_create_hlod', args: params },
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
