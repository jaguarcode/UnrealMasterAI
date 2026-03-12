import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { debugExecConsole } from './exec-console.js';
import { debugGetLog } from './get-log.js';
import { debugGetPerformance } from './get-performance.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'debug-execConsole',
      description: 'Execute UE console command (dangerous).',
      schema: {
        command: z.string().describe('Console command'),
      },
      handler: async (ctx, params) => debugExecConsole(ctx.bridge, params as any),
    },
    {
      name: 'debug-getLog',
      description: 'Get recent output log entries.',
      schema: {
        category: z.string().optional(),
        count: z.number().int().optional(),
      },
      handler: async (ctx, params) => debugGetLog(ctx.bridge, params as any),
    },
    {
      name: 'debug-getPerformance',
      description: 'Get frame time, draw calls, memory stats.',
      schema: {},
      handler: async (ctx, _params) => debugGetPerformance(ctx.bridge, {}),
    },
  ];
}
