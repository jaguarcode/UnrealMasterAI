/**
 * Sliding-window rate limiter for MCP tool calls.
 * Tracks call timestamps in a 60-second rolling window.
 * Disabled by default (maxCallsPerMinute=0).
 */

export interface RateLimiterConfig {
  maxCallsPerMinute: number;        // Global limit, 0 = disabled
  maxCallsPerToolPerMinute?: number; // Per-tool limit, optional
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number; // ms until next call would be allowed
  currentRate: number;   // current calls in the window
  limit: number;         // the limit that applies
}

export class RateLimiter {
  private globalWindow: number[] = [];
  private toolWindows: Map<string, number[]> = new Map();
  private config: RateLimiterConfig;
  private readonly windowMs = 60_000; // 1 minute

  constructor(config?: Partial<RateLimiterConfig>) {
    const envLimit = process.env['RATE_LIMIT_PER_MINUTE'];
    const envValue = envLimit !== undefined ? parseInt(envLimit, 10) : NaN;
    const envDefault = !isNaN(envValue) ? envValue : 0;

    this.config = {
      maxCallsPerMinute: config?.maxCallsPerMinute ?? envDefault,
      maxCallsPerToolPerMinute: config?.maxCallsPerToolPerMinute,
    };
  }

  /**
   * Prune timestamps older than the rolling window from an array in-place.
   */
  private prune(window: number[], now: number): void {
    const cutoff = now - this.windowMs;
    let i = 0;
    while (i < window.length && window[i] <= cutoff) {
      i++;
    }
    if (i > 0) window.splice(0, i);
  }

  /**
   * Compute retryAfterMs: time until the oldest timestamp in the window
   * rolls out, making room for a new call.
   */
  private retryAfter(window: number[], now: number): number {
    if (window.length === 0) return 0;
    return window[0] + this.windowMs - now;
  }

  /**
   * Check if a tool call is allowed. Records the call if allowed.
   */
  check(toolName: string): RateLimitResult {
    const now = Date.now();

    // --- Global limit ---
    this.prune(this.globalWindow, now);
    if (this.config.maxCallsPerMinute > 0) {
      if (this.globalWindow.length >= this.config.maxCallsPerMinute) {
        return {
          allowed: false,
          retryAfterMs: this.retryAfter(this.globalWindow, now),
          currentRate: this.globalWindow.length,
          limit: this.config.maxCallsPerMinute,
        };
      }
    }

    // --- Per-tool limit ---
    if (this.config.maxCallsPerToolPerMinute !== undefined) {
      let toolWindow = this.toolWindows.get(toolName);
      if (!toolWindow) {
        toolWindow = [];
        this.toolWindows.set(toolName, toolWindow);
      }
      this.prune(toolWindow, now);
      if (toolWindow.length >= this.config.maxCallsPerToolPerMinute) {
        return {
          allowed: false,
          retryAfterMs: this.retryAfter(toolWindow, now),
          currentRate: toolWindow.length,
          limit: this.config.maxCallsPerToolPerMinute,
        };
      }
    }

    // --- Record the call ---
    this.globalWindow.push(now);
    const toolWindow = this.toolWindows.get(toolName) ?? (() => {
      const w: number[] = [];
      this.toolWindows.set(toolName, w);
      return w;
    })();
    toolWindow.push(now);

    return {
      allowed: true,
      currentRate: this.globalWindow.length,
      limit: this.config.maxCallsPerMinute,
    };
  }

  /** Get current stats for all windows */
  getStats(): { globalRate: number; toolRates: Record<string, number> } {
    const now = Date.now();
    this.prune(this.globalWindow, now);
    const toolRates: Record<string, number> = {};
    for (const [tool, window] of this.toolWindows) {
      this.prune(window, now);
      toolRates[tool] = window.length;
    }
    return { globalRate: this.globalWindow.length, toolRates };
  }

  /** Reset all windows */
  reset(): void {
    this.globalWindow = [];
    this.toolWindows.clear();
  }
}
