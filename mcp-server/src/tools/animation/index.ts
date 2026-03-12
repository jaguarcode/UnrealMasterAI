import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { animListMontages } from './list-montages.js';
import { animGetBlendSpace } from './get-blend-space.js';
import { animCreateMontage } from './create-montage.js';
import { animListSequences } from './list-sequences.js';
import { animGetSkeletonInfo } from './get-skeleton-info.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'anim-listMontages',
      description: 'List animation montages.',
      schema: {
        skeletonPath: z.string().optional(),
      },
      handler: async (ctx, params) => animListMontages(ctx.bridge, params as unknown as Parameters<typeof animListMontages>[1]),
    },
    {
      name: 'anim-getBlendSpace',
      description: 'Get blend space details.',
      schema: {
        blendSpacePath: z.string(),
      },
      handler: async (ctx, params) => animGetBlendSpace(ctx.bridge, params as unknown as Parameters<typeof animGetBlendSpace>[1]),
    },
    {
      name: 'anim-createMontage',
      description: 'Create animation montage.',
      schema: {
        montageName: z.string(),
        montagePath: z.string(),
        sequencePath: z.string(),
      },
      handler: async (ctx, params) => animCreateMontage(ctx.bridge, params as unknown as Parameters<typeof animCreateMontage>[1]),
    },
    {
      name: 'anim-listSequences',
      description: 'List animation sequences.',
      schema: {
        skeletonPath: z.string().optional(),
      },
      handler: async (ctx, params) => animListSequences(ctx.bridge, params as unknown as Parameters<typeof animListSequences>[1]),
    },
    {
      name: 'anim-getSkeletonInfo',
      description: 'Get skeleton bone hierarchy.',
      schema: {
        skeletonPath: z.string(),
      },
      handler: async (ctx, params) => animGetSkeletonInfo(ctx.bridge, params as unknown as Parameters<typeof animGetSkeletonInfo>[1]),
    },
  ];
}
