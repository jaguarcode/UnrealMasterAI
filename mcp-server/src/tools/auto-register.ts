/**
 * Auto-registration system for MCP tools.
 * Scans domain directories for index.ts exports and registers all tools.
 * Also supports custom tool loading from custom-tools/ directory.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import fs from 'node:fs';
import path from 'node:path';
import type { ToolModule, ToolContext, GetToolsFn } from './tool-module.js';
import type { ToolHookManager } from './tool-hooks.js';
import type { RateLimiter } from '../state/rate-limiter.js';

// Static imports of all domain tool modules — ensures TypeScript compilation
// includes them and avoids dynamic import issues.
import { getTools as getEditorTools } from './editor/index.js';
import { getTools as getBlueprintTools } from './blueprint/index.js';
import { getTools as getCompilationTools } from './compilation/index.js';
import { getTools as getFileTools } from './file/index.js';
import { getTools as getSlateTools } from './slate/index.js';
import { getTools as getChatTools } from './chat/index.js';
import { getTools as getPythonTools } from './python/index.js';
import { getTools as getProjectTools } from './project/index.js';
import { getTools as getAssetTools } from './asset/index.js';
import { getTools as getContentTools } from './content/index.js';
import { getTools as getActorTools } from './actor/index.js';
import { getTools as getLevelTools } from './level/index.js';
import { getTools as getMaterialTools } from './material/index.js';
import { getTools as getMeshTools } from './mesh/index.js';
import { getTools as getDatatableTools } from './datatable/index.js';
import { getTools as getAnimationTools } from './animation/index.js';
import { getTools as getGameplayTools } from './gameplay/index.js';
import { getTools as getSourcecontrolTools } from './sourcecontrol/index.js';
import { getTools as getBuildTools } from './build/index.js';
import { getTools as getDebugTools } from './debug/index.js';
import { getTools as getSequencerTools } from './sequencer/index.js';
import { getTools as getWidgetTools } from './widget/index.js';
import { getTools as getAiTools } from './ai/index.js';
import { getTools as getTextureTools } from './texture/index.js';
import { getTools as getNiagaraTools } from './niagara/index.js';
import { getTools as getAudioTools } from './audio/index.js';
import { getTools as getLandscapeTools } from './landscape/index.js';
import { getTools as getPhysicsTools } from './physics/index.js';
import { getTools as getWorldpartitionTools } from './worldpartition/index.js';
import { getTools as getFoliageTools } from './foliage/index.js';
import { getTools as getCurveTools } from './curve/index.js';
import { getTools as getPcgTools } from './pcg/index.js';
import { getTools as getGeoscriptTools } from './geoscript/index.js';
import { getTools as getWorkflowTools } from './workflow/index.js';
import { getTools as getAnalyzeTools } from './analyze/index.js';
import { getTools as getRefactorTools } from './refactor/index.js';
import { getTools as getContextTools } from './context/index.js';

/** All built-in domain tool getters in registration order. */
const DOMAIN_GETTERS: GetToolsFn[] = [
  getEditorTools,
  getBlueprintTools,
  getCompilationTools,
  getFileTools,
  getSlateTools,
  getChatTools,
  getPythonTools,
  getProjectTools,
  getAssetTools,
  getContentTools,
  getActorTools,
  getLevelTools,
  getMaterialTools,
  getMeshTools,
  getDatatableTools,
  getAnimationTools,
  getGameplayTools,
  getSourcecontrolTools,
  getBuildTools,
  getDebugTools,
  getSequencerTools,
  getWidgetTools,
  getAiTools,
  getTextureTools,
  getNiagaraTools,
  getAudioTools,
  getLandscapeTools,
  getPhysicsTools,
  getWorldpartitionTools,
  getFoliageTools,
  getCurveTools,
  getPcgTools,
  getGeoscriptTools,
  getWorkflowTools,
  getAnalyzeTools,
  getRefactorTools,
  getContextTools,
];

/**
 * Collect all built-in tool modules from domain directories.
 */
