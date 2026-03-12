import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { gameplayGetGameMode } from './get-game-mode.js';
import { gameplaySetGameMode } from './set-game-mode.js';
import { gameplayListInputActions } from './list-input-actions.js';
import { gameplayAddInputAction } from './add-input-action.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'gameplay-getGameMode',
      description: 'Get current game mode.',
      schema: {},
      handler: async (ctx, _params) => gameplayGetGameMode(ctx.bridge),
    },
    {
      name: 'gameplay-setGameMode',
      description: 'Set game mode for current level.',
      schema: {
        gameModePath: z.string(),
      },
      handler: async (ctx, params) => gameplaySetGameMode(ctx.bridge, params as unknown as Parameters<typeof gameplaySetGameMode>[1]),
    },
    {
      name: 'gameplay-listInputActions',
      description: 'List all input action mappings.',
      schema: {},
      handler: async (ctx, _params) => gameplayListInputActions(ctx.bridge),
    },
    {
      name: 'gameplay-addInputAction',
      description: 'Add input action mapping.',
      schema: {
        actionName: z.string(),
        key: z.string(),
        shift: z.boolean().optional(),
        ctrl: z.boolean().optional(),
        alt: z.boolean().optional(),
      },
      handler: async (ctx, params) => gameplayAddInputAction(ctx.bridge, params as unknown as Parameters<typeof gameplayAddInputAction>[1]),
    },
  ];
}
