import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { compilationTrigger } from './trigger-compile.js';
import { compilationGetStatus } from './get-status.js';
import { compilationGetErrors } from './get-errors.js';
import { compilationSelfHeal } from './self-heal.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'compilation-trigger',
      description: 'Trigger a Live Coding compilation in the Unreal Editor.',
      schema: {},
      handler: (ctx) => compilationTrigger(ctx.bridge),
    },
    {
      name: 'compilation-getStatus',
      description: 'Get the status of the current or last compilation.',
      schema: {
        compileId: z.string().optional().describe('Compile ID to check'),
      },
      handler: (ctx, params) =>
        compilationGetStatus(ctx.bridge, params as { compileId?: string }),
    },
    {
      name: 'compilation-getErrors',
      description: 'Get structured compile errors from the last compilation.',
      schema: {
        compileId: z.string().optional().describe('Compile ID to check'),
      },
      handler: (ctx, params) =>
        compilationGetErrors(ctx.bridge, params as { compileId?: string }),
    },
    {
      name: 'compilation-selfHeal',
      description: 'Get current compile errors and self-healing context. Returns errors, retry count, and suggestion for Claude to act on.',
      schema: {
        filePath: z.string().optional().describe('File path with errors (for retry tracking)'),
      },
      handler: (ctx, params) =>
        compilationSelfHeal(ctx.bridge, ctx.session, params as { filePath?: string }),
    },
  ];
}
