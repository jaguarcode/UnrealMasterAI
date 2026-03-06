/**
 * actor.setTransform tool handler.
 * Sets the transform (location, rotation, scale) of an actor in the level.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface ActorSetTransformParams {
  actorName: string;
  location?: Vec3;
  rotation?: Rotation;
  scale?: Vec3;
}

export async function actorSetTransform(
  bridge: WebSocketBridge,
  params: ActorSetTransformParams,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'actor_transform', args: params },
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
