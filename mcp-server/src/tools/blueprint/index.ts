import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { blueprintSerialize } from './serialize.js';
import { blueprintCreateNode } from './create-node.js';
import { blueprintConnectPins } from './connect-pins.js';
import { blueprintModifyProperty } from './modify-property.js';
import { blueprintDeleteNode } from './delete-node.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'blueprint-serialize',
      description: 'Serialize a Blueprint to JSON AST. Returns a cache key and summary (full data cached server-side).',
      schema: {
        assetPath: z.string().describe('Blueprint asset path (e.g., /Game/BP_TestActor)'),
        graphName: z.string().optional().describe('Specific graph name to serialize'),
      },
      handler: (ctx, params) =>
        blueprintSerialize(ctx.bridge, ctx.cache, params as { assetPath: string; graphName?: string }),
    },
    {
      name: 'blueprint-createNode',
      description: 'Create a new Blueprint node in a graph.',
      schema: {
        blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
        graphName: z.string().describe('Target graph name'),
        nodeClass: z.string().describe('Node class (e.g., K2Node_CallFunction)'),
        functionOwnerClass: z.string().optional().describe('Owner class for K2Node_CallFunction (e.g., Actor, KismetMathLibrary)'),
        functionName: z.string().optional().describe('Function name for K2Node_CallFunction (e.g., AddActorLocalRotation)'),
        posX: z.number().int().optional().describe('X position'),
        posY: z.number().int().optional().describe('Y position'),
      },
      handler: (ctx, params) =>
        blueprintCreateNode(ctx.bridge, params as { blueprintCacheKey: string; graphName: string; nodeClass: string; functionOwnerClass?: string; functionName?: string; posX?: number; posY?: number }),
    },
    {
      name: 'blueprint-connectPins',
      description: 'Connect two Blueprint pins using TryCreateConnection.',
      schema: {
        blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
        sourcePinId: z.string().describe('Source pin UUID'),
        targetPinId: z.string().describe('Target pin UUID'),
      },
      handler: (ctx, params) =>
        blueprintConnectPins(ctx.bridge, params as { blueprintCacheKey: string; sourcePinId: string; targetPinId: string }),
    },
    {
      name: 'blueprint-modifyProperty',
      description: 'Modify a property value on a Blueprint node.',
      schema: {
        blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
        nodeId: z.string().describe('Node UUID'),
        propertyName: z.string().describe('Property name to modify'),
        propertyValue: z.string().describe('New property value'),
      },
      handler: (ctx, params) =>
        blueprintModifyProperty(ctx.bridge, params as { blueprintCacheKey: string; nodeId: string; propertyName: string; propertyValue: string }),
    },
    {
      name: 'blueprint-deleteNode',
      description: 'Delete a Blueprint node by its UUID.',
      schema: {
        blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
        nodeId: z.string().describe('Node UUID to delete'),
      },
      handler: (ctx, params) =>
        blueprintDeleteNode(ctx.bridge, params as { blueprintCacheKey: string; nodeId: string }, ctx.approvalGate),
    },
  ];
}
