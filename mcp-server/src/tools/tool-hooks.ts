/**
 * Tool hook system for pre/post execution interception.
 * Hooks wrap every tool handler, enabling logging, validation, and transformation.
 */
import type { McpToolResult } from './tool-module.js';

export interface PreHookContext {
  toolName: string;
  params: Record<string, unknown>;
}

export interface PostHookContext {
  toolName: string;
  params: Record<string, unknown>;
  result: McpToolResult;
  durationMs: number;
}

/**
 * Pre-hook: runs before tool execution.
 * Return modified params to transform input.
 * Throw to reject execution (error propagates to caller).
 * Return null/undefined to use original params.
 */
export type PreHook = (ctx: PreHookContext) => Promise<Record<string, unknown> | null | void>;

/**
 * Post-hook: runs after tool execution.
 * Return modified result to transform output.
 * Return null/undefined to use original result.
 */
export type PostHook = (ctx: PostHookContext) => Promise<McpToolResult | null | void>;

export class ToolHookManager {
  private preHooks: PreHook[] = [];
  private postHooks: PostHook[] = [];

  addPreHook(hook: PreHook): void {
    this.preHooks.push(hook);
  }

  addPostHook(hook: PostHook): void {
    this.postHooks.push(hook);
  }

  getPreHooks(): readonly PreHook[] {
    return this.preHooks;
  }

  getPostHooks(): readonly PostHook[] {
    return this.postHooks;
  }

  /**
   * Run all pre-hooks in order. Returns final params (possibly modified).
   * Throws if any pre-hook rejects.
   */
  async runPreHooks(toolName: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    let current = params;
    for (const hook of this.preHooks) {
      const modified = await hook({ toolName, params: current });
      if (modified != null) {
        current = modified;
      }
    }
    return current;
  }

  /**
   * Run all post-hooks in order. Returns final result (possibly modified).
   */
  async runPostHooks(
    toolName: string,
    params: Record<string, unknown>,
    result: McpToolResult,
    durationMs: number,
  ): Promise<McpToolResult> {
    let current = result;
    for (const hook of this.postHooks) {
      const modified = await hook({ toolName, params, result: current, durationMs });
      if (modified != null) {
        current = modified;
      }
    }
    return current;
  }
}
