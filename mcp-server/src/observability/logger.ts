/**
 * stderr-only logger for MCP server.
 * CRITICAL: stdout is reserved exclusively for JSON-RPC communication.
 * Any output to stdout will corrupt the MCP protocol stream.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogContext {
  requestId?: string;
  toolName?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface LoggerOptions {
  format?: 'text' | 'json';
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  withContext(ctx: LogContext): Logger;
}

/**
 * Create a logger that writes exclusively to stderr.
 * Supports 'text' (default) and 'json' formats.
 * Set LOG_FORMAT=json env var to enable JSON logging globally.
 */
export function createLogger(level: LogLevel = 'info', options?: LoggerOptions): Logger {
  const minLevel = LOG_LEVELS[level];
  const format = options?.format ?? (process.env['LOG_FORMAT'] === 'json' ? 'json' : 'text');

  function log(lvl: LogLevel, prefix: string, message: string, args: unknown[], ctx: LogContext = {}) {
    if (LOG_LEVELS[lvl] < minLevel) return;
    const timestamp = new Date().toISOString();

    if (format === 'json') {
      const entry: Record<string, unknown> = {
        timestamp,
        level: lvl,
        message,
      };
      if (ctx.requestId !== undefined) entry['requestId'] = ctx.requestId;
      if (ctx.toolName !== undefined) entry['toolName'] = ctx.toolName;
      if (ctx.durationMs !== undefined) entry['durationMs'] = ctx.durationMs;
      // Any extra keys from context beyond the known fields
      for (const key of Object.keys(ctx)) {
        if (key !== 'requestId' && key !== 'toolName' && key !== 'durationMs') {
          entry[key] = ctx[key];
        }
      }
      if (args.length > 0) {
        entry['data'] = args.length === 1 ? args[0] : args;
      }
      process.stderr.write(JSON.stringify(entry) + '\n');
    } else {
      const formatted = args.length > 0
        ? `[${timestamp}] ${prefix} ${message} ${args.map(a => JSON.stringify(a)).join(' ')}\n`
        : `[${timestamp}] ${prefix} ${message}\n`;
      process.stderr.write(formatted);
    }
  }

  function makeLogger(ctx: LogContext = {}): Logger {
    return {
      debug: (message, ...args) => log('debug', 'DEBUG', message, args, ctx),
      info: (message, ...args) => log('info', 'INFO', message, args, ctx),
      warn: (message, ...args) => log('warn', 'WARN', message, args, ctx),
      error: (message, ...args) => log('error', 'ERROR', message, args, ctx),
      withContext: (newCtx: LogContext) => makeLogger({ ...ctx, ...newCtx }),
    };
  }

  return makeLogger();
}

/**
 * Install a guard that redirects console.log to stderr.
 * MUST be called at server startup before any other code runs.
 */
export function installStdoutGuard(): void {
  const stderrLog = (...args: unknown[]) => {
    const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    process.stderr.write(`[REDIRECTED] ${message}\n`);
  };

  console.log = stderrLog;
  console.info = stderrLog;
  console.debug = stderrLog;
  // console.warn and console.error already write to stderr
}
