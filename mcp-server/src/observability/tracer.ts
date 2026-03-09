/** Generate a 32-char lowercase hex traceId (16 bytes) */
function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a 16-char lowercase hex spanId (8 bytes) */
function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  toolName: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  /** @deprecated use status instead */
  success?: boolean;
  status: 'ok' | 'error' | 'unset';
  inputSummary?: string;
  errorDetails?: string;
  attributes: Record<string, string | number | boolean>;
  /** @deprecated use attributes instead */
  metadata?: Record<string, unknown>;
}

export interface TracerOptions {
  enabled?: boolean;
  /** LangSmith/Langfuse/OTLP endpoint */
  endpoint?: string;
  /** OTLP exporter endpoint (OpenTelemetry) */
  otelExporterEndpoint?: string;
}

// ── OTLP export types ──────────────────────────────────────────────────────

interface OTLPAttributeValue {
  stringValue?: string;
  intValue?: string;
  boolValue?: boolean;
}

interface OTLPSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number; // 1 = INTERNAL
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  status: { code: number; message?: string }; // 0=UNSET,1=OK,2=ERROR
  attributes: Array<{ key: string; value: OTLPAttributeValue }>;
}

interface OTLPResourceSpan {
  resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
  scopeSpans: Array<{
    scope: { name: string; version: string };
    spans: OTLPSpan[];
  }>;
}

export interface OTLPExportPayload {
  resourceSpans: OTLPResourceSpan[];
}

// ── Status code mapping ────────────────────────────────────────────────────

function statusToCode(status: 'ok' | 'error' | 'unset'): number {
  if (status === 'ok') return 1;
  if (status === 'error') return 2;
  return 0;
}

function attributeToOTLP(key: string, val: string | number | boolean): { key: string; value: OTLPAttributeValue } {
  if (typeof val === 'boolean') return { key, value: { boolValue: val } };
  if (typeof val === 'number') return { key, value: { intValue: String(val) } };
  return { key, value: { stringValue: String(val) } };
}

// ── Tracer ─────────────────────────────────────────────────────────────────

export class Tracer {
  private spans: Map<string, TraceSpan> = new Map();
  private enabled: boolean;
  private completedSpans: TraceSpan[] = [];
  private options: TracerOptions;

  constructor(options?: TracerOptions) {
    this.options = options ?? {};
    this.enabled = options?.enabled ?? (process.env.TRACING_ENABLED !== 'false');
    // Store OTEL_EXPORTER_ENDPOINT from env if not provided via options
    if (!this.options.otelExporterEndpoint && process.env.OTEL_EXPORTER_ENDPOINT) {
      this.options.otelExporterEndpoint = process.env.OTEL_EXPORTER_ENDPOINT;
    }
  }

  /**
   * Start a new span. Accepts legacy signature `(toolName, inputSummary?)` or
   * new options-object signature `(toolName, { parentSpanId?, traceId?, inputSummary?, attributes? })`.
   * Returns the spanId (16-char hex), or '' when tracing is disabled.
   */
  startSpan(
    toolName: string,
    optionsOrInputSummary?:
      | string
      | {
          parentSpanId?: string;
          traceId?: string;
          inputSummary?: string;
          attributes?: Record<string, string | number | boolean>;
        },
  ): string {
    if (!this.enabled) return '';

    let parentSpanId: string | undefined;
    let traceId: string | undefined;
    let inputSummary: string | undefined;
    let attributes: Record<string, string | number | boolean> = {};

    if (typeof optionsOrInputSummary === 'string') {
      // Legacy: startSpan(toolName, inputSummary)
      inputSummary = optionsOrInputSummary;
    } else if (optionsOrInputSummary != null) {
      parentSpanId = optionsOrInputSummary.parentSpanId;
      traceId = optionsOrInputSummary.traceId;
      inputSummary = optionsOrInputSummary.inputSummary;
      attributes = optionsOrInputSummary.attributes ?? {};
    }

    const spanId = generateSpanId();
    const resolvedTraceId = traceId ?? generateTraceId();

    const span: TraceSpan = {
      traceId: resolvedTraceId,
      spanId,
      parentSpanId,
      toolName,
      startTime: Date.now(),
      status: 'unset',
      inputSummary,
      attributes,
    };

    this.spans.set(spanId, span);
    return spanId;
  }

  /**
   * End a span. Accepts legacy boolean `success` or the new status string.
   * Returns the completed TraceSpan, or undefined when tracing is disabled.
   */
  endSpan(spanId: string, success: boolean, errorDetails?: string): TraceSpan | undefined {
    if (!this.enabled || !spanId) return undefined;

    const span = this.spans.get(spanId);
    if (!span) return undefined;

    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.success = success;
    span.status = success ? 'ok' : 'error';
    span.errorDetails = errorDetails;

    this.spans.delete(spanId);
    this.completedSpans.push(span);

    return span;
  }

  /** Get all completed spans */
  getCompletedSpans(): TraceSpan[] {
    return [...this.completedSpans];
  }

  /** Check if tracing is enabled */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Clear completed spans */
  clear(): void {
    this.completedSpans = [];
  }

  /** Export completed spans as an OTLP-compatible JSON payload */
  exportSpans(): OTLPExportPayload {
    const otlpSpans: OTLPSpan[] = this.completedSpans
      .filter(s => s.endTime !== undefined)
      .map(s => {
        const otlpSpan: OTLPSpan = {
          traceId: s.traceId,
          spanId: s.spanId,
          name: s.toolName,
          kind: 1, // INTERNAL
          startTimeUnixNano: String(s.startTime * 1_000_000),
          endTimeUnixNano: String((s.endTime!) * 1_000_000),
          status: {
            code: statusToCode(s.status),
            ...(s.errorDetails ? { message: s.errorDetails } : {}),
          },
          attributes: Object.entries(s.attributes).map(([k, v]) => attributeToOTLP(k, v)),
        };
        if (s.parentSpanId !== undefined) {
          otlpSpan.parentSpanId = s.parentSpanId;
        }
        if (s.inputSummary) {
          otlpSpan.attributes.push(attributeToOTLP('input.summary', s.inputSummary));
        }
        return otlpSpan;
      });

    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'unreal-master-ai-mcp' } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: 'unreal-master-ai', version: '1.0.0' },
              spans: otlpSpans,
            },
          ],
        },
      ],
    };
  }

  /** Return the stored OTLP exporter endpoint (no HTTP call is made) */
  getOtelExporterEndpoint(): string | undefined {
    return this.options.otelExporterEndpoint ?? this.options.endpoint;
  }
}
