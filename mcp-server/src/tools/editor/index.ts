import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { editorPing } from './ping.js';
import { editorGetLevelInfo } from './get-level-info.js';
import { editorListActors } from './list-actors.js';
import { editorGetAssetInfo } from './get-asset-info.js';
import { editorGetSelection } from './get-selection.js';
import { editorGetViewport } from './get-viewport.js';
import { editorSetSelection } from './set-selection.js';
import { editorGetRecentActivity } from './get-recent-activity.js';
import { editorBatchOperation } from './batch-operation.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'editor-ping',
      description: 'Ping the Unreal Engine editor to verify connectivity. Returns "pong" if the UE plugin is connected.',
      schema: {},
      handler: (ctx) => editorPing(ctx.bridge, ctx.circuitBreaker),
    },
    {
      name: 'editor-getLevelInfo',
      description: 'Get information about the currently loaded level in the Unreal Editor.',
      schema: {},
      handler: (ctx) => editorGetLevelInfo(ctx.bridge),
    },
    {
      name: 'editor-listActors',
      description: 'List actors in the current Unreal Editor level with optional class name and tag filters.',
      schema: {
        className: z.string().optional().describe('Filter actors by class name'),
        tag: z.string().optional().describe('Filter actors by tag'),
      },
      handler: (ctx, params) => editorListActors(ctx.bridge, params as { className?: string; tag?: string }),
    },
    {
      name: 'editor-getAssetInfo',
      description: 'Get metadata for a specific asset in the Unreal Editor project.',
      schema: {
        assetPath: z.string().describe('Asset path (e.g., /Game/BP_TestActor)'),
      },
      handler: (ctx, params) => editorGetAssetInfo(ctx.bridge, params as { assetPath: string }),
    },
    {
      name: 'editor-getSelection',
      description: 'Get currently selected actors and optionally content browser assets.',
      schema: {
        assetSelection: z.boolean().optional().describe('Also return selected content browser assets'),
      },
      handler: (ctx, params) => editorGetSelection(ctx.bridge, params as { assetSelection?: boolean }),
    },
    {
      name: 'editor-getViewport',
      description: 'Get viewport camera location, rotation, and FOV.',
      schema: {},
      handler: (ctx) => editorGetViewport(ctx.bridge),
    },
    {
      name: 'editor-setSelection',
      description: 'Set actor selection in the viewport.',
      schema: {
        actorNames: z.array(z.string()).describe('Actor names to select'),
        deselectOthers: z.boolean().optional(),
      },
      handler: (ctx, params) => editorSetSelection(ctx.bridge, params as { actorNames: string[]; deselectOthers?: boolean }),
    },
    {
      name: 'editor-getRecentActivity',
      description: 'Get recently modified assets and opened levels.',
      schema: {
        count: z.number().int().optional().describe('Number of recent items (default 10)'),
      },
      handler: (ctx, params) => editorGetRecentActivity(ctx.bridge, params as { count?: number }),
    },
    {
      name: 'editor-batchOperation',
      description: 'Apply batch operation to multiple assets/actors.',
      schema: {
        operation: z.enum(['rename', 'move', 'setProperty', 'tag']).describe('Operation type'),
        targets: z.array(z.string()).describe('Asset/actor names to operate on'),
        args: z.record(z.unknown()).optional().describe('Operation-specific arguments'),
      },
      handler: (ctx, params) => editorBatchOperation(ctx.bridge, params as { operation: 'rename' | 'move' | 'setProperty' | 'tag'; targets: string[]; args?: Record<string, unknown> }),
    },
  ];
}
