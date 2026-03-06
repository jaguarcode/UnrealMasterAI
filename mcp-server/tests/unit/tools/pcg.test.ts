import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { pcgCreateGraph } from '../../../src/tools/pcg/create-graph.js';
import { pcgGetInfo } from '../../../src/tools/pcg/get-info.js';
import { pcgAddNode } from '../../../src/tools/pcg/add-node.js';
import { pcgConnectNodes } from '../../../src/tools/pcg/connect-nodes.js';

describe('pcg tools', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = { sendRequest: vi.fn() } as unknown as WebSocketBridge;
  });

  // --- pcgCreateGraph ---
  describe('pcgCreateGraph', () => {
    it('returns success on valid response', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: { graphPath: '/Game/PCG/MyGraph', graphName: 'MyGraph', created: true },
        duration_ms: 10,
      });
      const result = await pcgCreateGraph(mockBridge, {
        graphName: 'MyGraph',
        graphPath: '/Game/PCG',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.created).toBe(true);
    });

    it('returns error on bridge error', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8800, message: 'PCGGraph already exists: /Game/PCG/MyGraph' },
        duration_ms: 5,
      });
      const result = await pcgCreateGraph(mockBridge, {
        graphName: 'MyGraph',
        graphPath: '/Game/PCG',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- pcgGetInfo ---
  describe('pcgGetInfo', () => {
    it('returns success with graph info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          graphPath: '/Game/PCG/MyGraph',
          nodeCount: 2,
          nodes: [
            { nodeId: 'Node_0', nodeType: 'PCGSurfaceSamplerSettings' },
            { nodeId: 'Node_1', nodeType: 'PCGStaticMeshSpawnerSettings' },
          ],
          connections: [],
        },
        duration_ms: 10,
      });
      const result = await pcgGetInfo(mockBridge, { graphPath: '/Game/PCG/MyGraph' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result).toHaveProperty('nodeCount');
      expect(parsed.result).toHaveProperty('nodes');
      expect(parsed.result).toHaveProperty('connections');
    });

    it('returns error when graph not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8810, message: 'PCGGraph not found: /Game/PCG/Missing' },
        duration_ms: 5,
      });
      const result = await pcgGetInfo(mockBridge, { graphPath: '/Game/PCG/Missing' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- pcgAddNode ---
  describe('pcgAddNode', () => {
    it('returns success with added node info', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          graphPath: '/Game/PCG/MyGraph',
          nodeType: '/Script/PCG.PCGSurfaceSamplerSettings',
          nodeLabel: 'Surface Sampler',
          nodeId: 'Node_2',
          added: true,
        },
        duration_ms: 10,
      });
      const result = await pcgAddNode(mockBridge, {
        graphPath: '/Game/PCG/MyGraph',
        nodeType: '/Script/PCG.PCGSurfaceSamplerSettings',
        nodeLabel: 'Surface Sampler',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.added).toBe(true);
      expect(parsed.result).toHaveProperty('nodeId');
    });

    it('returns error when node type not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8822, message: 'PCG node type not found: /Script/PCG.NonExistent' },
        duration_ms: 5,
      });
      const result = await pcgAddNode(mockBridge, {
        graphPath: '/Game/PCG/MyGraph',
        nodeType: '/Script/PCG.NonExistent',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });

  // --- pcgConnectNodes ---
  describe('pcgConnectNodes', () => {
    it('returns success when nodes connected', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        result: {
          graphPath: '/Game/PCG/MyGraph',
          sourceNode: 'Node_0',
          sourcePin: 'Out',
          targetNode: 'Node_1',
          targetPin: 'In',
          connected: true,
        },
        duration_ms: 10,
      });
      const result = await pcgConnectNodes(mockBridge, {
        graphPath: '/Game/PCG/MyGraph',
        sourceNode: 'Node_0',
        sourcePin: 'Out',
        targetNode: 'Node_1',
        targetPin: 'In',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('success');
      expect(parsed.result.connected).toBe(true);
    });

    it('returns error when source node not found', async () => {
      vi.mocked(mockBridge.sendRequest).mockResolvedValueOnce({
        id: 'test-id',
        error: { code: 8833, message: 'Source node not found: MissingNode' },
        duration_ms: 5,
      });
      const result = await pcgConnectNodes(mockBridge, {
        graphPath: '/Game/PCG/MyGraph',
        sourceNode: 'MissingNode',
        sourcePin: 'Out',
        targetNode: 'Node_1',
        targetPin: 'In',
      });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status).toBe('error');
    });
  });
});
