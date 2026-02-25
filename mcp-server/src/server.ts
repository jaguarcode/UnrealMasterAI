/**
 * MCP Server Setup.
 * Creates and configures the McpServer with all tool registrations.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import path from 'node:path';
import type { Logger } from './observability/logger.js';
import type { WebSocketBridge } from './transport/websocket-bridge.js';
import { editorPing } from './tools/editor/ping.js';
import { editorGetLevelInfo } from './tools/editor/get-level-info.js';
import { editorListActors } from './tools/editor/list-actors.js';
import { editorGetAssetInfo } from './tools/editor/get-asset-info.js';
import { CacheStore } from './state/cache-store.js';
import { blueprintSerialize } from './tools/blueprint/serialize.js';
import { blueprintCreateNode } from './tools/blueprint/create-node.js';
import { blueprintConnectPins } from './tools/blueprint/connect-pins.js';
import { blueprintModifyProperty } from './tools/blueprint/modify-property.js';
import { blueprintDeleteNode } from './tools/blueprint/delete-node.js';
import { compilationTrigger } from './tools/compilation/trigger-compile.js';
import { compilationGetStatus } from './tools/compilation/get-status.js';
import { compilationGetErrors } from './tools/compilation/get-errors.js';
import { SessionManager } from './state/session.js';
import { compilationSelfHeal } from './tools/compilation/self-heal.js';
import { fileRead } from './tools/file/read-file.js';
import { fileWrite } from './tools/file/write-file.js';
import { fileSearch } from './tools/file/search-files.js';
import { ApprovalGate } from './state/safety.js';
import { validateSlateCode } from './tools/slate/validate-slate.js';
import { generateWidgetContext } from './tools/slate/generate-widget.js';
import { listTemplates } from './tools/slate/list-templates.js';
import { EmbeddingStore } from './rag/embedding-store.js';
import { SlateTemplateLoader } from './rag/slate-templates.js';

/**
 * Create and configure the MCP server with all tools registered.
 * @param logger - stderr-only logger
 * @param bridge - WebSocket bridge to the UE plugin
 */
