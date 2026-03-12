import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { aiCreateBehaviorTree } from './create-behavior-tree.js';
import { aiCreateBlackboard } from './create-blackboard.js';
import { aiGetBehaviorTreeInfo } from './get-behavior-tree-info.js';
import { aiGetBlackboardKeys } from './get-blackboard-keys.js';
import { aiAddBlackboardKey } from './add-blackboard-key.js';
import { aiConfigureNavMesh } from './configure-nav-mesh.js';
import { aiGetNavMeshInfo } from './get-nav-mesh-info.js';
import { aiCreateEqs } from './create-eqs.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'ai-createBehaviorTree',
      description: 'Create a new BehaviorTree asset.',
      schema: {
        treeName: z.string(),
        treePath: z.string(),
      },
      handler: async (ctx, params) => aiCreateBehaviorTree(ctx.bridge, params as any),
    },
    {
      name: 'ai-createBlackboard',
      description: 'Create a new Blackboard asset.',
      schema: {
        blackboardName: z.string(),
        blackboardPath: z.string(),
      },
      handler: async (ctx, params) => aiCreateBlackboard(ctx.bridge, params as any),
    },
    {
      name: 'ai-getBehaviorTreeInfo',
      description: 'Get metadata for a BehaviorTree asset.',
      schema: {
        treePath: z.string(),
      },
      handler: async (ctx, params) => aiGetBehaviorTreeInfo(ctx.bridge, params as any),
    },
    {
      name: 'ai-getBlackboardKeys',
      description: 'Get all keys from a Blackboard asset.',
      schema: {
        blackboardPath: z.string(),
      },
      handler: async (ctx, params) => aiGetBlackboardKeys(ctx.bridge, params as any),
    },
    {
      name: 'ai-addBlackboardKey',
      description: 'Add a key to a Blackboard asset.',
      schema: {
        blackboardPath: z.string(),
        keyName: z.string(),
        keyType: z.string(),
      },
      handler: async (ctx, params) => aiAddBlackboardKey(ctx.bridge, params as any),
    },
    {
      name: 'ai-configureNavMesh',
      description: 'Configure RecastNavMesh settings.',
      schema: {
        agentRadius: z.number().optional(),
        agentHeight: z.number().optional(),
        cellSize: z.number().optional(),
      },
      handler: async (ctx, params) => aiConfigureNavMesh(ctx.bridge, params as any),
    },
    {
      name: 'ai-getNavMeshInfo',
      description: 'Get current RecastNavMesh configuration.',
      schema: {},
      handler: async (ctx, _params) => aiGetNavMeshInfo(ctx.bridge, {}),
    },
    {
      name: 'ai-createEqs',
      description: 'Create a new Environment Query System asset.',
      schema: {
        queryName: z.string(),
        queryPath: z.string(),
      },
      handler: async (ctx, params) => aiCreateEqs(ctx.bridge, params as any),
    },
  ];
}
