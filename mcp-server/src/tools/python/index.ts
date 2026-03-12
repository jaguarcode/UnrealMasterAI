import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { ToolModule, McpToolResult } from '../tool-module.js';
import type { ToolContext } from '../tool-module.js';
import { pythonExecute } from './execute.js';

/**
 * Execute a custom Python script from the uma_custom/ directory.
 */
async function pythonCustomExecute(
  ctx: ToolContext,
  params: Record<string, unknown>,
): Promise<McpToolResult> {
  const script = params.script as string;
  const args = (params.args as Record<string, unknown>) ?? {};

  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: { script: `../uma_custom/${script}`, args },
    timestamp: Date.now(),
  };

  try {
    const response = await ctx.bridge.sendRequest(msg);
    if (response.error) {
      return { content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: response.error }) }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', result: response.result }) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }] };
  }
}

/**
 * List available custom Python scripts in uma_custom/ directory.
 */
async function pythonListCustomScripts(
  ctx: ToolContext,
): Promise<McpToolResult> {
  const msg = {
    id: uuidv4(),
    method: 'python.execute' as const,
    params: {
      script: 'list_custom_scripts',
      args: { directory: 'uma_custom' },
    },
    timestamp: Date.now(),
  };

  try {
    const response = await ctx.bridge.sendRequest(msg);
    if (response.error) {
      // If the listing script doesn't exist, return helpful message
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'info',
            message: 'No custom scripts directory found. Create Content/Python/uma_custom/ in your UE project and add .py scripts following the @execute_wrapper pattern.',
            scripts: [],
          }),
        }],
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', result: response.result }) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'info',
          message: `Custom scripts directory not available: ${message}. Create Content/Python/uma_custom/ in your UE project to add custom scripts.`,
          scripts: [],
        }),
      }],
    };
  }
}

export function getTools(): ToolModule[] {
  return [
    {
      name: 'python-execute',
      description: 'Execute a named Python script from the UMA plugin Content/Python/uma/ directory.',
      schema: {
        script: z.string().describe('Script name (without .py, e.g., "blueprint_setup_spinning_cube")'),
        args: z.record(z.unknown()).optional().describe('Arguments to pass to the script'),
      },
      handler: (ctx, params) =>
        pythonExecute(ctx.bridge, params as { script: string; args?: Record<string, unknown> }),
    },
    {
      name: 'python-customExecute',
      description: 'Execute a custom Python script from the user\'s Content/Python/uma_custom/ directory. For user-created automation scripts.',
      schema: {
        script: z.string().describe('Script name (without .py) from uma_custom/ directory'),
        args: z.record(z.unknown()).optional().describe('Arguments to pass to the script'),
      },
      handler: pythonCustomExecute,
    },
    {
      name: 'python-listCustomScripts',
      description: 'List available custom Python scripts in the Content/Python/uma_custom/ directory.',
      schema: {},
      handler: (ctx) => pythonListCustomScripts(ctx),
    },
  ];
}
