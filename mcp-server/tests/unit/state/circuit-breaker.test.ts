import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../../../src/state/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in closed state', () => {
    const state = cb.getState();
    expect(state.state).toBe('closed');
    expect(state.consecutiveFailures).toBe(0);
    expect(state.lastFailureAt).toBeNull();
    expect(state.openedAt).toBeNull();
  });

  it('stays closed below failure threshold', () => {
    for (let i = 0; i < 4; i++) {
      cb.recordFailure();
    }
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState().state).toBe('closed');
  });

  it('opens after reaching failure threshold', () => {
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }
    expect(cb.isOpen()).toBe(true);
  });

  it('getState returns open after threshold reached', () => {
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }
    expect(cb.getState().state).toBe('open');
  });

  it('recordSuccess resets failures and closes circuit', () => {
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }
    expect(cb.isOpen()).toBe(true);
    cb.recordSuccess();
    expect(cb.isOpen()).toBe(false);
    const state = cb.getState();
    expect(state.state).toBe('closed');
    expect(state.consecutiveFailures).toBe(0);
    expect(state.openedAt).toBeNull();
  });

  it('auto-transitions to half-open after cooldown', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }
    expect(cb.isOpen()).toBe(true);
    expect(cb.getState().state).toBe('open');

    vi.advanceTimersByTime(60_000);

    expect(cb.isOpen()).toBe(false);
    expect(cb.getState().state).toBe('half-open');
  });

  it('reset() clears all state', () => {
    for (let i = 0; i < 5; i++) {
      cb.recordFailure();
    }
    expect(cb.isOpen()).toBe(true);
    cb.reset();
    const state = cb.getState();
    expect(state.state).toBe('closed');
    expect(state.consecutiveFailures).toBe(0);
    expect(state.lastFailureAt).toBeNull();
    expect(state.openedAt).toBeNull();
    expect(cb.isOpen()).toBe(false);
  });

  it('respects custom failure threshold', () => {
    const custom = new CircuitBreaker({ failureThreshold: 3 });
    custom.recordFailure();
    custom.recordFailure();
    expect(custom.isOpen()).toBe(false);
    custom.recordFailure();
    expect(custom.isOpen()).toBe(true);
    expect(custom.getState().state).toBe('open');
  });

  it('respects custom cooldown', () => {
    vi.useFakeTimers();
    const custom = new CircuitBreaker({ cooldownMs: 1000 });
    for (let i = 0; i < 5; i++) {
      custom.recordFailure();
    }
    expect(custom.isOpen()).toBe(true);

    vi.advanceTimersByTime(999);
    expect(custom.isOpen()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(custom.isOpen()).toBe(false);
    expect(custom.getState().state).toBe('half-open');
  });

  it('isOpen returns false when circuit is closed', () => {
    expect(cb.isOpen()).toBe(false);
  });

  it('tracks lastFailureAt timestamp', () => {
    vi.useFakeTimers();
    const before = new Date();
    cb.recordFailure();
    const state = cb.getState();
    expect(state.lastFailureAt).not.toBeNull();
    expect(state.lastFailureAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
