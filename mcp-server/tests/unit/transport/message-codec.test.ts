import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { encodeMessage, decodeResponse } from '../../../src/transport/message-codec.js';
import type { WSMessage, WSResponse } from '../../../src/types/messages.js';

describe('MessageCodec', () => {
  describe('encodeMessage()', () => {
    it('produces valid JSON with id, method, params, timestamp', () => {
      const msg: WSMessage = {
        id: uuidv4(),
        method: 'editor.ping',
        params: {},
        timestamp: Date.now(),
      };
      const encoded = encodeMessage(msg);
      const parsed = JSON.parse(encoded);
      expect(parsed.id).toBe(msg.id);
      expect(parsed.method).toBe('editor.ping');
      expect(parsed.params).toEqual({});
      expect(parsed.timestamp).toBe(msg.timestamp);
    });

    it('encodes params with nested objects', () => {
      const msg: WSMessage = {
        id: uuidv4(),
        method: 'blueprint.serialize',
        params: { assetPath: '/Game/BP_TestActor', options: { depth: 3 } },
        timestamp: Date.now(),
      };
      const encoded = encodeMessage(msg);
      const parsed = JSON.parse(encoded);
      expect(parsed.params.assetPath).toBe('/Game/BP_TestActor');
      expect(parsed.params.options).toEqual({ depth: 3 });
    });

    it('handles unicode in string parameters', () => {
      const msg: WSMessage = {
        id: uuidv4(),
        method: 'editor.ping',
        params: { label: '한글 테스트 🎮' },
        timestamp: Date.now(),
      };
      const encoded = encodeMessage(msg);
      const parsed = JSON.parse(encoded);
      expect(parsed.params.label).toBe('한글 테스트 🎮');
    });

    it('handles large payloads', () => {
      const largeData = 'x'.repeat(1024 * 1024); // 1MB
      const msg: WSMessage = {
        id: uuidv4(),
        method: 'blueprint.serialize',
        params: { data: largeData },
        timestamp: Date.now(),
      };
      const encoded = encodeMessage(msg);
      expect(encoded.length).toBeGreaterThan(1024 * 1024);
      const parsed = JSON.parse(encoded);
      expect(parsed.params.data).toBe(largeData);
    });

    it('rejects message with invalid method format', () => {
      const msg = {
        id: uuidv4(),
        method: 'invalid-method',
        params: {},
        timestamp: Date.now(),
      };
      expect(() => encodeMessage(msg as WSMessage)).toThrow();
    });

    it('rejects message with missing id', () => {
      const msg = {
        method: 'editor.ping',
        params: {},
        timestamp: Date.now(),
      };
      expect(() => encodeMessage(msg as WSMessage)).toThrow();
    });
  });

  describe('decodeResponse()', () => {
    it('parses valid WSResponse with result field', () => {
      const raw = JSON.stringify({
        id: uuidv4(),
        result: { level: 'MainLevel', actorCount: 42 },
        duration_ms: 15.5,
      });
      const response = decodeResponse(raw);
      expect(response.result).toEqual({ level: 'MainLevel', actorCount: 42 });
      expect(response.duration_ms).toBe(15.5);
      expect(response.error).toBeUndefined();
    });

    it('parses valid WSResponse with error field', () => {
      const id = uuidv4();
      const raw = JSON.stringify({
        id,
        error: { code: 3001, message: 'Blueprint not found' },
        duration_ms: 2.1,
      });
      const response = decodeResponse(raw);
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(3001);
      expect(response.error!.message).toBe('Blueprint not found');
      expect(response.result).toBeUndefined();
    });

    it('parses WSResponse with error that includes data field', () => {
      const raw = JSON.stringify({
        id: uuidv4(),
        error: { code: 2001, message: 'Invalid params', data: { field: 'assetPath' } },
        duration_ms: 0.5,
      });
      const response = decodeResponse(raw);
      expect(response.error!.data).toEqual({ field: 'assetPath' });
    });

    it('rejects malformed JSON', () => {
      expect(() => decodeResponse('not json {{')).toThrow();
    });

    it('rejects missing required field (id)', () => {
      const raw = JSON.stringify({
        result: 'pong',
        duration_ms: 1.0,
      });
      expect(() => decodeResponse(raw)).toThrow();
    });

    it('rejects invalid error code (out of range)', () => {
      const raw = JSON.stringify({
        id: uuidv4(),
        error: { code: 999, message: 'bad code' },
        duration_ms: 0.1,
      });
      expect(() => decodeResponse(raw)).toThrow();
    });

    it('rejects negative duration_ms', () => {
      const raw = JSON.stringify({
        id: uuidv4(),
        result: 'ok',
        duration_ms: -1,
      });
      expect(() => decodeResponse(raw)).toThrow();
    });
  });

  describe('round-trip', () => {
    it('encode -> decode preserves all fields for success response', () => {
      const msg: WSMessage = {
        id: uuidv4(),
        method: 'editor.ping',
        params: {},
        timestamp: Date.now(),
      };
      const encoded = encodeMessage(msg);
      const parsed = JSON.parse(encoded);

      // Simulate UE response
      const responseRaw = JSON.stringify({
        id: parsed.id,
        result: 'pong',
        duration_ms: 5.0,
      });
      const response = decodeResponse(responseRaw);
      expect(response.id).toBe(msg.id);
      expect(response.result).toBe('pong');
    });

    it('encode -> decode preserves all fields for error response', () => {
      const msg: WSMessage = {
        id: uuidv4(),
        method: 'blueprint.serialize',
        params: { assetPath: '/Game/Missing' },
        timestamp: Date.now(),
      };
      const encoded = encodeMessage(msg);
      const parsed = JSON.parse(encoded);

      const responseRaw = JSON.stringify({
        id: parsed.id,
        error: { code: 3001, message: 'Asset not found', data: { path: '/Game/Missing' } },
        duration_ms: 3.2,
      });
      const response = decodeResponse(responseRaw);
      expect(response.id).toBe(msg.id);
      expect(response.error!.code).toBe(3001);
    });
  });
});
