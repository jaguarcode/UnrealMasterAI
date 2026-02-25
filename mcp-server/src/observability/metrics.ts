export interface ToolMetrics {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  successRate: number;
}

export class MetricsCollector {
  private metrics: Map<string, { calls: number; successes: number; failures: number; totalLatency: number }> = new Map();

  /** Record a tool call */
  recordToolCall(toolName: string, durationMs: number, success: boolean): void {
    const existing = this.metrics.get(toolName) ?? { calls: 0, successes: 0, failures: 0, totalLatency: 0 };
    existing.calls++;
    existing.totalLatency += durationMs;
    if (success) existing.successes++;
    else existing.failures++;
    this.metrics.set(toolName, existing);
  }

  /** Get metrics for a specific tool */
  getToolMetrics(toolName: string): ToolMetrics | undefined {
    const data = this.metrics.get(toolName);
    if (!data) return undefined;
    return {
      totalCalls: data.calls,
      successCount: data.successes,
      failureCount: data.failures,
      totalLatencyMs: data.totalLatency,
      avgLatencyMs: data.calls > 0 ? data.totalLatency / data.calls : 0,
      successRate: data.calls > 0 ? data.successes / data.calls : 0,
    };
  }

  /** Get all tool names with metrics */
  getAllToolNames(): string[] {
    return [...this.metrics.keys()];
  }

  /** Reset all metrics */
  reset(): void {
    this.metrics.clear();
  }
}
