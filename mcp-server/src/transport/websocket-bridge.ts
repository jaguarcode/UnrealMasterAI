/**
 * WebSocket Bridge Server.
 * Node.js acts as the WebSocket SERVER; UE Plugin connects as CLIENT.
 * Handles request/response correlation, timeouts, and connection management.
 */
import { WebSocketServer, WebSocket } from 'ws';
import { encodeMessage, decodeResponse } from './message-codec.js';
import type { WSMessage, WSResponse } from '../types/messages.js';

export interface WebSocketBridgeOptions {
  port: number;
  requestTimeoutMs?: number;
}

interface PendingRequest {
  resolve: (response: WSResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class WebSocketBridge {
  private wss: WebSocketServer | null = null;
  private activeClient: WebSocket | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private port: number;
  private requestTimeoutMs: number;
  private listening = false;
  private actualPort: number;

  /** Callback when client disconnects */
  onClientDisconnected: (() => void) | null = null;

  /** Callback when client connects */
  onClientConnected: (() => void) | null = null;

  constructor(options: WebSocketBridgeOptions) {
    this.port = options.port;
    this.actualPort = options.port;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30000;
  }

  /**
   * Start the WebSocket server.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('listening', () => {
        this.listening = true;
        const addr = this.wss!.address();
        if (addr && typeof addr === 'object') {
          this.actualPort = addr.port;
        }
        resolve();
      });

      this.wss.once('error', (err) => {
        this.listening = false;
        reject(err);
      });

      this.wss.on('connection', (ws) => {
        // Only allow one active client (the UE plugin)
        if (this.activeClient && this.activeClient.readyState === WebSocket.OPEN) {
          ws.close(1008, 'Only one client allowed');
          return;
        }

        this.activeClient = ws;
        this.onClientConnected?.();

        ws.on('message', (data) => {
          try {
            const raw = data.toString();
            const response = decodeResponse(raw);
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              clearTimeout(pending.timer);
              this.pendingRequests.delete(response.id);
              pending.resolve(response);
            }
          } catch {
            // Ignore malformed responses
          }
        });

        ws.on('close', () => {
          if (ws === this.activeClient) {
            this.activeClient = null;
            // Reject all pending requests
            for (const [id, pending] of this.pendingRequests) {
              clearTimeout(pending.timer);
              pending.reject(new Error('Client disconnected'));
              this.pendingRequests.delete(id);
            }
            this.onClientDisconnected?.();
          }
        });

        ws.on('error', () => {
          // Connection errors handled by close event
        });
      });
    });
  }

  /**
   * Stop the WebSocket server and close all connections.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Server shutting down'));
        this.pendingRequests.delete(id);
      }

      // Terminate all open connections forcefully so wss.close() callback fires promptly.
      if (this.wss) {
        for (const client of this.wss.clients) {
          client.terminate();
        }
      }
      this.activeClient = null;

      if (this.wss) {
        const wss = this.wss;
        this.wss = null;
        wss.close(() => {
          this.listening = false;
          resolve();
        });
      } else {
        this.listening = false;
        resolve();
      }
    });
  }

  /**
   * Send a request to the connected UE plugin and wait for a correlated response.
   */
  sendRequest(msg: WSMessage): Promise<WSResponse> {
    return new Promise((resolve, reject) => {
      if (!this.activeClient || this.activeClient.readyState !== WebSocket.OPEN) {
        reject(new Error('UE plugin not connected'));
        return;
      }

      const timer = setTimeout(() => {
        this.pendingRequests.delete(msg.id);
        reject(new Error(`Request timeout after ${this.requestTimeoutMs}ms for ${msg.method}`));
      }, this.requestTimeoutMs);

      this.pendingRequests.set(msg.id, { resolve, reject, timer });

      try {
        const encoded = encodeMessage(msg);
        this.activeClient.send(encoded);
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(msg.id);
        reject(err);
      }
    });
  }

  /**
   * Returns the actual port the server is bound to.
   * Useful when constructed with port 0 (OS-assigned port).
   */
  getPort(): number {
    return this.actualPort;
  }

  /**
   * Check if the server is listening.
   */
  isListening(): boolean {
    return this.listening;
  }

  /**
   * Check if a client is currently connected.
   */
  hasActiveConnection(): boolean {
    return this.activeClient !== null && this.activeClient.readyState === WebSocket.OPEN;
  }
}
