export interface ToolMetrics {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
}

export interface PerformanceSummary {
  tools: Array<{
    toolName: string;
    totalCalls: number;
    successRate: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
  }>;
  totalCalls: number;
  overallSuccessRate: number;
  timestamp: string;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}

export class MetricsCollector {
  private metrics: Map<string, { calls: number; successes: number; failures: number; totalLatency: number; latencies: number[] }> = new Map();

  recordToolCall(toolName: string, durationMs: number, success: boolean): void {
    const existing = this.metrics.get(toolName) ?? { calls: 0, successes: 0, failures: 0, totalLatency: 0, latencies: [] };
    existing.calls++;
    existing.totalLatency += durationMs;
    existing.latencies.push(durationMs);
    if (success) existing.successes++;
    else existing.failures++;
    this.metrics.set(toolName, existing);
  }

  getToolMetrics(toolName: string): ToolMetrics | undefined {
    const data = this.metrics.get(toolName);
    if (!data) return undefined;
    const sorted = [...data.latencies].sort((a, b) => a - b);
    return {
      totalCalls: data.calls,
      successCount: data.successes,
      failureCount: data.failures,
      totalLatencyMs: data.totalLatency,
      avgLatencyMs: data.calls > 0 ? data.totalLatency / data.calls : 0,
      p50LatencyMs: percentile(sorted, 50),
      p95LatencyMs: percentile(sorted, 95),
      p99LatencyMs: percentile(sorted, 99),
      successRate: data.calls > 0 ? data.successes / data.calls : 0,
    };
  }

  getPerformanceSummary(): PerformanceSummary {
    const toolEntries = [...this.metrics.entries()];
    let totalCalls = 0;
    let totalSuccesses = 0;

    const tools = toolEntries.map(([toolName, data]) => {
      totalCalls += data.calls;
      totalSuccesses += data.successes;
      const sorted = [...data.latencies].sort((a, b) => a - b);
      return {
        toolName,
        totalCalls: data.calls,
        successRate: data.calls > 0 ? data.successes / data.calls : 0,
        avgLatencyMs: data.calls > 0 ? data.totalLatency / data.calls : 0,
        p50LatencyMs: percentile(sorted, 50),
        p95LatencyMs: percentile(sorted, 95),
        p99LatencyMs: percentile(sorted, 99),
      };
    });

    tools.sort((a, b) => b.totalCalls - a.totalCalls);

    return {
      tools,
      totalCalls,
      overallSuccessRate: totalCalls > 0 ? totalSuccesses / totalCalls : 0,
      timestamp: new Date().toISOString(),
    };
  }

  getAllToolNames(): string[] {
    return [...this.metrics.keys()];
  }

  reset(): void {
    this.metrics.clear();
  }
}
