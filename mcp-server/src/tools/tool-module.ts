/**
 * Tool module interface for declarative tool registration.
 * Each domain directory exports a getTools() function returning ToolModule[].
 */
import type { z } from 'zod';
import type { WebSocketBridge } from '../transport/websocket-bridge.js';
import type { Logger } from '../observability/logger.js';
import type { CacheStore } from '../state/cache-store.js';
import type { SessionManager } from '../state/session.js';
import type { ApprovalGate } from '../state/safety.js';
import type { EmbeddingStore } from '../rag/embedding-store.js';
import type { CircuitBreaker } from '../state/circuit-breaker.js';

/**
 * Shared dependencies injected into every tool handler.
 */
export interface ToolContext {
  bridge: WebSocketBridge;
  logger: Logger;
  cache: CacheStore;
  session: SessionManager;
  approvalGate: ApprovalGate;
  allowedRoots: string[];
  slateStore: EmbeddingStore;
  circuitBreaker?: CircuitBreaker;
}

/**
 * McpToolResult matches the MCP SDK's expected return shape.
 */
export interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
}

/**
 * A single tool definition that can be auto-registered.
 */
export interface ToolModule {
  /** Tool name as registered in MCP (e.g., 'actor-spawn') */
  name: string;
  /** Human-readable description shown to the LLM */
  description: string;
  /** Zod schema object for input parameters (flat key-value) */
  schema: Record<string, z.ZodTypeAny>;
  /** Handler function receiving shared context and validated params */
  handler: (ctx: ToolContext, params: Record<string, unknown>) => Promise<McpToolResult>;
}

/**
 * Function signature each domain's index.ts must export.
 */
export type GetToolsFn = () => ToolModule[];
