/**
 * Shared types for the automatic usage-intelligence layer.
 * Consumed by usage-tracker, workflow-tracker, sequence-miner, and recommendation-engine.
 */

/** A single observed MCP tool invocation, captured automatically via tool hooks. */
export interface ToolCallEvent {
  /** MCP tool name, e.g. "blueprint-createNode" */
  tool: string;
  /** Whether the call succeeded (parsed from the tool result payload) */
  success: boolean;
  /** Wall-clock duration of the handler in milliseconds */
  durationMs: number;
  /** Epoch millis when the call completed */
  timestamp: number;
}

/**
 * Gap between consecutive events that starts a new usage session.
 * Sessions bound adjacency analysis and sequence mining so that unrelated
 * work periods don't produce false tool-transition signals.
 */
export const SESSION_GAP_MS = 30 * 60 * 1000;

/**
 * Meta/introspection tools are excluded from sequence intelligence
 * (adjacency, mining, workflow step matching) — they describe work rather
 * than perform it, so they would only add noise to learned patterns.
 * They ARE still recorded in the raw event journal.
 */
export function isMetaTool(tool: string): boolean {
  return tool.startsWith('context-') || tool === 'editor-ping';
}
