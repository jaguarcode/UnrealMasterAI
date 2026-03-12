import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { curveCreate } from './create.js';
import { curveSetKeys } from './set-keys.js';
import { curveGetInfo } from './get-info.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'curve-create',
      description: 'Create a curve asset (float, vector, or linear color).',
      schema: {
        curveName: z.string().describe('Curve name'),
        curvePath: z.string().describe('Content path'),
        curveType: z.enum(['float', 'vector', 'linear']).optional().describe('Type: float, vector, linear (default: float)'),
      },
      handler: async (ctx, params) => curveCreate(ctx.bridge, params as unknown as Parameters<typeof curveCreate>[1]),
    },
    {
      name: 'curve-setKeys',
      description: 'Add or modify keyframes on a curve.',
      schema: {
        curvePath: z.string().describe('Content path to curve'),
        keys: z.array(z.object({ time: z.number(), value: z.number() })).describe('Array of {time, value} keyframes'),
      },
      handler: async (ctx, params) => curveSetKeys(ctx.bridge, params as unknown as Parameters<typeof curveSetKeys>[1]),
    },
    {
      name: 'curve-getInfo',
      description: 'Get curve data, key count, and time range.',
      schema: {
        curvePath: z.string().describe('Content path to curve'),
      },
      handler: async (ctx, params) => curveGetInfo(ctx.bridge, params as unknown as Parameters<typeof curveGetInfo>[1]),
    },
  ];
}
