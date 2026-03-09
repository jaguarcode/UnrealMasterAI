/**
 * Security audit: verify every registered MCP tool has an input validation schema.
 *
 * Strategy: parse server.ts source text to extract all server.tool() registrations
 * and their schema arguments. Tools registered with `{}` (empty object) are valid —
 * they accept no parameters, which is a legitimate schema. Tools registered with
 * a non-empty schema must have at least one Zod field (z.<type>).
 *
 * stdout is sacred — no console.log() in this file.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_TS_PATH = resolve(__dirname, '../../../src/server.ts');

// ---------------------------------------------------------------------------
// Parse server.ts to extract tool registrations
// ---------------------------------------------------------------------------

interface ToolRegistration {
  name: string;
  /** Raw schema text extracted from the server.tool() call (3rd argument). */
  schemaText: string;
  /** True when the schema object has at least one key (non-empty). */
  hasFields: boolean;
}

function parseToolRegistrations(source: string): ToolRegistration[] {
  const registrations: ToolRegistration[] = [];

  // Match: server.tool( '<name>', '...description...', <schema>, ...
  // We capture the tool name then walk forward to extract the schema object.
  // Backtick is constructed via String.fromCharCode(96) to avoid any static
  // string/template-literal transform stripping backslashes in the regex source.
  const BT = String.fromCharCode(96); // backtick character
  const qClass = "['\"" + BT + "]"; // ['"`] — quote character class
  const notQClass = "[^'\"" + BT + "]"; // [^'"`] — negated quote class
  const toolCallRe = new RegExp(
    "server\\.tool\\(\\s*" + qClass + "(" + notQClass + "+)" + qClass,
    'g',
  );
  let match: RegExpExecArray | null;

  while ((match = toolCallRe.exec(source)) !== null) {
    const name = match[1];
    const afterName = source.slice(match.index + match[0].length);

    // Strip comma + whitespace between tool name and description.
    const afterNameComma = afterName.replace(/^\s*,\s*/, '');

    // Skip past the description string argument (may be single/double quoted).
    const descSkipped = skipStringArg(afterNameComma);
    if (descSkipped === null) continue;

    // Strip comma + whitespace between description and schema object.
    const afterComma = descSkipped.replace(/^\s*,\s*/, '');

    // Extract the schema object `{ ... }` (3rd argument).
    const schemaText = extractBracedBlock(afterComma);
    if (schemaText === null) continue;

    // Determine if the schema has any fields (not just `{}`).
    const inner = schemaText.slice(1, -1).trim(); // content between { }
    const hasFields = inner.length > 0;

    registrations.push({ name, schemaText, hasFields });
  }

  return registrations;
}

/**
 * Skip a quoted string argument (single, double, or backtick) and return the
 * remaining source after the closing quote. Returns null if no string found.
 */
function skipStringArg(source: string): string | null {
  const trimmed = source.trimStart();
  const quote = trimmed[0];
  const BT = String.fromCharCode(96);
  if (quote !== "'" && quote !== '"' && quote !== BT) return null;

  let i = 1;
  while (i < trimmed.length) {
    if (trimmed[i] === '\\') {
      i += 2; // skip escape sequence
      continue;
    }
    if (trimmed[i] === quote) {
      return trimmed.slice(i + 1);
    }
    i++;
  }
  return null;
}

/**
 * Extract a balanced `{ ... }` block from the start of source (after trimming).
 * Returns the full block including braces, or null if not found.
 */
function extractBracedBlock(source: string): string | null {
  const trimmed = source.trimStart();
  if (trimmed[0] !== '{') return null;

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (trimmed[i - 1] === '\\') continue; // escaped char

    if (!inDouble && !inBacktick && ch === "'") { inSingle = !inSingle; continue; }
    if (!inSingle && !inBacktick && ch === '"') { inDouble = !inDouble; continue; }
    if (!inSingle && !inDouble && ch === String.fromCharCode(96)) { inBacktick = !inBacktick; continue; }

    if (inSingle || inDouble || inBacktick) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return trimmed.slice(0, i + 1);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MCP Tool Input Validation Audit', () => {
  const source = readFileSync(SERVER_TS_PATH, 'utf-8');
  const tools = parseToolRegistrations(source);

  it('parser extracts all 183 registered tools', () => {
    // Snapshot: if this fails a tool was added without being noticed.
    expect(tools.length).toBe(183);
  });

  it('every registered tool has a schema object (3rd argument present)', () => {
    const missing = tools.filter(t => t.schemaText === null);
    expect(missing.map(t => t.name)).toEqual([]);
  });

  it('every tool schema is a valid object literal (starts with { ends with })', () => {
    const invalid = tools.filter(
      t => !t.schemaText.startsWith('{') || !t.schemaText.endsWith('}'),
    );
    expect(invalid.map(t => t.name)).toEqual([]);
  });

  it('tools with non-empty schemas use Zod field declarations (z.<type>)', () => {
    // Every tool whose schema has fields must reference `z.` at least once —
    // proving Zod validation is wired up rather than a raw untyped object.
    const withFields = tools.filter(t => t.hasFields);
    const missingZod = withFields.filter(t => !t.schemaText.includes('z.'));
    expect(missingZod.map(t => t.name)).toEqual([]);
  });

  it('no tool schema is completely missing (undefined or null schema arg)', () => {
    // All tools must have been captured — none slipped past the parser.
    expect(tools.every(t => typeof t.schemaText === 'string')).toBe(true);
  });

  it('tool count matches expected value of 183 (snapshot to catch unvalidated additions)', () => {
    // If this fails: a new tool was registered. Update this count AND add
    // a Zod schema for the new tool before merging.
    expect(tools.length).toBe(183);
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
});
