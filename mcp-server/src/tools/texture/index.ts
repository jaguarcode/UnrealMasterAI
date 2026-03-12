import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { textureImport } from './import.js';
import { textureGetInfo } from './get-info.js';
import { textureSetCompression } from './set-compression.js';
import { textureCreateRenderTarget } from './create-render-target.js';
import { textureResize } from './resize.js';
import { textureListTextures } from './list-textures.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'texture-import',
      description: 'Import a texture file into the project.',
      schema: {
        filePath: z.string().describe('Source file path'),
        destinationPath: z.string().describe('Content path for imported texture'),
        assetName: z.string().optional().describe('Override asset name'),
      },
      handler: async (ctx, params) => textureImport(ctx.bridge, params as any),
    },
    {
      name: 'texture-getInfo',
      description: 'Get texture info: resolution, format, compression, LOD group.',
      schema: {
        texturePath: z.string().describe('Content path to texture asset'),
      },
      handler: async (ctx, params) => textureGetInfo(ctx.bridge, params as any),
    },
    {
      name: 'texture-setCompression',
      description: 'Set compression settings on a texture asset.',
      schema: {
        texturePath: z.string().describe('Content path to texture asset'),
        compressionType: z.string().describe('Compression type (e.g. Default, Normalmap, HDR, Alpha)'),
      },
      handler: async (ctx, params) => textureSetCompression(ctx.bridge, params as any),
    },
    {
      name: 'texture-createRenderTarget',
      description: 'Create a Render Target 2D asset.',
      schema: {
        assetName: z.string().describe('Asset name'),
        assetPath: z.string().describe('Content path'),
        width: z.number().int().describe('Width in pixels'),
        height: z.number().int().describe('Height in pixels'),
        format: z.string().optional().describe('Pixel format (default RTF_RGBA16f)'),
      },
      handler: async (ctx, params) => textureCreateRenderTarget(ctx.bridge, params as any),
    },
    {
      name: 'texture-resize',
      description: 'Set max texture size and LOD bias.',
      schema: {
        texturePath: z.string().describe('Content path to texture asset'),
        maxSize: z.number().int().describe('Max texture size (power of 2)'),
        lodBias: z.number().int().optional().describe('LOD bias value'),
      },
      handler: async (ctx, params) => textureResize(ctx.bridge, params as any),
    },
    {
      name: 'texture-listTextures',
      description: 'List and filter texture assets in the project.',
      schema: {
        directory: z.string().optional().describe('Content directory to search'),
        filter: z.string().optional().describe('Name filter pattern'),
      },
      handler: async (ctx, params) => textureListTextures(ctx.bridge, params as any),
    },
  ];
}
