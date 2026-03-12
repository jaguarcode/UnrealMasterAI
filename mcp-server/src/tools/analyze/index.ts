import { z } from 'zod';
import type { ToolModule } from '../tool-module.js';
import { analyzeBlueprintComplexity } from './blueprint-complexity.js';
import { analyzeAssetHealth } from './asset-health.js';
import { analyzePerformanceHints } from './performance-hints.js';
import { analyzeCodeConventions } from './code-conventions.js';

export function getTools(): ToolModule[] {
  return [
    {
      name: 'analyze-blueprintComplexity',
      description: 'Analyze Blueprint complexity: node count, nesting, cyclomatic.',
      schema: {
        blueprintPath: z.string().describe('Content path to Blueprint'),
      },
      handler: async (ctx, params) => analyzeBlueprintComplexity(ctx.bridge, params as unknown as Parameters<typeof analyzeBlueprintComplexity>[1]),
    },
    {
      name: 'analyze-assetHealth',
      description: 'Analyze asset health: unused, broken refs, oversized textures.',
      schema: {
        directory: z.string().optional().describe('Content directory to scan'),
        includeUnused: z.boolean().optional().describe('Include unused asset detection'),
      },
      handler: async (ctx, params) => analyzeAssetHealth(ctx.bridge, params as unknown as Parameters<typeof analyzeAssetHealth>[1]),
    },
    {
      name: 'analyze-performanceHints',
      description: 'Get performance hints: draw calls, texture memory, mesh complexity.',
      schema: {
        levelPath: z.string().optional().describe('Level to analyze (default: current)'),
      },
      handler: async (ctx, params) => analyzePerformanceHints(ctx.bridge, params as unknown as Parameters<typeof analyzePerformanceHints>[1]),
    },
    {
      name: 'analyze-codeConventions',
      description: 'Check naming conventions and folder structure compliance.',
      schema: {
        directory: z.string().optional().describe('Content directory to scan'),
      },
      handler: async (ctx, params) => analyzeCodeConventions(ctx.bridge, params as unknown as Parameters<typeof analyzeCodeConventions>[1]),
    },
  ];
}
