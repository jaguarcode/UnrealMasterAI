import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { projectGetStructure } from './get-structure.js';
import { projectGetSettings } from './get-settings.js';
import { projectGetPlugins } from './get-plugins.js';
import { projectGetDependencyGraph } from './get-dependency-graph.js';
import { projectGetClassHierarchy } from './get-class-hierarchy.js';
import { projectSnapshot } from './snapshot.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'project-getStructure',
      description: 'Get project directory tree with asset type counts.',
      schema: {
        path: z.string().optional().describe('Root path (default: /Game/)'),
      },
      handler: (ctx, params) =>
        projectGetStructure(ctx.bridge, params as { path?: string }),
    },
    {
      name: 'project-getSettings',
      description: 'Get project settings (engine config, maps, etc.).',
      schema: {},
      handler: (ctx) => projectGetSettings(ctx.bridge),
    },
    {
      name: 'project-getPlugins',
      description: 'List enabled/disabled plugins.',
      schema: {
        enabledOnly: z.boolean().optional().describe('Only show enabled plugins'),
      },
      handler: (ctx, params) =>
        projectGetPlugins(ctx.bridge, params as { enabledOnly?: boolean }),
    },
    {
      name: 'project-getDependencyGraph',
      description: 'Get asset reference/dependency graph.',
      schema: {
        assetPath: z.string().describe('Asset path to query dependencies for'),
      },
      handler: (ctx, params) =>
        projectGetDependencyGraph(ctx.bridge, params as { assetPath: string }),
    },
    {
      name: 'project-getClassHierarchy',
      description: 'Get Blueprint/C++ class inheritance tree.',
      schema: {
        rootClass: z.string().optional().describe('Root class to start from'),
      },
      handler: (ctx, params) =>
        projectGetClassHierarchy(ctx.bridge, params as { rootClass?: string }),
    },
    {
      name: 'project-snapshot',
      description: 'Get comprehensive project summary (cached 5 min).',
      schema: {
        forceRefresh: z.boolean().optional().describe('Force refresh cached snapshot'),
      },
      handler: (ctx, params) =>
        projectSnapshot(ctx.bridge, ctx.cache, params as { forceRefresh?: boolean }),
    },
  ];
}
