/**
 * WebSocket Bridge Server.
 * Node.js acts as the WebSocket SERVER; UE Plugin connects as CLIENT.
 * Handles request/response correlation, timeouts, and connection management.
 */
import { WebSocketServer, WebSocket } from 'ws';
import { encodeMessage, decodeResponse } from './message-codec.js';
import type { WSMessage, WSResponse } from '../types/messages.js';
import { ConnectionManager } from './connection-manager.js';
import type { ConnectionStats } from './connection-manager.js';
import { validateWsAuth } from './ws-auth.js';

export interface WebSocketBridgeOptions {
  port: number;
  requestTimeoutMs?: number;
  authSecret?: string;
}

interface PendingRequest {
  resolve: (response: WSResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface BridgeDiagnostics {
  websocketState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'NO_CLIENT';
  configuredPort: number;
  lastConnectedAt: string | null;
}

export class WebSocketBridge {
  private wss: WebSocketServer | null = null;
  private activeClient: WebSocket | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private port: number;
  private requestTimeoutMs: number;
  private listening = false;
  private actualPort: number;
  private lastConnectedAt: Date | null = null;
  private authSecret: string | undefined;
  connectionManager: ConnectionManager;

  /** Callback when client disconnects */
  onClientDisconnected: (() => void) | null = null;

  /** Callback when client connects */
  onClientConnected: (() => void) | null = null;

  constructor(options: WebSocketBridgeOptions) {
    this.port = options.port;
    this.actualPort = options.port;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30000;
    this.authSecret = options.authSecret;
    this.connectionManager = new ConnectionManager();
  }

  /**
   * Start the WebSocket server.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({
        port: this.port,
        verifyClient: this.authSecret
          ? (info, cb) => {
              const result = validateWsAuth(info.req.headers, { secret: this.authSecret });
              if (result.accepted) cb(true);
              else cb(false, 401, result.reason ?? 'Unauthorized');
            }
          : undefined,
      });

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
        console.error(`[WS] Client connection attempt`);
        // Only allow one active client (the UE plugin)
        if (this.activeClient && this.activeClient.readyState === WebSocket.OPEN) {
          console.error(`[WS] Rejecting connection - already have active client`);
          ws.close(1008, 'Only one client allowed');
          return;
        }

        console.error(`[WS] Client connected successfully`);
        this.activeClient = ws;
        this.lastConnectedAt = new Date();
        this.connectionManager.setState('connected');
        console.error(`[WS] Connection established (total disconnects so far: ${this.connectionManager.disconnectCount})`);
        this.onClientConnected?.();

        ws.on('message', (data) => {
          try {
            const raw = data.toString();
            console.error(`[WS] Received response: ${raw.substring(0, 200)}`);
            const response = decodeResponse(raw);
            console.error(`[WS] Decoded response id: ${response.id}`);
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              console.error(`[WS] Found pending request, resolving`);
              clearTimeout(pending.timer);
              this.pendingRequests.delete(response.id);
              pending.resolve(response);
            } else {
              console.error(`[WS] No pending request found for id: ${response.id}`);
            }
          } catch (err) {
            console.error(`[WS] Error decoding response: ${err}`);
          }
        });

        ws.on('close', () => {
          if (ws === this.activeClient) {
            this.activeClient = null;
            this.connectionManager.setState('disconnected');
            const count = this.connectionManager.disconnectCount;
            console.error(`[WS] Client disconnected (disconnect #${count}). Server still listening for reconnections.`);
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
   * @param msg - The message to send
   * @param timeoutMs - Optional per-request timeout override. Falls back to this.requestTimeoutMs.
   */
  sendRequest(msg: WSMessage, timeoutMs?: number): Promise<WSResponse> {
    return new Promise((resolve, reject) => {
      console.error(`[WS] sendRequest called for ${msg.method}, hasClient=${!!this.activeClient}, readyState=${this.activeClient?.readyState}`);
      if (!this.activeClient || this.activeClient.readyState !== WebSocket.OPEN) {
        console.error(`[WS] Rejecting request - UE plugin not connected`);
        reject(new Error('UE plugin not connected'));
        return;
      }

      const effectiveTimeout = timeoutMs ?? this.requestTimeoutMs;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(msg.id);
        reject(new Error(`Request timeout after ${effectiveTimeout}ms for ${msg.method}`));
      }, effectiveTimeout);

      this.pendingRequests.set(msg.id, { resolve, reject, timer });

      try {
        const encoded = encodeMessage(msg);
        console.error(`[WS] Sending message: ${encoded.substring(0, 200)}`);
        this.activeClient.send(encoded);
      } catch (err) {
        console.error(`[WS] Error sending message: ${err}`);
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

  /**
   * Return diagnostic information about the current WebSocket state.
   * Used by editor-ping to surface connection health details.
   */
  /**
   * Return connection statistics from the connection manager.
   */
  getConnectionStats(): ConnectionStats {
    return this.connectionManager.getStats();
  }

  getDiagnostics(): BridgeDiagnostics {
    let websocketState: BridgeDiagnostics['websocketState'];
    if (this.activeClient === null) {
      websocketState = 'NO_CLIENT';
    } else {
      const stateMap: Record<number, BridgeDiagnostics['websocketState']> = {
        [WebSocket.CONNECTING]: 'CONNECTING',
        [WebSocket.OPEN]: 'OPEN',
        [WebSocket.CLOSING]: 'CLOSING',
        [WebSocket.CLOSED]: 'CLOSED',
      };
      websocketState = stateMap[this.activeClient.readyState] ?? 'CLOSED';
    }
    return {
      websocketState,
      configuredPort: this.port,
      lastConnectedAt: this.lastConnectedAt ? this.lastConnectedAt.toISOString() : null,
    };
  }
}
