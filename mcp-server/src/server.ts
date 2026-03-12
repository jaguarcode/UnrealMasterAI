/**
 * MCP Server Setup.
 * Creates and configures the McpServer with auto-registered tools.
 *
 * Tool registrations are defined in each domain's index.ts file
 * (e.g., tools/actor/index.ts, tools/blueprint/index.ts).
 * Custom tools can be added to the custom-tools/ directory.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'node:path';
import type { Logger } from './observability/logger.js';
import type { WebSocketBridge } from './transport/websocket-bridge.js';
import type { RateLimiter } from './state/rate-limiter.js';
import { CacheStore } from './state/cache-store.js';
import { SessionManager } from './state/session.js';
import { ApprovalGate } from './state/safety.js';
import { EmbeddingStore } from './rag/embedding-store.js';
import { SlateTemplateLoader } from './rag/slate-templates.js';
import type { ToolContext } from './tools/tool-module.js';
import { ToolHookManager } from './tools/tool-hooks.js';
import { autoRegisterTools } from './tools/auto-register.js';

/**
 * Server instructions embedded into the MCP initialization handshake.
 * Any Claude instance connecting to this server receives these directives
 * automatically — no CLAUDE.md file required in the user's project folder.
 */
const SERVER_INSTRUCTIONS = `
# Unreal Master Agent — Context-First Workflow

You are connected to the Unreal Master Agent MCP server, which provides 183+ tools
across 37 domains for bidirectional control of Unreal Engine. Follow this mandatory
workflow for EVERY developer request involving UE operations.

## 1. Intent Matching (BEFORE executing any tool)
Always call \`context-matchIntent\` first with the developer's natural language request.
- Returns the optimal workflow, tool sequence, confidence score, and outcome history.
- If confidence >= 0.5, follow the recommended \`suggestedToolSequence\`.
- If confidence < 0.5, use your judgment but still reference partial matches.
- Prefer workflows with higher success rates when \`outcomeInfo\` is present.

## 2. Error Recovery (WHEN any tool call fails)
When a tool returns an error, immediately call \`context-matchError\` before manual troubleshooting.
- Checks both built-in recovery strategies AND learned resolutions from past sessions.
- Follow \`recommendation.steps\` in order.
- Respect \`recommendation.avoidActions\` — these are confirmed dead-end approaches.
- If confidence >= 0.4, apply the recommendation directly.

## 3. Outcome Recording (AFTER completing a workflow)
After completing a developer request that matched a workflow, call \`context-recordOutcome\`.
- Set \`success: true/false\` based on whether the task completed as expected.
- Include \`toolsUsed\` with the actual tools called during execution.
- This builds outcome history that improves future recommendations.

## 4. Error Resolution Learning (AFTER fixing an error)
When you resolve an error through troubleshooting, call \`context-recordResolution\`.
- Capture the original error message and source tool.
- Document ALL attempted fixes (including failures — these prevent future dead ends).
- Record the successful fix with its tool sequence and step-by-step instructions.
- Provide a root cause analysis.

## 5. Workflow Learning (WHEN discovering new patterns)
When you discover a new effective workflow not in the knowledge base:
- Call \`context-learnWorkflow\` to persist it.
- Include clear \`intentPatterns\` so future similar requests match it.
- Tag it with the relevant UE domain.

## Decision Flow

Developer Request
  → context-matchIntent(request)
    → High confidence → Follow suggestedToolSequence
      → Tool succeeds → Continue → All done → context-recordOutcome(success: true)
      → Tool fails → context-matchError(error)
        → Resolution found → Apply fix → context-markResolutionReused(id)
        → No match → Manual troubleshooting → Fixed → context-recordResolution(details)
    → Low/no match → Execute with best judgment
      → Success → context-learnWorkflow(new pattern)

## Key Technical Constraints
1. GameThread-only UE APIs — dispatch via AsyncTask(ENamedThreads::GameThread).
2. stdout is sacred — never console.log() in MCP server code, use stderr.
3. TryCreateConnection, never MakeLinkTo — for Blueprint pin connections.
4. UE is the WebSocket CLIENT — Node.js listens, UE connects.
5. Python scripts follow standard pattern — @execute_wrapper, execute(params), make_result()/make_error().
6. Spawn actors by full class path — e.g., /Script/Engine.TargetPoint, not just TargetPoint.
7. Actor mobility — StaticMeshActors default to Static, set to Movable before runtime movement.
`.trim();

interface ServerOptions {
  rateLimiter?: RateLimiter;
}

/**
 * Create and configure the MCP server with all tools auto-registered.
 * @param logger - stderr-only logger
 * @param bridge - WebSocket bridge to the UE plugin
 * @param options - optional server options (rate limiter, etc.)
 */
export function createServer(logger: Logger, bridge: WebSocketBridge, options: ServerOptions = {}): McpServer {
  const { rateLimiter } = options;
  const server = new McpServer(
    {
      name: 'unreal-master-agent',
      version: '0.5.0',
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // Build shared tool context
  const cache = new CacheStore({ maxEntries: 1000, ttlMs: 60000 });
  const session = new SessionManager(3);
  const approvalGate = new ApprovalGate(60000, bridge);
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

  const ctx: ToolContext = {
    bridge,
    logger,
    cache,
    session,
    approvalGate,
    allowedRoots,
    slateStore,
  };

  // Set up tool hooks
  const hookManager = new ToolHookManager();

  // Custom tools directory (relative to mcp-server/)
  const customToolsDir = path.resolve(process.cwd(), 'custom-tools');

  // Auto-register all tools (built-in synchronously, custom async)
  const { builtinCount, customToolsPromise } = autoRegisterTools(server, ctx, {
    rateLimiter,
    hookManager,
    customToolsDir,
  });

  // Custom tools load asynchronously — log when ready
  customToolsPromise.catch(err => {
    logger.error(`Custom tool loading failed: ${(err as Error).message}`);
  });

  return server;
}
