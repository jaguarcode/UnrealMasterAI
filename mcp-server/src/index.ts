#!/usr/bin/env node
/**
 * MCP Bridge Server Entry Point.
 * Initializes WebSocket bridge, then McpServer with the selected transport.
 * Transport is selected via --transport=<type> flag or MCP_TRANSPORT env var.
 * Supported: stdio (default), sse, streamable-http.
 *
 * CRITICAL (stdio mode): No output to stdout except JSON-RPC messages.
 * All logging goes to stderr via the logger module.
 */

// Handle CLI subcommands before anything else so stdout is never guarded.
const args = process.argv;

if (args.includes('init')) {
  const { runInit } = await import('./cli/init.js');
  await runInit();
  process.exit(0);
}

if (args.includes('analytics')) {
  const { runAnalytics } = await import('./cli/analytics.js');
  await runAnalytics();
  process.exit(0);
}

if (args.includes('import-workflow')) {
  const idx = args.indexOf('import-workflow');
  const source = args[idx + 1];
  if (!source) {
    console.error('Usage: unreal-master-mcp-server import-workflow <path-or-url-or-id>');
    process.exit(1);
  }
  const { runImportWorkflow } = await import('./cli/import-workflow.js');
  await runImportWorkflow(source);
  setTimeout(() => process.exit(0), 100);
  // Prevent server from starting — await a never-resolving promise
  await new Promise(() => {});
}

// --- MCP Server startup (only reached if no CLI subcommand matched) ---

import { installStdoutGuard, createLogger } from './observability/logger.js';
import { createServer } from './server.js';
import { WebSocketBridge } from './transport/websocket-bridge.js';
import { RateLimiter } from './state/rate-limiter.js';
import { parseTransportType, startTransport } from './transport/transport-factory.js';

// Determine transport type before installing the stdout guard — SSE/HTTP transports
// do not require the guard since they don't use stdout for JSON-RPC framing.
const transportType = parseTransportType(process.argv, process.env);

// Install stdout guard only for stdio transport (stdout is the JSON-RPC channel).
if (transportType === 'stdio') {
  installStdoutGuard();
}

const logger = createLogger(
  (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ?? 'info'
);

async function main() {
  logger.info(`Starting Unreal Master Agent MCP Bridge Server (transport: ${transportType})`);

  const wsPort = parseInt(process.env.UE_WS_PORT ?? '9877', 10);
  const authSecret = process.env.WS_AUTH_SECRET;
  const bridge = new WebSocketBridge({ port: wsPort, authSecret });
  await bridge.start();
  logger.info(`WebSocket bridge listening on port ${bridge.getPort()}`);
  if (authSecret) {
    logger.info('WebSocket authentication enabled');
  }

  const rateLimiter = new RateLimiter();
  const mcpServer = createServer(logger, bridge, { rateLimiter });

  await startTransport(mcpServer, transportType, { logger });
}

main().catch((error) => {
  const logger = createLogger('error');
  logger.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