export function getAllBuiltinTools(): ToolModule[] {
  const tools: ToolModule[] = [];
  for (const getter of DOMAIN_GETTERS) {
    tools.push(...getter());
  }
  return tools;
}

/**
 * Load custom tool modules from a directory.
 * Each .js file in the directory should default-export a ToolModule or ToolModule[].
 */
export async function loadCustomTools(customDir: string): Promise<ToolModule[]> {
  const tools: ToolModule[] = [];
  if (!fs.existsSync(customDir)) {
    return tools;
  }

  const files = fs.readdirSync(customDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
  for (const file of files) {
    if (file.endsWith('.d.ts') || file.startsWith('_') || file === 'README.md') continue;
    try {
      const fullPath = path.resolve(customDir, file);
      const mod = await import(fullPath);
      const exported = mod.default ?? mod.getTools?.();
      if (Array.isArray(exported)) {
        tools.push(...exported);
      } else if (exported && typeof exported === 'object' && exported.name) {
        tools.push(exported as ToolModule);
      }
    } catch {
      // Skip files that don't export valid tool modules
    }
  }
  return tools;
}

function withRateLimit(
  rateLimiter: RateLimiter | undefined,
  toolName: string,
  handler: (params: Record<string, unknown>) => Promise<unknown>,
): (params: Record<string, unknown>) => Promise<unknown> {
  if (!rateLimiter) return handler;
  return async (params: Record<string, unknown>) => {
    const result = rateLimiter.check(toolName);
    if (!result.allowed) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            code: 'UMA_E_RATE_LIMITED',
            error: `Rate limited. Retry after ${result.retryAfterMs}ms`,
            retryAfterMs: result.retryAfterMs,
          }),
        }],
      };
    }
    return handler(params);
  };
}

export interface AutoRegisterOptions {
  rateLimiter?: RateLimiter;
  hookManager?: ToolHookManager;
  customToolsDir?: string;
}

/**
 * Register a list of tool modules on the MCP server.
 * Wraps each handler with hooks and rate limiting.
 */
function registerToolModules(
  server: McpServer,
  ctx: ToolContext,
  tools: ToolModule[],
  rateLimiter?: RateLimiter,
  hookManager?: ToolHookManager,
): void {
  for (const tool of tools) {
    const wrappedHandler = async (params: Record<string, unknown>) => {
      ctx.logger.info(`${tool.name} called`);

      // Run pre-hooks
      let finalParams = params;
      if (hookManager) {
        finalParams = await hookManager.runPreHooks(tool.name, params);
      }

      const startTime = Date.now();
      const result = await tool.handler(ctx, finalParams);
      const durationMs = Date.now() - startTime;

      // Run post-hooks
      if (hookManager) {
        return hookManager.runPostHooks(tool.name, finalParams, result, durationMs);
      }
      return result;
    };

    const finalHandler = withRateLimit(rateLimiter, tool.name, wrappedHandler);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (server as any).tool(tool.name, tool.description, tool.schema, finalHandler);
  }
}

/**
 * Register all built-in tools synchronously, then load custom tools async.
 * Built-in tools are available immediately after this call returns.
 * Custom tools are loaded asynchronously and registered when ready.
 */
export function autoRegisterTools(
  server: McpServer,
  ctx: ToolContext,
  options: AutoRegisterOptions = {},
): { builtinCount: number; customToolsPromise: Promise<number> } {
  const { rateLimiter, hookManager, customToolsDir } = options;

  // Register built-in tools synchronously
  const builtinTools = getAllBuiltinTools();
  registerToolModules(server, ctx, builtinTools, rateLimiter, hookManager);

  ctx.logger.info(`MCP built-in tools registered: ${builtinTools.length}`);

  // Load and register custom tools asynchronously
  const customToolsPromise = (async () => {
    if (!customToolsDir) return 0;
    const customTools = await loadCustomTools(customToolsDir);
    if (customTools.length > 0) {
      registerToolModules(server, ctx, customTools, rateLimiter, hookManager);
      ctx.logger.info(`MCP custom tools registered: ${customTools.length}`);
    }
    return customTools.length;
  })();

  return { builtinCount: builtinTools.length, customToolsPromise };
}
