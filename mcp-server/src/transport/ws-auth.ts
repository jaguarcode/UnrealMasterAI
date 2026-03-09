import { timingSafeEqual, createHmac } from 'node:crypto';

export interface WsAuthConfig {
  secret?: string; // shared secret, undefined = no auth required
}

/**
 * Validate incoming WebSocket connection headers.
 * Returns true if connection should be accepted, false if rejected.
 */
export function validateWsAuth(
  headers: Record<string, string | string[] | undefined>,
  config: WsAuthConfig
): { accepted: boolean; reason?: string } {
  // If no secret configured, accept all connections (backward compat, local-only)
  if (!config.secret) return { accepted: true };

  const token = headers['x-uma-auth-token'];
  if (!token) return { accepted: false, reason: 'Missing x-uma-auth-token header' };

  const tokenStr = Array.isArray(token) ? token[0] : token;

  // Hash both to fixed length to avoid leaking secret length via timing side-channel
  const hmacKey = 'uma-ws-auth';
  const expectedHash = createHmac('sha256', hmacKey).update(config.secret).digest();
  const tokenHash = createHmac('sha256', hmacKey).update(tokenStr).digest();
  const match = timingSafeEqual(expectedHash, tokenHash);
  if (!match) return { accepted: false, reason: 'Invalid auth token' };

  return { accepted: true };
}

/**
 * Create auth config from environment.
 */
export function createWsAuthConfig(): WsAuthConfig {
  return { secret: process.env.WS_AUTH_SECRET };
}
