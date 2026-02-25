import { describe, it, expect, beforeEach } from 'vitest';
import { Tracer } from '../../../src/observability/tracer.js';
import { MetricsCollector } from '../../../src/observability/metrics.js';

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer({ enabled: true });
  });

  it('startSpan creates span with tool name', () => {
    const spanId = tracer.startSpan('editor-ping');
    expect(spanId).toBeTruthy();
  });

  it('endSpan records duration_ms', () => {
    const spanId = tracer.startSpan('editor-ping');
    const span = tracer.endSpan(spanId, true);
    expect(span).toBeDefined();
    expect(span!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('span includes toolName, success, inputSummary', () => {
    const spanId = tracer.startSpan('editor-ping', 'ping input');
    const span = tracer.endSpan(spanId, true);
    expect(span!.toolName).toBe('editor-ping');
    expect(span!.success).toBe(true);
    expect(span!.inputSummary).toBe('ping input');
  });

  it('failed span has error details', () => {
    const spanId = tracer.startSpan('blueprint-serialize');
    const span = tracer.endSpan(spanId, false, 'Timeout');
    expect(span!.success).toBe(false);
    expect(span!.errorDetails).toBe('Timeout');
  });

  it('getCompletedSpans returns all finished spans', () => {
    const id1 = tracer.startSpan('tool-a');
    const id2 = tracer.startSpan('tool-b');
    tracer.endSpan(id1, true);
    tracer.endSpan(id2, false);
    expect(tracer.getCompletedSpans()).toHaveLength(2);
  });

  it('tracer disabled returns empty spanId', () => {
    const disabled = new Tracer({ enabled: false });
    const spanId = disabled.startSpan('test');
    expect(spanId).toBe('');
  });

  it('disabled tracer endSpan returns undefined', () => {
    const disabled = new Tracer({ enabled: false });
    const result = disabled.endSpan('anything', true);
    expect(result).toBeUndefined();
  });
});

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('recordToolCall increments counter', () => {
    metrics.recordToolCall('editor-ping', 10, true);
    const stats = metrics.getToolMetrics('editor-ping');
    expect(stats!.totalCalls).toBe(1);
  });

  it('getToolMetrics returns stats with avgLatency and successRate', () => {
    metrics.recordToolCall('editor-ping', 10, true);
    metrics.recordToolCall('editor-ping', 20, true);
    metrics.recordToolCall('editor-ping', 30, false);
    const stats = metrics.getToolMetrics('editor-ping');
    expect(stats!.totalCalls).toBe(3);
    expect(stats!.avgLatencyMs).toBe(20);
    expect(stats!.successRate).toBeCloseTo(2 / 3);
  });

  it('returns undefined for unknown tool', () => {
    expect(metrics.getToolMetrics('nonexistent')).toBeUndefined();
  });

  it('getAllToolNames returns tracked tools', () => {
    metrics.recordToolCall('tool-a', 10, true);
    metrics.recordToolCall('tool-b', 20, false);
    expect(metrics.getAllToolNames()).toContain('tool-a');
    expect(metrics.getAllToolNames()).toContain('tool-b');
  });

  it('reset clears all metrics', () => {
    metrics.recordToolCall('tool-a', 10, true);
    metrics.reset();
    expect(metrics.getAllToolNames()).toHaveLength(0);
  });
});
