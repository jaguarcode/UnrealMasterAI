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

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Create a logger that writes exclusively to stderr.
 */
export function createLogger(level: LogLevel = 'info'): Logger {
  const minLevel = LOG_LEVELS[level];

  function log(lvl: LogLevel, prefix: string, message: string, args: unknown[]) {
    if (LOG_LEVELS[lvl] < minLevel) return;
    const timestamp = new Date().toISOString();
    const formatted = args.length > 0
      ? `[${timestamp}] ${prefix} ${message} ${args.map(a => JSON.stringify(a)).join(' ')}\n`
      : `[${timestamp}] ${prefix} ${message}\n`;
    process.stderr.write(formatted);
  }

  return {
    debug: (message, ...args) => log('debug', 'DEBUG', message, args),
    info: (message, ...args) => log('info', 'INFO', message, args),
    warn: (message, ...args) => log('warn', 'WARN', message, args),
    error: (message, ...args) => log('error', 'ERROR', message, args),
  };
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
