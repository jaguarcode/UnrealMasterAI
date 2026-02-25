export interface TraceSpan {
  spanId: string;
  toolName: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  success?: boolean;
  inputSummary?: string;
  errorDetails?: string;
  metadata?: Record<string, unknown>;
}

export interface TracerOptions {
  enabled?: boolean;
  endpoint?: string; // LangSmith/Langfuse endpoint
}

export class Tracer {
  private spans: Map<string, TraceSpan> = new Map();
  private enabled: boolean;
  private completedSpans: TraceSpan[] = [];

  constructor(options?: TracerOptions) {
    this.enabled = options?.enabled ?? (process.env.TRACING_ENABLED !== 'false');
  }

  /** Start a new span */
  startSpan(toolName: string, inputSummary?: string): string {
    if (!this.enabled) return '';

    const spanId = crypto.randomUUID();
    const span: TraceSpan = {
      spanId,
      toolName,
      startTime: Date.now(),
      inputSummary,
    };
    this.spans.set(spanId, span);
    return spanId;
  }

  /** End a span with success/failure */
  endSpan(spanId: string, success: boolean, errorDetails?: string): TraceSpan | undefined {
    if (!this.enabled || !spanId) return undefined;

    const span = this.spans.get(spanId);
    if (!span) return undefined;

    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.success = success;
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
}
