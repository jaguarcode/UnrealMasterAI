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

export class ConnectionManager {
  private state: ConnectionState = 'disconnected';
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatIntervalMs: number;

  onStateChange: ((state: ConnectionState) => void) | null = null;

  constructor(options: ConnectionManagerOptions = {}) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10000;
  }

  /**
   * Update connection state.
   */
  setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
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
   * Clean up resources.
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
