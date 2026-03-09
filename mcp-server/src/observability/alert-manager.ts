export interface AlertConfig {
  webhookUrl?: string;
  errorRateThreshold: number;
  windowMs: number;
  minCalls: number;
  cooldownMs?: number;
}

export interface AlertPayload {
  type: 'error_rate_exceeded';
  toolName: string;
  errorRate: number;
  threshold: number;
  callCount: number;
  windowMs: number;
  timestamp: string;
  recentErrors: Array<{ timestamp: string; toolName: string }>;
}

export interface AlertResult {
  fired: boolean;
  payload: AlertPayload;
}

interface CallRecord {
  timestamp: number;
  success: boolean;
}

export class AlertManager {
  private readonly webhookUrl: string | undefined;
  private readonly errorRateThreshold: number;
  private readonly windowMs: number;
  private readonly minCalls: number;
  private readonly cooldownMs: number;

  private windows: Map<string, CallRecord[]> = new Map();
  private cooldowns: Map<string, number> = new Map();

  constructor(config: Partial<AlertConfig> = {}) {
    this.errorRateThreshold = config.errorRateThreshold ?? 0.5;
    this.windowMs = config.windowMs ?? 60000;
    this.minCalls = config.minCalls ?? 5;
    this.cooldownMs = config.cooldownMs ?? 300000;
    this.webhookUrl = config.webhookUrl ?? process.env.ALERT_WEBHOOK_URL;
  }

  check(toolName: string, success: boolean): AlertResult | null {
    const now = Date.now();

    // Get or init window for this tool
    const records = this.windows.get(toolName) ?? [];
    // Add current call
    records.push({ timestamp: now, success });
    // Prune outside window
    const cutoff = now - this.windowMs;
    const pruned = records.filter(r => r.timestamp > cutoff);
    this.windows.set(toolName, pruned);

    const callCount = pruned.length;
    const failureCount = pruned.filter(r => !r.success).length;
    const errorRate = callCount > 0 ? failureCount / callCount : 0;

    if (errorRate <= this.errorRateThreshold || callCount < this.minCalls) {
      return null;
    }

    // Check cooldown
    const lastAlert = this.cooldowns.get(toolName);
    if (lastAlert !== undefined && now - lastAlert < this.cooldownMs) {
      return null;
    }

    // Fire alert
    this.cooldowns.set(toolName, now);

    const recentErrors = pruned
      .filter(r => !r.success)
      .map(r => ({ timestamp: new Date(r.timestamp).toISOString(), toolName }));

    const payload: AlertPayload = {
      type: 'error_rate_exceeded',
      toolName,
      errorRate,
      threshold: this.errorRateThreshold,
      callCount,
      windowMs: this.windowMs,
      timestamp: new Date(now).toISOString(),
      recentErrors,
    };

    if (this.webhookUrl) {
      // Fire-and-forget
      fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err: unknown) => {
        process.stderr.write(`[AlertManager] Webhook send failed: ${err}\n`);
      });
    }

    return { fired: true, payload };
  }

  getStats(toolName: string): { errorRate: number; callCount: number; inCooldown: boolean } | undefined {
    const records = this.windows.get(toolName);
    if (records === undefined) return undefined;

    const now = Date.now();
    const cutoff = now - this.windowMs;
    const active = records.filter(r => r.timestamp > cutoff);
    const callCount = active.length;
    const failureCount = active.filter(r => !r.success).length;
    const errorRate = callCount > 0 ? failureCount / callCount : 0;

    const lastAlert = this.cooldowns.get(toolName);
    const inCooldown = lastAlert !== undefined && now - lastAlert < this.cooldownMs;

    return { errorRate, callCount, inCooldown };
  }

  reset(): void {
    this.windows.clear();
    this.cooldowns.clear();
  }

  resetTool(toolName: string): void {
    this.windows.delete(toolName);
    this.cooldowns.delete(toolName);
  }
}
