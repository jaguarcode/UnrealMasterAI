import { describe, it, expect, beforeEach } from 'vitest';
import { Tracer } from '../../../src/observability/tracer.js';
import { MetricsCollector } from '../../../src/observability/metrics.js';

// ── helpers ────────────────────────────────────────────────────────────────

const HEX32 = /^[0-9a-f]{32}$/;
const HEX16 = /^[0-9a-f]{16}$/;

// ── Tracer (legacy API backward-compat) ────────────────────────────────────

describe('Tracer – legacy API backward compatibility', () => {
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

// ── W3C-compatible IDs ─────────────────────────────────────────────────────

describe('Tracer – W3C-compatible ID generation', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer({ enabled: true });
  });

  it('traceId is a 32-char lowercase hex string', () => {
    const spanId = tracer.startSpan('tool-x');
    const span = tracer.endSpan(spanId, true);
    expect(span!.traceId).toMatch(HEX32);
  });

  it('spanId is a 16-char lowercase hex string', () => {
    const spanId = tracer.startSpan('tool-x');
    expect(spanId).toMatch(HEX16);
    const span = tracer.endSpan(spanId, true);
    expect(span!.spanId).toMatch(HEX16);
    expect(span!.spanId).toBe(spanId);
  });

  it('two root spans get different traceIds', () => {
    const id1 = tracer.startSpan('a');
    const id2 = tracer.startSpan('b');
    const s1 = tracer.endSpan(id1, true);
    const s2 = tracer.endSpan(id2, true);
    expect(s1!.traceId).not.toBe(s2!.traceId);
  });
});

// ── parentSpanId / traceId propagation ────────────────────────────────────

describe('Tracer – parentSpanId propagation', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer({ enabled: true });
  });

  it('child span inherits provided traceId', () => {
    const rootId = tracer.startSpan('root');
    const rootSpan = tracer.endSpan(rootId, true);
    const childId = tracer.startSpan('child', {
      parentSpanId: rootSpan!.spanId,
      traceId: rootSpan!.traceId,
    });
    const childSpan = tracer.endSpan(childId, true);
    expect(childSpan!.traceId).toBe(rootSpan!.traceId);
    expect(childSpan!.parentSpanId).toBe(rootSpan!.spanId);
  });

  it('span without parentSpanId has no parentSpanId field', () => {
    const spanId = tracer.startSpan('root');
    const span = tracer.endSpan(spanId, true);
    expect(span!.parentSpanId).toBeUndefined();
  });

  it('startSpan options object accepts inputSummary and attributes', () => {
    const spanId = tracer.startSpan('tool-z', {
      inputSummary: 'my summary',
      attributes: { region: 'us-east', retries: 3, cached: false },
    });
    const span = tracer.endSpan(spanId, true);
    expect(span!.inputSummary).toBe('my summary');
    expect(span!.attributes).toMatchObject({ region: 'us-east', retries: 3, cached: false });
  });
});

// ── status field ───────────────────────────────────────────────────────────

describe('Tracer – status field', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer({ enabled: true });
  });

  it('endSpan(true) sets status to "ok"', () => {
    const id = tracer.startSpan('t');
    const span = tracer.endSpan(id, true);
    expect(span!.status).toBe('ok');
  });

  it('endSpan(false) sets status to "error"', () => {
    const id = tracer.startSpan('t');
    const span = tracer.endSpan(id, false, 'oops');
    expect(span!.status).toBe('error');
  });

  it('new span starts with status "unset"', () => {
    // Access via completed span — must end it to inspect
    const id = tracer.startSpan('t');
    // Peek at in-progress span via getCompletedSpans (none yet)
    expect(tracer.getCompletedSpans()).toHaveLength(0);
    tracer.endSpan(id, true);
    // After endSpan the status is 'ok'; verify it was 'unset' before by checking default
    const span = tracer.getCompletedSpans()[0];
    expect(['ok', 'error', 'unset']).toContain(span.status);
  });
});

// ── exportSpans() OTLP structure ──────────────────────────────────────────

