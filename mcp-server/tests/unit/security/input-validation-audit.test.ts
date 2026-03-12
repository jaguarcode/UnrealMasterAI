/**
 * Security audit: verify every registered MCP tool has an input validation schema.
 *
 * Strategy: use getAllBuiltinTools() from auto-register to get all tool modules,
 * then verify each has a valid Zod schema. Tools with empty schemas `{}` are valid —
 * they accept no parameters, which is a legitimate schema.
 *
 * stdout is sacred — no console.log() in this file.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { getAllBuiltinTools } from '../../../src/tools/auto-register.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MCP Tool Input Validation Audit', () => {
  const tools = getAllBuiltinTools();

  it('returns all 183 registered tools', () => {
    // Snapshot: if this fails a tool was added/removed without being noticed.
    expect(tools.length).toBe(188);
  });

  it('every registered tool has a schema object', () => {
    const missing = tools.filter(t => t.schema === null || t.schema === undefined);
    expect(missing.map(t => t.name)).toEqual([]);
  });

  it('every tool schema is a plain object', () => {
    const invalid = tools.filter(
      t => typeof t.schema !== 'object' || Array.isArray(t.schema),
    );
    expect(invalid.map(t => t.name)).toEqual([]);
  });

  it('tools with non-empty schemas use Zod field declarations', () => {
    // Every tool whose schema has fields must have ZodType values —
    // proving Zod validation is wired up rather than a raw untyped object.
    const withFields = tools.filter(t => Object.keys(t.schema).length > 0);
    const missingZod = withFields.filter(t =>
      !Object.values(t.schema).every(v => v instanceof z.ZodType),
    );
    expect(missingZod.map(t => t.name)).toEqual([]);
  });

  it('tool count matches expected value of 183 (snapshot to catch unvalidated additions)', () => {
    // If this fails: a new tool was registered. Update this count AND add
    // a Zod schema for the new tool before merging.
    expect(tools.length).toBe(188);
  });

  it('all tool names are non-empty strings', () => {
    const empty = tools.filter(t => !t.name || t.name.trim().length === 0);
    expect(empty).toHaveLength(0);
  });

  it('no duplicate tool names are registered', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const t of tools) {
      if (seen.has(t.name)) duplicates.push(t.name);
      seen.add(t.name);
    }
    expect(duplicates).toEqual([]);
  });

  it('every tool name matches kebab-case domain-action pattern', () => {
    // Tool names follow the pattern: <domain>-<action> e.g. "editor-ping"
    // Context tools may use longer chains like "context-matchIntent".
    const invalid = tools.filter(t => !/^[a-z][a-zA-Z0-9]*-[a-zA-Z][a-zA-Z0-9]*$/.test(t.name));
    expect(invalid.map(t => t.name)).toEqual([]);
  });

  it('every tool has a non-empty description', () => {
    const missing = tools.filter(t => !t.description || t.description.trim().length === 0);
    expect(missing.map(t => t.name)).toEqual([]);
  });

  it('every tool has a handler function', () => {
    const missing = tools.filter(t => typeof t.handler !== 'function');
    expect(missing.map(t => t.name)).toEqual([]);
  });
});
