import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { contextAutoGather } from './auto-gather.js';
import { generateManifest } from './tool-manifest.js';
import { listChains } from './tool-chains.js';
import { listRecoveryStrategies } from './error-recovery.js';
import {
  contextLearnWorkflow,
  contextMatchIntent,
  contextRecordOutcome,
  contextLearnFromDocs,
  contextGetOutcomeStats,
} from './learn-workflow.js';
import { getAllWorkflows } from './workflow-knowledge.js';
import {
  contextRecordResolution,
  contextMatchError,
  contextMarkResolutionReused,
  contextListResolutions,
} from './error-learning.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'context-autoGather',
      description: 'Gather comprehensive project context: info, code stats, content, conventions.',
      schema: {
        includeConventions: z.boolean().optional().describe('Include convention detection (default true)'),
        includeViewport: z.boolean().optional().describe('Include viewport state (default true)'),
      },
      handler: (ctx, params) =>
        contextAutoGather(ctx.bridge, params as { includeConventions?: boolean; includeViewport?: boolean }),
    },
    {
      name: 'context-getManifest',
      description: 'Get the complete tool manifest with all tools, domains, and workflow chains.',
      schema: {},
      handler: () => {
        const manifest = generateManifest();
        return Promise.resolve({ content: [{ type: 'text' as const, text: JSON.stringify({ status: 'success', result: manifest }) }] });
      },
    },
    {
      name: 'context-getChains',
      description: 'Get available tool workflow chains and error recovery strategies.',
      schema: {},
      handler: () => {
        const chains = listChains();
        const recoveryStrategies = listRecoveryStrategies();
        return Promise.resolve({ content: [{ type: 'text' as const, text: JSON.stringify({ status: 'success', result: { chains, recoveryStrategies } }) }] });
      },
    },
    {
      name: 'context-learnWorkflow',
      description: 'Learn a new UE developer workflow from documentation or web research. Stores structured workflow with intent patterns and tool sequences.',
      schema: {
        id: z.string().describe('Unique workflow identifier (e.g., "mat-create-decal")'),
        name: z.string().describe('Human-readable workflow name'),
        description: z.string().describe('What the workflow accomplishes'),
        domain: z.string().describe('Primary domain (blueprint, material, character, level, etc.)'),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Difficulty level'),
        intentPatterns: z.array(z.string()).describe('Natural language phrases that trigger this workflow'),
        prerequisites: z.array(z.string()).optional().describe('What must be true before starting'),
        steps: z.array(z.object({
          tool: z.string().describe('MCP tool name to call'),
          purpose: z.string().describe('Why this step is needed'),
          optional: z.boolean().optional(),
          repeat: z.boolean().optional(),
        })).describe('Ordered sequence of tool calls'),
        expectedOutcome: z.string().describe('What the developer gets at the end'),
        source: z.string().optional().describe('Where this workflow was learned from'),
        tags: z.array(z.string()).optional().describe('Search tags'),
      },
      handler: (_ctx, params) =>
        contextLearnWorkflow(params as unknown as Parameters<typeof contextLearnWorkflow>[0]),
    },
    {
      name: 'context-matchIntent',
      description: 'Match a natural language description of developer intent to known UE workflows. Returns ranked recommendations with tool sequences.',
      schema: {
        query: z.string().describe('Natural language description of what the developer wants to do'),
        maxResults: z.number().optional().describe('Maximum number of matches to return (default 5)'),
      },
      handler: (_ctx, params) =>
        contextMatchIntent(params as { query: string; maxResults?: number }),
    },
    {
      name: 'context-getWorkflows',
      description: 'List all known UE developer workflows (built-in + learned). Optionally filter by domain or tag.',
      schema: {
        domain: z.string().optional().describe('Filter by domain (blueprint, material, character, level, etc.)'),
        tag: z.string().optional().describe('Filter by tag'),
      },
      handler: (_ctx, params) => {
        const p = params as { domain?: string; tag?: string };
        let workflows = getAllWorkflows();
        if (p.domain) workflows = workflows.filter((w) => w.domain === p.domain);
        if (p.tag) workflows = workflows.filter((w) => w.tags.includes(p.tag!));
        const summary = workflows.map((w) => ({
          id: w.id, name: w.name, domain: w.domain, difficulty: w.difficulty,
          stepCount: w.steps.length, source: w.source, tags: w.tags,
        }));
        return Promise.resolve({ content: [{ type: 'text' as const, text: JSON.stringify({ status: 'success', count: summary.length, workflows: summary }) }] });
      },
    },
    {
      name: 'context-recordOutcome',
      description: 'Record the outcome (success/failure) of a workflow execution. Builds outcome history for confidence-weighted recommendations.',
      schema: {
        workflowId: z.string().describe('ID of the workflow that was executed'),
        success: z.boolean().describe('Whether the workflow completed successfully'),
        toolsUsed: z.array(z.string()).optional().describe('List of tool names actually used during execution'),
        durationMs: z.number().optional().describe('Total execution duration in milliseconds'),
        notes: z.string().optional().describe('Additional notes about the outcome (errors, workarounds)'),
      },
      handler: (_ctx, params) =>
        contextRecordOutcome(params as { workflowId: string; success: boolean; toolsUsed?: string[]; durationMs?: number; notes?: string }),
    },
    {
      name: 'context-learnFromDocs',
      description: 'Extract and learn UE workflows from documentation content. Parses structured doc text into workflow definitions with tool sequences.',
      schema: {
        domain: z.string().describe('UE domain (blueprint, material, character, level, animation, etc.)'),
        docContent: z.string().describe('Documentation text content with numbered/bulleted steps describing a workflow'),
        docSource: z.string().optional().describe('Source identifier (default: "epic-docs")'),
      },
      handler: (_ctx, params) =>
        contextLearnFromDocs(params as { domain: string; docContent: string; docSource?: string }),
    },
    {
      name: 'context-getOutcomeStats',
      description: 'Get outcome statistics for all tracked workflows. Shows success rates, trends, and execution counts.',
      schema: {},
      handler: () => contextGetOutcomeStats(),
    },
    {
      name: 'context-recordResolution',
      description: 'Record a successful error resolution after troubleshooting. Captures the error, attempted fixes (including failures), the successful fix, and root cause. Future similar errors will receive this resolution as a recommendation.',
      schema: {
        errorMessage: z.string().describe('The error message that was encountered'),
        errorType: z.string().optional().describe('Error category (compile-error, asset-not-found, pin-connection-failure, etc.). Auto-inferred if omitted.'),
        sourceTool: z.string().describe('The MCP tool that produced the error (e.g., "blueprint-connectPins")'),
        developerIntent: z.string().describe('What the developer was trying to accomplish when the error occurred'),
        attemptedFixes: z.array(z.object({
          action: z.string().describe('What was tried'),
          toolUsed: z.string().optional().describe('Tool used for this attempt'),
          result: z.enum(['success', 'failure', 'partial']).describe('Outcome of this attempt'),
          notes: z.string().optional().describe('Additional context'),
        })).describe('All fixes attempted, including failures (helps avoid dead ends in future)'),
        successfulFix: z.object({
          description: z.string().describe('Summary of what fixed the error'),
          toolSequence: z.array(z.string()).describe('Ordered list of tools used in the fix'),
          steps: z.array(z.string()).describe('Step-by-step instructions to reproduce the fix'),
        }).describe('The fix that ultimately resolved the error'),
        rootCause: z.string().describe('Root cause analysis of why the error occurred'),
        tags: z.array(z.string()).optional().describe('Tags for searchability (e.g., ["mobility", "static-mesh"])'),
      },
      handler: (_ctx, params) =>
        contextRecordResolution(params as unknown as Parameters<typeof contextRecordResolution>[0]),
    },
    {
      name: 'context-matchError',
      description: 'Find matching past resolutions for a current error. Combines builtin recovery strategies with learned resolutions. Returns ranked recommendations with confidence scores and actions to avoid.',
      schema: {
        errorMessage: z.string().describe('The error message to find resolutions for'),
        sourceTool: z.string().describe('The tool that produced the error'),
        errorType: z.string().optional().describe('Error category (auto-inferred if omitted)'),
        maxResults: z.number().optional().describe('Maximum learned resolutions to return (default 5)'),
      },
      handler: (_ctx, params) =>
        contextMatchError(params as { errorMessage: string; sourceTool: string; errorType?: string; maxResults?: number }),
    },
    {
      name: 'context-markResolutionReused',
      description: 'Mark a learned error resolution as successfully reused. Boosts its ranking for future similar errors.',
      schema: {
        resolutionId: z.string().describe('ID of the resolution that was successfully reused'),
      },
      handler: (_ctx, params) =>
        contextMarkResolutionReused(params as { resolutionId: string }),
    },
    {
      name: 'context-listResolutions',
      description: 'List all stored error resolutions. Optionally filter by error type or source tool.',
      schema: {
        errorType: z.string().optional().describe('Filter by error type'),
        sourceTool: z.string().optional().describe('Filter by source tool'),
      },
      handler: (_ctx, params) =>
        contextListResolutions(params as { errorType?: string; sourceTool?: string }),
    },
  ];
}
