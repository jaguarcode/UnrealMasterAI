/**
 * context.learnWorkflow and context.matchIntent tool handlers.
 * Enables the system to learn new UE developer workflows and match intent to workflows.
 */
import type { McpToolResult } from '../editor/ping.js';
import {
  addLearnedWorkflow,
  getAllWorkflows,
  getLearnedWorkflows,
  type Workflow,
} from './workflow-knowledge.js';
import { matchIntent } from './intent-matcher.js';

export interface LearnWorkflowParams {
  id: string;
  name: string;
  description: string;
  domain: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  intentPatterns: string[];
  prerequisites?: string[];
  steps: Array<{ tool: string; purpose: string; optional?: boolean; repeat?: boolean }>;
  expectedOutcome: string;
  source?: string;
  tags?: string[];
}

export interface MatchIntentParams {
  query: string;
  maxResults?: number;
}

/**
 * Learn a new workflow and add it to the runtime knowledge base.
 */
export async function contextLearnWorkflow(
  params: LearnWorkflowParams,
): Promise<McpToolResult> {
  try {
    const workflow: Workflow = {
      id: params.id,
      name: params.name,
      description: params.description,
      domain: params.domain,
      difficulty: params.difficulty ?? 'intermediate',
      intentPatterns: params.intentPatterns,
      prerequisites: params.prerequisites ?? [],
      steps: params.steps,
      expectedOutcome: params.expectedOutcome,
      source: (params.source as Workflow['source']) ?? 'user-defined',
      tags: params.tags ?? [params.domain],
    };

    addLearnedWorkflow(workflow);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            message: `Workflow "${workflow.name}" learned successfully`,
            id: workflow.id,
            totalWorkflows: getAllWorkflows().length,
            learnedWorkflows: getLearnedWorkflows().length,
          }),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

/**
 * Match a natural language intent to known workflows and return recommendations.
 */
export async function contextMatchIntent(
  params: MatchIntentParams,
): Promise<McpToolResult> {
  try {
    const result = matchIntent(params.query, params.maxResults ?? 5);

    // Simplify output for Claude consumption
    const output = {
      status: 'success',
      query: result.query,
      matchCount: result.matches.length,
      topRecommendation: result.topRecommendation
        ? {
            id: result.topRecommendation.id,
            name: result.topRecommendation.name,
            description: result.topRecommendation.description,
            difficulty: result.topRecommendation.difficulty,
            steps: result.topRecommendation.steps,
            expectedOutcome: result.topRecommendation.expectedOutcome,
          }
        : null,
      suggestedToolSequence: result.suggestedToolSequence,
      allMatches: result.matches.map((m) => ({
        id: m.workflow.id,
        name: m.workflow.name,
        score: Math.round(m.score * 100) / 100,
        matchedPatterns: m.matchedPatterns,
        domain: m.workflow.domain,
        difficulty: m.workflow.difficulty,
        stepCount: m.workflow.steps.length,
      })),
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}
