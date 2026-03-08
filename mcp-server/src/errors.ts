/**
 * Structured error codes and helpers for the UMA MCP server.
 */

export enum ErrorCode {
  CONNECTION_LOST = 'UMA_E_CONNECTION_LOST',
  CONNECTION_REFUSED = 'UMA_E_CONNECTION_REFUSED',
  REQUEST_TIMEOUT = 'UMA_E_REQUEST_TIMEOUT',
  ACTOR_NOT_FOUND = 'UMA_E_ACTOR_NOT_FOUND',
  ASSET_NOT_FOUND = 'UMA_E_ASSET_NOT_FOUND',
  BLUEPRINT_NOT_FOUND = 'UMA_E_BLUEPRINT_NOT_FOUND',
  VALIDATION_ERROR = 'UMA_E_VALIDATION_ERROR',
  COMPILATION_FAILED = 'UMA_E_COMPILATION_FAILED',
  PERMISSION_DENIED = 'UMA_E_PERMISSION_DENIED',
  PYTHON_EXECUTION_ERROR = 'UMA_E_PYTHON_EXECUTION',
  CIRCUIT_OPEN = 'UMA_E_CIRCUIT_OPEN',
  TOOL_NOT_FOUND = 'UMA_E_TOOL_NOT_FOUND',
  INTERNAL_ERROR = 'UMA_E_INTERNAL_ERROR',
}

export class UMAError extends Error {
  readonly code: ErrorCode;
  readonly toolName: string;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, toolName: string, details?: unknown) {
    super(message);
    this.name = 'UMAError';
    this.code = code;
    this.toolName = toolName;
    this.details = details;
  }

  toJSON() {
    return {
      status: 'error',
      code: this.code,
      error: this.message,
      toolName: this.toolName,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

export function inferErrorCode(message: string): ErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes('not connected') || lower.includes('disconnected')) {
    return ErrorCode.CONNECTION_LOST;
  }
  if (lower.includes('timeout')) {
    return ErrorCode.REQUEST_TIMEOUT;
  }
  if (lower.includes('not found')) {
    return ErrorCode.ASSET_NOT_FOUND;
  }
  if (lower.includes('compile') || lower.includes('compilation')) {
    return ErrorCode.COMPILATION_FAILED;
  }
  if (lower.includes('permission') || lower.includes('denied') || lower.includes('approval')) {
    return ErrorCode.PERMISSION_DENIED;
  }
  if (lower.includes('circuit')) {
    return ErrorCode.CIRCUIT_OPEN;
  }
  return ErrorCode.INTERNAL_ERROR;
}

export function createToolError(
  toolName: string,
  error: unknown,
  code?: ErrorCode,
): { content: Array<{ type: 'text'; text: string }> } {
  if (error instanceof UMAError) {
    return { content: [{ type: 'text', text: JSON.stringify(error.toJSON()) }] };
  }
  const message = error instanceof Error ? error.message : String(error);
  const errorCode = code ?? inferErrorCode(message);
  const umaError = new UMAError(errorCode, message, toolName);
  return { content: [{ type: 'text', text: JSON.stringify(umaError.toJSON()) }] };
}

export function formatBridgeError(
  toolName: string,
  responseError: { code: number; message: string; data?: unknown },
): { content: Array<{ type: 'text'; text: string }> } {
  const code = inferErrorCode(responseError.message);
  const umaError = new UMAError(code, responseError.message, toolName, {
    bridgeErrorCode: responseError.code,
    ...(responseError.data !== undefined ? { data: responseError.data } : {}),
  });
  return { content: [{ type: 'text', text: JSON.stringify(umaError.toJSON()) }] };
}
