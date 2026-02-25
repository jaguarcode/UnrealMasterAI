export interface SessionState {
  retryCount: Map<string, number>; // file path -> retry count
  maxRetries: number;
  compileHistory: Array<{
    compileId: string;
    timestamp: number;
    success: boolean;
    errorCount: number;
  }>;
}

export class SessionManager {
  private retryCount: Map<string, number> = new Map();
  private maxRetries: number;
  private compileHistory: Array<{
    compileId: string;
    timestamp: number;
    success: boolean;
    errorCount: number;
  }> = [];

  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
  }

  /** Get retry count for a file */
  getRetryCount(filePath: string): number {
    return this.retryCount.get(filePath) ?? 0;
  }

  /** Increment retry count. Returns false if max retries exceeded */
  incrementRetry(filePath: string): boolean {
    const current = this.getRetryCount(filePath);
    if (current >= this.maxRetries) return false;
    this.retryCount.set(filePath, current + 1);
    return true;
  }

  /** Reset retry count for a file (after successful fix) */
  resetRetry(filePath: string): void {
    this.retryCount.delete(filePath);
  }

  /** Reset all retry counts */
  resetAllRetries(): void {
    this.retryCount.clear();
  }

  /** Record a compile result */
  recordCompile(compileId: string, success: boolean, errorCount: number): void {
    this.compileHistory.push({
      compileId,
      timestamp: Date.now(),
      success,
      errorCount,
    });
  }

  /** Get compile history */
  getCompileHistory() { return [...this.compileHistory]; }

  /** Get max retries setting */
  getMaxRetries(): number { return this.maxRetries; }
}
