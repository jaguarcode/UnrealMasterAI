/**
 * Safety classification system for MCP tool operations.
 * Classifies operations by risk level and gates dangerous operations
 * behind an approval workflow.
 */

export type SafetyLevel = 'safe' | 'warn' | 'dangerous';

export interface SafetyClassification {
  level: SafetyLevel;
  reason: string;
  requiresApproval: boolean;
}

/** Read-only / query operations that never mutate state. */
const SAFE_TOOLS = new Set([
  'editor-ping',
  'editor-getLevelInfo',
  'editor-listActors',
  'editor-getAssetInfo',
  'blueprint-serialize',
  'file-read',
  'file-search',
  'compilation-getStatus',
  'compilation-getErrors',
]);

/** Mutation operations that change state but are generally recoverable. */
const WARN_TOOLS = new Set([
  'blueprint-createNode',
  'blueprint-connectPins',
  'blueprint-modifyProperty',
  'compilation-trigger',
]);

/**
 * Classify an operation's safety level based on tool name and parameters.
 *
 * - safe: read-only queries
 * - warn: mutations that are generally recoverable
 * - dangerous: destructive or production-impacting writes requiring approval
 */
export function classifyOperation(
  toolName: string,
  params: Record<string, unknown>,
): SafetyClassification {
  // Safe operations (queries, reads)
  if (SAFE_TOOLS.has(toolName)) {
    return { level: 'safe', reason: 'Read-only operation', requiresApproval: false };
  }

  // File write — context-dependent classification
  if (toolName === 'file-write') {
    const filePath = params.filePath as string | undefined;
    // Writing to production Content paths (excluding Tests) is dangerous
    if (filePath && filePath.includes('/Content/') && !filePath.includes('/Tests/')) {
      return {
        level: 'dangerous',
        reason: 'Writing to production content path',
        requiresApproval: true,
      };
    }
    // All other file writes are warn-level
    return { level: 'warn', reason: 'File write operation', requiresApproval: false };
  }

  // Destructive blueprint operations
  if (toolName === 'blueprint-deleteNode') {
    return {
      level: 'dangerous',
      reason: 'Destructive Blueprint operation',
      requiresApproval: true,
    };
  }

  // Known mutation tools
  if (WARN_TOOLS.has(toolName)) {
    return { level: 'warn', reason: 'Mutation operation', requiresApproval: false };
  }

  // Unknown tools default to warn
  return { level: 'warn', reason: 'Unknown operation', requiresApproval: false };
}

/**
 * Validate that a file path is safe and within allowed project roots.
 * Blocks path traversal attacks (.., ~) and paths outside allowed roots.
 */
export function isPathSafe(filePath: string, allowedRoots: string[]): boolean {
  // Normalize to forward slashes
  const normalized = filePath.replace(/\\/g, '/');

  // Block path traversal
  if (normalized.includes('..')) return false;
  if (normalized.includes('~')) return false;

  // Must start with one of the allowed roots
  return allowedRoots.some((root) => normalized.startsWith(root.replace(/\\/g, '/')));
}

/**
 * Approval gate for dangerous operations.
 * In production, sends approval request via WebSocket to UE editor dialog.
 * In test mode, can be configured to auto-approve or auto-reject.
 */
export class ApprovalGate {
  private autoResponse: 'approve' | 'reject' | null = null;
  private timeoutMs: number;

  constructor(timeoutMs = 60000) {
    this.timeoutMs = timeoutMs;
  }

  /** For testing: set automatic response mode. Pass null to restore timeout behavior. */
  setAutoResponse(response: 'approve' | 'reject' | null): void {
    this.autoResponse = response;
  }

  /**
   * Request approval for a dangerous operation.
   * Returns true if approved, false if rejected or timed out.
   * Non-dangerous operations (requiresApproval === false) are auto-approved.
   */
  async requestApproval(classification: SafetyClassification): Promise<boolean> {
    if (!classification.requiresApproval) return true;

    if (this.autoResponse !== null) {
      return this.autoResponse === 'approve';
    }

    // In production, this would send an approval request via WS to UE editor.
    // Default: timeout = reject.
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), this.timeoutMs);
      // Allow Node.js process to exit even if timer is pending (for tests/graceful shutdown)
      timer.unref?.();
    });
  }
}
