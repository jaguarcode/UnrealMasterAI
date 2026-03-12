import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { fileRead } from './read-file.js';
import { fileWrite } from './write-file.js';
import { fileSearch } from './search-files.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'file-read',
      description: 'Read a source file from the Unreal Engine project.',
      schema: {
        filePath: z.string().describe('File path to read'),
        offset: z.number().int().optional(),
        limit: z.number().int().optional(),
      },
      handler: (ctx, params) =>
        fileRead(ctx.bridge, params as { filePath: string; offset?: number; limit?: number }, ctx.allowedRoots),
    },
    {
      name: 'file-write',
      description: 'Write content to a source file in the Unreal Engine project.',
      schema: {
        filePath: z.string().describe('File path to write'),
        content: z.string().describe('File content'),
      },
      handler: (ctx, params) =>
        fileWrite(ctx.bridge, params as { filePath: string; content: string }, ctx.allowedRoots, ctx.approvalGate),
    },
    {
      name: 'file-search',
      description: 'Search for files or patterns in the Unreal Engine project.',
      schema: {
        pattern: z.string().describe('Search pattern'),
        directory: z.string().optional(),
        glob: z.string().optional(),
      },
      handler: (ctx, params) =>
        fileSearch(ctx.bridge, params as { pattern: string; directory?: string; glob?: string }),
    },
  ];
}
