/**
 * MCP Bridge Server Entry Point.
 * Initializes WebSocket bridge, then McpServer with StdioServerTransport.
 *
 * CRITICAL: No output to stdout except JSON-RPC messages.
 * All logging goes to stderr via the logger module.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { installStdoutGuard, createLogger } from './observability/logger.js';
import { createServer } from './server.js';
import { WebSocketBridge } from './transport/websocket-bridge.js';

// Install stdout guard FIRST — before any other code can pollute stdout
installStdoutGuard();

const logger = createLogger(
  (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ?? 'info'
);

async function main() {
  logger.info('Starting Unreal Master Agent MCP Bridge Server');

  const wsPort = parseInt(process.env.UE_WS_PORT ?? '9877', 10);
  const bridge = new WebSocketBridge({ port: wsPort });
  await bridge.start();
  logger.info(`WebSocket bridge listening on port ${bridge.getPort()}`);

  const mcpServer = createServer(logger, bridge);

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  logger.info('MCP Bridge Server connected via stdio transport');
}

main().catch((error) => {
  const logger = createLogger('error');
  logger.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
