/**
 * Unit tests for enhanced path traversal prevention in isPathSafe and isAssetPathSafe.
 */
import { describe, it, expect } from 'vitest';
import { isPathSafe, isAssetPathSafe } from '../../../src/state/safety.js';

describe('isPathSafe — enhanced traversal prevention', () => {
  const allowedRoots = ['/Project/Source', '/Project/Content'];

  // --- Null byte injection ---
  it('blocks null byte in path', () => {
    expect(isPathSafe('/Project/Source/file\0.cpp', allowedRoots)).toBe(false);
  });

  it('blocks \\x00 null byte in path', () => {
    expect(isPathSafe('/Project/Source/file\x00evil', allowedRoots)).toBe(false);
  });

  // --- URL-encoded traversal ---
  it('blocks URL-encoded traversal %2e%2e', () => {
    expect(isPathSafe('/Project/Source/%2e%2e/etc/passwd', allowedRoots)).toBe(false);
  });

  it('blocks URL-encoded traversal uppercase %2E%2E', () => {
    expect(isPathSafe('/Project/Source/%2E%2E/etc/passwd', allowedRoots)).toBe(false);
  });

  it('blocks URL-encoded forward slash %2f', () => {
    expect(isPathSafe('/Project/Source%2fetc%2fpasswd', allowedRoots)).toBe(false);
  });

  it('blocks URL-encoded backslash %5c', () => {
    expect(isPathSafe('/Project/Source%5cetc', allowedRoots)).toBe(false);
  });

  // --- Double-encoded traversal ---
  it('blocks double-encoded traversal %252e', () => {
    expect(isPathSafe('/Project/Source/%252e%252e/etc/passwd', allowedRoots)).toBe(false);
  });

  it('blocks double-encoded backslash %255c', () => {
    expect(isPathSafe('/Project/Source/%255cetc', allowedRoots)).toBe(false);
  });

  // --- UNC paths ---
  it('blocks UNC path //server/share', () => {
    expect(isPathSafe('//server/share/file.txt', allowedRoots)).toBe(false);
  });

  it('blocks UNC path with backslashes normalized (\\\\server\\share)', () => {
    expect(isPathSafe('\\\\server\\share\\file.txt', allowedRoots)).toBe(false);
  });

  // --- Backward compatibility: still allows valid paths ---
  it('allows valid path within first allowed root', () => {
    expect(isPathSafe('/Project/Source/MyClass.cpp', allowedRoots)).toBe(true);
  });

  it('allows valid path within second allowed root', () => {
    expect(isPathSafe('/Project/Content/Maps/Level.umap', allowedRoots)).toBe(true);
  });

  it('allows Windows-style path with backslashes within allowed root', () => {
    expect(isPathSafe('\\Project\\Source\\File.cpp', ['\\Project\\Source'])).toBe(true);
  });

  // --- Backward compatibility: still blocks basic .. traversal ---
  it('blocks basic .. traversal', () => {
    expect(isPathSafe('/Project/Source/../../../etc/passwd', allowedRoots)).toBe(false);
  });

  it('blocks ~ home directory reference', () => {
    expect(isPathSafe('~/secret/file.txt', allowedRoots)).toBe(false);
  });

  it('rejects path outside allowed roots', () => {
    expect(isPathSafe('/Other/Path/file.txt', allowedRoots)).toBe(false);
  });
});

describe('isAssetPathSafe', () => {
  // --- Valid paths ---
  it('accepts /Game/Content/BP_Actor', () => {
    expect(isAssetPathSafe('/Game/Content/BP_Actor')).toBe(true);
  });

  it('accepts /Game/Content/Tests/Test_BP', () => {
    expect(isAssetPathSafe('/Game/Content/Tests/Test_BP')).toBe(true);
  });

  it('accepts /Engine/BasicShapes/Cube', () => {
    expect(isAssetPathSafe('/Engine/BasicShapes/Cube')).toBe(true);
  });

  it('accepts /Script/Engine.StaticMeshActor', () => {
    expect(isAssetPathSafe('/Script/Engine.StaticMeshActor')).toBe(true);
  });

  it('accepts /Script/UMATestProject.PatrollingActor', () => {
    expect(isAssetPathSafe('/Script/UMATestProject.PatrollingActor')).toBe(true);
  });

  // --- Traversal attacks ---
  it('rejects /Game/../../../etc/passwd', () => {
    expect(isAssetPathSafe('/Game/../../../etc/passwd')).toBe(false);
  });

  it('rejects /Game/Content/../../System32', () => {
    expect(isAssetPathSafe('/Game/Content/../../System32')).toBe(false);
  });

  it('rejects encoded traversal %2e%2e in asset path', () => {
    expect(isAssetPathSafe('/Game/Content/%2e%2e/etc/passwd')).toBe(false);
  });

  it('rejects double-encoded traversal %252e in asset path', () => {
    expect(isAssetPathSafe('/Game/Content/%252e%252e/etc')).toBe(false);
  });

  // --- Invalid roots ---
  it('rejects /Temp/malicious (not a valid root)', () => {
    expect(isAssetPathSafe('/Temp/malicious')).toBe(false);
  });

  it('rejects /Users/attacker/payload', () => {
    expect(isAssetPathSafe('/Users/attacker/payload')).toBe(false);
  });

  it('rejects path starting with Game/ (missing leading slash)', () => {
    expect(isAssetPathSafe('Game/Content/BP_Actor')).toBe(false);
  });

  // --- Null bytes ---
  it('rejects path with null byte', () => {
    expect(isAssetPathSafe('/Game/Content/BP_Actor\0')).toBe(false);
  });

  it('rejects path with \\x00 null byte', () => {
    expect(isAssetPathSafe('/Game/Content/BP_Actor\x00evil')).toBe(false);
  });

  // --- Empty / edge cases ---
  it('rejects empty string', () => {
    expect(isAssetPathSafe('')).toBe(false);
  });

  it('rejects path that is only /Game (no trailing slash, no content)', () => {
    // '/Game' does not start with '/Game/' so it is rejected
    expect(isAssetPathSafe('/Game')).toBe(false);
  });
});
