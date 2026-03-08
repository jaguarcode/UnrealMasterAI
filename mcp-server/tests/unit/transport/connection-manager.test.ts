import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionManager } from '../../../src/transport/connection-manager.js';

describe('ConnectionManager', () => {
  let cm: ConnectionManager;

  beforeEach(() => {
    cm = new ConnectionManager();
  });

  it('starts in disconnected state', () => {
    expect(cm.getState()).toBe('disconnected');
    expect(cm.isConnected()).toBe(false);
  });

  it('tracks state transitions', () => {
    cm.setState('connected');
    expect(cm.getState()).toBe('connected');
    expect(cm.isConnected()).toBe(true);

    cm.setState('disconnected');
    expect(cm.getState()).toBe('disconnected');
    expect(cm.isConnected()).toBe(false);
  });

  it('increments disconnectCount on disconnect', () => {
    expect(cm.disconnectCount).toBe(0);

    cm.setState('connected');
    cm.setState('disconnected');
    expect(cm.disconnectCount).toBe(1);

    cm.setState('connected');
    cm.setState('disconnected');
    expect(cm.disconnectCount).toBe(2);
  });

  it('tracks lastDisconnectedAt timestamp', () => {
    expect(cm.lastDisconnectedAt).toBeNull();

    const before = new Date();
    cm.setState('connected');
    cm.setState('disconnected');
    const after = new Date();

    expect(cm.lastDisconnectedAt).not.toBeNull();
    expect(cm.lastDisconnectedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(cm.lastDisconnectedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('tracks lastConnectedAt timestamp', () => {
    expect(cm.lastConnectedAt).toBeNull();

    const before = new Date();
    cm.setState('connected');
    const after = new Date();

    expect(cm.lastConnectedAt).not.toBeNull();
    expect(cm.lastConnectedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(cm.lastConnectedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('getStats returns full state', () => {
    cm.setState('connected');
    cm.setState('disconnected');
    cm.setState('connected');

    const stats = cm.getStats();
    expect(stats.state).toBe('connected');
    expect(stats.disconnectCount).toBe(1);
    expect(stats.lastDisconnectedAt).toBeInstanceOf(Date);
    expect(stats.lastConnectedAt).toBeInstanceOf(Date);
  });

  it('resetStats clears counters', () => {
    cm.setState('connected');
    cm.setState('disconnected');
    expect(cm.disconnectCount).toBe(1);

    cm.resetStats();
    expect(cm.disconnectCount).toBe(0);
    expect(cm.lastDisconnectedAt).toBeNull();
    expect(cm.lastConnectedAt).toBeNull();
    // state itself is not reset
    expect(cm.getState()).toBe('disconnected');
  });

  it('fires onStateChange callback', () => {
    const cb = vi.fn();
    cm.onStateChange = cb;

    cm.setState('connected');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('connected');

    cm.setState('disconnected');
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith('disconnected');
  });

  it('does not fire callback for same state', () => {
    const cb = vi.fn();
    cm.onStateChange = cb;

    // starts disconnected — setting disconnected again should not fire
    cm.setState('disconnected');
    expect(cb).not.toHaveBeenCalled();

    cm.setState('connected');
    cm.setState('connected'); // duplicate
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
