import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { contentListAssets } from './list-assets.js';
import { contentFindAssets } from './find-assets.js';
import { contentGetAssetDetails } from './get-asset-details.js';
import { contentValidateAssets } from './validate-assets.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'content-listAssets',
      description: 'List assets with filtering.',
      schema: {
        path: z.string().optional().describe('Content path'),
        assetType: z.string().optional().describe('Filter by type'),
        recursive: z.boolean().optional(),
      },
      handler: async (ctx, params) => contentListAssets(ctx.bridge, params as unknown as Parameters<typeof contentListAssets>[1]),
    },
    {
      name: 'content-findAssets',
      description: 'Search assets by name, type, or metadata.',
      schema: {
        query: z.string().describe('Search query'),
        assetType: z.string().optional(),
        path: z.string().optional(),
      },
      handler: async (ctx, params) => contentFindAssets(ctx.bridge, params as unknown as Parameters<typeof contentFindAssets>[1]),
    },
    {
      name: 'content-getAssetDetails',
      description: 'Deep inspection of any asset.',
      schema: {
        assetPath: z.string().describe('Asset path'),
      },
      handler: async (ctx, params) => contentGetAssetDetails(ctx.bridge, params as unknown as Parameters<typeof contentGetAssetDetails>[1]),
    },
    {
      name: 'content-validateAssets',
      description: 'Run asset validation checks.',
      schema: {
        paths: z.array(z.string()).optional().describe('Asset paths to validate'),
      },
      handler: async (ctx, params) => contentValidateAssets(ctx.bridge, params as unknown as Parameters<typeof contentValidateAssets>[1]),
    },
  ];
}
