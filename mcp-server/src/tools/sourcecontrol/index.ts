import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { sourcecontrolGetStatus } from './get-status.js';
import { sourcecontrolCheckout } from './checkout.js';
import { sourcecontrolDiff } from './diff.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'sourcecontrol-getStatus',
      description: 'Get source control status of assets.',
      schema: {
        assetPaths: z.array(z.string()).optional(),
      },
      handler: async (ctx, params) => sourcecontrolGetStatus(ctx.bridge, params as any),
    },
    {
      name: 'sourcecontrol-checkout',
      description: 'Check out assets for editing.',
      schema: {
        assetPaths: z.array(z.string()),
      },
      handler: async (ctx, params) => sourcecontrolCheckout(ctx.bridge, params as any),
    },
    {
      name: 'sourcecontrol-diff',
      description: 'Get diff summary for modified asset.',
      schema: {
        assetPath: z.string(),
      },
      handler: async (ctx, params) => sourcecontrolDiff(ctx.bridge, params as any),
    },
  ];
}
