import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { worldpartitionGetInfo } from './get-info.js';
import { worldpartitionSetConfig } from './set-config.js';
import { worldpartitionCreateDataLayer } from './create-data-layer.js';
import { worldpartitionCreateHLOD } from './create-hlod.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'worldpartition-getInfo',
      description: 'Get World Partition configuration and data layers.',
      schema: {
        levelPath: z.string().optional().describe('Level path (default: current)'),
      },
      handler: async (ctx, params) => worldpartitionGetInfo(ctx.bridge, params as unknown as Parameters<typeof worldpartitionGetInfo>[1]),
    },
    {
      name: 'worldpartition-setConfig',
      description: 'Set World Partition grid and loading settings.',
      schema: {
        gridSize: z.number().optional().describe('Grid cell size'),
        loadingRange: z.number().optional().describe('Loading range'),
        cellSize: z.number().optional().describe('Cell size'),
      },
      handler: async (ctx, params) => worldpartitionSetConfig(ctx.bridge, params as unknown as Parameters<typeof worldpartitionSetConfig>[1]),
    },
    {
      name: 'worldpartition-createDataLayer',
      description: 'Create a new World Partition data layer.',
      schema: {
        layerName: z.string().describe('Data layer name'),
        layerType: z.string().optional().describe('Layer type'),
      },
      handler: async (ctx, params) => worldpartitionCreateDataLayer(ctx.bridge, params as unknown as Parameters<typeof worldpartitionCreateDataLayer>[1]),
    },
    {
      name: 'worldpartition-createHLOD',
      description: 'Create an HLOD layer configuration.',
      schema: {
        layerName: z.string().describe('HLOD layer name'),
        hlodSetupAsset: z.string().optional().describe('HLOD setup asset path'),
      },
      handler: async (ctx, params) => worldpartitionCreateHLOD(ctx.bridge, params as unknown as Parameters<typeof worldpartitionCreateHLOD>[1]),
    },
  ];
}
