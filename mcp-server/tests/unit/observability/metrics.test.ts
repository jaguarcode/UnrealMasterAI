import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../../../src/observability/metrics.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('recordToolCall stores latency values', () => {
    collector.recordToolCall('tool-a', 100, true);
    collector.recordToolCall('tool-a', 200, true);
    const metrics = collector.getToolMetrics('tool-a')!;
    expect(metrics.totalCalls).toBe(2);
    expect(metrics.totalLatencyMs).toBe(300);
  });

  it('getToolMetrics returns p50, p95, p99', () => {
    collector.recordToolCall('tool-a', 10, true);
    collector.recordToolCall('tool-a', 20, true);
    collector.recordToolCall('tool-a', 30, true);
    const metrics = collector.getToolMetrics('tool-a')!;
    expect(metrics.p50LatencyMs).toBe(20);
    expect(metrics.p95LatencyMs).toBe(30);
    expect(metrics.p99LatencyMs).toBe(30);
  });

  it('percentile calculation with 1 value returns that value', () => {
    collector.recordToolCall('tool-a', 42, true);
    const metrics = collector.getToolMetrics('tool-a')!;
    expect(metrics.p50LatencyMs).toBe(42);
    expect(metrics.p95LatencyMs).toBe(42);
    expect(metrics.p99LatencyMs).toBe(42);
  });

  it('percentile calculation with 100 values returns correct p50/p95/p99', () => {
    // Record values 1..100
    for (let i = 1; i <= 100; i++) {
      collector.recordToolCall('tool-a', i, true);
    }
    const metrics = collector.getToolMetrics('tool-a')!;
    // nearest-rank: p50 -> ceil(50/100*100)-1 = index 49 -> value 50
    expect(metrics.p50LatencyMs).toBe(50);
    // p95 -> ceil(95/100*100)-1 = index 94 -> value 95
    expect(metrics.p95LatencyMs).toBe(95);
    // p99 -> ceil(99/100*100)-1 = index 98 -> value 99
    expect(metrics.p99LatencyMs).toBe(99);
  });

  it('getPerformanceSummary returns all tools sorted by call count descending', () => {
    collector.recordToolCall('tool-a', 10, true);
    collector.recordToolCall('tool-b', 20, true);
    collector.recordToolCall('tool-b', 30, true);
    collector.recordToolCall('tool-b', 40, true);
    const summary = collector.getPerformanceSummary();
    expect(summary.tools[0].toolName).toBe('tool-b');
    expect(summary.tools[0].totalCalls).toBe(3);
    expect(summary.tools[1].toolName).toBe('tool-a');
    expect(summary.tools[1].totalCalls).toBe(1);
  });

  it('getPerformanceSummary includes aggregate totalCalls and overallSuccessRate', () => {
    collector.recordToolCall('tool-a', 10, true);
    collector.recordToolCall('tool-a', 20, false);
    collector.recordToolCall('tool-b', 30, true);
    const summary = collector.getPerformanceSummary();
    expect(summary.totalCalls).toBe(3);
    // 2 successes out of 3 calls
    expect(summary.overallSuccessRate).toBeCloseTo(2 / 3);
  });

  it('getPerformanceSummary timestamp is valid ISO 8601', () => {
    const summary = collector.getPerformanceSummary();
    const parsed = new Date(summary.timestamp);
    expect(parsed.toISOString()).toBe(summary.timestamp);
  });

  it('reset clears all data including latencies', () => {
    collector.recordToolCall('tool-a', 100, true);
    collector.reset();
    expect(collector.getAllToolNames()).toHaveLength(0);
    expect(collector.getToolMetrics('tool-a')).toBeUndefined();
    const summary = collector.getPerformanceSummary();
    expect(summary.totalCalls).toBe(0);
    expect(summary.tools).toHaveLength(0);
  });

  it('backward compat: totalCalls, successCount, failureCount, avgLatencyMs still work', () => {
    collector.recordToolCall('tool-a', 100, true);
    collector.recordToolCall('tool-a', 200, false);
    const metrics = collector.getToolMetrics('tool-a')!;
    expect(metrics.totalCalls).toBe(2);
    expect(metrics.successCount).toBe(1);
    expect(metrics.failureCount).toBe(1);
    expect(metrics.avgLatencyMs).toBe(150);
    expect(metrics.successRate).toBe(0.5);
  });
});