export function createServer(logger: Logger, bridge: WebSocketBridge): McpServer {
  const server = new McpServer({
    name: 'unreal-master-agent',
    version: '0.1.0',
  });

  const cache = new CacheStore({ maxEntries: 1000, ttlMs: 60000 });

  const session = new SessionManager(3);

  const approvalGate = new ApprovalGate();
  const allowedRoots = ['/Game/', '/Engine/'];

  // Initialize RAG store for Slate templates
  const slateStore = new EmbeddingStore();
  const templatesDir = path.resolve(process.cwd(), '../docs/slate-templates');
  try {
    const loader = new SlateTemplateLoader(slateStore, templatesDir);
    loader.loadAll();
    logger.info(`Slate templates loaded from ${templatesDir}`);
  } catch (e) {
    logger.warn(`Could not load Slate templates: ${(e as Error).message}`);
  }

  // Register editor.ping tool
  server.tool(
    'editor-ping',
    'Ping the Unreal Engine editor to verify connectivity. Returns "pong" if the UE plugin is connected.',
    {},
    async () => {
      logger.info('editor.ping called');
      return editorPing(bridge);
    }
  );

  // Register editor.getLevelInfo tool
  server.tool(
    'editor-getLevelInfo',
    'Get information about the currently loaded level in the Unreal Editor.',
    {},
    async () => {
      logger.info('editor.getLevelInfo called');
      return editorGetLevelInfo(bridge);
    }
  );

  // Register editor.listActors tool
  server.tool(
    'editor-listActors',
    'List actors in the current Unreal Editor level with optional class name and tag filters.',
    {
      className: z.string().optional().describe('Filter actors by class name'),
      tag: z.string().optional().describe('Filter actors by tag'),
    },
    async (params) => {
      logger.info('editor.listActors called');
      return editorListActors(bridge, params);
    }
  );

  // Register editor.getAssetInfo tool
  server.tool(
    'editor-getAssetInfo',
    'Get metadata for a specific asset in the Unreal Editor project.',
    {
      assetPath: z.string().describe('Asset path (e.g., /Game/BP_TestActor)'),
    },
    async (params) => {
      logger.info('editor.getAssetInfo called');
      return editorGetAssetInfo(bridge, params);
    }
  );

  // Blueprint tools
  server.tool(
    'blueprint-serialize',
    'Serialize a Blueprint to JSON AST. Returns a cache key and summary (full data cached server-side).',
    {
      assetPath: z.string().describe('Blueprint asset path (e.g., /Game/BP_TestActor)'),
      graphName: z.string().optional().describe('Specific graph name to serialize'),
    },
    async (params) => {
      logger.info(`blueprint.serialize called for ${params.assetPath}`);
      return blueprintSerialize(bridge, cache, params);
    }
  );

  server.tool(
    'blueprint-createNode',
    'Create a new Blueprint node in a graph.',
    {
      blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
      graphName: z.string().describe('Target graph name'),
      nodeClass: z.string().describe('Node class (e.g., K2Node_CallFunction)'),
      posX: z.number().int().optional().describe('X position'),
      posY: z.number().int().optional().describe('Y position'),
    },
    async (params) => {
      logger.info('blueprint.createNode called');
      return blueprintCreateNode(bridge, params);
    }
  );

  server.tool(
    'blueprint-connectPins',
    'Connect two Blueprint pins using TryCreateConnection.',
    {
      blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
      sourcePinId: z.string().describe('Source pin UUID'),
      targetPinId: z.string().describe('Target pin UUID'),
    },
    async (params) => {
      logger.info('blueprint.connectPins called');
      return blueprintConnectPins(bridge, params);
    }
  );

  server.tool(
    'blueprint-modifyProperty',
    'Modify a property value on a Blueprint node.',
    {
      blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
      nodeId: z.string().describe('Node UUID'),
      propertyName: z.string().describe('Property name to modify'),
      propertyValue: z.string().describe('New property value'),
    },
    async (params) => {
      logger.info('blueprint.modifyProperty called');
      return blueprintModifyProperty(bridge, params);
    }
  );

  server.tool(
    'blueprint-deleteNode',
    'Delete a Blueprint node by its UUID.',
    {
      blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
      nodeId: z.string().describe('Node UUID to delete'),
    },
    async (params) => {
      logger.info('blueprint.deleteNode called');
      return blueprintDeleteNode(bridge, params);
    }
  );

  // Compilation tools
  server.tool(
    'compilation-trigger',
    'Trigger a Live Coding compilation in the Unreal Editor.',
    {},
    async () => {
      logger.info('compilation.trigger called');
      return compilationTrigger(bridge);
    }
  );

  server.tool(
    'compilation-getStatus',
    'Get the status of the current or last compilation.',
    {
      compileId: z.string().optional().describe('Compile ID to check'),
    },
    async (params) => {
      logger.info('compilation.getStatus called');
      return compilationGetStatus(bridge, params);
    }
  );

  server.tool(
    'compilation-getErrors',
    'Get structured compile errors from the last compilation.',
    {
      compileId: z.string().optional().describe('Compile ID to check'),
    },
    async (params) => {
      logger.info('compilation.getErrors called');
      return compilationGetErrors(bridge, params);
    }
  );

  // Self-healing compile loop
  server.tool(
    'compilation-selfHeal',
    'Get current compile errors and self-healing context. Returns errors, retry count, and suggestion for Claude to act on.',
    {
      filePath: z.string().optional().describe('File path with errors (for retry tracking)'),
    },
    async (params) => {
      logger.info('compilation.selfHeal called');
      return compilationSelfHeal(bridge, session, params);
    }
  );

  // File operation tools
  server.tool(
    'file-read',
    'Read a source file from the Unreal Engine project.',
    {
      filePath: z.string().describe('File path to read'),
      offset: z.number().int().optional(),
      limit: z.number().int().optional(),
    },
    async (params) => {
      logger.info(`file.read: ${params.filePath}`);
      return fileRead(bridge, params, allowedRoots);
    }
  );

  server.tool(
    'file-write',
    'Write content to a source file in the Unreal Engine project.',
    {
      filePath: z.string().describe('File path to write'),
      content: z.string().describe('File content'),
    },
    async (params) => {
      logger.info(`file.write: ${params.filePath}`);
      return fileWrite(bridge, params, allowedRoots, approvalGate);
    }
  );

  server.tool(
    'file-search',
    'Search for files or patterns in the Unreal Engine project.',
    {
      pattern: z.string().describe('Search pattern'),
      directory: z.string().optional(),
      glob: z.string().optional(),
    },
    async (params) => {
      logger.info(`file.search: ${params.pattern}`);
      return fileSearch(bridge, params);
    }
  );

  // Slate tools
  server.tool(
    'slate-validate',
    'Validate Slate C++ code for common errors (unbalanced SNew, missing SLATE_END_ARGS, etc.).',
    {
      code: z.string().describe('Slate C++ code to validate'),
    },
    async (params) => {
      logger.info('slate.validate called');
      const result = validateSlateCode(params.code);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'slate-generate',
    'Get relevant Slate templates and style guide for widget generation.',
    {
      query: z.string().describe('Widget description (e.g., "list view with checkboxes")'),
      widgetName: z.string().optional(),
    },
    async (params) => {
      logger.info(`slate.generate: ${params.query}`);
      const result = generateWidgetContext(slateStore, params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'slate-listTemplates',
    'List all available Slate widget templates.',
    {},
    async () => {
      logger.info('slate.listTemplates called');
      const templates = listTemplates(slateStore);
      return { content: [{ type: 'text' as const, text: JSON.stringify(templates) }] };
    }
  );

  logger.info('MCP tools registered: editor-ping, editor-getLevelInfo, editor-listActors, editor-getAssetInfo, blueprint-serialize, blueprint-createNode, blueprint-connectPins, blueprint-modifyProperty, blueprint-deleteNode, compilation-trigger, compilation-getStatus, compilation-getErrors, compilation-selfHeal, file-read, file-write, file-search, slate-validate, slate-generate, slate-listTemplates');

  return server;
}
