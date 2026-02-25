/**
 * Mock WebSocket client simulating UE plugin behavior for testing.
 */
import WebSocket from 'ws';

export interface MockUEClientOptions {
  /** Artificial delay before responding (ms) */
  responseDelay?: number;
  /** If true, sends malformed responses */
  sendMalformed?: boolean;
}

export class MockUEClient {
  private ws: WebSocket | null = null;
  private options: MockUEClientOptions;

  constructor(options: MockUEClientOptions = {}) {
    this.options = options;
  }

  /**
   * Connect to the bridge server.
   */
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.on('open', () => {
        // Auto-respond to incoming messages (simulate UE plugin)
        this.ws!.on('message', (data) => {
          const message = JSON.parse(data.toString());
          const delay = this.options.responseDelay ?? 0;

          setTimeout(() => {
            if (this.options.sendMalformed) {
              this.ws?.send('not valid json {{{');
              return;
            }

            // Echo back a proper response
            const response = {
              id: message.id,
              result: { method: message.method, echo: true },
              duration_ms: delay,
            };
            this.ws?.send(JSON.stringify(response));
          }, delay);
        });
        resolve();
      });
      this.ws.on('error', reject);
    });
  }

  /**
   * Send a raw message to the bridge.
   */
  send(data: string): void {
    this.ws?.send(data);
  }

  /**
   * Disconnect from the bridge.
   */
  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.ws = null;
        resolve();
        return;
      }
      if (this.ws.readyState === WebSocket.CLOSING) {
        this.ws.once('close', () => { this.ws = null; resolve(); });
        return;
      }
      this.ws.once('close', () => { this.ws = null; resolve(); });
      this.ws.close();
    });
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
