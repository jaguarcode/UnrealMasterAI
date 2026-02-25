/**
 * compilation.selfHeal meta-tool handler.
 * Provides self-healing context for Claude to reason about compile loop retries.
 * Claude does the actual fix reasoning; this tool tracks state and surfaces errors.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';
import type { SessionManager } from '../../state/session.js';

export interface SelfHealParams {
  filePath?: string; // if known which file has errors
}

export interface SelfHealResult {
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
  errors: unknown;
  suggestion: string;
}

export async function compilationSelfHeal(
  bridge: WebSocketBridge,
  session: SessionManager,
  params: SelfHealParams,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    // 1. Get current compile errors
    const errorsMsg = {
      id: uuidv4(),
      method: 'compilation.getErrors',
      params: {},
      timestamp: Date.now(),
    };
    const errorsResponse = await bridge.sendRequest(errorsMsg);
    const errors = errorsResponse.error ? errorsResponse.error : errorsResponse.result;

    // 2. Check retry count
    const filePath = params.filePath ?? 'unknown';
    const retryCount = session.getRetryCount(filePath);
    const canRetry = session.incrementRetry(filePath);

    if (!canRetry) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            canRetry: false,
            retryCount,
            maxRetries: session.getMaxRetries(),
            errors,
            suggestion: `Max retries (${session.getMaxRetries()}) exceeded for ${filePath}. Please review the errors manually.`,
          }),
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          canRetry: true,
          retryCount: retryCount + 1,
          maxRetries: session.getMaxRetries(),
          errors,
          suggestion: `Retry ${retryCount + 1}/${session.getMaxRetries()}: Read the file, fix the errors, write the fix, and trigger recompilation.`,
        }),
      }],
    };
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          canRetry: false,
          retryCount: 0,
          maxRetries: session.getMaxRetries(),
          errors: (err as Error).message,
          suggestion: 'Could not retrieve compile errors. Check UE plugin connection.',
        }),
      }],
    };
  }
}
