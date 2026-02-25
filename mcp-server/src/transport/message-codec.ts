/**
 * Message codec for encoding/decoding WebSocket messages.
 * Uses Zod for runtime validation.
 */
import { WSMessageSchema, WSResponseSchema } from '../types/ws-protocol.js';
import type { WSMessage, WSResponse } from '../types/messages.js';

/**
 * Encode a WSMessage into a JSON string.
 * Validates against WSMessageSchema before encoding.
 * @throws ZodError if message doesn't conform to schema
 */
export function encodeMessage(msg: WSMessage): string {
  const validated = WSMessageSchema.parse(msg);
  return JSON.stringify(validated);
}

/**
 * Decode a raw JSON string into a validated WSResponse.
 * @throws ZodError if response doesn't conform to schema
 * @throws SyntaxError if input is not valid JSON
 */
export function decodeResponse(raw: string): WSResponse {
  const parsed = JSON.parse(raw);
  return WSResponseSchema.parse(parsed) as WSResponse;
}
