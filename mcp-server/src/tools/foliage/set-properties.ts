/**
 * foliage.setProperties tool handler.
 * Sets density, scale, and cull distance on a foliage type.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface FoliageSetPropertiesParams {
  foliageTypePath: string;
  density?: number;
  scale?: number;
  cullDistance?: number;
}

export async function foliageSetProperties(
  bridge: WebSocketBridge,
  params: FoliageSetPropertiesParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'foliage_set_properties', args: params },
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
