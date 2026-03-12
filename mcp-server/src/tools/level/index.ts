import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { levelCreate } from './create.js';
import { levelOpen } from './open.js';
import { levelSave } from './save.js';
import { levelAddSublevel } from './add-sublevel.js';
import { levelGetWorldSettings } from './get-world-settings.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'level-create',
      description: 'Create a new level/map.',
      schema: {
        levelName: z.string().describe('Level name'),
        templatePath: z.string().optional(),
      },
      handler: async (ctx, params) => levelCreate(ctx.bridge, params as unknown as Parameters<typeof levelCreate>[1]),
    },
    {
      name: 'level-open',
      description: 'Open an existing level.',
      schema: {
        levelPath: z.string().describe('Level path'),
      },
      handler: async (ctx, params) => levelOpen(ctx.bridge, params as unknown as Parameters<typeof levelOpen>[1]),
    },
    {
      name: 'level-save',
      description: 'Save current level.',
      schema: {},
      handler: async (ctx, _params) => levelSave(ctx.bridge),
    },
    {
      name: 'level-addSublevel',
      description: 'Add streaming sublevel.',
      schema: {
        levelPath: z.string().describe('Sublevel path'),
        streamingMethod: z.string().optional(),
      },
      handler: async (ctx, params) => levelAddSublevel(ctx.bridge, params as unknown as Parameters<typeof levelAddSublevel>[1]),
    },
    {
      name: 'level-getWorldSettings',
      description: 'Get world settings for current level.',
      schema: {},
      handler: async (ctx, _params) => levelGetWorldSettings(ctx.bridge),
    },
  ];
}
