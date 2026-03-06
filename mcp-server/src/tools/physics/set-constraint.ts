/**
 * physics.setConstraint tool handler.
 * Configures constraint limits on a PhysicsAsset constraint.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface PhysicsSetConstraintParams {
  physicsAssetPath: string;
  constraintName: string;
  linearLimit?: number;
  angularLimit?: number;
}

export async function physicsSetConstraint(
  bridge: WebSocketBridge,
  params: PhysicsSetConstraintParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'physics_set_constraint', args: params },
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
