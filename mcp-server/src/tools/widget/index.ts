import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { widgetCreate } from './create.js';
import { widgetGetInfo } from './get-info.js';
import { widgetAddElement } from './add-element.js';
import { widgetSetProperty } from './set-property.js';
import { widgetGetBindings } from './get-bindings.js';
import { widgetListWidgets } from './list-widgets.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'widget-create',
      description: 'Create a new Widget Blueprint.',
      schema: {
        widgetName: z.string().describe('Widget name'),
        widgetPath: z.string().describe('Content path'),
        parentClass: z.string().optional().describe('Parent widget class'),
      },
      handler: async (ctx, params) => widgetCreate(ctx.bridge, params as any),
    },
    {
      name: 'widget-getInfo',
      description: 'Get Widget Blueprint info (widget tree, bindings).',
      schema: {
        widgetPath: z.string().describe('Widget Blueprint path'),
      },
      handler: async (ctx, params) => widgetGetInfo(ctx.bridge, params as any),
    },
    {
      name: 'widget-addElement',
      description: 'Add a UI element to a Widget Blueprint.',
      schema: {
        widgetPath: z.string().describe('Widget Blueprint path'),
        elementType: z.string().describe('Element type (TextBlock, Button, Image, etc.)'),
        elementName: z.string().describe('Element name'),
        parentName: z.string().optional().describe('Parent element name'),
      },
      handler: async (ctx, params) => widgetAddElement(ctx.bridge, params as any),
    },
    {
      name: 'widget-setProperty',
      description: 'Set a property on a Widget Blueprint element.',
      schema: {
        widgetPath: z.string().describe('Widget Blueprint path'),
        elementName: z.string().describe('Element name'),
        propertyName: z.string().describe('Property name'),
        propertyValue: z.string().describe('Property value'),
      },
      handler: async (ctx, params) => widgetSetProperty(ctx.bridge, params as any),
    },
    {
      name: 'widget-getBindings',
      description: 'Get property bindings and event dispatchers from a Widget Blueprint.',
      schema: {
        widgetPath: z.string().describe('Widget Blueprint path'),
      },
      handler: async (ctx, params) => widgetGetBindings(ctx.bridge, params as any),
    },
    {
      name: 'widget-listWidgets',
      description: 'List all Widget Blueprints in project.',
      schema: {
        path: z.string().optional().describe('Content path to search'),
        recursive: z.boolean().optional(),
      },
      handler: async (ctx, params) => widgetListWidgets(ctx.bridge, params as any),
    },
  ];
}
