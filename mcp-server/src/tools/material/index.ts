import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { materialCreate } from './create.js';
import { materialSetParameter } from './set-parameter.js';
import { materialGetParameters } from './get-parameters.js';
import { materialCreateInstance } from './create-instance.js';
import { materialSetTexture } from './set-texture.js';
import { materialGetNodes } from './get-nodes.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'material-create',
      description: 'Create new material.',
      schema: {
        materialName: z.string(),
        materialPath: z.string(),
        materialType: z.string().optional(),
      },
      handler: async (ctx, params) => materialCreate(ctx.bridge, params as unknown as Parameters<typeof materialCreate>[1]),
    },
    {
      name: 'material-setParameter',
      description: 'Set material parameter value.',
      schema: {
        materialPath: z.string(),
        parameterName: z.string(),
        value: z.unknown(),
        parameterType: z.string().optional(),
      },
      handler: async (ctx, params) => materialSetParameter(ctx.bridge, params as unknown as Parameters<typeof materialSetParameter>[1]),
    },
    {
      name: 'material-getParameters',
      description: 'List material parameters.',
      schema: {
        materialPath: z.string(),
      },
      handler: async (ctx, params) => materialGetParameters(ctx.bridge, params as unknown as Parameters<typeof materialGetParameters>[1]),
    },
    {
      name: 'material-createInstance',
      description: 'Create material instance from parent.',
      schema: {
        parentPath: z.string(),
        instanceName: z.string(),
        instancePath: z.string(),
      },
      handler: async (ctx, params) => materialCreateInstance(ctx.bridge, params as unknown as Parameters<typeof materialCreateInstance>[1]),
    },
    {
      name: 'material-setTexture',
      description: 'Assign texture to material.',
      schema: {
        materialPath: z.string(),
        parameterName: z.string(),
        texturePath: z.string(),
      },
      handler: async (ctx, params) => materialSetTexture(ctx.bridge, params as unknown as Parameters<typeof materialSetTexture>[1]),
    },
    {
      name: 'material-getNodes',
      description: 'Get material graph nodes.',
      schema: {
        materialPath: z.string(),
      },
      handler: async (ctx, params) => materialGetNodes(ctx.bridge, params as unknown as Parameters<typeof materialGetNodes>[1]),
    },
  ];
}
