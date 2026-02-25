/**
 * Core message types for WebSocket communication between MCP Bridge Server and UE Plugin.
 */

export interface WSMessage {
  /** UUID v4 for request/response correlation */
  id: string;
  /** Dot-notation command (e.g., 'blueprint.serialize', 'editor.ping') */
  method: string;
  /** Command-specific parameters */
  params: Record<string, unknown>;
  /** Unix timestamp in milliseconds */
  timestamp: number;
}

export interface WSError {
  /** Error code per taxonomy (1000-6099) */
  code: number;
  /** Human-readable error description */
  message: string;
  /** Optional structured error context */
  data?: unknown;
}

export interface WSResponse {
  /** Correlates to request WSMessage.id */
  id: string;
  /** Success payload (present on success) */
  result?: unknown;
  /** Error details (present on failure) */
  error?: WSError;
  /** Server-side processing time in milliseconds */
  duration_ms: number;
}
