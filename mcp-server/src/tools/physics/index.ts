import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { physicsCreateAsset } from './create-asset.js';
import { physicsGetInfo } from './get-info.js';
import { physicsSetProfile } from './set-profile.js';
import { physicsCreateMaterial } from './create-material.js';
import { physicsSetConstraint } from './set-constraint.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'physics-createAsset',
      description: 'Create a PhysicsAsset for a skeletal mesh.',
      schema: {
        assetName: z.string().describe('Asset name'),
        assetPath: z.string().describe('Content path'),
        skeletalMeshPath: z.string().optional().describe('Skeletal mesh to generate physics for'),
      },
      handler: async (ctx, params) => physicsCreateAsset(ctx.bridge, params as unknown as Parameters<typeof physicsCreateAsset>[1]),
    },
    {
      name: 'physics-getInfo',
      description: 'Get physics asset info: bodies, constraints, profiles.',
      schema: {
        physicsAssetPath: z.string().describe('Content path to PhysicsAsset'),
      },
      handler: async (ctx, params) => physicsGetInfo(ctx.bridge, params as unknown as Parameters<typeof physicsGetInfo>[1]),
    },
    {
      name: 'physics-setProfile',
      description: 'Set collision profile on a physics body.',
      schema: {
        assetPath: z.string().describe('Content path to PhysicsAsset'),
        bodyName: z.string().describe('Body name'),
        profileName: z.string().describe('Collision profile name'),
      },
      handler: async (ctx, params) => physicsSetProfile(ctx.bridge, params as unknown as Parameters<typeof physicsSetProfile>[1]),
    },
    {
      name: 'physics-createMaterial',
      description: 'Create a PhysicalMaterial asset.',
      schema: {
        materialName: z.string().describe('Material name'),
        materialPath: z.string().describe('Content path'),
        friction: z.number().optional().describe('Friction coefficient'),
        restitution: z.number().optional().describe('Restitution (bounciness)'),
      },
      handler: async (ctx, params) => physicsCreateMaterial(ctx.bridge, params as unknown as Parameters<typeof physicsCreateMaterial>[1]),
    },
    {
      name: 'physics-setConstraint',
      description: 'Configure a physics constraint.',
      schema: {
        physicsAssetPath: z.string().describe('Content path to PhysicsAsset'),
        constraintName: z.string().describe('Constraint name'),
        linearLimit: z.number().optional().describe('Linear motion limit'),
        angularLimit: z.number().optional().describe('Angular motion limit in degrees'),
      },
      handler: async (ctx, params) => physicsSetConstraint(ctx.bridge, params as unknown as Parameters<typeof physicsSetConstraint>[1]),
    },
  ];
}
