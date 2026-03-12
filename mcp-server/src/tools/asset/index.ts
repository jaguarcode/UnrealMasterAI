import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { assetCreate } from './create.js';
import { assetDuplicate } from './duplicate.js';
import { assetRename } from './rename.js';
import { assetDelete } from './delete.js';
import { assetImport } from './import.js';
import { assetExport } from './export.js';
import { assetGetReferences } from './get-references.js';
import { assetSetMetadata } from './set-metadata.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'asset-create',
      description: 'Create a new UE asset (Blueprint, Material, DataTable, etc.).',
      schema: {
        assetName: z.string().describe('Asset name'),
        assetPath: z.string().describe('Content path (e.g., /Game/Blueprints)'),
        assetType: z.string().describe('Asset type'),
        parentClass: z.string().optional().describe('Parent class for Blueprints'),
      },
      handler: async (ctx, params) => assetCreate(ctx.bridge, params as unknown as Parameters<typeof assetCreate>[1]),
    },
    {
      name: 'asset-duplicate',
      description: 'Duplicate an existing asset.',
      schema: {
        sourcePath: z.string().describe('Source asset path'),
        destinationPath: z.string().describe('Destination path'),
        newName: z.string().describe('New asset name'),
      },
      handler: async (ctx, params) => assetDuplicate(ctx.bridge, params as unknown as Parameters<typeof assetDuplicate>[1]),
    },
    {
      name: 'asset-rename',
      description: 'Rename/move an asset with reference fixing.',
      schema: {
        assetPath: z.string().describe('Current asset path'),
        newName: z.string().describe('New name'),
      },
      handler: async (ctx, params) => assetRename(ctx.bridge, params as unknown as Parameters<typeof assetRename>[1]),
    },
    {
      name: 'asset-delete',
      description: 'Delete an asset (with dependency check).',
      schema: {
        assetPath: z.string().describe('Asset path to delete'),
        forceDelete: z.boolean().optional().describe('Force delete without dependency check'),
      },
      handler: async (ctx, params) => assetDelete(ctx.bridge, params as unknown as Parameters<typeof assetDelete>[1]),
    },
    {
      name: 'asset-import',
      description: 'Import external file (FBX, PNG, WAV, etc.) as UE asset.',
      schema: {
        filePath: z.string().describe('External file path'),
        destinationPath: z.string().describe('Content path'),
        assetName: z.string().optional().describe('Asset name'),
      },
      handler: async (ctx, params) => assetImport(ctx.bridge, params as unknown as Parameters<typeof assetImport>[1]),
    },
    {
      name: 'asset-export',
      description: 'Export asset to external format.',
      schema: {
        assetPath: z.string().describe('Asset path'),
        outputPath: z.string().describe('Output file path'),
      },
      handler: async (ctx, params) => assetExport(ctx.bridge, params as unknown as Parameters<typeof assetExport>[1]),
    },
    {
      name: 'asset-getReferences',
      description: 'Get all assets referencing/referenced by target.',
      schema: {
        assetPath: z.string().describe('Asset path'),
      },
      handler: async (ctx, params) => assetGetReferences(ctx.bridge, params as unknown as Parameters<typeof assetGetReferences>[1]),
    },
    {
      name: 'asset-setMetadata',
      description: 'Set asset tags/metadata.',
      schema: {
        assetPath: z.string().describe('Asset path'),
        key: z.string().describe('Metadata key'),
        value: z.string().describe('Metadata value'),
      },
      handler: async (ctx, params) => assetSetMetadata(ctx.bridge, params as unknown as Parameters<typeof assetSetMetadata>[1]),
    },
  ];
}
