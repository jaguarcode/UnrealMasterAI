import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { meshGetInfo } from './get-info.js';
import { meshSetMaterial } from './set-material.js';
import { meshGenerateCollision } from './generate-collision.js';
import { meshSetLOD } from './set-lod.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'mesh-getInfo',
      description: 'Get mesh details (verts, tris, LODs, materials).',
      schema: {
        meshPath: z.string(),
      },
      handler: async (ctx, params) => meshGetInfo(ctx.bridge, params as unknown as Parameters<typeof meshGetInfo>[1]),
    },
    {
      name: 'mesh-setMaterial',
      description: 'Assign material to mesh slot.',
      schema: {
        meshPath: z.string(),
        materialPath: z.string(),
        slotIndex: z.number().int().optional(),
      },
      handler: async (ctx, params) => meshSetMaterial(ctx.bridge, params as unknown as Parameters<typeof meshSetMaterial>[1]),
    },
    {
      name: 'mesh-generateCollision',
      description: 'Generate collision for static mesh.',
      schema: {
        meshPath: z.string(),
        collisionType: z.string().optional(),
      },
      handler: async (ctx, params) => meshGenerateCollision(ctx.bridge, params as unknown as Parameters<typeof meshGenerateCollision>[1]),
    },
    {
      name: 'mesh-setLOD',
      description: 'Configure LOD settings.',
      schema: {
        meshPath: z.string(),
        lodIndex: z.number().int(),
        screenSize: z.number().optional(),
        reductionPercent: z.number().optional(),
      },
      handler: async (ctx, params) => meshSetLOD(ctx.bridge, params as unknown as Parameters<typeof meshSetLOD>[1]),
    },
  ];
}
