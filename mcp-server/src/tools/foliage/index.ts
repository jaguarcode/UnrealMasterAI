import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { foliageCreateType } from './create-type.js';
import { foliageGetInfo } from './get-info.js';
import { foliageSetProperties } from './set-properties.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'foliage-createType',
      description: 'Create a FoliageType asset.',
      schema: {
        typeName: z.string().describe('Foliage type name'),
        typePath: z.string().describe('Content path'),
        meshPath: z.string().describe('Static mesh path to use'),
      },
      handler: async (ctx, params) => foliageCreateType(ctx.bridge, params as unknown as Parameters<typeof foliageCreateType>[1]),
    },
    {
      name: 'foliage-getInfo',
      description: 'Get foliage type settings and density info.',
      schema: {
        foliageTypePath: z.string().describe('Content path to FoliageType'),
      },
      handler: async (ctx, params) => foliageGetInfo(ctx.bridge, params as unknown as Parameters<typeof foliageGetInfo>[1]),
    },
    {
      name: 'foliage-setProperties',
      description: 'Set foliage density, scale, and culling properties.',
      schema: {
        foliageTypePath: z.string().describe('Content path to FoliageType'),
        density: z.number().optional().describe('Foliage density'),
        scale: z.number().optional().describe('Scale multiplier'),
        cullDistance: z.number().optional().describe('Cull distance'),
      },
      handler: async (ctx, params) => foliageSetProperties(ctx.bridge, params as unknown as Parameters<typeof foliageSetProperties>[1]),
    },
  ];
}
