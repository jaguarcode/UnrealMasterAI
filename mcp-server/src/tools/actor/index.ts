import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { actorSpawn } from './spawn.js';
import { actorDelete } from './delete.js';
import { actorSetTransform } from './set-transform.js';
import { actorGetProperties } from './get-properties.js';
import { actorSetProperty } from './set-property.js';
import { actorGetComponents } from './get-components.js';
import { actorAddComponent } from './add-component.js';
import { actorSelect } from './select.js';
import { actorSetArrayRef } from './set-array-ref.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'actor-spawn',
      description: 'Spawn actor in current level.',
      schema: {
        className: z.string().describe('Actor class or Blueprint path'),
        location: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
        rotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }).optional(),
        label: z.string().optional().describe('Actor label'),
      },
      handler: async (ctx, params) => actorSpawn(ctx.bridge, params as unknown as Parameters<typeof actorSpawn>[1]),
    },
    {
      name: 'actor-delete',
      description: 'Delete actor(s) from level.',
      schema: {
        actorName: z.string().describe('Actor name to delete'),
      },
      handler: async (ctx, params) => actorDelete(ctx.bridge, params as unknown as Parameters<typeof actorDelete>[1]),
    },
    {
      name: 'actor-setTransform',
      description: 'Set actor location/rotation/scale.',
      schema: {
        actorName: z.string().describe('Actor name'),
        location: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
        rotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }).optional(),
        scale: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
      },
      handler: async (ctx, params) => actorSetTransform(ctx.bridge, params as unknown as Parameters<typeof actorSetTransform>[1]),
    },
    {
      name: 'actor-getProperties',
      description: 'Read all editable properties of an actor.',
      schema: {
        actorName: z.string().describe('Actor name'),
      },
      handler: async (ctx, params) => actorGetProperties(ctx.bridge, params as unknown as Parameters<typeof actorGetProperties>[1]),
    },
    {
      name: 'actor-setProperty',
      description: 'Set a specific property on an actor.',
      schema: {
        actorName: z.string().describe('Actor name'),
        propertyName: z.string().describe('Property name'),
        propertyValue: z.string().describe('New value'),
      },
      handler: async (ctx, params) => actorSetProperty(ctx.bridge, params as unknown as Parameters<typeof actorSetProperty>[1]),
    },
    {
      name: 'actor-getComponents',
      description: 'List all components on an actor.',
      schema: {
        actorName: z.string().describe('Actor name'),
      },
      handler: async (ctx, params) => actorGetComponents(ctx.bridge, params as unknown as Parameters<typeof actorGetComponents>[1]),
    },
    {
      name: 'actor-addComponent',
      description: 'Add a component to an actor.',
      schema: {
        actorName: z.string().describe('Actor name'),
        componentClass: z.string().describe('Component class'),
        componentName: z.string().optional(),
      },
      handler: async (ctx, params) => actorAddComponent(ctx.bridge, params as unknown as Parameters<typeof actorAddComponent>[1]),
    },
    {
      name: 'actor-select',
      description: 'Select/deselect actors in viewport.',
      schema: {
        actorNames: z.array(z.string()).describe('Actor names to select'),
        deselectOthers: z.boolean().optional(),
      },
      handler: async (ctx, params) => actorSelect(ctx.bridge, params as unknown as Parameters<typeof actorSelect>[1]),
    },
    {
      name: 'actor-setArrayRef',
      description: 'Set an array-of-actor-references property (e.g., PatrolPoints).',
      schema: {
        actorName: z.string().describe('Actor name'),
        propertyName: z.string().describe('Array property name'),
        actorNames: z.array(z.string()).describe('Actor names/labels to assign'),
      },
      handler: async (ctx, params) => actorSetArrayRef(ctx.bridge, params as unknown as Parameters<typeof actorSetArrayRef>[1]),
    },
  ];
}
