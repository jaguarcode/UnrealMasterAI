/**
 * Tokenize text for intent/error matching.
 * Preserves underscores (important for UE identifiers like BP_MyActor).
 * NOTE: mcp-server/src/rag/embedding-store.ts has a separate tokenize()
 * with a different regex for embedding purposes — intentionally not shared.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}
