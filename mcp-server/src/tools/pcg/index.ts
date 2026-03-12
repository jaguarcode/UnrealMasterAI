import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { pcgCreateGraph } from './create-graph.js';
import { pcgGetInfo } from './get-info.js';
import { pcgAddNode } from './add-node.js';
import { pcgConnectNodes } from './connect-nodes.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'pcg-createGraph',
      description: 'Create a PCG graph asset (UE 5.2+).',
      schema: {
        graphName: z.string().describe('Graph name'),
        graphPath: z.string().describe('Content path'),
      },
      handler: async (ctx, params) => pcgCreateGraph(ctx.bridge, params as unknown as Parameters<typeof pcgCreateGraph>[1]),
    },
    {
      name: 'pcg-getInfo',
      description: 'Get PCG graph info: nodes, connections, settings.',
      schema: {
        graphPath: z.string().describe('Content path to PCG graph'),
      },
      handler: async (ctx, params) => pcgGetInfo(ctx.bridge, params as unknown as Parameters<typeof pcgGetInfo>[1]),
    },
    {
      name: 'pcg-addNode',
      description: 'Add a node to a PCG graph.',
      schema: {
        graphPath: z.string().describe('Content path to PCG graph'),
        nodeType: z.string().describe('Node type to add'),
        nodeLabel: z.string().optional().describe('Node label'),
      },
      handler: async (ctx, params) => pcgAddNode(ctx.bridge, params as unknown as Parameters<typeof pcgAddNode>[1]),
    },
    {
      name: 'pcg-connectNodes',
      description: 'Connect two nodes in a PCG graph.',
      schema: {
        graphPath: z.string().describe('Content path to PCG graph'),
        sourceNode: z.string().describe('Source node name'),
        sourcePin: z.string().describe('Source pin name'),
        targetNode: z.string().describe('Target node name'),
        targetPin: z.string().describe('Target pin name'),
      },
      handler: async (ctx, params) => pcgConnectNodes(ctx.bridge, params as unknown as Parameters<typeof pcgConnectNodes>[1]),
    },
  ];
}
