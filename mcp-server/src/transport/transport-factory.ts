/**
 * Transport Factory for MCP Server.
 * Supports stdio (Claude Code), SSE, and Streamable HTTP transports.
 * Use --transport=<type> CLI flag or MCP_TRANSPORT env var to select.
 */
import * as http from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type TransportType = 'stdio' | 'sse' | 'streamable-http';

export interface TransportResult {
  /** Call to shut down the transport cleanly. */
  cleanup: () => Promise<void>;
}

/**
 * Parse the desired transport type from CLI argv or environment variables.
 * Precedence: --transport=<type> flag > MCP_TRANSPORT env var > 'stdio' default.
 * Throws if an unrecognized value is supplied.
 */
export function parseTransportType(
  argv: string[],
  env: Record<string, string | undefined>
): TransportType {
  const VALID: TransportType[] = ['stdio', 'sse', 'streamable-http'];

  // Check --transport=<type> in argv
  for (const arg of argv) {
    if (arg.startsWith('--transport=')) {
      const value = arg.slice('--transport='.length);
      if (!VALID.includes(value as TransportType)) {
        throw new Error(
          `Unknown transport type "${value}". Valid options: ${VALID.join(', ')}`
        );
      }
      return value as TransportType;
    }
  }

  // Fall back to MCP_TRANSPORT env var
  if (env.MCP_TRANSPORT) {
    const value = env.MCP_TRANSPORT;
    if (!VALID.includes(value as TransportType)) {
      throw new Error(
        `Unknown MCP_TRANSPORT value "${value}". Valid options: ${VALID.join(', ')}`
      );
    }
    return value as TransportType;
  }

  return 'stdio';
}

/**
 * Start the appropriate transport and connect the McpServer to it.
 * Returns a cleanup function to shut down gracefully.
 */
export async function startTransport(
  server: McpServer,
  type: TransportType,
  options?: {
    port?: number;
    logger?: { info: (msg: string) => void };
  }
): Promise<TransportResult> {
  const log = options?.logger ?? { info: () => {} };

  switch (type) {
    case 'stdio': {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      log.info('MCP server connected via stdio transport');
      return {
        cleanup: async () => {
          // stdio transport has no explicit teardown needed
        },
      };
    }

    case 'sse': {
      const port = resolvePort(options?.port);
      // SSEServerTransport is per-connection; track active transports for POST routing.
      const activeTransports = new Map<string, SSEServerTransport>();

      const httpServer = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost:${port}`);

        if (req.method === 'GET' && url.pathname === '/sse') {
          // Create a new SSE transport for this client. The second arg is the
          // path to which the client will POST messages back.
          const sseTransport = new SSEServerTransport('/messages', res);
          const sessionId = sseTransport.sessionId;
          activeTransports.set(sessionId, sseTransport);

          res.on('close', () => {
            activeTransports.delete(sessionId);
          });

          // Connect a fresh server instance per SSE session would be needed for
          // multi-client SSE, but McpServer supports a single connect(). For
          // simplicity we connect on the first client and reuse for subsequent.
          server.connect(sseTransport).catch((err: unknown) => {
            console.error('[SSE] Error connecting transport:', err);
          });

          log.info(`SSE client connected (session ${sessionId})`);
          return;
        }

        if (req.method === 'POST' && url.pathname === '/messages') {
          // Route the POST body to the matching SSE transport.
          const sessionId = url.searchParams.get('sessionId') ?? '';
          const sseTransport = activeTransports.get(sessionId);
          if (!sseTransport) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Session not found' }));
            return;
          }
          sseTransport.handlePostMessage(req, res).catch((err: unknown) => {
            console.error('[SSE] Error handling POST message:', err);
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, () => {
          httpServer.off('error', reject);
          resolve();
        });
      });

      log.info(`MCP server listening for SSE connections on http://localhost:${port}/sse`);

      return {
        cleanup: async () => {
          await new Promise<void>((resolve) => httpServer.close(() => resolve()));
        },
      };
    }

    case 'streamable-http': {
      const port = resolvePort(options?.port);

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
      });

      await server.connect(transport);

      const httpServer = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost:${port}`);

        if (url.pathname === '/mcp') {
          transport.handleRequest(req, res).catch((err: unknown) => {
            console.error('[StreamableHTTP] Error handling request:', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Internal server error' }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, () => {
          httpServer.off('error', reject);
          resolve();
        });
      });

      log.info(
        `MCP server listening for Streamable HTTP connections on http://localhost:${port}/mcp`
      );

      return {
        cleanup: async () => {
          await new Promise<void>((resolve) => httpServer.close(() => resolve()));
        },
      };
    }

    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled transport type: ${String(_exhaustive)}`);
    }
  }
}

function resolvePort(optionsPort?: number): number {
  if (optionsPort !== undefined) return optionsPort;
  const envPort = process.env.MCP_HTTP_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 3000;
}
