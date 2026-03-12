import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { geoscriptMeshBoolean } from './mesh-boolean.js';
import { geoscriptMeshTransform } from './mesh-transform.js';
import { geoscriptGetInfo } from './get-info.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'geoscript-meshBoolean',
      description: 'Perform mesh boolean operation (UE 5.1+).',
      schema: {
        targetMesh: z.string().describe('Target mesh path'),
        toolMesh: z.string().describe('Tool mesh path'),
        operation: z.enum(['union', 'subtract', 'intersect']).describe('Boolean operation'),
      },
      handler: async (ctx, params) => geoscriptMeshBoolean(ctx.bridge, params as unknown as Parameters<typeof geoscriptMeshBoolean>[1]),
    },
    {
      name: 'geoscript-meshTransform',
      description: 'Transform, simplify, or remesh a mesh (UE 5.1+).',
      schema: {
        meshPath: z.string().describe('Mesh asset path'),
        operation: z.enum(['simplify', 'remesh', 'transform']).describe('Operation type'),
        params: z.record(z.unknown()).optional().describe('Operation-specific parameters'),
      },
      handler: async (ctx, params) => geoscriptMeshTransform(ctx.bridge, params as unknown as Parameters<typeof geoscriptMeshTransform>[1]),
    },
    {
      name: 'geoscript-getInfo',
      description: 'Get mesh geometry info: vertex/tri count, bounds.',
      schema: {
        meshPath: z.string().describe('Mesh asset path'),
      },
      handler: async (ctx, params) => geoscriptGetInfo(ctx.bridge, params as unknown as Parameters<typeof geoscriptGetInfo>[1]),
    },
  ];
}
