import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { niagaraCreateSystem } from './create-system.js';
import { niagaraGetInfo } from './get-info.js';
import { niagaraAddEmitter } from './add-emitter.js';
import { niagaraSetParameter } from './set-parameter.js';
import { niagaraCompile } from './compile.js';
import { niagaraListSystems } from './list-systems.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'niagara-createSystem',
      description: 'Create a new Niagara particle system asset.',
      schema: {
        systemName: z.string().describe('System asset name'),
        systemPath: z.string().describe('Content path'),
      },
      handler: async (ctx, params) => niagaraCreateSystem(ctx.bridge, params as any),
    },
    {
      name: 'niagara-getInfo',
      description: 'Get Niagara system info: emitters, modules, parameters.',
      schema: {
        systemPath: z.string().describe('Content path to Niagara system'),
      },
      handler: async (ctx, params) => niagaraGetInfo(ctx.bridge, params as any),
    },
    {
      name: 'niagara-addEmitter',
      description: 'Add an emitter to a Niagara system.',
      schema: {
        systemPath: z.string().describe('Content path to Niagara system'),
        emitterName: z.string().describe('Emitter name'),
        templatePath: z.string().optional().describe('Template emitter path'),
      },
      handler: async (ctx, params) => niagaraAddEmitter(ctx.bridge, params as any),
    },
    {
      name: 'niagara-setParameter',
      description: 'Set a user parameter on a Niagara system.',
      schema: {
        systemPath: z.string().describe('Content path to Niagara system'),
        parameterName: z.string().describe('Parameter name'),
        value: z.unknown().describe('Parameter value'),
      },
      handler: async (ctx, params) => niagaraSetParameter(ctx.bridge, params as any),
    },
    {
      name: 'niagara-compile',
      description: 'Compile a Niagara system.',
      schema: {
        systemPath: z.string().describe('Content path to Niagara system'),
      },
      handler: async (ctx, params) => niagaraCompile(ctx.bridge, params as any),
    },
    {
      name: 'niagara-listSystems',
      description: 'List Niagara system assets in the project.',
      schema: {
        directory: z.string().optional().describe('Content directory to search'),
        filter: z.string().optional().describe('Name filter pattern'),
      },
      handler: async (ctx, params) => niagaraListSystems(ctx.bridge, params as any),
    },
  ];
}
