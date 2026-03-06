import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectGetStructure } from '../../../src/tools/project/get-structure.js';
import { projectGetSettings } from '../../../src/tools/project/get-settings.js';
import { projectGetPlugins } from '../../../src/tools/project/get-plugins.js';
import { projectGetDependencyGraph } from '../../../src/tools/project/get-dependency-graph.js';
import { projectGetClassHierarchy } from '../../../src/tools/project/get-class-hierarchy.js';
import { projectSnapshot } from '../../../src/tools/project/snapshot.js';
import { CacheStore } from '../../../src/state/cache-store.js';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';

describe('projectGetStructure', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  it('returns status success with directory tree on success', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: { root: '/Game/', total_assets: 10, tree: { '/Game/Blueprints': { Blueprint: 5 } } },
      duration_ms: 42,
    });

    const result = await projectGetStructure(mockBridge, { path: '/Game/' });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.result.total_assets).toBe(10);
  });

  it('returns status error when bridge returns an error', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      error: { code: 5101, message: 'Script failed' },
      duration_ms: 5,
    });

    const result = await projectGetStructure(mockBridge);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error.code).toBe(5101);
  });

  it('catches thrown errors and returns status error', async () => {
    vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Connection lost'));

    const result = await projectGetStructure(mockBridge);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toContain('Connection lost');
  });
});

describe('projectGetSettings', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  it('returns status success with settings on success', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: { settings: { project_name: 'MyGame', engine_version: '5.3.0' } },
      duration_ms: 20,
    });

    const result = await projectGetSettings(mockBridge);

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.result.settings.project_name).toBe('MyGame');
  });

  it('returns status error when bridge returns an error', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      error: { code: 5100, message: 'Python unavailable' },
      duration_ms: 5,
    });

    const result = await projectGetSettings(mockBridge);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error.code).toBe(5100);
  });

  it('catches thrown errors and returns status error', async () => {
    vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Timeout'));

    const result = await projectGetSettings(mockBridge);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toContain('Timeout');
  });
});

describe('projectGetPlugins', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  it('returns status success with plugins list on success', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: { plugins: [{ name: 'Paper2D', enabled: true }], total: 1 },
      duration_ms: 15,
    });

    const result = await projectGetPlugins(mockBridge, { enabledOnly: true });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.result.total).toBe(1);
  });

  it('returns status error when bridge returns an error', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      error: { code: 5101, message: 'uproject not found' },
      duration_ms: 5,
    });

    const result = await projectGetPlugins(mockBridge);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error.message).toContain('uproject not found');
  });
});

describe('projectGetDependencyGraph', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  it('returns status success with dependency graph on success', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: {
        asset_path: '/Game/Blueprints/BP_Player',
        referencers: ['/Game/Maps/Level1'],
        dependencies: ['/Game/Characters/Mesh'],
        referencer_count: 1,
        dependency_count: 1,
      },
      duration_ms: 30,
    });

    const result = await projectGetDependencyGraph(mockBridge, {
      assetPath: '/Game/Blueprints/BP_Player',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.result.referencer_count).toBe(1);
    expect(parsed.result.dependency_count).toBe(1);
  });

  it('returns status error when bridge returns an error', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      error: { code: 5102, message: 'Asset does not exist: /Game/Missing' },
      duration_ms: 5,
    });

    const result = await projectGetDependencyGraph(mockBridge, {
      assetPath: '/Game/Missing',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error.code).toBe(5102);
  });

  it('catches thrown errors and returns status error', async () => {
    vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(new Error('Bridge disconnected'));

    const result = await projectGetDependencyGraph(mockBridge, {
      assetPath: '/Game/Blueprints/BP_Test',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toContain('Bridge disconnected');
  });
});

describe('projectGetClassHierarchy', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  it('returns status success with class hierarchy on success', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: {
        root_class: 'Actor',
        hierarchy: { Actor: ['BP_Player', 'BP_Enemy'] },
        classes: { BP_Player: { name: 'BP_Player', type: 'Blueprint' } },
        total_classes: 1,
      },
      duration_ms: 25,
    });

    const result = await projectGetClassHierarchy(mockBridge, { rootClass: 'Actor' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.result.total_classes).toBe(1);
  });

  it('returns status error when bridge returns an error', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      error: { code: 5101, message: 'Asset registry unavailable' },
      duration_ms: 5,
    });

    const result = await projectGetClassHierarchy(mockBridge);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error.code).toBe(5101);
  });
});

describe('projectSnapshot', () => {
  let mockBridge: WebSocketBridge;
  let cache: CacheStore;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
    cache = new CacheStore();
  });

  it('returns status success with snapshot on success', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: { snapshot: { project_name: 'MyGame', total_assets: 42 } },
      duration_ms: 50,
    });

    const result = await projectSnapshot(mockBridge, cache);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.result.snapshot.project_name).toBe('MyGame');
    expect(parsed.cached).toBeUndefined();
  });

  it('returns cached result on second call without forceRefresh', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      result: { snapshot: { project_name: 'MyGame', total_assets: 42 } },
      duration_ms: 50,
    });

    // First call — fetches from bridge
    await projectSnapshot(mockBridge, cache);

    // Second call — should use cache
    const result = await projectSnapshot(mockBridge, cache);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.cached).toBe(true);
    // sendRequest should only have been called once
    expect(vi.mocked(mockBridge.sendRequest)).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when forceRefresh is true', async () => {
    vi.mocked(mockBridge.sendRequest)
      .mockResolvedValueOnce({
        id: 'test-id',
        result: { snapshot: { project_name: 'MyGame', total_assets: 42 } },
        duration_ms: 50,
      })
      .mockResolvedValueOnce({
        id: 'test-id-2',
        result: { snapshot: { project_name: 'MyGame', total_assets: 50 } },
        duration_ms: 50,
      });

    // First call — populates cache
    await projectSnapshot(mockBridge, cache);

    // Second call with forceRefresh — should bypass cache
    const result = await projectSnapshot(mockBridge, cache, { forceRefresh: true });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.cached).toBeUndefined();
    expect(parsed.result.snapshot.total_assets).toBe(50);
    expect(vi.mocked(mockBridge.sendRequest)).toHaveBeenCalledTimes(2);
  });

  it('returns status error when bridge returns an error', async () => {
    vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
      id: 'test-id',
      error: { code: 5101, message: 'Script failed during snapshot' },
      duration_ms: 5,
    });

    const result = await projectSnapshot(mockBridge, cache);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error.code).toBe(5101);
  });

  it('catches thrown errors and returns status error', async () => {
    vi.mocked(mockBridge.sendRequest).mockRejectedValueOnce(
      new Error('WebSocket connection timed out')
    );

    const result = await projectSnapshot(mockBridge, cache);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toContain('WebSocket connection timed out');
  });

  it('does not cache on error response', async () => {
    vi.mocked(mockBridge.sendRequest)
      .mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 5101, message: 'Script failed' },
        duration_ms: 5,
      })
      .mockResolvedValueOnce({
        id: 'test-id-2',
        result: { snapshot: { project_name: 'MyGame' } },
        duration_ms: 20,
      });

    // First call — error, should not cache
    await projectSnapshot(mockBridge, cache);

    // Second call — should fetch fresh, not return cached error
    const result = await projectSnapshot(mockBridge, cache);

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(vi.mocked(mockBridge.sendRequest)).toHaveBeenCalledTimes(2);
  });
});
