/**
 * Connection Manager for the WebSocket bridge.
 * Handles health monitoring and provides connection state info.
 * Note: Since UE is the client and connects to us, "reconnection" is
 * handled by UE. We just track connection state and notify on changes.
 */

export type ConnectionState = 'disconnected' | 'connected';

export interface ConnectionManagerOptions {
  heartbeatIntervalMs?: number;
}

export interface ConnectionStats {
  state: ConnectionState;
  disconnectCount: number;
  lastDisconnectedAt: Date | null;
  lastConnectedAt: Date | null;
}

export class ConnectionManager {
  private state: ConnectionState = 'disconnected';
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatIntervalMs: number;

  disconnectCount: number = 0;
  lastDisconnectedAt: Date | null = null;
  lastConnectedAt: Date | null = null;

  onStateChange: ((state: ConnectionState) => void) | null = null;

  constructor(options: ConnectionManagerOptions = {}) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10000;
  }

  /**
   * Update connection state. Tracks disconnect/connect timestamps and counts.
   */
  setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      if (state === 'disconnected') {
        this.disconnectCount++;
        this.lastDisconnectedAt = new Date();
      } else if (state === 'connected') {
        this.lastConnectedAt = new Date();
      }
      this.onStateChange?.(state);
    }
  }

  /**
   * Get current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Return a snapshot of connection statistics.
   */
  getStats(): ConnectionStats {
    return {
      state: this.state,
      disconnectCount: this.disconnectCount,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastConnectedAt: this.lastConnectedAt,
    };
  }

  /**
   * Reset disconnect counter and timestamps.
   */
  resetStats(): void {
    this.disconnectCount = 0;
    this.lastDisconnectedAt = null;
    this.lastConnectedAt = null;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
