import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlertManager } from '../../../src/observability/alert-manager.js';

describe('AlertManager', () => {
  let manager: AlertManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new AlertManager({
      errorRateThreshold: 0.5,
      windowMs: 60000,
      minCalls: 5,
      cooldownMs: 300000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.ALERT_WEBHOOK_URL;
  });

  it('no alert when error rate is below threshold', () => {
    // 2 failures out of 5 = 40%, threshold is 50%
    for (let i = 0; i < 3; i++) manager.check('tool-a', true);
    for (let i = 0; i < 2; i++) manager.check('tool-a', false);
    const result = manager.check('tool-a', true); // 6th call, still 2/6 ~33%
    expect(result).toBeNull();
  });

  it('no alert when below minCalls', () => {
    // 4 calls all failures — would exceed threshold but minCalls is 5
    for (let i = 0; i < 4; i++) manager.check('tool-a', false);
    const last = manager.check('tool-a', true); // 5th call - now 4/5 = 80% but this last one is success
    // Actually 4 failures + 1 success = 80% error rate >=5 calls → alert fires
    // Reset and test true below-minCalls scenario
    manager.reset();
    for (let i = 0; i < 4; i++) manager.check('tool-b', false);
    // Only 4 calls, all failures, but minCalls=5 → no alert
    expect(manager.check('tool-b', false)).not.toBeNull(); // 5th call triggers
    manager.reset();
    for (let i = 0; i < 3; i++) manager.check('tool-c', false);
    // 3 calls, below minCalls of 5
    const result = manager.check('tool-c', false); // 4 total, still below
    expect(result).toBeNull();
  });

  it('alert fires when error rate exceeds threshold with enough calls', () => {
    // 4 failures + 1 success = 5 calls, 80% error rate > 50% threshold
    for (let i = 0; i < 4; i++) manager.check('tool-a', false);
    const result = manager.check('tool-a', true);
    expect(result).not.toBeNull();
    expect(result!.fired).toBe(true);
  });

  it('alert payload has correct structure', () => {
    for (let i = 0; i < 4; i++) manager.check('tool-a', false);
    const result = manager.check('tool-a', false); // 5 failures, 100% error rate
    expect(result).not.toBeNull();
    const { payload } = result!;
    expect(payload.type).toBe('error_rate_exceeded');
    expect(payload.toolName).toBe('tool-a');
    expect(payload.errorRate).toBe(1);
    expect(payload.threshold).toBe(0.5);
    expect(payload.callCount).toBe(5);
    expect(payload.windowMs).toBe(60000);
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(payload.recentErrors)).toBe(true);
  });

  it('cooldown prevents duplicate alerts within cooldownMs', () => {
    // Trigger first alert on the 5th call (4 failures + 1 more = 5 calls, 100% error rate)
    for (let i = 0; i < 4; i++) manager.check('tool-a', false);
    const first = manager.check('tool-a', false);
    expect(first).not.toBeNull();

    // Immediately after, still in cooldown
    const second = manager.check('tool-a', false);
    expect(second).toBeNull();

    // Advance less than cooldownMs (5 min = 300000ms), still in cooldown
    vi.advanceTimersByTime(299000);
    const third = manager.check('tool-a', false);
    expect(third).toBeNull();
  });

  it('cooldown expires and allows new alert', () => {
    // Trigger first alert on the 5th call
    for (let i = 0; i < 4; i++) manager.check('tool-a', false);
    const first = manager.check('tool-a', false);
    expect(first).not.toBeNull();

    // Advance past cooldownMs
    vi.advanceTimersByTime(300001);

    // Add more calls within the new window to meet minCalls
    for (let i = 0; i < 4; i++) manager.check('tool-a', false);
    const second = manager.check('tool-a', false);
    expect(second).not.toBeNull();
    expect(second!.fired).toBe(true);
  });

  it('sliding window prunes old entries', () => {
    // Add 5 failing calls
    for (let i = 0; i < 5; i++) manager.check('tool-a', false);
    // Trigger alert so cooldown is set
    manager.check('tool-a', false);

    // Advance past the window (60s) AND past cooldown (5min)
    vi.advanceTimersByTime(360001);

    // Now old entries are pruned; add fresh successful calls — error rate should be 0
    for (let i = 0; i < 5; i++) manager.check('tool-a', true);
    const stats = manager.getStats('tool-a');
    expect(stats).toBeDefined();
    expect(stats!.errorRate).toBe(0);
    expect(stats!.callCount).toBe(5);
  });

  it('ALERT_WEBHOOK_URL env var is used when no config url', () => {
    process.env.ALERT_WEBHOOK_URL = 'https://example.com/webhook';
    const m = new AlertManager({ errorRateThreshold: 0.5, windowMs: 60000, minCalls: 5 });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    for (let i = 0; i < 5; i++) m.check('tool-a', false);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('getStats returns correct errorRate and callCount', () => {
    manager.check('tool-a', true);
    manager.check('tool-a', false);
    manager.check('tool-a', false);
    const stats = manager.getStats('tool-a');
    expect(stats).toBeDefined();
    expect(stats!.callCount).toBe(3);
    expect(stats!.errorRate).toBeCloseTo(2 / 3);
  });

  it('getStats returns undefined for unknown tool', () => {
    expect(manager.getStats('nonexistent')).toBeUndefined();
  });

  it('reset clears all data', () => {
    manager.check('tool-a', false);
    manager.check('tool-b', false);
    manager.reset();
    expect(manager.getStats('tool-a')).toBeUndefined();
    expect(manager.getStats('tool-b')).toBeUndefined();
  });

  it('resetTool clears specific tool only', () => {
    manager.check('tool-a', false);
    manager.check('tool-b', false);
    manager.resetTool('tool-a');
    expect(manager.getStats('tool-a')).toBeUndefined();
    expect(manager.getStats('tool-b')).toBeDefined();
  });

  it('webhook fetch is called with correct payload', () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const m = new AlertManager({
      webhookUrl: 'https://hooks.example.com/alert',
      errorRateThreshold: 0.5,
      windowMs: 60000,
      minCalls: 5,
    });

    for (let i = 0; i < 5; i++) m.check('tool-x', false);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://hooks.example.com/alert');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.type).toBe('error_rate_exceeded');
    expect(body.toolName).toBe('tool-x');
    expect(body.errorRate).toBe(1);
  });

  it('recentErrors array contains only failures from the window', () => {
    manager.check('tool-a', true);  // success — not in recentErrors
    manager.check('tool-a', false); // failure
    manager.check('tool-a', false); // failure
    manager.check('tool-a', false); // failure
    const result = manager.check('tool-a', false); // 5th call, 4 failures = 80%
    expect(result).not.toBeNull();
    const { recentErrors } = result!.payload;
    expect(recentErrors).toHaveLength(4);
    recentErrors.forEach(e => {
      expect(e.toolName).toBe('tool-a');
      expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  it('getStats inCooldown is true after alert and false after cooldown expires', () => {
    for (let i = 0; i < 5; i++) manager.check('tool-a', false);
    const stats = manager.getStats('tool-a');
    expect(stats!.inCooldown).toBe(true);

    vi.advanceTimersByTime(300001);
    const statsAfter = manager.getStats('tool-a');
    expect(statsAfter!.inCooldown).toBe(false);
  });

  it('no webhook call when webhookUrl is not configured', () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    // Manager with no webhookUrl and no env var
    const m = new AlertManager({ errorRateThreshold: 0.5, windowMs: 60000, minCalls: 5 });
    for (let i = 0; i < 5; i++) m.check('tool-a', false);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
