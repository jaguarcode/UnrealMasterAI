/**
 * Per-tool timeout configuration.
 * Long-running UE operations get extended timeouts.
 */

const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds
const LONG_TIMEOUT_MS = 300_000;   // 5 minutes

/** Tools that require extended timeout due to long UE processing times. */
const LONG_RUNNING_TOOLS = new Set([
  'build-cookContent',
  'build-lightmaps',
  'compilation-trigger',
  'compilation-selfHeal',
  'workflow-createCharacter',
  'workflow-createUIScreen',
  'workflow-setupLevel',
  'workflow-createInteractable',
  'workflow-createProjectile',
  'workflow-setupMultiplayer',
  'workflow-createInventorySystem',
  'workflow-createDialogueSystem',
  'asset-import',
  'landscape-create',
  'landscape-importHeightmap',
  'niagara-compile',
]);

/**
 * Get the appropriate timeout for a given tool.
 * @param toolName - The MCP tool name (e.g., 'build-cookContent')
 * @returns Timeout in milliseconds
 */
export function getToolTimeout(toolName: string): number {
  if (LONG_RUNNING_TOOLS.has(toolName)) {
    return LONG_TIMEOUT_MS;
  }
  return DEFAULT_TIMEOUT_MS;
}

export { DEFAULT_TIMEOUT_MS, LONG_TIMEOUT_MS };
