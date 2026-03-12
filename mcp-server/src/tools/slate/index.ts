import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { validateSlateCode } from './validate-slate.js';
import { generateWidgetContext } from './generate-widget.js';
import { listTemplates } from './list-templates.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'slate-validate',
      description: 'Validate Slate C++ code for common errors (unbalanced SNew, missing SLATE_END_ARGS, etc.).',
      schema: {
        code: z.string().describe('Slate C++ code to validate'),
      },
      handler: (_ctx, params) => {
        const result = validateSlateCode((params as { code: string }).code);
        return Promise.resolve({ content: [{ type: 'text' as const, text: JSON.stringify(result) }] });
      },
    },
    {
      name: 'slate-generate',
      description: 'Get relevant Slate templates and style guide for widget generation.',
      schema: {
        query: z.string().describe('Widget description (e.g., "list view with checkboxes")'),
        widgetName: z.string().optional(),
      },
      handler: (ctx, params) => {
        const result = generateWidgetContext(ctx.slateStore, params as { query: string; widgetName?: string });
        return Promise.resolve({ content: [{ type: 'text' as const, text: JSON.stringify(result) }] });
      },
    },
    {
      name: 'slate-listTemplates',
      description: 'List all available Slate widget templates.',
      schema: {},
      handler: (ctx) => {
        const templates = listTemplates(ctx.slateStore);
        return Promise.resolve({ content: [{ type: 'text' as const, text: JSON.stringify(templates) }] });
      },
    },
  ];
}
