import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { buildLightmaps } from './lightmaps.js';
import { buildGetMapCheck } from './get-map-check.js';
import { buildCookContent } from './cook-content.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'build-lightmaps',
      description: 'Trigger lightmap build.',
      schema: {
        quality: z.string().optional().describe('Preview/Medium/High/Production'),
      },
      handler: async (ctx, params) => buildLightmaps(ctx.bridge, params as any),
    },
    {
      name: 'build-getMapCheck',
      description: 'Run map check and return warnings/errors.',
      schema: {},
      handler: async (ctx, _params) => buildGetMapCheck(ctx.bridge, {}),
    },
    {
      name: 'build-cookContent',
      description: 'Trigger content cooking for target platform.',
      schema: {
        platform: z.string().optional().describe('Target platform'),
      },
      handler: async (ctx, params) => buildCookContent(ctx.bridge, params as any),
    },
  ];
}
