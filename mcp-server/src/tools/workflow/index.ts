import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { workflowCreateCharacter } from './create-character.js';
import { workflowCreateUIScreen } from './create-ui-screen.js';
import { workflowSetupLevel } from './setup-level.js';
import { workflowCreateInteractable } from './create-interactable.js';
import { workflowCreateProjectile } from './create-projectile.js';
import { workflowSetupMultiplayer } from './setup-multiplayer.js';
import { workflowCreateInventorySystem } from './create-inventory-system.js';
import { workflowCreateDialogueSystem } from './create-dialogue-system.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'workflow-createCharacter',
      description: 'Scaffold a playable character: Blueprint, mesh, anim BP, inputs.',
      schema: {
        characterName: z.string().describe('Character name'),
        basePath: z.string().describe('Content path for generated assets'),
        meshPath: z.string().optional().describe('Skeletal mesh to assign'),
      },
      handler: async (ctx, params) => workflowCreateCharacter(ctx.bridge, params as unknown as Parameters<typeof workflowCreateCharacter>[1]),
    },
    {
      name: 'workflow-createUIScreen',
      description: 'Create a UI screen Widget Blueprint with layout template.',
      schema: {
        screenName: z.string().describe('Screen name'),
        screenPath: z.string().describe('Content path'),
        screenType: z.enum(['hud', 'menu', 'inventory']).optional().describe('Type: hud, menu, inventory'),
      },
      handler: async (ctx, params) => workflowCreateUIScreen(ctx.bridge, params as unknown as Parameters<typeof workflowCreateUIScreen>[1]),
    },
    {
      name: 'workflow-setupLevel',
      description: 'Create a level with core actors (player start, lights, sky).',
      schema: {
        levelName: z.string().describe('Level name'),
        levelPath: z.string().describe('Content path'),
        includePlayerStart: z.boolean().optional().describe('Include PlayerStart (default true)'),
        includeLighting: z.boolean().optional().describe('Include default lighting (default true)'),
      },
      handler: async (ctx, params) => workflowSetupLevel(ctx.bridge, params as unknown as Parameters<typeof workflowSetupLevel>[1]),
    },
    {
      name: 'workflow-createInteractable',
      description: 'Create an interactable actor with overlap/interaction component.',
      schema: {
        interactableName: z.string().describe('Actor name'),
        basePath: z.string().describe('Content path'),
        interactionType: z.string().optional().describe('Interaction type'),
      },
      handler: async (ctx, params) => workflowCreateInteractable(ctx.bridge, params as unknown as Parameters<typeof workflowCreateInteractable>[1]),
    },
    {
      name: 'workflow-createProjectile',
      description: 'Create a projectile actor with movement, collision, damage.',
      schema: {
        projectileName: z.string().describe('Projectile name'),
        basePath: z.string().describe('Content path'),
        speed: z.number().optional().describe('Projectile speed'),
        damage: z.number().optional().describe('Damage amount'),
      },
      handler: async (ctx, params) => workflowCreateProjectile(ctx.bridge, params as unknown as Parameters<typeof workflowCreateProjectile>[1]),
    },
    {
      name: 'workflow-setupMultiplayer',
      description: 'Scaffold multiplayer: GameMode, PlayerState, GameState.',
      schema: {
        gameName: z.string().describe('Game name prefix'),
        basePath: z.string().describe('Content path'),
        maxPlayers: z.number().int().optional().describe('Max player count'),
      },
      handler: async (ctx, params) => workflowSetupMultiplayer(ctx.bridge, params as unknown as Parameters<typeof workflowSetupMultiplayer>[1]),
    },
    {
      name: 'workflow-createInventorySystem',
      description: 'Create inventory system: DataTable, struct, component BP.',
      schema: {
        systemName: z.string().describe('System name'),
        basePath: z.string().describe('Content path'),
        maxSlots: z.number().int().optional().describe('Max inventory slots'),
      },
      handler: async (ctx, params) => workflowCreateInventorySystem(ctx.bridge, params as unknown as Parameters<typeof workflowCreateInventorySystem>[1]),
    },
    {
      name: 'workflow-createDialogueSystem',
      description: 'Create dialogue system: DataTable, widget BP, manager BP.',
      schema: {
        systemName: z.string().describe('System name'),
        basePath: z.string().describe('Content path'),
      },
      handler: async (ctx, params) => workflowCreateDialogueSystem(ctx.bridge, params as unknown as Parameters<typeof workflowCreateDialogueSystem>[1]),
    },
  ];
}
