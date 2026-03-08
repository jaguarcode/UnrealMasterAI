/**
 * Fuzz validation tests for tool handlers.
 * Verifies that handlers gracefully handle random/invalid inputs
 * by always returning an error result rather than throwing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import type { CacheStore } from '../../../src/state/cache-store.js';
import { actorSpawn } from '../../../src/tools/actor/spawn.js';
import { actorDelete } from '../../../src/tools/actor/delete.js';
import { actorSetTransform } from '../../../src/tools/actor/set-transform.js';
import { blueprintSerialize } from '../../../src/tools/blueprint/serialize.js';
import { materialCreate } from '../../../src/tools/material/create.js';
import { levelCreate } from '../../../src/tools/level/create.js';
import { levelOpen } from '../../../src/tools/level/open.js';
import { assetCreate } from '../../../src/tools/asset/create.js';
import { contentFindAssets } from '../../../src/tools/content/find-assets.js';
import { meshGetInfo } from '../../../src/tools/mesh/get-info.js';

// ---------------------------------------------------------------------------
// Fuzz input corpus
// ---------------------------------------------------------------------------
const FUZZ_INPUTS = [
  { label: 'empty string',         value: '' },
  { label: 'null',                 value: null },
  { label: 'undefined',            value: undefined },
  { label: 'very long string',     value: 'A'.repeat(10_000) },
  { label: 'XSS payload',          value: '<script>alert("xss")</script>' },
  { label: 'SQL injection',        value: "'; DROP TABLE actors; --" },
  { label: 'path traversal',       value: '../../../etc/passwd' },
  { label: 'number',               value: 12345 },
  { label: 'plain object',         value: {} },
  { label: 'array',                value: [] },
  { label: 'unicode / null bytes', value: '🎮🎯\u0000\uffff' },
] as const;

// ---------------------------------------------------------------------------
// Helper: assert a handler result is a parseable JSON error (never throws)
// ---------------------------------------------------------------------------
function assertGracefulError(result: { content: Array<{ type: string; text: string }> }, label: string): void {
  expect(result, `[${label}] handler returned undefined`).toBeDefined();
  expect(result.content, `[${label}] missing content array`).toBeDefined();
  expect(result.content.length, `[${label}] content array is empty`).toBeGreaterThan(0);

  const text = result.content[0].text;
  let parsed: { status: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`[${label}] content[0].text is not valid JSON: ${text}`);
  }
  expect(parsed.status, `[${label}] expected status === 'error'`).toBe('error');
}

// ---------------------------------------------------------------------------
// Tool definitions: { name, call } — each call accepts one fuzz value
// ---------------------------------------------------------------------------
describe('fuzz-validation: tool handlers never throw on invalid input', () => {
  let mockBridge: WebSocketBridge;
  let mockCache: CacheStore;

  beforeEach(() => {
    mockBridge = {
      sendRequest: vi.fn().mockRejectedValue(new Error('not connected')),
    } as unknown as WebSocketBridge;

    mockCache = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn().mockReturnValue(false),
    } as unknown as CacheStore;
  });

  // ---- actorSpawn ----------------------------------------------------------
  describe('actorSpawn', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input: ${label}`, async () => {
        const result = await actorSpawn(mockBridge, { className: value as string });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- actorDelete ---------------------------------------------------------
  describe('actorDelete', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input: ${label}`, async () => {
        const result = await actorDelete(mockBridge, { actorName: value as string });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- actorSetTransform ---------------------------------------------------
  describe('actorSetTransform', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input (actorName): ${label}`, async () => {
        const result = await actorSetTransform(mockBridge, { actorName: value as string });
        assertGracefulError(result, label);
      });
    }

    // Also fuzz the optional location field with the same corpus
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input (location): ${label}`, async () => {
        const result = await actorSetTransform(mockBridge, {
          actorName: 'SomeActor',
          location: value as { x: number; y: number; z: number },
        });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- blueprintSerialize --------------------------------------------------
  // NOTE: blueprintSerialize has signature (bridge, cache, params) — different
  // from other handlers. Real bug found: accessing params.assetPath before
  // null-check would throw if params itself were undefined.
  describe('blueprintSerialize', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input: ${label}`, async () => {
        const result = await blueprintSerialize(mockBridge, mockCache, { assetPath: value as string });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- materialCreate ------------------------------------------------------
  describe('materialCreate', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input (name): ${label}`, async () => {
        const result = await materialCreate(mockBridge, { name: value as string });
        assertGracefulError(result, label);
      });
    }

    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input (parentPath): ${label}`, async () => {
        const result = await materialCreate(mockBridge, {
          name: 'ValidName',
          parentPath: value as string,
        });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- levelCreate ---------------------------------------------------------
  describe('levelCreate', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input: ${label}`, async () => {
        const result = await levelCreate(mockBridge, { name: value as string });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- levelOpen -----------------------------------------------------------
  describe('levelOpen', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input: ${label}`, async () => {
        const result = await levelOpen(mockBridge, { mapPath: value as string });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- assetCreate ---------------------------------------------------------
  describe('assetCreate', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input (assetPath): ${label}`, async () => {
        const result = await assetCreate(mockBridge, {
          assetPath: value as string,
          assetType: 'StaticMesh',
        });
        assertGracefulError(result, label);
      });
    }

    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input (assetType): ${label}`, async () => {
        const result = await assetCreate(mockBridge, {
          assetPath: '/Game/ValidPath',
          assetType: value as string,
        });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- contentFindAssets ---------------------------------------------------
  describe('contentFindAssets', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input: ${label}`, async () => {
        const result = await contentFindAssets(mockBridge, { searchQuery: value as string });
        assertGracefulError(result, label);
      });
    }
  });

  // ---- meshGetInfo ---------------------------------------------------------
  describe('meshGetInfo', () => {
    for (const { label, value } of FUZZ_INPUTS) {
      it(`handles fuzz input: ${label}`, async () => {
        const result = await meshGetInfo(mockBridge, { assetPath: value as string });
        assertGracefulError(result, label);
      });
    }
  });
});