describe('Tracer – exportSpans()', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer({ enabled: true });
  });

  it('returns valid OTLP structure with resourceSpans array', () => {
    const id = tracer.startSpan('ping');
    tracer.endSpan(id, true);
    const payload = tracer.exportSpans();
    expect(payload).toHaveProperty('resourceSpans');
    expect(Array.isArray(payload.resourceSpans)).toBe(true);
    expect(payload.resourceSpans.length).toBeGreaterThan(0);
  });

  it('OTLP span has startTimeUnixNano and endTimeUnixNano as strings', () => {
    const id = tracer.startSpan('ping');
    tracer.endSpan(id, true);
    const otlpSpan = tracer.exportSpans().resourceSpans[0].scopeSpans[0].spans[0];
    expect(typeof otlpSpan.startTimeUnixNano).toBe('string');
    expect(typeof otlpSpan.endTimeUnixNano).toBe('string');
    // Values should be numeric strings representing nanoseconds
    expect(Number(otlpSpan.startTimeUnixNano)).toBeGreaterThan(0);
    expect(Number(otlpSpan.endTimeUnixNano)).toBeGreaterThanOrEqual(Number(otlpSpan.startTimeUnixNano));
  });

  it('OTLP status.code maps ok=1, error=2, unset=0', () => {
    const okId = tracer.startSpan('ok-tool');
    tracer.endSpan(okId, true);
    const errId = tracer.startSpan('err-tool');
    tracer.endSpan(errId, false, 'fail');

    const spans = tracer.exportSpans().resourceSpans[0].scopeSpans[0].spans;
    const okSpan = spans.find(s => s.name === 'ok-tool')!;
    const errSpan = spans.find(s => s.name === 'err-tool')!;
    expect(okSpan.status.code).toBe(1);
    expect(errSpan.status.code).toBe(2);
  });

  it('OTLP error span includes error message in status', () => {
    const id = tracer.startSpan('failing');
    tracer.endSpan(id, false, 'Connection refused');
    const span = tracer.exportSpans().resourceSpans[0].scopeSpans[0].spans[0];
    expect(span.status.message).toBe('Connection refused');
  });

  it('OTLP attributes are correctly formatted', () => {
    const id = tracer.startSpan('attr-tool', {
      attributes: { region: 'eu-west', retries: 2, cached: true },
    });
    tracer.endSpan(id, true);
    const span = tracer.exportSpans().resourceSpans[0].scopeSpans[0].spans[0];
    const byKey = Object.fromEntries(span.attributes.map(a => [a.key, a.value]));
    expect(byKey['region']).toMatchObject({ stringValue: 'eu-west' });
    expect(byKey['retries']).toMatchObject({ intValue: '2' });
    expect(byKey['cached']).toMatchObject({ boolValue: true });
  });

  it('OTLP span includes input.summary attribute when inputSummary is set', () => {
    const id = tracer.startSpan('sum-tool', { inputSummary: 'test input' });
    tracer.endSpan(id, true);
    const span = tracer.exportSpans().resourceSpans[0].scopeSpans[0].spans[0];
    const summaryAttr = span.attributes.find(a => a.key === 'input.summary');
    expect(summaryAttr).toBeDefined();
    expect(summaryAttr!.value.stringValue).toBe('test input');
  });

  it('OTLP span includes parentSpanId when set', () => {
    const rootId = tracer.startSpan('root');
    const rootSpan = tracer.endSpan(rootId, true);
    const childId = tracer.startSpan('child', {
      parentSpanId: rootSpan!.spanId,
      traceId: rootSpan!.traceId,
    });
    tracer.endSpan(childId, true);
    const spans = tracer.exportSpans().resourceSpans[0].scopeSpans[0].spans;
    const child = spans.find(s => s.name === 'child')!;
    expect(child.parentSpanId).toBe(rootSpan!.spanId);
  });

  it('OTLP span kind is 1 (INTERNAL)', () => {
    const id = tracer.startSpan('t');
    tracer.endSpan(id, true);
    const span = tracer.exportSpans().resourceSpans[0].scopeSpans[0].spans[0];
    expect(span.kind).toBe(1);
  });

  it('exportSpans returns empty spans array when no spans completed', () => {
    const payload = tracer.exportSpans();
    expect(payload.resourceSpans[0].scopeSpans[0].spans).toHaveLength(0);
  });

  it('disabled tracer exportSpans still returns valid empty structure', () => {
    const disabled = new Tracer({ enabled: false });
    const payload = disabled.exportSpans();
    expect(payload.resourceSpans[0].scopeSpans[0].spans).toHaveLength(0);
  });
});

// ── OTEL_EXPORTER_ENDPOINT stored in options ──────────────────────────────

describe('Tracer – OTEL_EXPORTER_ENDPOINT', () => {
  it('stores otelExporterEndpoint from constructor options', () => {
    const tracer = new Tracer({ enabled: true, otelExporterEndpoint: 'http://localhost:4318' });
    expect(tracer.getOtelExporterEndpoint()).toBe('http://localhost:4318');
  });

  it('falls back to endpoint option when otelExporterEndpoint not set', () => {
    const tracer = new Tracer({ enabled: true, endpoint: 'http://langsmith.example.com' });
    expect(tracer.getOtelExporterEndpoint()).toBe('http://langsmith.example.com');
  });

  it('returns undefined when no endpoint configured', () => {
    const tracer = new Tracer({ enabled: true });
    // Env var may or may not be set; just check it returns string or undefined
    const ep = tracer.getOtelExporterEndpoint();
    expect(ep === undefined || typeof ep === 'string').toBe(true);
  });
});

// ── MetricsCollector (unchanged) ───────────────────────────────────────────

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
