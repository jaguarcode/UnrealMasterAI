import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { landscapeCreate } from './create.js';
import { landscapeImportHeightmap } from './import-heightmap.js';
import { landscapeExportHeightmap } from './export-heightmap.js';
import { landscapeGetInfo } from './get-info.js';
import { landscapeSetMaterial } from './set-material.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'landscape-create',
      description: 'Create a new landscape actor.',
      schema: {
        landscapeName: z.string().describe('Landscape name'),
        sectionSize: z.number().int().optional().describe('Section size (default 63)'),
        componentsX: z.number().int().optional().describe('Components in X'),
        componentsY: z.number().int().optional().describe('Components in Y'),
        heightmapPath: z.string().optional().describe('Optional heightmap file to import'),
      },
      handler: async (ctx, params) => landscapeCreate(ctx.bridge, params as unknown as Parameters<typeof landscapeCreate>[1]),
    },
    {
      name: 'landscape-importHeightmap',
      description: 'Import a heightmap to an existing landscape.',
      schema: {
        landscapeName: z.string().describe('Landscape actor name'),
        heightmapPath: z.string().describe('Heightmap file path'),
      },
      handler: async (ctx, params) => landscapeImportHeightmap(ctx.bridge, params as unknown as Parameters<typeof landscapeImportHeightmap>[1]),
    },
    {
      name: 'landscape-exportHeightmap',
      description: 'Export heightmap from a landscape.',
      schema: {
        landscapeName: z.string().describe('Landscape actor name'),
        exportPath: z.string().describe('Output file path'),
      },
      handler: async (ctx, params) => landscapeExportHeightmap(ctx.bridge, params as unknown as Parameters<typeof landscapeExportHeightmap>[1]),
    },
    {
      name: 'landscape-getInfo',
      description: 'Get landscape info: components, size, layers.',
      schema: {
        landscapeName: z.string().optional().describe('Landscape actor name (default: first found)'),
      },
      handler: async (ctx, params) => landscapeGetInfo(ctx.bridge, params as unknown as Parameters<typeof landscapeGetInfo>[1]),
    },
    {
      name: 'landscape-setMaterial',
      description: 'Assign a material to a landscape.',
      schema: {
        landscapeName: z.string().describe('Landscape actor name'),
        materialPath: z.string().describe('Content path to material'),
      },
      handler: async (ctx, params) => landscapeSetMaterial(ctx.bridge, params as unknown as Parameters<typeof landscapeSetMaterial>[1]),
    },
  ];
}
