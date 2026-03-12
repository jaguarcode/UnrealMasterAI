import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { refactorRenameChain } from './rename-chain.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'refactor-renameChain',
      description: 'Rename asset and update all references + clean redirectors.',
      schema: {
        assetPath: z.string().describe('Content path to asset'),
        newName: z.string().describe('New asset name'),
        updateReferences: z.boolean().optional().describe('Update all references (default true)'),
      },
      handler: async (ctx, params) => refactorRenameChain(ctx.bridge, params as unknown as Parameters<typeof refactorRenameChain>[1]),
    },
  ];
}
