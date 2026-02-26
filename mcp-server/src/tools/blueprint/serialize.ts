/**
 * blueprint.serialize tool handler.
 * Serializes a Blueprint asset via WebSocket bridge, with cache support
 * to avoid redundant token-heavy round trips.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { CacheStore } from '../../state/cache-store.js';

export interface SerializeParams {
  assetPath: string;
  graphName?: string;
}

export async function blueprintSerialize(
  bridge: WebSocketBridge,
  cache: CacheStore,
  params: SerializeParams,
) {
  const cacheKey = `bp:${params.assetPath}`;

  // Check cache first (only for full-blueprint requests without graphName filter)
  const cached = cache.get(cacheKey);
  if (cached && !params.graphName) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            cacheKey,
            cached: true,
            summary: (cached as Record<string, unknown>).summary || 'Blueprint data cached',
          }),
        },
      ],
    };
  }

  // Build WS message
  const msg = {
    id: uuidv4(),
    method: 'blueprint.serialize',
    params: {
      blueprintPath: params.assetPath,
      ...(params.graphName && { graphName: params.graphName }),
    },
    timestamp: Date.now(),
  };

  try {
    const response = await bridge.sendRequest(msg);

    if (response.error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ status: 'error', error: response.error }),
          },
        ],
      };
    }

    // Cache the full result, return summary
    const result = response.result as Record<string, unknown> | undefined;
    cache.set(cacheKey, result);

    const graphs = result?.graphs as Array<{ nodes?: unknown[] }> | undefined;
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            cacheKey,
            cached: false,
            summary: {
              blueprintPath: params.assetPath,
              graphCount: graphs?.length ?? 0,
              nodeCount:
                graphs?.reduce(
                  (sum: number, g) => sum + (g?.nodes?.length ?? 0),
                  0,
                ) ?? 0,
            },
          }),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ status: 'error', error: message }),
        },
      ],
    };
  }
}
