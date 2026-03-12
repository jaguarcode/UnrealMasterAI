#!/usr/bin/env node
/**
 * MCP Bridge Server Entry Point.
 * Initializes WebSocket bridge, then McpServer with StdioServerTransport.
 *
 * CRITICAL: No output to stdout except JSON-RPC messages.
 * All logging goes to stderr via the logger module.
 */

// Handle `init` subcommand before anything else so stdout is never guarded.
if (process.argv.includes('init')) {
  const { runInit } = await import('./cli/init.js');
  await runInit();
  process.exit(0);
}

// Handle `import-workflow` subcommand before stdout guard is installed.
if (process.argv.includes('import-workflow')) {
  const idx = process.argv.indexOf('import-workflow');
  const source = process.argv[idx + 1];
  if (!source) {
    console.error('Usage: unreal-master-mcp-server import-workflow <path-or-url>');
    process.exit(1);
  }
  const { runImportWorkflow } = await import('./cli/import-workflow.js');
  await runImportWorkflow(source);
  process.exit(0);
}

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { installStdoutGuard, createLogger } from './observability/logger.js';
import { createServer } from './server.js';
import { WebSocketBridge } from './transport/websocket-bridge.js';
import { RateLimiter } from './state/rate-limiter.js';

// Install stdout guard FIRST — before any other code can pollute stdout
installStdoutGuard();

const logger = createLogger(
  (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ?? 'info'
);

async function main() {
  logger.info('Starting Unreal Master Agent MCP Bridge Server');

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

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  logger.info('MCP Bridge Server connected via stdio transport');
}

main().catch((error) => {
  const logger = createLogger('error');
  logger.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
