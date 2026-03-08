import { describe, it, expect } from 'vitest';
import { getToolTimeout, DEFAULT_TIMEOUT_MS, LONG_TIMEOUT_MS } from '../../../src/transport/tool-timeouts.js';

describe('getToolTimeout', () => {
  it('returns default timeout for standard tools', () => {
    expect(getToolTimeout('actor-spawn')).toBe(DEFAULT_TIMEOUT_MS);
    expect(getToolTimeout('editor-ping')).toBe(DEFAULT_TIMEOUT_MS);
    expect(getToolTimeout('blueprint-serialize')).toBe(DEFAULT_TIMEOUT_MS);
  });

  it('returns long timeout for build tools', () => {
    expect(getToolTimeout('build-cookContent')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('build-lightmaps')).toBe(LONG_TIMEOUT_MS);
  });

  it('returns long timeout for compilation tools', () => {
    expect(getToolTimeout('compilation-trigger')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('compilation-selfHeal')).toBe(LONG_TIMEOUT_MS);
  });

  it('returns long timeout for workflow tools', () => {
    expect(getToolTimeout('workflow-createCharacter')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('workflow-createUIScreen')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('workflow-setupLevel')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('workflow-createInteractable')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('workflow-createProjectile')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('workflow-setupMultiplayer')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('workflow-createInventorySystem')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('workflow-createDialogueSystem')).toBe(LONG_TIMEOUT_MS);
  });

  it('returns long timeout for import/landscape tools', () => {
    expect(getToolTimeout('asset-import')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('landscape-create')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('landscape-importHeightmap')).toBe(LONG_TIMEOUT_MS);
    expect(getToolTimeout('niagara-compile')).toBe(LONG_TIMEOUT_MS);
  });

  it('returns default timeout for unknown tools', () => {
    expect(getToolTimeout('nonexistent-tool')).toBe(DEFAULT_TIMEOUT_MS);
  });

  it('exports DEFAULT_TIMEOUT_MS and LONG_TIMEOUT_MS constants', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000);
    expect(LONG_TIMEOUT_MS).toBe(300_000);
  });
});
