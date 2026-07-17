/**
 * Intelligence Hooks — the wiring that turns the passive usage-intelligence
 * layer into a live, self-observing system.
 *
 * Registers a single post-hook on the server's ToolHookManager that, for EVERY
 * tool call:
 *   1. Extracts a success/error signal from the (JSON) tool result.
 *   2. Journals the call into the UsageTracker (all tools, incl. context-*).
 *   3. Advances the active WorkflowTracker (which ignores meta tools itself).
 *   4. Optionally injects a proactive `_uma` hint into the result payload —
 *      a known-error resolution on failures, or workflow-progress on success.
 *
 * ABSOLUTE RULE: this hook must NEVER throw or corrupt a tool result. Every
 * step is defended so that any internal failure degrades gracefully to
 * "return the original result untouched".
 */
import type { ToolHookManager, PostHookContext } from '../tool-hooks.js';
import type { McpToolResult } from '../tool-module.js';
import { getUsageTracker } from './usage-tracker.js';
import { getWorkflowTracker, type WorkflowProgress } from './workflow-tracker.js';
import { matchError } from './error-learning.js';
import { isMetaTool } from './usage-types.js';

/** Cap on injected/parsed error messages so hints stay compact. */
const ERROR_MESSAGE_MAX_LEN = 500;

/** Minimum learned-resolution similarity required to surface a known-resolution hint. */
const HINT_SIMILARITY_THRESHOLD = 0.4;

/**
 * Derive a success flag and (on failure) an error message from a tool result.
 *
 * The tool-result convention is `{ content: [{ type: 'text', text: '<JSON>' }] }`
 * where the JSON usually carries `status: 'success' | 'error'` and sometimes an
 * `error` field. We treat a call as failed when the parsed payload declares
 * `status === 'error'` or carries a truthy `error`, OR when the SDK-level
 * `isError` flag is set.
 *
 * Parse failures are non-fatal: we fall back to `!result.isError` (default
 * success) and report no error message.
 */
export function extractResultStatus(
  result: unknown,
): { success: boolean; errorMessage: string | null } {
  const isError = Boolean((result as { isError?: unknown } | null)?.isError);

  let parsed: unknown;
  try {
    const content = (result as { content?: unknown } | null)?.content;
    const first = Array.isArray(content) ? content[0] : undefined;
    if (first && (first as { type?: unknown }).type === 'text') {
      const text = (first as { text?: unknown }).text;
      if (typeof text === 'string') {
        parsed = JSON.parse(text);
      }
    }
  } catch {
    parsed = undefined;
  }

  if (parsed === undefined || parsed === null || typeof parsed !== 'object') {
    // No parseable payload — rely solely on the SDK error flag.
    return { success: !isError, errorMessage: null };
  }

  const obj = parsed as { status?: unknown; error?: unknown; message?: unknown };
  const declaredError = obj.status === 'error' || Boolean(obj.error);
  const success = !declaredError && !isError;

  if (success) {
    return { success: true, errorMessage: null };
  }

  // Build a compact error message from the richest available field.
  let raw: string | null = null;
  if (obj.error != null) {
    raw = typeof obj.error === 'string' ? obj.error : safeStringify(obj.error);
  } else if (obj.status === 'error' && obj.message != null) {
    raw = typeof obj.message === 'string' ? obj.message : safeStringify(obj.message);
  }

  const errorMessage = raw != null ? truncate(raw, ERROR_MESSAGE_MAX_LEN) : null;
  return { success: false, errorMessage };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/** Shape of the proactive hint injected into tool results. */
interface UmaHintBlock {
  hint?: {
    type: 'known-resolution';
    resolutionId: string;
    similarity: number;
    fix: string;
    note: string;
  };
  workflow?: {
    id: string;
    name: string;
    progress?: string;
    nextSuggested?: string | null;
    completed?: boolean;
    autoRecorded?: boolean;
  };
}

/**
 * Register the intelligence post-hook on the given hook manager.
 * Idempotent from the server's perspective — call once at startup.
 */
export function registerIntelligenceHooks(hooks: ToolHookManager): void {
  hooks.addPostHook(async (ctx: PostHookContext): Promise<McpToolResult | void> => {
    const { toolName, result, durationMs } = ctx;

    try {
      // 1. Success/error extraction.
      const { success, errorMessage } = extractResultStatus(result);

      // 2. Journal the call — ALL tools, including context-*.
      try {
        getUsageTracker().recordCall({
          tool: toolName,
          success,
          durationMs,
          timestamp: Date.now(),
        });
      } catch {
        // Recording must never break the tool response.
      }

      // 3. Advance workflow tracking (tracker ignores meta tools internally).
      let completed = false;
      let progress: WorkflowProgress | null = null;
      try {
        const advanced = getWorkflowTracker().onToolCall(toolName, success);
        completed = advanced.completed;
        progress = advanced.progress;
      } catch {
        completed = false;
        progress = null;
      }

      // 4. Proactive hint injection — only under strict conditions.
      if (process.env.UMA_HINTS === 'off') {
        return; // opt-out: leave the result untouched.
      }
      if (isMetaTool(toolName)) {
        return; // meta tools never receive hints.
      }

      // The result must be a text payload with a JSON-parseable object.
      const content = (result as { content?: unknown }).content;
      const first = Array.isArray(content) ? content[0] : undefined;
      if (!first || (first as { type?: unknown }).type !== 'text') {
        return;
      }
      const text = (first as { text?: unknown }).text;
      if (typeof text !== 'string') {
        return;
      }

      let parsed: Record<string, unknown>;
      try {
        const candidate = JSON.parse(text);
        if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
          return; // not an object payload — nothing to attach to.
        }
        parsed = candidate as Record<string, unknown>;
      } catch {
        return; // malformed JSON — pass through untouched.
      }

      const uma: UmaHintBlock = {};

      if (!success) {
        // Failure path — surface a known-resolution hint if we have a strong match.
        // matchError performs file I/O; it only runs on this (rarer) failure branch.
        try {
          const recovery = matchError(errorMessage ?? '', toolName);
          const top = recovery.learnedResolutions[0];
          if (top && top.similarity >= HINT_SIMILARITY_THRESHOLD) {
            uma.hint = {
              type: 'known-resolution',
              resolutionId: top.resolution.id,
              similarity: Math.round(top.similarity * 100) / 100,
              fix: top.resolution.successfulFix.description,
              note: 'Call context-matchError for full recovery steps and actions to avoid.',
            };
          }
        } catch {
          // matchError failure must not break the response.
        }
      } else if (completed && progress) {
        // Workflow just finished — the tracker already auto-recorded the outcome.
        uma.workflow = {
          id: progress.workflowId,
          name: progress.workflowName,
          completed: true,
          autoRecorded: true,
        };
      } else if (progress) {
        // Workflow still in progress on a successful call.
        uma.workflow = {
          id: progress.workflowId,
          name: progress.workflowName,
          progress: `${progress.stepsCompleted}/${progress.totalSteps}`,
          nextSuggested: progress.nextExpectedTool,
        };
      }

      // Nothing to inject — return untouched.
      if (!uma.hint && !uma.workflow) {
        return;
      }

      parsed._uma = uma;

      const transformed: McpToolResult = {
        ...(result as McpToolResult),
        content: [
          { type: 'text', text: JSON.stringify(parsed) },
          ...((Array.isArray(content) ? content.slice(1) : []) as McpToolResult['content']),
        ],
      };
      return transformed;
    } catch {
      // ABSOLUTE RULE: never throw, never corrupt. Fall back to the original result.
      return;
    }
  });
}
