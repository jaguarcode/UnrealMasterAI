/**
 * project.snapshot tool handler.
 * Generates a comprehensive project summary with 5-minute TTL caching.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { McpToolResult } from '../editor/ping.js';
import type { CacheStore } from '../../state/cache-store.js';

const SNAPSHOT_CACHE_KEY = 'project-snapshot';
const SNAPSHOT_TTL_MS = 300000; // 5 minutes

export interface ProjectSnapshotParams {
  forceRefresh?: boolean;
}

export async function projectSnapshot(
  bridge: WebSocketBridge,
  cache: CacheStore,
  params?: ProjectSnapshotParams
): Promise<McpToolResult> {
  if (!params?.forceRefresh) {
    const cached = cache.get(SNAPSHOT_CACHE_KEY);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ status: 'success', result: cached, cached: true }),
          },
        ],
      };
    }
  }

  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: 'project_snapshot', args: {} },
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

    cache.set(SNAPSHOT_CACHE_KEY, response.result, SNAPSHOT_TTL_MS);

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
