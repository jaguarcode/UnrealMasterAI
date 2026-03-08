/**
 * Circuit breaker for tool execution resilience.
 * Opens after consecutive failures to prevent cascading errors.
 * Auto-resets after a cooldown period to allow recovery.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Cooldown period in ms before transitioning from open to half-open. Default: 60000 (60s) */
  cooldownMs?: number;
}

export interface CircuitBreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureAt: Date | null;
  openedAt: Date | null;
}

export class CircuitBreaker {
  private consecutiveFailures = 0;
  private lastFailureAt: Date | null = null;
  private openedAt: Date | null = null;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 60_000;
  }

  /**
   * Record a successful operation. Resets failure count and closes the circuit.
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  /**
   * Record a failed operation. Increments failure count and may open the circuit.
   */
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureAt = new Date();
    if (this.consecutiveFailures >= this.failureThreshold) {
      if (this.openedAt === null) {
        this.openedAt = new Date();
      }
    }
  }

  /**
   * Check if the circuit is open (requests should be blocked).
   * Transitions from open to half-open after cooldown expires.
   */
  isOpen(): boolean {
    if (this.openedAt === null) return false;
    const elapsed = Date.now() - this.openedAt.getTime();
    if (elapsed >= this.cooldownMs) {
      // Transition to half-open - allow one request through
      return false;
    }
    return true;
  }

  /**
   * Get the current state of the circuit breaker.
   */
  getState(): CircuitBreakerState {
    let state: CircuitState;
    if (this.openedAt === null) {
      state = 'closed';
    } else {
      const elapsed = Date.now() - this.openedAt.getTime();
      state = elapsed >= this.cooldownMs ? 'half-open' : 'open';
    }
    return {
      state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureAt: this.lastFailureAt,
      openedAt: this.openedAt,
    };
  }

  /**
   * Manually reset the circuit breaker to closed state.
   */
  reset(): void {
    this.consecutiveFailures = 0;
    this.lastFailureAt = null;
    this.openedAt = null;
  }
}
